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
${answers ? `ANSWERS:\n${answers}\n` : ""}${input.styleGuideRules?.trim() ? `STYLE:\n${input.styleGuideRules}\n` : ""}${GOVERNANCE_RULES}

INTENT: ${input.userIntent}
SOURCE:
${input.context}

STRUCTURE:
${sections.map(s => `- ${s}`).join("\n")}
${OUTPUT_SPEC_MAP[input.taskType](sections)}`;
}

function procedureOutputSpec(sections: string[]): string {
  return `
${gapCheckBlock()}
GENERATE: Rewrite source as a procedure.
RULES:
- Overview: "This procedure describes how to [task]." (1 sentence)
- Prerequisites: List required inputs from source.
- Result: 1 sentence summary of outcome.
- Omit empty sections.
- Sections: ${sections.join(", ")}
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
