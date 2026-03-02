import {
  NormalizedDocument,
  Step,
} from "./types";
import {
  STOPWORDS,
  ADJECTIVE_SUFFIXES,
  IRREGULAR_VERBS,
  AMBIGUITY_PHRASES,
} from "./wordlists";

// ---------------------------------------------------------------------------
// DocumentNormalizer
// ---------------------------------------------------------------------------
// Pure-TypeScript, zero-dependency document normalizer.
// Converts raw Markdown or plain text into a structured NormalizedDocument
// whose Sets can be compared in O(1) by the Rule Engine.
// ---------------------------------------------------------------------------

export class DocumentNormalizer {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  public normalize(text: string): NormalizedDocument {
    const clean = this.stripMarkdown(text);
    const sentences = this.splitSentences(clean);
    const tokens = this.tokenize(clean);

    return {
      rawText: text,
      wordCount: tokens.length,
      sentences,
      nounSet: this.extractNouns(tokens),
      verbSet: this.extractVerbs(tokens),
      uiLabels: this.extractUILabels(text),
      capitalizedEntities: this.extractEntities(text, sentences),
      stepStructure: this.parseSteps(text),
    };
  }

  // -----------------------------------------------------------------------
  // Markdown stripping
  // -----------------------------------------------------------------------

  private stripMarkdown(text: string): string {
    return (
      text
        // Fenced code blocks (``` … ```)
        .replace(/```[\s\S]*?```/g, " ")
        // Inline code (`…`)
        .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
        // ATX headings (## Heading)
        .replace(/^#{1,6}\s+/gm, "")
        // Bold / italic (**text**, *text*, __text__, _text_)
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        .replace(/(\*|_)(.*?)\1/g, "$2")
        // Links/images [text](url) → text
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        // Reference-style links [text][ref] → text
        .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
        // Blockquotes
        .replace(/^>\s?/gm, "")
        // Horizontal rules
        .replace(/^[-*_]{3,}\s*$/gm, "")
        // HTML tags
        .replace(/<[^>]+>/g, " ")
        // Collapse multiple blank lines
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  // -----------------------------------------------------------------------
  // Sentence splitting
  // -----------------------------------------------------------------------

  private splitSentences(text: string): string[] {
    // Split on sentence-ending punctuation, but guard against:
    //   - decimal numbers (1.5)
    //   - step prefixes    (1. Click …)
    //   - common abbreviations
    const abbrevGuard = text
      .replace(/(\d+)\.\s+/g, "$1__STEP__ ")
      .replace(/\b(e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|St|Fig|approx)\./gi, "$1__DOT__");

    const raw = abbrevGuard
      .split(/(?<=[.!?])\s+(?=[A-Z"'([]|\d)/)
      .map((s) =>
        s
          .replace(/__STEP__/g, ".")
          .replace(/__DOT__/g, ".")
          .trim()
      )
      .filter(Boolean);

    return raw.length > 0 ? raw : [text.trim()];
  }

  // -----------------------------------------------------------------------
  // Tokenisation
  // -----------------------------------------------------------------------

  private tokenize(text: string): string[] {
    return (
      text
        // lower-case for comparison
        .toLowerCase()
        // keep hyphens inside compound words (e.g. "plug-in"), strip rest
        .replace(/[^a-z0-9\s'-]/g, " ")
        // split on whitespace
        .split(/\s+/)
        // drop empty strings and pure punctuation
        .filter((t) => t.length > 1 && /[a-z]/.test(t))
    );
  }

  // -----------------------------------------------------------------------
  // Noun extraction
  // -----------------------------------------------------------------------
  // A token is a noun candidate when it is:
  //   - not a stopword
  //   - not identified as a verb by extractVerbs logic
  //   - not clearly an adjective/adverb (suffix check)
  //   - at least 3 chars
  // We singularize before storing so "servers" matches "server".

  private extractNouns(tokens: string[]): Set<string> {
    const nouns = new Set<string>();

    for (const raw of tokens) {
      if (raw.length < 3) { continue; }
      if (STOPWORDS.has(raw)) { continue; }
      if (this.lookLikeVerb(raw)) { continue; }
      if (this.looksLikeAdjectiveOrAdverb(raw)) { continue; }

      nouns.add(this.singularize(raw));
    }

    return nouns;
  }

  private singularize(word: string): string {
    if (word.endsWith("ies") && word.length > 4) {
      return word.slice(0, -3) + "y"; // queries → query
    }
    if (
      word.endsWith("ses") ||
      word.endsWith("xes") ||
      word.endsWith("zes") ||
      word.endsWith("ches") ||
      word.endsWith("shes")
    ) {
      return word.slice(0, -2); // boxes → box, matches → match
    }
    if (
      word.endsWith("s") &&
      !word.endsWith("ss") &&
      !word.endsWith("us") &&
      !word.endsWith("is") &&
      !word.endsWith("as") &&
      word.length > 3
    ) {
      return word.slice(0, -1);
    }
    return word;
  }

  private looksLikeAdjectiveOrAdverb(word: string): boolean {
    for (const suffix of ADJECTIVE_SUFFIXES) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return true;
      }
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Verb extraction
  // -----------------------------------------------------------------------
  // Strategy:
  //   1. Irregular verb table → direct lookup → infinitive
  //   2. Suffix stripping heuristics → infinitive candidate
  //   3. Discard if infinitive hits stopwords

  private extractVerbs(tokens: string[]): Set<string> {
    const verbs = new Set<string>();

    for (const raw of tokens) {
      const lemma = this.lemmatizeVerb(raw);
      if (lemma && !STOPWORDS.has(lemma) && lemma.length > 1) {
        verbs.add(lemma);
      }
    }

    return verbs;
  }

  public lemmatizeVerb(word: string): string | null {
    const lower = word.toLowerCase();

    // 1. Irregular table
    if (IRREGULAR_VERBS[lower]) {
      return IRREGULAR_VERBS[lower];
    }

    // 2. Base-form check — if the word itself looks like a verb, return it as-is
    if (!STOPWORDS.has(lower) && lower.length >= 3 && this.isLikelyVerb(lower)) {
      return lower;
    }

    // 2. Heuristic suffix stripping
    //    -ing  (running → run, writing → write)
    if (lower.endsWith("ing") && lower.length > 5) {
      const stem = lower.slice(0, -3);
      // double-consonant: running → run
      if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
        return stem.slice(0, -1);
      }
      // magic-e: writing → write
      return this.isLikelyVerb(stem + "e") ? stem + "e" : stem;
    }

    // -ed  (configured → configure, clicked → click)
    if (lower.endsWith("ed") && lower.length > 4) {
      const stem = lower.slice(0, -2);
      if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
        return stem.slice(0, -1); // stopped → stop
      }
      if (this.isLikelyVerb(stem + "e")) {
        return stem + "e"; // configured → configure
      }
      return stem; // added → add
    }

    // -izes / -ises
    if (lower.endsWith("izes") || lower.endsWith("ises")) {
      return lower.slice(0, -1); // initializes → initialize
    }
    if (lower.endsWith("ying") && lower.length > 5) {
      return lower.slice(0, -4) + "y"; // deploying → deploy
    }

    // Third-person -s but NOT obvious nouns
    if (
      lower.endsWith("s") &&
      !lower.endsWith("ss") &&
      !lower.endsWith("us") &&
      lower.length > 4 &&
      this.isLikelyVerb(lower.slice(0, -1))
    ) {
      return lower.slice(0, -1);
    }

    return null;
  }

  /** Rough plausibility gate – does the candidate look like a real verb? */
  private isLikelyVerb(word: string): boolean {
    const verbSuffixes = [
      "ate","ize","ise","ify","ect","ent","ort","end","ert","ost",
      "ove","ose","ode","ote","oke","ope","ome","one","ore","ule",
      "ure","ude","age","ange","ance","ence","ign",
      "etch","atch","itch","oad","ead","eal","eel",
      "ull","all","ell","ill","oll",
      // short action-word endings common in technical writing
      "ick","eck","ack","ock","mit","ull","all","ell",
      "ash","ush","ish","oss","ress","ess","iss",
    ];
    for (const s of verbSuffixes) {
      if (word.endsWith(s) && word.length > s.length + 1) { return true; }
    }
    // Most single syllable CVC words are verbs: run, get, set, put, log
    return word.length <= 5 && /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]/.test(word);
  }

  private lookLikeVerb(word: string): boolean {
    return this.lemmatizeVerb(word) !== null;
  }

  // -----------------------------------------------------------------------
  // Capitalized entity extraction
  // -----------------------------------------------------------------------
  // Entities: one or more consecutive TitleCase words that are NOT the first
  // word of a sentence.  We merge runs so "Runtime Manager" counts as one entity.

  private extractEntities(rawText: string, sentences: string[]): Set<string> {
    const entities = new Set<string>();

    // Build a set of sentence-starter words to skip
    const sentenceStarters = new Set<string>(
      sentences.map((s) => s.trim().split(/\s+/)[0])
    );

    // Regex: consecutive TitleCase tokens (including hyphenated)
    const titleCaseRun = /\b([A-Z][a-z]+(?:[-–][A-Za-z]+)*(?:\s+[A-Z][a-z]+(?:[-–][A-Za-z]+)*)*)\b/g;
    let match: RegExpExecArray | null;

    while ((match = titleCaseRun.exec(rawText)) !== null) {
      const candidate = match[1].trim();
      // Skip if it's just a sentence-opener, a stopword, or a lone word we've seen as a starter
      const words = candidate.split(/\s+/);
      if (words.length === 1 && sentenceStarters.has(candidate)) { continue; }
      if (words.length === 1 && STOPWORDS.has(candidate.toLowerCase())) { continue; }
      if (candidate.length < 3) { continue; }
      entities.add(candidate);
    }

    // Also capture ALL_CAPS acronyms (API, URL, SQL, UI, etc.)
    const allCapsRun = /\b([A-Z]{2,})\b/g;
    while ((match = allCapsRun.exec(rawText)) !== null) {
      entities.add(match[1]);
    }

    return entities;
  }

  // -----------------------------------------------------------------------
  // UI Label extraction (quoted / bracketed / backtick-delimited text)
  // -----------------------------------------------------------------------

  private extractUILabels(text: string): Set<string> {
    const labels = new Set<string>();

    const patterns: RegExp[] = [
      /"([^"\n]{1,80})"/g,          // "Submit"
      /'([^'\n]{1,80})'/g,           // 'Submit'
      /`([^`\n]{1,80})`/g,           // `Submit`
      /\[([^\]\n]{1,80})\]/g,        // [Submit]
      /\*\*([^*\n]{1,60})\*\*/g,     // **Submit** (bold UI labels)
    ];

    for (const pattern of patterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const label = m[1].trim();
        // Filter out markdown links and empty captures
        if (label.length > 0 && !label.startsWith("http")) {
          labels.add(label);
        }
      }
    }

    return labels;
  }

  // -----------------------------------------------------------------------
  // Step / procedure structure parsing
  // -----------------------------------------------------------------------

  private parseSteps(text: string): Step[] {
    const steps: Step[] = [];
    const lines = text.split(/\n/);

    // Match: "1. text", "1) text", "Step 1: text", "Step 1 – text"
    const numberedStep = /^\s*(?:Step\s+)?(\d+)[.):\-–]\s+(.+)/i;

    for (const line of lines) {
      const match = line.match(numberedStep);
      if (!match) { continue; }

      const [, idxStr, stepText] = match;
      const actionVerbs = this.extractActionVerbsFromStep(stepText);

      steps.push({
        index: parseInt(idxStr, 10),
        text: stepText.trim(),
        isConditional: /\b(if|when|unless|whether|provided that|assuming)\b/i.test(stepText),
        actionVerbs,
      });
    }

    return steps;
  }

  private extractActionVerbsFromStep(stepText: string): string[] {
    const tokens = this.tokenize(stepText);
    const verbs: string[] = [];

    for (const token of tokens) {
      const lemma = this.lemmatizeVerb(token);
      if (lemma && !STOPWORDS.has(lemma)) {
        verbs.push(lemma);
      }
    }

    return [...new Set(verbs)];
  }

  // -----------------------------------------------------------------------
  // Ambiguity detection (used by the UI layer / pre-generation checks)
  // -----------------------------------------------------------------------

  public detectAmbiguities(text: string): string[] {
    const found: string[] = [];
    for (const pattern of AMBIGUITY_PHRASES) {
      // reset lastIndex for global regexes shared across calls
      const localRe = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
      let m: RegExpExecArray | null;
      while ((m = localRe.exec(text)) !== null) {
        found.push(m[0]);
      }
    }
    return [...new Set(found)];
  }
}
