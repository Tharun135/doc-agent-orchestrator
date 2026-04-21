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
  const pass = (input.pass && input.pass > 1) ? ` (Revision Pass ${input.pass})` : "";
  const answers = (input.preClarifications?.trim() || "") + (input.clarifications?.trim() || "");
  const template = getTemplateFor(input.taskType);
  const sections = input.templateContent?.trim() ? extractHeadingsFromMarkdown(input.templateContent) : template.requiredSections;

  return `Technical Writer Mode.${pass}

TASK: Write a ${input.taskType} document.
INTENT: ${input.userIntent}
SOURCE: """
${input.context}
"""
${answers ? `ANSWERS: """\n${answers}\n"""` : ""}

RULES:
${input.governanceProfileId === "fast_draft" ? LIGHT_GOVERNANCE_RULES : GOVERNANCE_RULES}${input.styleGuideRules?.trim() ? `- STYLE: ${input.styleGuideRules}\n` : ""}- ${OUTPUT_SPEC_MAP[input.taskType](input.governanceProfileId)}

OUTPUT STRUCTURE:
${sections.map(s => `- ${s}`).join("\n")}
- Known Gaps`;
}

function procedureOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "Format as a draft procedure.";
  return "Strict procedure. Include 1-sentence overview, prerequisites, and result summary.";
}

function conceptOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "Format as a concept draft.";
  return "Detailed concept. Explain 'what' and 'why' based only on source.";
}

function troubleshootingOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "Format as troubleshooting draft.";
  return "Troubleshooting guide. Direct mapping of symptoms to resolutions.";
}

function referenceOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "Format as reference draft.";
  return "Technical reference. Document parameters and types accurately.";
}

function tutorialOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "Format as tutorial draft.";
  return "Learning tutorial. Guide the user through the task step-by-step.";
}

function releaseNotesOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "Format as release notes draft.";
  return "Release notes. Group changes by category (Features, Fixes, etc.).";
}

function apiDocumentationOutputSpec(profileId?: string): string {
  if (profileId === "fast_draft") return "Format as API doc draft.";
  return "Technical API reference. Focus on endpoints, methods, and schemas.";
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
