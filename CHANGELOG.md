# Change Log

All notable changes to the "doc-agent-orchestrator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.1.0] — 2026-03-09

### Added
- **Source Grounding Layer** (`sourceGrounding.ts`) — every AI output sentence is mapped to the closest source sentence via Jaccard similarity. Sentences below the anchor threshold are flagged as unanchored (invented workflow branches not traceable to the source).
- **SOURCE_GROUNDING validation rule** — integrates the grounding layer into the governance pipeline as a fifth rule; raises `warning` (advisory profiles) or `error` (strict / safety-critical profiles) for unanchored sentences.
- **Grounding tab in Governance Panel** — new "🔗 Grounding" tab showing per-sentence source anchors, match percentages, and a summary grounding ratio metric.
- **Grounding % metric** in the governance report banner strip, colour-coded green / amber / red.
- **Gap Resolution Panel** — redesigned pre-generation Q&A webview with structured gap-type cards (icon + category label), per-question Skip toggles, answered counter, and a fixed footer action bar. Replaces the plain input-box sequence with a single overview panel.
- **`gapTypeFromId()`** helper maps question ID prefixes to human-readable gap type labels and icons.
- **Multi-action answer splitting** in `formatPreClarifications()` — answers containing multiple sequential actions are automatically expanded into numbered sub-steps so the AI treats each as a separate procedure step.
- **NOTE FORMATTING rule** in `promptGenerator.ts` — instructs the AI to collapse source conditions + navigation path answers into one fluent sentence using `>` notation.
- **STEP EXPANSION FROM ANSWERS rule** — prevents the AI from collapsing annotated multi-action answers back into a single step.
- **Sharpened NOTES vs PRESERVED AMBIGUITIES decision rule** in `governance.ts` — explicit yes/no test: "Can the user perform this step as written?" determines whether vague content belongs in Notes or Preserved Ambiguities.

## [Unreleased]

- Initial release