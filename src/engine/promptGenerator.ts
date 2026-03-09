import { PromptInput } from "./types";
import { GOVERNANCE_RULES } from "./governance";
import { getTemplateFor } from "./templates";

export function generatePrompt(input: PromptInput): string {
  const hasPreClarifications = !!(input.preClarifications?.trim());
  const hasClarifications = !!(input.clarifications?.trim());
  const hasAnyAnswers = hasPreClarifications || hasClarifications;

  // Pre-clarifications are collected BEFORE the first AI call (upfront Q&A in the extension).
  const preClarificationsSection = hasPreClarifications
    ? `
PRE-CLARIFICATIONS (collected before generation — authoritative facts, use directly):
${input.preClarifications}
`
    : '';

  // Post-pass clarifications collected after reviewing AI output (ambiguity resolution).
  const clarificationsSection = hasClarifications
    ? `
CLARIFICATIONS (collected after previous pass — authoritative facts):
${input.clarifications}
`
    : '';

  const passHeader = (input.pass && input.pass > 1)
    ? `GENERATION PASS: ${input.pass}
This is a resolution pass. Preserved ambiguities from the previous pass have now been answered via the CLARIFICATIONS block below. Incorporate each answer factually and remove the corresponding item from "Preserved Ambiguities". Do not add new invented content.
`
    : '';

  const gapCheckBlock_inline = hasAnyAnswers ? `` : `
═══════════════════════════════════════════════════════════════
STEP 1 — INFORMATION CHECK  ← DO THIS BEFORE WRITING ANYTHING
═══════════════════════════════════════════════════════════════

A procedure step is only documentable when the source states all of:
  □ WHERE  — exact UI location or navigation path
  □ HOW    — specific value, input, or action required
  □ RESULT — what the system shows or does when the step succeeds
  □ ON ERROR — which specific log, what to look for, and what to do next

Check EVERY action step in the source now. Use these as your pattern:

FAIL — these require questions before you can document them:
  ✗ "Build project first."        — WHERE in the UI? No location stated.
  ✗ "Upload files."               — WHERE in the UI? No location stated.
  ✗ "System validates something." — WHAT does it validate? "Something" is undefined.
  ✗ "If ok → deploy."            — WHAT does "ok" look like? What indicator confirms it?
  ✗ "If error → check logs."     — WHICH log? What to look for? What is the next action?
  ✗ "Test connection."            — HOW? What does success look like?
  ✗ "Restart runtime."            — After restarting, must the user wait? For what?
  ✗ "Port defaults to something." — WHAT is the actual default value?

PASS — these do not require questions:
  ✓ "Might need firewall exception."   — conditional note, preserve in Notes section
  ✓ "Go to deployment section."        — location named, sufficient to act
  ✓ "Select target device from list."  — action and location clear

IF ANY step fails:
  → Write ONLY the question list below. Do NOT write any headings, sections, or document content. STOP.

  **Before I can write this document, I need the following information:**

  1. [Question] *(Source: "exact source line")*
  2. [Question] *(Source: "exact source line")*
  ...

  ⚠ Do not generate the document until the user provides answers to all questions above.

IF ALL steps pass:
  → Proceed to STEP 2.

═══════════════════════════════════════════════════════════════
STEP 2 — GENERATE DOCUMENT  ← ONLY REACHED IF STEP 1 PASSED
═══════════════════════════════════════════════════════════════
`;

  // When no clarifications have been provided, attempt to extract
  // a comprehensive set of candidate clarification questions from the
  // source text so the extension can present them to the user before
  // generation. Each question references the exact source sentence.
  function generateQuestionsFromSource(src: string): string {
    if (!src || !src.trim()) return '';
    const sentences = src.match(/[^.!?]+[.!?]?/g) || [];
    const questions: string[] = [];

    const push = (q: string, s: string) => {
      const safe = s.replace(/"/g, "'").trim();
      questions.push(`${q} *(Source: "${safe}")`);
    };

    sentences.forEach(s => {
      const t = s.trim();
      if (!t) return;

      // UI location missing for generic open/tab actions
      if (/open\s+[A-Za-z0-9 _-]+tab\.?/i.test(t) || /open\s+[A-Za-z0-9 _-]+/i.test(t)) {
        push('1. [Question] Where in the UI does the user perform this step? Provide the full navigation path or exact UI label.', t);
        return;
      }

      // Right-click or ambiguous icon references
      if (/right click|right-click|rightclick/i.test(t) || /icon next to/i.test(t)) {
        push('2. [Question] Which icon exactly should be clicked? Provide the icon name, tooltip text, or distinguishing description.', t);
        return;
      }

      // Generic click/import actions without target path
      if (/click\s+import/i.test(t) || /click\s+[A-Za-z0-9 _-]+/i.test(t) && /click import/i.test(t.toLowerCase())) {
        push('3. [Question] Where in the UI does this click occur? Provide the full navigation path or exact UI label.', t);
        return;
      }

      // Selection method questions
      if (/choose tags|choose|select tags|select/i.test(t)) {
        push('4. [Question] How should the user select items? Provide exact selection method text (e.g., checkboxes, multi-select list, dialog).', t);
        return;
      }

      // Connection / prerequisite phrasing
      if (/connected to PLC|when connected to|need online connection|need online connection to PLC|online connection/i.test(t)) {
        push('5. [Question] What exact prerequisite sentence should be listed (copy exact wording)?', t);
        return;
      }

      // Loading / progress indicators
      if (/loading might|might take time|progress|loading/i.test(t)) {
        push('6. [Question] Is there an in-UI progress indicator or message? Provide the exact message text if present.', t);
        return;
      }

      // Deploy references and cross-links
      if (/deploy connection|deploy .* IIH Semantics|deploy section|see deploy section/i.test(t)) {
        push('7. [Question] Provide the exact deploy step text or the file/UI reference to include verbatim.', t);
        return;
      }

      // Generic vague or placeholder words
      if (/\b(something|it|this)\b/i.test(t) || /if ok|if error|check logs|test connection|restart/i.test(t)) {
        push('8. [Question] The sentence uses vague wording. Please specify what "something/it/this" refers to, and provide expected success or error follow-up text.', t);
        return;
      }

      // Fallback: if sentence contains 'choose' or 'select' or ends with a short imperative, ask for clarification
      if (/^\s*(Choose|Select|Click|Right click|Right-click)\b/i.test(t)) {
        push('9. [Question] Please provide any missing UI labels, selection methods, or exact wording needed to perform this action.', t);
        return;
      }
    });

    if (questions.length === 0) return '';
    // Number the questions sequentially for clarity.
    const numbered = questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
    return `\n**Before I can write this document, I need the following information:**\n\n${numbered}\n\n`;
  }

  const base = `
SYSTEM:
You are a Technical Documentation Agent. Your first task is always to check whether the source contains enough information to write a complete document. If information is missing, list your questions and stop. Do not generate an incomplete document.
${passHeader}
${gapCheckBlock_inline}
${hasAnyAnswers ? '' : generateQuestionsFromSource(input.context)}
${GOVERNANCE_RULES}

REWRITE POLICY:
- Use only words, concepts, and steps that exist in the source
- You may reorder sentences for clarity, but you may NOT add meaning
- If a step in the source is one sentence, the output step is one sentence — do not expand it
- Shorter and faithful is better than longer and invented

${hasAnyAnswers ? `CLARIFICATIONS PROVIDED — treat these as authoritative facts and use them directly when generating:
${preClarificationsSection}${clarificationsSection}` : ''}

GOVERNANCE ENFORCEMENT:
- If you would need to invent something to complete a step: do not invent it — ask instead
- If you catch yourself adding a clause not in the source: delete it

PRESERVED AMBIGUITIES:
- When source content is vague but does NOT block the user from acting, document it as-is and list it under Preserved Ambiguities
- Preserved Ambiguities is NOT a reason to skip asking — if a gap blocks action, it must be asked

USER INTENT:
${input.userIntent}

SOURCE CONTENT (authoritative):
${input.context}
`;

  // Inject the selected template's skeleton and enforce headings. Prefer a
  // user-edited template if one was provided via `input.templateContent`.
  const template = getTemplateFor(input.taskType);
  const templateContent = input.templateContent && input.templateContent.trim()
    ? input.templateContent
    : template.content;
  // Derive required sections from the canonical template (not the edited body)
  const requiredSections = template.requiredSections;
  const templateBlock = `\nOUTPUT STRUCTURE — Use exactly these headings in this order. Do not add or remove sections.\n\n${requiredSections.map(s => `- ${s}`).join('\n')}\n\nTEMPLATE EXAMPLE:\n${templateContent}\n`;
  const baseWithTemplate = base + templateBlock;

  switch (input.taskType) {
    case "procedure":
      return baseWithTemplate + procedureOutputSpec(hasAnyAnswers);
    case "concept":
      return baseWithTemplate + conceptOutputSpec();
    case "troubleshooting":
      return baseWithTemplate + troubleshootingOutputSpec(hasAnyAnswers);
    case "reference":
      return baseWithTemplate + referenceOutputSpec();
    case "tutorial":
      return baseWithTemplate + tutorialOutputSpec(hasAnyAnswers);
    case "release-notes":
      return baseWithTemplate + releaseNotesOutputSpec();
    case "api-documentation":
      return baseWithTemplate + apiDocumentationOutputSpec();
    default:
      throw new Error("Unsupported task type");
  }
}

function gapCheckBlock(): string {
  return `
STEP 1 — GAP CHECK (mandatory, do this before anything else):

For every action step in the source, check all four of the following:
  □ WHERE  — is the exact UI location or navigation path stated?
  □ WHAT   — is the value, setting, or input required stated?
  □ RESULT — is what the user sees or what happens on success stated?
  □ IF ERROR — is what to do, which log to check, and what the next action stated?

Also check:
  □ Does any step say "something", "it", or "this" without defining what?
  □ Does any "if ok / if error / if successful" branch lack a defined outcome or recovery?
  □ Does "check logs" name a specific log?
  □ Does any verification step state how to verify and what success looks like?
  □ Does any restart/reboot state whether the user must wait before continuing?

IF any of the above are missing:
  → Output ONLY the following block and STOP. Do not output any document sections.

  **Before I can write this document, I need the following information:**
  
  1. [Question] *(Source line: "exact source text")*
  2. [Question] *(Source line: "exact source text")*
  ...

  Do not generate the document. Wait for the user to provide answers.

IF all steps are fully specified (no gaps):
  → Proceed to STEP 2.

`;
}

function procedureOutputSpec(hasAnswers = false): string {
  const gapCheck = hasAnswers ? "" : gapCheckBlock();
  return `
${gapCheck}STEP 2 — GENERATE DOCUMENT:
Rewrite the source content into a user-facing procedure.

PROCEDURE STEP FORMATTING:
- One source sentence = one output step. Do not split or expand it.
- Only include the action. Do not add purpose clauses ("to X"), location phrases ("in the X section"), or result sentences unless the source contains them.
- If the source says "Add new connector." → output "Add new connector." — nothing more.
- Combine action and result ONLY when the source itself states both: "Click Submit. The form is validated."
- If a conditional or error branch ends without a stated next action (e.g. "If error → check logs" with no follow-up), stop at the source's words; do NOT add implied recovery steps, retry instructions, or resolution guidance.

PREREQUISITES SECTION RULES:
- Only list a prerequisite if the source contains a sentence that is itself a prerequisite — not a step, not a note, not an implied dependency.
- Do NOT derive prerequisites from steps. A step that says "Enter server address" is not a prerequisite stating "have the server address ready."
- Do NOT derive prerequisites from notes. "Might need firewall exception" is a Note — not a prerequisite.
- Do NOT infer prerequisites from the steps (e.g. do not add "access to the interface" just because the procedure involves an interface).
- If the source has no explicit prerequisites, omit the Prerequisites section entirely. Write nothing under it — not "None", not "None stated in source."

SECTION SUPPRESSION RULES:
- If a section heading has no source-supported content to put under it, omit it entirely.
- Omitting a section is CORRECT. Filling it with inferred or invented content is a violation.

OUTPUT STRUCTURE:
Prerequisites          ← OMIT if source contains no explicit prior requirements; write nothing, not "None"
Procedure              ← Required
Notes                  ← OMIT if source has no notes, caveats, or asides
Preserved Ambiguities  ← OMIT if nothing was vague or unspecified
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function conceptOutputSpec(): string {
  return `
TASK:
Rewrite the source content into a formal concept explanation.

SECTION SUPPRESSION RULES:
- Omit any section that has no content grounded in the source. Do not fill it with inference.

OUTPUT STRUCTURE:
Overview               ← Required
Key Components         ← OMIT if source names no distinct components
Process Flow           ← OMIT if source describes no flow or sequence
Important Considerations  ← OMIT if source has no caveats or constraints
Preserved Ambiguities  ← OMIT if nothing was vague or unspecified
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function troubleshootingOutputSpec(hasAnswers = false): string {
  const gapCheck = hasAnswers ? "" : gapCheckBlock();
  return `
${gapCheck}STEP 2 — GENERATE DOCUMENT:
Rewrite the source content into a troubleshooting guide.

SECTION SUPPRESSION RULES:
- Omit any section that has no content grounded in the source. Do not fill it with inference.

OUTPUT STRUCTURE:
Symptoms               ← Required if source describes a problem
Possible Causes        ← OMIT if source states no causes
Verification Steps     ← OMIT if source states no diagnostic steps
Resolution             ← OMIT if source states no resolution steps
Prevention             ← OMIT if source states no prevention measures
Preserved Ambiguities  ← OMIT if nothing was vague or unspecified
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function referenceOutputSpec(): string {
  return `
TASK:
Rewrite the source content into a reference document.

SECTION SUPPRESSION RULES:
- Omit any section that has no content grounded in the source. Do not fill it with inference.

OUTPUT STRUCTURE:
Description            ← Required
Parameters / Options   ← OMIT if source lists no parameters or options
Examples               ← OMIT if source provides no examples
Related Information    ← OMIT if source references no related topics
Preserved Ambiguities  ← OMIT if nothing was vague or unspecified
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function tutorialOutputSpec(hasAnswers = false): string {
  const gapCheck = hasAnswers ? "" : gapCheckBlock();
  return `
${gapCheck}STEP 2 — GENERATE DOCUMENT:
Rewrite the source content into a tutorial.

SECTION SUPPRESSION RULES:
- Omit any section that has no content grounded in the source. Do not fill it with inference.

OUTPUT STRUCTURE:
Objective              ← Required
Prerequisites          ← OMIT if source contains no explicit prior requirements
Steps                  ← Required
Verification           ← OMIT if source states no verification or confirmation step
Next Steps             ← OMIT if source mentions no follow-on actions
Preserved Ambiguities  ← OMIT if nothing was vague or unspecified
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function releaseNotesOutputSpec(): string {
  return `
TASK:
Rewrite the source content into release notes.

SECTION SUPPRESSION RULES:
- Omit any section that has no content grounded in the source. Do not fill it with inference.

OUTPUT STRUCTURE:
New Features           ← OMIT if source mentions no new features
Improvements           ← OMIT if source mentions no improvements
Bug Fixes              ← OMIT if source mentions no bug fixes
Breaking Changes       ← OMIT if source mentions no breaking changes
Known Issues           ← OMIT if source mentions no known issues
Preserved Ambiguities  ← OMIT if nothing was vague or unspecified
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function apiDocumentationOutputSpec(): string {
  return `
TASK:
Rewrite the source content into API documentation.

SECTION SUPPRESSION RULES:
- Omit any section that has no content grounded in the source. Do not fill it with inference.

OUTPUT STRUCTURE:
Endpoint / Function    ← Required
Description            ← Required
Request / Parameters   ← OMIT if source lists no parameters
Response / Return Value  ← OMIT if source describes no response
Examples               ← OMIT if source provides no examples
Error Handling         ← OMIT if source describes no error behaviour
Preserved Ambiguities  ← OMIT if nothing was vague or unspecified
Governance Notes       ← OMIT if no governance rules were violated
`;
}
