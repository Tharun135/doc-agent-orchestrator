/**
 * sourceGrounding.ts
 *
 * Source Alignment Layer — validates that every AI output sentence can be
 * traced to either the source text or a clarification answer.
 *
 * Algorithm:
 *   For each output sentence, compute the Jaccard similarity against every
 *   source sentence and take the best match. If the best similarity falls
 *   below ANCHOR_THRESHOLD the sentence is marked as "unanchored" — it
 *   contains vocabulary the source never uses, suggesting an invented
 *   workflow branch (new steps, error recovery, or conditions not in the
 *   original content).
 *
 * This detects a class of hallucination that word-overlap rules miss:
 * a sentence that is grammatically adjacent to real steps but introduces
 * entities, conditions, or recovery paths with no source traceability.
 *
 * Examples the rule catches:
 *   Source: "Restart connector."
 *   Output: "If the restart fails, check firewall settings."
 *     → "firewall" / "restart fails" have no source anchor → UNANCHORED
 *
 *   Source: "Import tags."
 *   Output: "Import all tags from the PLC device."
 *     → "PLC" / "device" above threshold because "import" + "tags" match
 *     → ANCHORED  (expansion, not invention — caught by noNewInventions)
 */

export interface SentenceAnchor {
  /** The output sentence being evaluated. */
  sentence: string;
  /** The closest matching source sentence, or null if unanchored. */
  anchor: string | null;
  /** Best Jaccard similarity vs. any single source sentence [0..1]. */
  similarity: number;
  /** True when the anchor comes from a clarification answer, not the source. */
  anchoredByAnswer: boolean;
  /** True if this sentence has no meaningful source mapping. */
  unanchored: boolean;
}

export interface GroundingReport {
  anchors: SentenceAnchor[];
  /** Number of output sentences with no source anchor. */
  unanchoredCount: number;
  /** Total output sentences evaluated. */
  total: number;
  /** Fraction of sentences that are anchored [0..1]. */
  groundingRatio: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Minimum Jaccard similarity to consider a sentence anchored.
 * Low threshold to avoid flagging legitimate AI prose expansion;
 * this only catches sentences with near-zero shared vocabulary.
 */
const ANCHOR_THRESHOLD = 0.12;

/** Skip sentences with fewer content words (step numbers, short labels). */
const MIN_TOKENS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'a','an','the','in','on','at','to','for','of','and','or','is','are','was',
  'were','be','been','by','from','with','as','this','that','it','its','after',
  'before','if','when','then','do','not','no','any','all','can','will','should',
  'must','may','might','each','per','via','into','also','such','both','either',
  'which','these','those','their','they','them','you','your','we','our','us',
  'so','just','only','more','very','too','he','she','him','her','i','my',
]);

/** Tokenises text into a set of lowercase content words (length > 2). */
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Jaccard similarity between two content-word sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) { return 0; }
  let intersection = 0;
  for (const w of a) { if (b.has(w)) { intersection++; } }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Splits text into candidate sentences for evaluation.
 * Filters markdown headings, blank lines, and trivial list markers.
 */
function splitSentences(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.length > 0 &&
      !l.startsWith('#') &&
      !/^[-*•]\s*$/.test(l) &&
      !/^\d+\.\s*$/.test(l)
    )
    .flatMap(l => l.split(/(?<=[.?!])\s+(?=[A-Z])/))
    .map(s => s.replace(/^\s*\d+\.\s*/, '').trim())
    .filter(s => s.length > 12);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Maps every AI output sentence to the closest source sentence (or
 * clarification answer). Sentences with similarity below ANCHOR_THRESHOLD
 * are flagged as unanchored — potential invented workflow branches.
 *
 * @param sourceText     The original source content.
 * @param aiText         The AI-generated output to evaluate.
 * @param clarifications Optional clarification answers (treated as valid
 *                       source anchors because they are authoritative facts).
 */
export function groundOutput(
  sourceText: string,
  aiText: string,
  clarifications?: string,
): GroundingReport {
  const sourceSentences = splitSentences(sourceText);
  const clarSentences   = clarifications ? splitSentences(clarifications) : [];
  const allAnchors      = [...sourceSentences, ...clarSentences];
  const anchorSets      = allAnchors.map(tokenize);
  const clarStart       = sourceSentences.length;

  const outputSentences = splitSentences(aiText);

  const anchors: SentenceAnchor[] = outputSentences.map(sentence => {
    const outTokens = tokenize(sentence);

    // Skip structural / too-short sentences — treat as anchored so they
    // don't inflate the unanchored count.
    if (outTokens.size < MIN_TOKENS) {
      return {
        sentence,
        anchor: null,
        similarity: 1,
        anchoredByAnswer: false,
        unanchored: false,
      };
    }

    let bestSim = 0;
    let bestIdx = -1;
    for (let i = 0; i < anchorSets.length; i++) {
      const sim = jaccard(outTokens, anchorSets[i]);
      if (sim > bestSim) { bestSim = sim; bestIdx = i; }
    }

    const unanchored       = bestSim < ANCHOR_THRESHOLD;
    const anchoredByAnswer = !unanchored && bestIdx >= clarStart;

    return {
      sentence,
      anchor: (!unanchored && bestIdx >= 0) ? allAnchors[bestIdx] : null,
      similarity: bestSim,
      anchoredByAnswer,
      unanchored,
    };
  });

  const unanchoredCount = anchors.filter(a => a.unanchored).length;
  const groundingRatio  = anchors.length > 0
    ? (anchors.length - unanchoredCount) / anchors.length
    : 1;

  return { anchors, unanchoredCount, total: anchors.length, groundingRatio };
}
