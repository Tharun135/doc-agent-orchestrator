/**
 * promptGenerator.ts
 *
 * Responsibility: Build the AI generation prompt ONLY.
 *
 * Gap detection has been fully moved to questionDetector.ts (Pass 0).
 * By the time generatePrompt() is called, all questions have been asked
 * and answers are present in input.preClarifications.
 *
 * This file no longer contains:
 *   - generateQuestionsFromSource()   → deleted (replaced by questionDetector.ts)
 *   - gapCheckBlock_inline            → deleted (Pass 0 handles this)
 *   - switch statement for task types → replaced by OUTPUT_SPEC_MAP
 */

import { PromptInput, TaskType } from "./types";
import { GOVERNANCE_RULES } from "./governance";
import { getTemplateFor } from "./templates";

// ─────────────────────────────────────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────────────────────────────────────

export function validatePromptInput(input: PromptInput): void {
  if (!input.context?.trim()) {
    throw new Error("Source content (context) is required.");
  }
  if (!input.userIntent?.trim()) {
    throw new Error("User intent is required.");
  }
  if (!input.taskType) {
    throw new Error("Task type is required.");
  }
  if (!(input.taskType in OUTPUT_SPEC_MAP)) {
    throw new Error(`Unsupported task type: "${input.taskType}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Output spec map  (replaces the switch statement)
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_SPEC_MAP: Record<TaskType, () => string> = {
  "procedure":         procedureOutputSpec,
  "concept":           conceptOutputSpec,
  "troubleshooting":   troubleshootingOutputSpec,
  "reference":         referenceOutputSpec,
  "tutorial":          tutorialOutputSpec,
  "release-notes":     releaseNotesOutputSpec,
  "api-documentation": apiDocumentationOutputSpec,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the AI generation prompt (Pass 1 / Pass N).
 *
 * Pre-condition: all ambiguity questions have already been asked and answered.
 * Answers arrive via input.preClarifications (collected before Pass 1) or
 * input.clarifications (collected after a previous pass).
 *
 * This function does NOT perform gap detection. Call detectQuestions() from
 * questionDetector.ts before calling this.
 */
export function generatePrompt(input: PromptInput): string {
  validatePromptInput(input);

  const hasPreClarifications = !!(input.preClarifications?.trim());
  const hasClarifications    = !!(input.clarifications?.trim());
  const hasAnyAnswers        = hasPreClarifications || hasClarifications;

  // Pre-clarifications are collected BEFORE the first AI call (upfront Q&A in the extension).
  // ── Pass header (resolution pass only) ──────────────────────────────────
  const passHeader = (input.pass && input.pass > 1)
    ? `GENERATION PASS: ${input.pass}
This is a resolution pass. Preserved ambiguities from the previous pass have
now been answered in the CLARIFICATIONS block below. Incorporate each answer
as a factual statement and remove the corresponding item from
"Preserved Ambiguities". Do not add invented content.
`
    : "";

  // ── Clarification blocks ─────────────────────────────────────────────────
  const preClarificationsSection = hasPreClarifications
    ? `PRE-CLARIFICATIONS (collected before generation — authoritative, use directly):
${input.preClarifications}
`
    : "";

  const clarificationsSection = hasClarifications
    ? `CLARIFICATIONS (collected after previous pass — authoritative):
${input.clarifications}
`
    : "";

  const clarificationsBlock = hasAnyAnswers
    ? `CLARIFICATIONS PROVIDED — treat these as authoritative facts. You MUST use
these answers when writing each affected step. A step whose gap has been answered
must NOT remain vague or appear in Preserved Ambiguities:
${preClarificationsSection}${clarificationsSection}
CLARIFICATION RESOLUTION RULES — MANDATORY, apply to every answer above:
1. Locate the source step each answer resolves and rewrite it as complete, fluent prose.
2. NEVER leave a step in its original vague form once its answer is known.
3. NEVER treat a short or single-word answer as insufficient — a bare value like
   "green indicator", "port 4840", or "Settings > Advanced" is authoritative and
   MUST be woven into the affected step as a specific detail.
4. Remove the corresponding item from Preserved Ambiguities — do not list it.
5. Do not repeat the clarification as a standalone note unless it is a warning
   or condition from the source that belongs under Notes.
6. If an answer resolves a location gap, rewrite the navigation path into every
   affected step — do not leave any step locationless when the answer provides it.
`
    : "";

  // ── Template ─────────────────────────────────────────────────────────────
  const template = getTemplateFor(input.taskType);
  const templateContent = input.templateContent?.trim()
    ? input.templateContent
    : template.content;
  const requiredSections = template.requiredSections;

  const templateBlock = `
OUTPUT STRUCTURE — Use exactly these headings in this order.
Do not add or remove sections. Omit any section that has no source-grounded content.

${requiredSections.map(s => `- ${s}`).join("\n")}

TEMPLATE EXAMPLE:
${templateContent}
`;

  // ── Core prompt ──────────────────────────────────────────────────────────
  const prompt = `SYSTEM:
You are a Technical Documentation Agent.
${passHeader}
DOCUMENTATION RESPONSIBILITY:
- You are responsible for generating all documentation structure sections:
  Overview, Prerequisites, Procedure, Result, Notes.
- These sections must NEVER be requested from the user.
- The user provides only product-specific facts (UI paths, values, status indicators).
- Generate the complete structure automatically from the source and clarifications.
- The template may contain placeholder text such as "Explain what the procedure does.",
  "List conditions required before starting.", or "Step-by-step instructions." — these
  are structural hints only. Replace every placeholder entirely with generated content.
  Never copy placeholder text into the output.

GENERATION APPROACH — work through these stages internally before writing output:
Stage 1 — Analyze: identify the core task, the action sequence, system behaviors,
  and any optional or conditional steps present in the source.
Stage 2 — Structure: generate every section from the template automatically.
  Never ask the user for section content. Never leave a required section empty
  unless there is genuinely no source-grounded content for it.
Stage 3 — Refine: convert informal notes into numbered, actionable steps.
  Incorporate all clarification answers. Apply the soft-ambiguity policy below.

SOFT AMBIGUITY POLICY:
- When the source contains hedging language ("maybe", "if needed", "or whatever",
  "etc.", "and so on"), do NOT leave a gap — rewrite with appropriate conditional prose.
- Example: "configure timeout or whatever" → "Configure connection settings such as
  Polling Interval, Retry Count, or Connection Timeout as required."
- Preserve the optional or conditional nature of the step in the output phrasing.
- Do NOT generate user questions for soft-ambiguity language — rewrite it directly.

REWRITE POLICY:
- Ground every step in a source sentence — do not invent content with no source basis.
- When pre-clarification or clarification answers are provided, you MUST use them to
  expand the affected steps into fluent, complete, user-facing prose. Do NOT leave a
  step in its vague source form when an answer already clarifies it.
- When incorporating an answer, integrate it naturally into the sentence rather
  than appending it in parentheses.
- Prefer active, specific language: "the service starts automatically" over
  "service starts"; "green status indicator" over a bare colour if the answer
  implies a UI element.
- Articles ("the", "a"), conjunctions, and light connective phrases are permitted
  where they improve readability.
- Step transformation pattern:
    Source:  "If successful, service starts."
    Answer:  "green indicator"
    Output:  "If the validation is successful, indicated by a green status
              indicator, the service starts automatically."
- If a section has no source-grounded content, omit it entirely — write nothing under it.

${clarificationsBlock}
${GOVERNANCE_RULES}

GOVERNANCE ENFORCEMENT:
- If you would need to invent something to complete a step, omit it and flag it under Preserved Ambiguities.
- If you catch yourself adding a clause not in the source, delete it.

PRESERVED AMBIGUITIES:
- When source content is vague but does NOT block the user from acting, document it
  as-is and list it under Preserved Ambiguities.
- If a gap blocks action, it should already have been asked before this call.
  If you still encounter a blocking gap, list it under Preserved Ambiguities
  and do NOT invent a value.

USER INTENT:
${input.userIntent}

SOURCE CONTENT (authoritative):
${input.context}
${templateBlock}
${OUTPUT_SPEC_MAP[input.taskType]()}`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared gap-check block  (one canonical version, used by specs that need it)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the gap-check instruction block.
 * Only injected into specs for task types where action steps are present
 * (procedure, troubleshooting, tutorial). Not needed for concept/reference/
 * release-notes/api-documentation because Pass 0 already handled all gaps.
 *
 * This block is a last-resort safety net for gaps that slipped through
 * questionDetector.ts. It should rarely trigger in practice.
 */
function gapCheckBlock(): string {
  return `
SAFETY CHECK (last resort — Pass 0 should have caught these):
If you encounter a step where any of the following are still unknown, do NOT
invent a value. List it under Preserved Ambiguities and continue.

  □ WHERE  — exact UI location or navigation path
  □ HOW    — specific value, input, or action required
  □ RESULT — what the system shows or does on success
  □ ON ERROR — which log, what to look for, what the next action is

Do not stop generation for these — list them and continue.
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-task output specs
// ─────────────────────────────────────────────────────────────────────────────

function procedureOutputSpec(): string {
  return `
${gapCheckBlock()}
GENERATE: Rewrite the source into a user-facing procedure.

STRUCTURAL INFERENCE RULES (procedure documents only):
These rules expand what you may write beyond strict verbatim traceability.
They apply only to structural sections (Overview, Prerequisites, Result, Notes).
They do NOT permit inventing steps, parameters, or system behaviour.

  Overview:
  - Write one sentence as the first line of the Overview section.
  - If the source has a title that describes a task ("Set Up X", "Configure X",
    "Create X"), write: "This procedure describes how to [verb phrase from title]."
  - Derive the verb phrase from the source title only. Do NOT use the USER INTENT field.
  - Example: source title "Set Up an OPC UA Connector" →
    "This procedure describes how to set up an OPC UA connector."
  - If no source title is present, fall back to the USER INTENT field.
  - One sentence only. Do not add purpose clauses.

  Prerequisites:
  - You MAY list prerequisites derived from required inputs implied by steps.
  - Only derive a prerequisite when a step requires the user to supply a concrete
    input (e.g. "Enter server address", "Configure authentication").
  - Write the prerequisite as: "[Input noun from source] is available."
    Example: "Enter server address." → "The OPC UA server address is available."
    Example: "Configure authentication." + clarification "user name and password"
             → "Valid user name and password are available."
  - Do NOT introduce nouns not present in the source or clarifications.
  - Do NOT add system access, environment, or permission prerequisites.
  - If no steps imply concrete required inputs, omit Prerequisites entirely.

  Result:
  - If the last 1–2 steps indicate an enabled, confirmed, or verified final state,
    write one sentence summarising the outcome.
  - The sentence must restate what the final steps establish — nothing more.
    Example: last steps "Enable the connector." + "Confirm data is flowing." →
             "The connector is enabled and data is flowing."
  - Prefer describing the final state over restating the last step's wording.
    Good:  "The connector is active and data is flowing."
    Avoid: "The user confirms data is flowing."
  - Do NOT introduce system components, integrations, or purpose clauses not in source.
  - If the final steps do not clearly indicate a definable outcome, omit Result.

  Notes:
  - Conditional or warning sentences from the source ("if", "may require",
    "might require", "warning:") must be placed under Notes.
  - Preserve the conditional word from the source ("might", "may", "if").

STRUCTURAL INFERENCE RESTRICTIONS — even when inference is permitted:
  - Do not invent new configuration parameters or field names.
  - Do not add steps not present in the source.
  - Do not introduce system components not mentioned in the source or clarifications.
  - Do not add technical explanations beyond what the steps directly imply.
  - Do not introduce new nouns that do not appear in the source or clarifications.
  - Structural sections may summarise the source; they must not extend system behaviour.

STEP FORMATTING RULES:
- Ground every step in a source sentence — do not invent content with no source basis.
- You MAY expand a step using answer text to produce fluent, readable prose.
- When incorporating an answer, integrate it naturally into the sentence.
- If a conditional or error branch ends without a stated next action, stop at
  the source's words. Do NOT add implied recovery steps.

STEP EXPANSION FROM ANSWERS:
- When an answer to a clarification question is prefixed "This answer contains multiple
  sequential actions", each listed sub-step becomes its own numbered step in the procedure.
- Do NOT collapse them back into one step.
- Do NOT add connecting words like "and then" between them.

NOTE FORMATTING RULE:
- When a Note combines a source condition ("Admin may need to...") with an answer that
  provides a navigation path, collapse them into one fluent sentence:
    Correct:   "If required, configure advanced settings in Settings > Advanced Settings
               on the Connector page."
    Incorrect: "Admin may need to configure advanced settings. The Advanced Settings
               option is available in the Settings page inside the Connector page."
- Format navigation paths using > notation: "Settings > Advanced Settings"
  not "the settings page inside the connector page".
- The conditional word from the source ("may", "if required") must be preserved.

SECTION SUPPRESSION:
- If a section has no source-grounded or inferrable content by the rules above,
  omit it entirely.
- Omitting is correct. Filling with ungrounded invented content is a violation.

SECTIONS:
Overview               ← Required (intro sentence as first line)
Prerequisites          ← OMIT if no steps imply concrete required inputs
Procedure              ← Required
Notes                  ← OMIT if source has no conditional or warning sentences
Result                 ← OMIT if final steps do not indicate a clear outcome
Preserved Ambiguities  ← OMIT only if nothing could be resolved by a follow-up answer
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function conceptOutputSpec(): string {
  return `
GENERATE: Rewrite the source into a formal concept explanation.

INTRO SENTENCE:
- Write one sentence as the very first line of the Overview section, in the form:
  "This article [describes | provides an overview of] [topic]."
- Derive [topic] from the source title or opening line first. If no source title is present, fall back to the USER INTENT field.
- Example: source title "IIH Semantics overview:" → "This article provides an overview of IIH Semantics."
- One sentence only. Never two. Do not repeat the document title.

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Overview                  ← Required — intro sentence as its first line
Key Components            ← OMIT if source names no distinct components
How It Works              ← OMIT if source describes no flow or sequence
Important Considerations  ← OMIT if source has no caveats or constraints
Preserved Ambiguities     ← OMIT if nothing was vague or unresolved
Governance Notes          ← OMIT if no governance rules were violated
`;
}

function troubleshootingOutputSpec(): string {
  return `
${gapCheckBlock()}
GENERATE: Rewrite the source into a troubleshooting guide.

INTRO SENTENCE:
- Write one sentence as the very first line of the Symptoms section, in the form:
  "Use this guide to diagnose and resolve [problem]."
- Derive [problem] from the source title or opening line first. If no source title is present, fall back to the USER INTENT field or the first symptom.
- Example: source title "Connector failure troubleshooting:" → "Use this guide to diagnose and resolve connector failures."
- One sentence only. Never two.

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Symptoms               ← Required — intro sentence as its first line
Possible Causes        ← OMIT if source states no causes
Verification Steps     ← OMIT if source states no diagnostic steps
Resolution             ← OMIT if source states no resolution steps
Prevention             ← OMIT if source states no prevention measures
Preserved Ambiguities  ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function referenceOutputSpec(): string {
  return `
GENERATE: Rewrite the source into a reference document.

INTRO SENTENCE:
- Write one sentence as the very first line of the Description section, in the form:
  "This reference describes [subject]."
- Derive [subject] from the source title or opening line first. If no source title is present, fall back to the USER INTENT field.
- Example: source title "Connector API parameters:" → "This reference describes the connector API parameters."
- One sentence only. Never two.

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Description            ← Required — intro sentence as its first line
Parameters / Options   ← OMIT if source lists no parameters or options
Example                ← OMIT if source provides no examples
Related Information    ← OMIT if source references no related topics
Preserved Ambiguities  ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function tutorialOutputSpec(): string {
  return `
${gapCheckBlock()}
GENERATE: Rewrite the source into a tutorial.

INTRO SENTENCE:
- Write one sentence as the very first line of the Objective section, in the form:
  "This tutorial guides you through [task]."
- Derive [task] from the source title or opening line first. If no source title is present, fall back to the USER INTENT field.
- Example: source title "Setting up a PLC connector:" → "This tutorial guides you through setting up a PLC connector."
- One sentence only. Never two.

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Objective              ← Required — intro sentence as its first line
Prerequisites          ← OMIT if source has no explicit prerequisites
Steps                  ← Required
Verification           ← OMIT if source states no verification step
Next Steps             ← OMIT if source mentions no follow-on actions
Preserved Ambiguities  ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function releaseNotesOutputSpec(): string {
  return `
GENERATE: Rewrite the source into release notes.

INTRO SENTENCE:
- Write one sentence as a standalone line BEFORE the first section heading
  (before New Features, Bug Fixes, etc.), in the form:
  "This document summarises the changes introduced in [version or scope]."
- Derive [version or scope] from the source title or opening line first. If no source title is present, fall back to the USER INTENT field.
- Example: source title "Release 2.4 changes:" → "This document summarises the changes introduced in version 2.4."
- One sentence only. Never two. It stands alone — it is not inside any section.

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
[intro sentence — standalone, before all section headings]
New Features           ← OMIT if source mentions no new features
Improvements           ← OMIT if source mentions no improvements
Bug Fixes              ← OMIT if source mentions no bug fixes
Breaking Changes       ← OMIT if source mentions no breaking changes
Known Issues           ← OMIT if source mentions no known issues
Preserved Ambiguities  ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function apiDocumentationOutputSpec(): string {
  return `
GENERATE: Rewrite the source into API documentation.

INTRO SENTENCE:
- Write one sentence as the very first line of the Description section, in the form:
  "This reference describes the [endpoint or function name]."
- Derive the name from the source title or opening line first. If no source title is present, fall back to the USER INTENT field.
- Example: source title "/deploy endpoint reference:" → "This reference describes the /deploy endpoint."
- One sentence only. Never two.

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Endpoint / Function      ← Required
Description              ← Required — intro sentence as its first line
Request / Parameters     ← OMIT if source lists no parameters
Response / Return Value  ← OMIT if source describes no response
Examples                 ← OMIT if source provides no examples
Error Handling           ← OMIT if source describes no error behaviour
Preserved Ambiguities    ← OMIT if nothing was vague or unresolved
Governance Notes         ← OMIT if no governance rules were violated
`;
}
