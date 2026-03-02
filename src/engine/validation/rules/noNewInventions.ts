import {
  ValidationRule,
  RuleViolation,
  NormalizedDocument,
  GovernanceProfile,
} from "../types";

// ---------------------------------------------------------------------------
// Rule: NO_NEW_INVENTIONS
// ---------------------------------------------------------------------------
// Flags nouns and verbs that appear in AI output but are absent from the
// source document.  These represent potential hallucinations — concepts the
// AI introduced that have no grounding in the original text.
//
// Confidence rationale:
//   - Nouns:  0.85  — high signal; new nouns almost always mean new concepts.
//   - Verbs:  0.70  — lower signal; AI often paraphrases with synonymous verbs.
// ---------------------------------------------------------------------------

/** Words so generic in technical prose they aren't meaningful invention signals. */
const GENERIC_TECH_WORDS = new Set<string>([
  "system", "user", "data", "file", "step", "process", "option", "value",
  "item", "list", "page", "view", "window", "message", "result", "field",
  "form", "type", "mode", "state", "status", "path", "name", "id", "key",
  "level", "group", "set", "service", "function", "method", "object",
  "entry", "output", "input", "information", "section", "note", "example",
  "detail", "number", "text", "time", "date", "version", "change", "update",
  "default", "current", "new", "action", "event", "request", "response",
  "error", "warning", "info", "log", "task", "job", "run", "item", "line",
  "content", "document", "point", "code", "link", "tab", "button", "menu",
  "box", "panel", "screen", "area", "column", "row", "table", "record",
]);

export const noNewInventions: ValidationRule = {
  id: "NO_NEW_INVENTIONS",
  category: "invention",

  evaluate(
    source: NormalizedDocument,
    ai: NormalizedDocument,
    profile: GovernanceProfile
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    // If the profile explicitly permits new nouns → info only.
    // If not permitted but the profile is advisory (blockOnErrors=false) → warning.
    // If not permitted and the profile is strict (blockOnErrors=true) → error.
    const nounSeverity = profile.allowNewNouns
      ? "info"
      : profile.blockOnErrors ? "error" : "warning";
    const verbSeverity = profile.allowNewVerbs
      ? "info"
      : profile.blockOnErrors ? "warning" : "info";

    // -----------------------------------------------------------------------
    // 1. New nouns
    // -----------------------------------------------------------------------
    for (const noun of ai.nounSet) {
      if (source.nounSet.has(noun)) { continue; }
      if (GENERIC_TECH_WORDS.has(noun)) { continue; }
      // A noun that matches a UI label is expected to appear; skip.
      if (source.uiLabels.has(noun)) { continue; }

      // Find a sentence that contains the offending noun for context
      const contextSentence = ai.sentences.find((s) =>
        s.toLowerCase().includes(noun)
      );

      violations.push({
        ruleId: this.id,
        category: this.category,
        severity: nounSeverity,
        message: `New noun "${noun}" introduced — not present in source. Potential hallucination.`,
        location: {
          offendingPhrase: noun,
          contextSnippet: contextSentence,
        },
        confidence: 0.85,
      });
    }

    // -----------------------------------------------------------------------
    // 2. New action verbs
    // -----------------------------------------------------------------------
    for (const verb of ai.verbSet) {
      if (source.verbSet.has(verb)) { continue; }
      if (GENERIC_TECH_WORDS.has(verb)) { continue; }
      // Ignore very short / auxiliary-style verbs
      if (verb.length <= 2) { continue; }

      const contextSentence = ai.sentences.find((s) =>
        s.toLowerCase().includes(verb)
      );

      violations.push({
        ruleId: this.id,
        category: this.category,
        severity: verbSeverity,
        message: `New action verb "${verb}" detected — not present in source. Ensure no implied requirement.`,
        location: {
          offendingPhrase: verb,
          contextSnippet: contextSentence,
        },
        confidence: 0.70,
      });
    }

    return violations;
  },
};
