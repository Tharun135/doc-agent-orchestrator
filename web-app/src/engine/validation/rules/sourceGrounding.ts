import { ValidationRule, RuleViolation } from "../types";
import { groundOutput } from "../../sourceGrounding";

/**
 * SOURCE_GROUNDING rule
 *
 * Flags output sentences that have no traceability to the source text.
 * These "unanchored" sentences represent invented workflow branches —
 * steps, error-recovery paths, or conditions that the source never mentions.
 *
 * Severity:
 *   - error   when the active profile blocks on errors (strict / safety-critical)
 *   - warning otherwise
 *
 * Confidence is derived from how far the best match falls below the
 * anchoring threshold: a similarity of 0% yields confidence 1.0.
 */
export const sourceGroundingRule: ValidationRule = {
  id: "SOURCE_GROUNDING",
  category: "invention",

  evaluate(source, ai, profile): RuleViolation[] {
    const report = groundOutput(source.rawText, ai.rawText);
    if (report.unanchoredCount === 0) { return []; }

    return report.anchors
      .filter(a => a.unanchored)
      .map(a => {
        const simPct      = Math.round(a.similarity * 100);
        const severity    = profile.blockOnErrors ? "error" : "warning";
        const confidence  = Math.min(1, Math.max(0.5, 1 - a.similarity * 2));
        const phrase      = a.sentence.length > 80
          ? a.sentence.slice(0, 80) + "…"
          : a.sentence;

        return {
          ruleId:    "SOURCE_GROUNDING",
          category:  "invention" as const,
          severity:  severity as "error" | "warning",
          message:   `Unanchored sentence — no source mapping found (${simPct}% match). ` +
                     `This sentence may represent invented content not traceable to the source.`,
          location: {
            offendingPhrase: phrase,
            contextSnippet:  a.sentence,
          },
          confidence,
        };
      });
  },
};
