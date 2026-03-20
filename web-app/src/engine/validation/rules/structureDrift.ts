import {
  ValidationRule,
  RuleViolation,
  NormalizedDocument,
  GovernanceProfile,
} from "../types";

// ---------------------------------------------------------------------------
// Rule: STRUCTURE_DRIFT
// ---------------------------------------------------------------------------
// Validates the structural integrity of procedural content.
// Checks:
//   1. Step count drift — AI added or removed steps beyond the allowed drift
//   2. New conditional logic — AI injected "if/when/unless" into steps that
//      were unconditional in the source
//   3. Step reordering — steps whose index in the AI output differs from
//      the source order by more than 1 position
// ---------------------------------------------------------------------------

export const structureDrift: ValidationRule = {
  id: "STRUCTURE_DRIFT",
  category: "structure",

  evaluate(
    source: NormalizedDocument,
    ai: NormalizedDocument,
    profile: GovernanceProfile
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // Only meaningful when both documents actually have steps
    if (source.stepStructure.length === 0 && ai.stepStructure.length === 0) {
      return [];
    }

    const srcSteps = source.stepStructure;
    const aiSteps = ai.stepStructure;

    // -----------------------------------------------------------------------
    // 1. Step count drift
    // -----------------------------------------------------------------------
    const drift = Math.abs(aiSteps.length - srcSteps.length);
    if (drift > profile.allowStepDrift) {
      const direction = aiSteps.length > srcSteps.length ? "added" : "removed";
      violations.push({
        ruleId: this.id,
        category: this.category,
        severity: profile.allowStepDrift === 0 ? "error" : "warning",
        message:
          `Step count changed from ${srcSteps.length} to ${aiSteps.length} ` +
          `(${direction} ${drift - profile.allowStepDrift} step(s) beyond allowed drift of ${profile.allowStepDrift}).`,
        location: {},
        confidence: 1.0,
      });
    }

    // -----------------------------------------------------------------------
    // 2. New conditional logic injected into steps
    // -----------------------------------------------------------------------
    // Build a set of which source step indices were already conditional
    const srcConditionalIndices = new Set(
      srcSteps.filter((s) => s.isConditional).map((s) => s.index)
    );

    for (const aiStep of aiSteps) {
      if (aiStep.isConditional && !srcConditionalIndices.has(aiStep.index)) {
        violations.push({
          ruleId: this.id,
          category: this.category,
          severity: "warning",
          message:
            `Step ${aiStep.index} introduces conditional logic ("if/when/unless") ` +
            `not present in the source. May imply an invented precondition.`,
          location: {
            offendingPhrase: aiStep.text.slice(0, 80),
            contextSnippet: aiStep.text,
          },
          confidence: 0.80,
        });
      }
    }

    // -----------------------------------------------------------------------
    // 3. Step reordering (compare by content similarity at each index)
    // -----------------------------------------------------------------------
    // We use the first 6 tokens of each step as a fingerprint.
    const fingerprint = (text: string): string =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .slice(0, 6)
        .join(" ");

    const sourceFingerprints: Map<string, number> = new Map(
      srcSteps.map((s) => [fingerprint(s.text), s.index])
    );

    for (const aiStep of aiSteps) {
      const fp = fingerprint(aiStep.text);
      const srcIndex = sourceFingerprints.get(fp);
      if (srcIndex !== undefined && Math.abs(srcIndex - aiStep.index) > 1) {
        violations.push({
          ruleId: this.id,
          category: this.category,
          severity: "info",
          message:
            `Step "${aiStep.text.slice(0, 50)}…" appears to have moved ` +
            `from position ${srcIndex} to ${aiStep.index}.`,
          location: {
            offendingPhrase: aiStep.text.slice(0, 60),
          },
          confidence: 0.75,
        });
      }
    }

    return violations;
  },
};
