import {
  ValidationRule,
  RuleViolation,
  NormalizedDocument,
  GovernanceProfile,
} from "../types";

// ---------------------------------------------------------------------------
// Rule: TERM_SUBSTITUTION
// ---------------------------------------------------------------------------
// Enforces terminology lock.  If the source establishes a capitalized entity
// (product name, feature name, service name) or a specific UI label, that
// exact string must appear in the AI output.
// Missing → deleted or silently renamed.
//
// Confidence rationale:
//   - UI labels:            1.0 — button/field text must be verbatim.
//   - Capitalized entities: 0.90 — high signal; product names rarely change.
// ---------------------------------------------------------------------------

/** Minimum meaningful entity length — filters out lone "A", "I", "My", etc. */
const MIN_ENTITY_LENGTH = 3;

/**
 * Returns true when two strings are "suspiciously similar" — same first word,
 * same length class — which suggests synonym drift rather than full deletion.
 */
function looksLikeSubstitution(missing: string, ai: Set<string>): string | null {
  const missingFirst = missing.split(/\s+/)[0].toLowerCase();
  for (const candidate of ai) {
    if (candidate === missing) { continue; }
    const candFirst = candidate.split(/\s+/)[0].toLowerCase();
    if (
      candFirst === missingFirst &&                 // Same lead word
      Math.abs(candidate.length - missing.length) < 10  // Similar length
    ) {
      return candidate;
    }
  }
  return null;
}

export const termSubstitution: ValidationRule = {
  id: "TERM_SUBSTITUTION",
  category: "terminology",

  evaluate(
    source: NormalizedDocument,
    ai: NormalizedDocument,
    profile: GovernanceProfile
  ): RuleViolation[] {
    if (!profile.requireTerminologyLock) {
      return [];
    }

    const violations: RuleViolation[] = [];

    // -----------------------------------------------------------------------
    // 1. UI Labels — verbatim match required
    // -----------------------------------------------------------------------
    for (const label of source.uiLabels) {
      if (label.length < 2) { continue; }
      if (ai.uiLabels.has(label)) { continue; }

      // Soft check: is the label's text still present (just without delimiters)?
      const rawPresent = ai.rawText.includes(label);

      violations.push({
        ruleId: this.id,
        category: this.category,
        severity: rawPresent ? "warning" : "error",
        message: rawPresent
          ? `UI label "${label}" exists in output but lost its formatting delimiters.`
          : `UI label "${label}" was removed or renamed. UI text must be preserved exactly.`,
        location: { offendingPhrase: label },
        confidence: 1.0,
      });
    }

    // -----------------------------------------------------------------------
    // 2. Capitalized entities — product names, service names, feature names
    // -----------------------------------------------------------------------
    for (const entity of source.capitalizedEntities) {
      if (entity.length < MIN_ENTITY_LENGTH) { continue; }
      if (ai.capitalizedEntities.has(entity)) { continue; }

      // Check if the entity text still appears verbatim in raw output
      const rawPresent = ai.rawText.includes(entity);
      if (rawPresent) { continue; } // present but no longer TitleCase — lower severity

      const substitute = looksLikeSubstitution(entity, ai.capitalizedEntities);

      violations.push({
        ruleId: this.id,
        category: this.category,
        severity: "warning",
        message: substitute
          ? `Entity "${entity}" appears to have been renamed to "${substitute}". Verify this is intentional.`
          : `Entity "${entity}" is missing from AI output. Check for silent deletion or synonym substitution.`,
        location: {
          offendingPhrase: entity,
          contextSnippet: substitute ? `Possible substitute: "${substitute}"` : undefined,
        },
        confidence: 0.90,
      });
    }

    return violations;
  },
};
