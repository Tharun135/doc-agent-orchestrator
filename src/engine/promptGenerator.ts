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
  if (profileId === "fast_draft") return "GENERATE: Concept draft.";
  return `GENERATE: Rewrite as concept. Intro: "This article describes [topic]."`;
}

function troubleshootingOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "GENERATE: Troubleshooting draft.";
  return `${gapCheckBlock(profileId)}\nGENERATE: Rewrite as troubleshooting. Intro: "Use this guide to diagnose and resolve [problem]."`;
}

function referenceOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "GENERATE: Reference draft.";
  return `GENERATE: Rewrite as reference. Intro: "This reference describes [subject]."`;
}

function tutorialOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "GENERATE: Tutorial draft.";
  return `${gapCheckBlock(profileId)}\nGENERATE: Rewrite as tutorial. Intro: "This tutorial guides you through [task]."`;
}

function releaseNotesOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "GENERATE: Release notes draft.";
  return `GENERATE: Rewrite as release notes. Intro: "This document summarises the changes in [version]."`;
}

function apiDocumentationOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "GENERATE: API doc draft.";
  return `GENERATE: Rewrite as API documentation. Intro: "This reference describes the [endpoint/function]."`;
}

function gapCheckBlock(profileId?: string): string {
  if (profileId === "fast_draft") return "";
  return `Safety check: No inventions for WHERE, HOW, RESULT, ON ERROR. List in Known Gaps.`;
}

function extractHeadingsFromMarkdown(markdown: string): string[] {
  const headings: string[] = [];
  const matches = markdown.matchAll(/^#{1,6}\s+(.+)$/gm);
  for (const match of matches) {
    const h = match[1].trim().replace(/[\[\]]/g, '').replace(/:$/, '');
    if (h && !headings.includes(h)) headings.push(h);
  }
  return headings;
}
