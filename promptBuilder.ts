/**
 * promptBuilder.ts
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
 *   - duplicate gapCheckBlock()       → consolidated into one private helper
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

  const hasPreClarifications = !!input.preClarifications?.trim();
  const hasClarifications    = !!input.clarifications?.trim();
  const hasAnyAnswers        = hasPreClarifications || hasClarifications;

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
    ? `CLARIFICATIONS PROVIDED — treat these as ground truth:
${preClarificationsSection}${clarificationsSection}`
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
REWRITE POLICY:
- Use only words, concepts, and steps that exist in the source or the answers below.
- One source sentence = one output step. Do not split, expand, or add purpose clauses.
- Shorter and faithful is better than longer and invented.
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

STEP FORMATTING RULES:
- One source sentence = one output step. Do not split or expand it.
- Only include the action. Do not add purpose clauses ("to X"), location phrases
  ("in the X section"), or result sentences unless the source contains them.
- If the source says "Add new connector." → output "Add new connector." — nothing more.
- Combine action and result ONLY when the source itself states both.
- If a conditional or error branch ends without a stated next action, stop at
  the source's words. Do NOT add implied recovery steps.

PREREQUISITES RULES:
- Only list a prerequisite if the source contains a sentence that is itself
  a prerequisite — not a step, not a note, not an implied dependency.
- Do NOT derive prerequisites from steps or notes.
- If the source has no explicit prerequisites, omit Prerequisites entirely.

SECTION SUPPRESSION:
- If a section has no source-grounded content, omit it entirely.
- Omitting is correct. Filling with inferred content is a violation.

SECTIONS:
Prerequisites          ← OMIT if source has no explicit prerequisites
Overview               ← Required
Procedure              ← Required
Notes                  ← OMIT if source has no notes or caveats
Result                 ← OMIT if source states no result
Preserved Ambiguities  ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function conceptOutputSpec(): string {
  return `
GENERATE: Rewrite the source into a formal concept explanation.

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Overview                  ← Required
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

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Symptoms               ← Required if source describes a problem
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

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Description            ← Required
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

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Objective              ← Required
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

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
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

SECTION SUPPRESSION:
- Omit any section that has no content grounded in the source.

SECTIONS:
Endpoint / Function      ← Required
Description              ← Required
Request / Parameters     ← OMIT if source lists no parameters
Response / Return Value  ← OMIT if source describes no response
Examples                 ← OMIT if source provides no examples
Error Handling           ← OMIT if source describes no error behaviour
Preserved Ambiguities    ← OMIT if nothing was vague or unresolved
Governance Notes         ← OMIT if no governance rules were violated
`;
}
