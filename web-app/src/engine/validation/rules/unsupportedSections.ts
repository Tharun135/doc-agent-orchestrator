import {
  ValidationRule,
  RuleViolation,
  NormalizedDocument,
  GovernanceProfile,
} from "../types";

// ---------------------------------------------------------------------------
// Rule: UNSUPPORTED_SECTIONS
// ---------------------------------------------------------------------------
// Checks that optional sections (Prerequisites, Possible Causes, etc.) are
// grounded in the source document.
//
// A section is considered "ungrounded" when the vast majority of its content
// words do not appear anywhere in the source text — i.e., the AI filled the
// section by inference rather than from the source.
//
// Grounding ratio = (content words that also appear in source) / total content words
// Threshold: < 0.30 → ungrounded error; 0.30–0.49 → warning
//
// Only sections with meaningful content (≥ 4 content words) are evaluated.
// ---------------------------------------------------------------------------

/** Headings that should not exist without explicit source support. */
const OPTIONAL_SECTIONS: string[] = [
  "prerequisites",
  "possible causes",
  "prevention",
  "next steps",
  "related information",
  "breaking changes",
  "known issues",
  "error handling",
  "key components",
  "process flow",
  "important considerations",
];

/** Stop words and structural noise that carry no semantic grounding signal. */
const STOP_WORDS = new Set<string>([
  "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to",
  "for", "of", "with", "by", "from", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "shall", "can",
  "not", "no", "nor", "so", "yet", "both", "either", "neither", "than",
  "that", "this", "these", "those", "it", "its", "i", "you", "he", "she",
  "we", "they", "them", "their", "what", "which", "who", "how", "when",
  "where", "why", "all", "any", "each", "every", "some", "such",
  "access", "ensure", "verify", "confirm", "available", "required", "need",
  "following", "before", "after", "during", "while", "also", "e.g", "eg",
  // Very generic governance / doc structure words
  "note", "see", "refer", "depending", "based", "appropriate",
]);

/**
 * Extract sections from a markdown string.
 * Returns a map of lowercased heading label → body text.
 */
function extractSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  // Split on markdown headings (##, ###, #### etc.)
  const headingRe = /^#{1,4}\s+(.+)$/gm;
  const indices: Array<{ label: string; start: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(markdown)) !== null) {
    indices.push({ label: m[1].trim().toLowerCase(), start: m.index + m[0].length });
  }
  for (let i = 0; i < indices.length; i++) {
    const end = i + 1 < indices.length ? indices[i + 1].start : markdown.length;
    const body = markdown.slice(indices[i].start, end).trim();
    sections.set(indices[i].label, body);
  }
  return sections;
}

/** Tokenise text into lowercase content words. */
function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Build a flat word set from source raw text. */
function sourceWordSet(sourceText: string): Set<string> {
  return new Set(contentWords(sourceText));
}

export const unsupportedSections: ValidationRule = {
  id: "UNSUPPORTED_SECTIONS",
  category: "invention",

  evaluate(
    source: NormalizedDocument,
    ai: NormalizedDocument,
    profile: GovernanceProfile
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const srcWords = sourceWordSet(source.rawText);

    const aiSections = extractSections(ai.rawText);

    for (const [heading, body] of aiSections) {
      // Only check headings that are in the optional-and-risky list
      const isOptional = OPTIONAL_SECTIONS.some(
        (opt) => heading === opt || heading.startsWith(opt)
      );
      if (!isOptional) { continue; }

      const words = contentWords(body);
      if (words.length < 4) { continue; } // Too short to evaluate fairly

      const groundedCount = words.filter((w) => srcWords.has(w)).length;
      const groundingRatio = groundedCount / words.length;

      if (groundingRatio < 0.30) {
        const severity = profile.blockOnErrors ? "error" : "warning";
        // Build a short snippet of the offending content for context
        const snippet = body.replace(/\n/g, " ").slice(0, 120);
        violations.push({
          ruleId: this.id,
          category: this.category,
          severity,
          message: `Section "${heading}" appears ungrounded — only ${Math.round(groundingRatio * 100)}% of its content words are traceable to the source (threshold: 30%). This section may have been invented.`,
          location: {
            offendingPhrase: heading,
            contextSnippet: snippet,
          },
          confidence: 0.80,
        });
      } else if (groundingRatio < 0.50) {
        const snippet = body.replace(/\n/g, " ").slice(0, 120);
        violations.push({
          ruleId: this.id,
          category: this.category,
          severity: "warning",
          message: `Section "${heading}" has low source grounding (${Math.round(groundingRatio * 100)}% of content words traced to source). Review for invented content.`,
          location: {
            offendingPhrase: heading,
            contextSnippet: snippet,
          },
          confidence: 0.65,
        });
      }
    }

    return violations;
  },
};
