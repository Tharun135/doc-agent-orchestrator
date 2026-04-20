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
import { GOVERNANCE_RULES, LIGHT_GOVERNANCE_RULES } from "./governance";
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

const OUTPUT_SPEC_MAP: Record<TaskType, (profileId?: string) => string> = {
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
  const passHeader = (input.pass && input.pass > 1) ? `RESOLUTION PASS: ${input.pass}\n` : "";
  const answers = (input.preClarifications?.trim() || "") + (input.clarifications?.trim() || "");
  const template = getTemplateFor(input.taskType);
  const sections = input.templateContent?.trim() ? extractHeadingsFromMarkdown(input.templateContent) : template.requiredSections;

  return `SYSTEM: Technical Documentation Agent.
${passHeader}
APPROACH:
1. Ground in SOURCE/ANSWERS; do not invent.
2. Omit sections with no grounded content.
3. List gaps in "Known Gaps".
${answers ? `ANSWERS:\n${answers}\n` : ""}${input.styleGuideRules?.trim() ? `STYLE:\n${input.styleGuideRules}\n` : ""}${input.governanceProfileId === "fast_draft" ? LIGHT_GOVERNANCE_RULES : GOVERNANCE_RULES}

INTENT: ${input.userIntent}
SOURCE:
${input.context}

STRUCTURE:
${sections.map(s => `- ${s}`).join("\n")}
${OUTPUT_SPEC_MAP[input.taskType](input.governanceProfileId)}`;
}

function procedureOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "GENERATE: User-facing procedure draft.";
  return `
${gapCheckBlock(profileId)}
GENERATE: Rewrite source as a procedure.
RULES:
- Overview: "This procedure describes how to [task]." (1 sentence)
- Prerequisites: List required inputs from source.
- Result: 1 sentence summary of outcome.
- Omit empty sections.
`;
}

function conceptOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") {
    return "GENERATE: Rewrite the source into a formal concept explanation. Focus on clarity and flow.";
  }
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
Known Gaps                ← OMIT if nothing was vague or unresolved
Governance Notes          ← OMIT if no governance rules were violated
`;
}

function troubleshootingOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") {
    return "GENERATE: Rewrite the source into a troubleshooting guide. List Symptoms, Causes, and Resolutions clearly.";
  }
  return `
${gapCheckBlock(profileId)}
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
Known Gaps             ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function referenceOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") {
    return "GENERATE: Rewrite the source into a reference document. Group parameters and options logically.";
  }
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
Known Gaps             ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function tutorialOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") {
    return "GENERATE: Rewrite the source into a tutorial. Provide a logical learning path.";
  }
  return `
${gapCheckBlock(profileId)}
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
Known Gaps             ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function releaseNotesOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") {
    return "GENERATE: Rewrite the source into release notes. Summarise key changes by category.";
  }
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
Known Gaps             ← OMIT if nothing was vague or unresolved
Governance Notes       ← OMIT if no governance rules were violated
`;
}

function apiDocumentationOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") {
    return "GENERATE: Rewrite the source into API documentation. Clearly define endpoints, parameters, and responses.";
  }
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
Known Gaps               ← OMIT if nothing was vague or unresolved
Governance Notes         ← OMIT if no governance rules were violated
`;
}
