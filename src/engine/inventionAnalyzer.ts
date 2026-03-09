/**
 * inventionAnalyzer.ts
 *
 * Analyzes source content vs. generated output to identify and classify
 * semantic expansion, invention, clarification, and inference.
 *
 * Classifies each phrase mapping as:
 * - PRESERVED: Faithful reproduction from source
 * - CLARIFIED: Source phrase + minor UI/contextual clarification
 * - INFERRED: Logical expansion based on source intent
 * - INVENTED: New phrase/entity not in source
 * - STRENGTHENED: Vague source term made specific
 */

export type Classification =
  | "PRESERVED"
  | "CLARIFIED"
  | "INFERRED"
  | "INVENTED"
  | "STRENGTHENED";

export type Category =
  | "UI_Location"
  | "Entity"
  | "Prerequisite"
  | "Behavioral"
  | "Scope"
  | "Action"
  | "State"
  | "Reference"
  | "Other";

export interface PhraseMapping {
  sourcePhrase: string;
  outputPhrase: string;
  classification: Classification;
  category: Category;
  severity: "low" | "medium" | "high";
  reason: string;
}

export interface InventionReport {
  mappings: PhraseMapping[];
  stats: {
    preserved: number;
    clarified: number;
    inferred: number;
    invented: number;
    strengthened: number;
    total: number;
  };
  expansionRatio: number; // percentage of total output that is inferred/invented
  summary: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Keywords that hint at classification
// ───────────────────────────────────────────────────────────────────────────

const CLARIFICATION_KEYWORDS = [
  "tab",
  "menu",
  "interface",
  "form",
  "button",
  "icon",
  "field",
  "section",
  "page",
  "list",
  "dialog",
];

const VAGUE_QUALIFIERS = ["something", "whatever", "etc", "might", "may"];

const INVENTED_KEYWORDS = [
  "project",
  "context menu",
  "system",
  "application",
  "configuration",
];

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]/g, "");
}

function wordOverlap(source: string, output: string): number {
  const sourceWords = normalizePhrase(source).split(/\s+/);
  const outputWords = normalizePhrase(output).split(/\s+/);
  const common = sourceWords.filter((w) => outputWords.includes(w)).length;
  return common / Math.max(sourceWords.length, outputWords.length);
}

function containsInventedEntity(phrase: string): boolean {
  return INVENTED_KEYWORDS.some((kw) =>
    normalizePhrase(phrase).includes(normalizePhrase(kw))
  );
}

function isClarification(source: string, output: string): boolean {
  // Clarifications add UI terms but preserve core action
  const overlap = wordOverlap(source, output);
  const addsClarifyingKeywords = CLARIFICATION_KEYWORDS.some((kw) =>
    normalizePhrase(output).includes(kw)
  );
  return overlap > 0.5 && addsClarifyingKeywords;
}

function isStrengthening(source: string, output: string): boolean {
  // Vague term becomes specific
  const hasVagueInSource = VAGUE_QUALIFIERS.some((vq) =>
    normalizePhrase(source).includes(vq)
  );
  const isMoreSpecificInOutput = normalizePhrase(output).length >
    normalizePhrase(source).length && !containsInventedEntity(output);
  return hasVagueInSource && isMoreSpecificInOutput;
}

function classifyMapping(
  source: string,
  output: string
): { classification: Classification; reason: string } {
  const sourceNorm = normalizePhrase(source);
  const outputNorm = normalizePhrase(output);

  // Check if preserved (exact match)
  if (
    sourceNorm === outputNorm ||
    wordOverlap(source, output) > 0.95
  ) {
    return { classification: "PRESERVED", reason: "Faithful reproduction" };
  }

  // Check if invented (new entity appears)
  if (containsInventedEntity(output) && !containsInventedEntity(source)) {
    return {
      classification: "INVENTED",
      reason: "New entity not present in source",
    };
  }

  // Check if clarification (adds UI context)
  if (isClarification(source, output)) {
    return {
      classification: "CLARIFIED",
      reason: "Source + UI/context clarification",
    };
  }

  // Check if strengthened (vague made specific)
  if (isStrengthening(source, output)) {
    return {
      classification: "STRENGTHENED",
      reason: "Vague term made more specific",
    };
  }

  // Default: inferred (logical expansion)
  return {
    classification: "INFERRED",
    reason: "Logical expansion of source intent",
  };
}

function detectCategory(phrase: string): Category {
  const norm = normalizePhrase(phrase);

  if (
    CLARIFICATION_KEYWORDS.some((kw) => norm.includes(kw)) ||
    /where|navigate|go to|open|click|menu|tab/i.test(phrase)
  ) {
    return "UI_Location";
  }

  if (
    /project|file|device|connection|service|component|entity/i.test(phrase)
  ) {
    return "Entity";
  }

  if (
    /must|required|need|prerequisite|before|first|establish/i.test(phrase)
  ) {
    return "Prerequisite";
  }

  if (/wait|load|process|perform|execute|follow/i.test(phrase)) {
    return "Behavioral";
  }

  if (/deploy|scope|all|selected/i.test(phrase)) {
    return "Scope";
  }

  if (/action|step|procedure|guide|refer|section/i.test(phrase)) {
    return "Reference";
  }

  return "Other";
}

function assignSeverity(classification: Classification): "low" | "medium" | "high" {
  switch (classification) {
    case "PRESERVED":
      return "low";
    case "CLARIFIED":
      return "low";
    case "STRENGTHENED":
      return "medium";
    case "INFERRED":
      return "medium";
    case "INVENTED":
      return "high";
    default:
      return "medium";
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Main Analyzer
// ───────────────────────────────────────────────────────────────────────────

/**
 * Extract sentences from text, handling various delimiters.
 */
function extractSentences(text: string): string[] {
  return text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

/**
 * Analyze source vs output and produce invention report.
 */
export function analyzeInvention(
  source: string,
  output: string
): InventionReport {
  const sourceSentences = extractSentences(source);
  const outputSentences = extractSentences(output);

  const mappings: PhraseMapping[] = [];

  // Match sentences from source to output
  // Use greedy matching: try to find best match for each source sentence
  const usedOutputIndices = new Set<number>();

  for (const srcSent of sourceSentences) {
    let bestMatch: { index: number; overlap: number } | null = null;

    // Find best matching output sentence
    for (let i = 0; i < outputSentences.length; i++) {
      if (usedOutputIndices.has(i)) continue;

      const overlap = wordOverlap(srcSent, outputSentences[i]);
      if (!bestMatch || overlap > bestMatch.overlap) {
        bestMatch = { index: i, overlap };
      }
    }

    if (bestMatch && bestMatch.overlap > 0.2) {
      const outSent = outputSentences[bestMatch.index];
      usedOutputIndices.add(bestMatch.index);

      const { classification, reason } = classifyMapping(srcSent, outSent);
      const category = detectCategory(outSent);
      const severity = assignSeverity(classification);

      mappings.push({
        sourcePhrase: srcSent,
        outputPhrase: outSent,
        classification,
        category,
        severity,
        reason,
      });
    } else {
      // Source phrase has no good match in output
      mappings.push({
        sourcePhrase: srcSent,
        outputPhrase: "(not found in output)",
        classification: "INVENTED",
        category: "Other",
        severity: "high",
        reason: "Source phrase not reflected in output",
      });
    }
  }

  // Capture unmatched output sentences as invented
  for (let i = 0; i < outputSentences.length; i++) {
    if (!usedOutputIndices.has(i)) {
      mappings.push({
        sourcePhrase: "(no source)",
        outputPhrase: outputSentences[i],
        classification: "INVENTED",
        category: detectCategory(outputSentences[i]),
        severity: "high",
        reason: "New content not in source",
      });
    }
  }

  // Calculate statistics
  const stats = {
    preserved: mappings.filter((m) => m.classification === "PRESERVED").length,
    clarified: mappings.filter((m) => m.classification === "CLARIFIED").length,
    inferred: mappings.filter((m) => m.classification === "INFERRED").length,
    invented: mappings.filter((m) => m.classification === "INVENTED").length,
    strengthened: mappings.filter(
      (m) => m.classification === "STRENGTHENED"
    ).length,
    total: mappings.length,
  };

  const inferred_invented = stats.inferred + stats.invented + stats.strengthened;
  const expansionRatio = Math.round((inferred_invented / stats.total) * 100);

  // Generate summary
  let summary = `${stats.preserved} preserved, ${stats.clarified} clarified, ${stats.inferred} inferred, ${stats.strengthened} strengthened, ${stats.invented} invented.`;
  if (expansionRatio > 50) {
    summary += " ⚠️ High expansion ratio — significant inference beyond source.";
  } else if (expansionRatio > 30) {
    summary += " 🟡 Moderate expansion — some inference applied.";
  } else {
    summary += " ✅ Low expansion — faithful to source.";
  }

  return {
    mappings,
    stats,
    expansionRatio,
    summary,
  };
}
