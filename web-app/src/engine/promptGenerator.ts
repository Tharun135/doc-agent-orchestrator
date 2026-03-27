/**
 * promptGenerator.ts
 *
 * Responsibility: Build the AI generation prompt ONLY.
 *
 * Gap detection has been fully moved to questionDetector.ts (Pass 0).
 * By the time generatePrompt() is called, all questions have been asked
 * and answers are present in input.preClarifications.
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Output spec map
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_SPEC_MAP: Record<TaskType, (sections: string[]) => string> = {
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

export function generatePrompt(input: PromptInput): string {
  validatePromptInput(input);

  const hasPreClarifications = !!(input.preClarifications?.trim());
  const hasClarifications    = !!(input.clarifications?.trim());
  const hasAnyAnswers        = hasPreClarifications || hasClarifications;

  const passHeader = (input.pass && input.pass > 1)
    ? `GENERATION PASS: ${input.pass}
This is a resolution pass. Preserved ambiguities from the previous pass have
now been answered in the CLARIFICATIONS block below. Incorporate each answer
as a factual statement and remove the corresponding item from
"Known Gaps". Do not add invented content.
`
    : "";

  const clarificationsBlock = hasAnyAnswers
    ? `Clarifications provided — treat these as authoritative facts. You MUST use
these answers when writing each affected step. A step whose gap has been answered
must NOT remain vague or appear in Preserved ambiguities:
${input.preClarifications ? `Pre-clarifications:\n${input.preClarifications}\n` : ""}${input.clarifications ? `Clarifications:\n${input.clarifications}\n` : ""}
`
    : "";

  // ── Template logic ───────────────────────────────────────────────────────
  const template = getTemplateFor(input.taskType);
  const isOverride = !!(input.templateContent?.trim());
  const templateContent = isOverride
    ? input.templateContent!
    : template.content;

  const requiredSections = isOverride
    ? extractHeadingsFromMarkdown(templateContent)
    : template.requiredSections;

  const templateBlock = `
Output structure — MANDATORY:
You MUST use exactly these headings in this order.
Do not add or remove headings.
If a heading appears here, you MUST include it in the output (unless OMIT rules below apply).

${requiredSections.map((s: string) => `- ${s}`).join("\n")}

Template formatting example:
${templateContent}
`;

  const styleGuideBlock = input.styleGuideRules?.trim()
    ? `Custom style guide rules — MANDATORY:
${input.styleGuideRules}
`
    : "";

  // ── Final Prompt Assembly ───────────────────────────────────────────────
  const prompt = `SYSTEM:
You are a Technical Documentation Agent.
${passHeader}
Documentation responsibility:
- Generate the complete structure automatically from the source and clarifications.
- Replace placeholders like "[Task title]" or "Explain what the procedure does" with real content.

${clarificationsBlock}
${styleGuideBlock}
${GOVERNANCE_RULES}

USER INTENT:
${input.userIntent}

SOURCE CONTENT (authoritative):
${input.context}

${templateBlock}

${OUTPUT_SPEC_MAP[input.taskType](requiredSections)}`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function gapCheckBlock(): string {
  return `
Safety check (last resort):
If you encounter a step where WHERE, HOW, RESULT, or ON ERROR are still unknown,
do NOT invent a value. List it under Known gaps and continue.
`;
}

function formatSectionsList(sections: string[]): string {
  return "SECTIONS (in required order):\n" + sections.map(s => {
    if (s.toLowerCase() === "overview") return `${s} ← Required (one sentence intro)`;
    if (s.toLowerCase() === "procedure") return `${s} ← Required`;
    if (s.toLowerCase() === "steps") return `${s} ← Required`;
    if (s.toLowerCase() === "result") return `${s} ← OMIT if no final state is indicated`;
    if (s.toLowerCase() === "notes") return `${s} ← OMIT if no warnings/conditions in source`;
    return `${s} ← OMIT if no source-grounded content`;
  }).join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Output Specs (Refactored to be dynamic)
// ─────────────────────────────────────────────────────────────────────────────

function procedureOutputSpec(sections: string[]): string {
  return `
${gapCheckBlock()}
GENERATE: Rewrite the source into a user-facing procedure.

STRUCTURAL RULES:
1. Every section must use the exact heading name from the list below.
2. If a heading like "Overview" exists in the required list, you MUST provide it as a heading (e.g., "### Overview"), followed by its content.
3. The intro sentence must be the first line of the "Overview" section.

Overview content logic:
- Write: "This procedure describes how to [task]."
- Derive [task] from the source title or user intent.
- One sentence only.

${formatSectionsList(sections)}
Known Gaps ← Required if any gaps exist
Governance Notes ← Required if any violations occur
`;
}

function conceptOutputSpec(sections: string[]): string {
  return `
GENERATE: Rewrite the source into a formal concept explanation.
Intro: "This article provides an overview of [topic]."
${formatSectionsList(sections)}
Known Gaps ← Required if any gaps exist
Governance Notes ← Required if any violations occur
`;
}

function troubleshootingOutputSpec(sections: string[]): string {
  return `
${gapCheckBlock()}
GENERATE: Rewrite the source into a troubleshooting guide.
Intro: "Use this guide to diagnose and resolve [problem]."
${formatSectionsList(sections)}
`;
}

function referenceOutputSpec(sections: string[]): string {
  return `
GENERATE: Rewrite the source into a reference document.
Intro: "This reference describes [subject]."
${formatSectionsList(sections)}
Known Gaps ← Required if any gaps exist
Governance Notes ← Required if any violations occur
`;
}

function tutorialOutputSpec(sections: string[]): string {
  return `
${gapCheckBlock()}
GENERATE: Rewrite the source into a tutorial.
Intro: "This tutorial guides you through [task]."
${formatSectionsList(sections)}
`;
}

function releaseNotesOutputSpec(sections: string[]): string {
  return `
GENERATE: Rewrite the source into release notes.
Intro: "This document summarises the changes introduced in [version]."
${formatSectionsList(sections)}
Known Gaps ← Required if any gaps exist
Governance Notes ← Required if any violations occur
`;
}

function apiDocumentationOutputSpec(sections: string[]): string {
  return `
GENERATE: Rewrite the source into API documentation.
Intro: "This reference describes the [endpoint/function]."
${formatSectionsList(sections)}
Known Gaps ← Required if any gaps exist
Governance Notes ← Required if any violations occur
`;
}

function extractHeadingsFromMarkdown(markdown: string): string[] {
  const lineRegex = /^#{1,6}\s+(.+)$/gm;
  const headings: string[] = [];
  let match;
  while ((match = lineRegex.exec(markdown)) !== null) {
    const cleanHeading = match[1].trim().replace(/[\[\]]/g, '').replace(/:$/, '');
    if (cleanHeading && !headings.includes(cleanHeading)) {
      headings.push(cleanHeading);
    }
  }
  return headings;
}
