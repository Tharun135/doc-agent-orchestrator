# Change log

All notable changes to the "doc-agent-orchestrator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.2.0] — 2026-03-10

### Added
- **Structural Inference Rules for procedure documents** — `procedureOutputSpec()` now permits bounded inference for three sections:
  - *Overview*: derived from the source title ("Set Up X" → "This procedure describes how to set up X.").
  - *Prerequisites*: derived from input-requiring steps ("Enter server address." → "The OPC UA server address is available."); restricted to nouns present in the source or clarifications.
  - *Result*: derived from the final activation/confirmation steps; prefers describing the final state over restating step wording.
- **Result final-state guidance** — added prompt instruction to prefer "The connector is active and data is flowing." over "The user confirms data is flowing."
- **`ProcedureModel`** (`buildProcedureModel()`) — lightweight structural parser that extracts title and step `{action, object}` pairs before running gap checks. Powers smarter PC-2 and PC-3 checks.
- **`QuestionIntent` type** and `intent` field on `DetectedQuestion` — semantic category tag (`location`, `input`, `success`, `environment`, `actor`, `value`, `error`, `timing`, `format`, `scope`, `other`) applied to every generated question.
- **`inferIntent()`** — maps question ID prefixes to `QuestionIntent` values, covering all 40+ per-line checkers.
- **Intent-based question deduplication** (procedure type only):
  - *Location collapse*: when the source has no UI context and 2+ `location`-intent questions were generated, all are replaced by one `proc-global-location` question.
  - *Success collapse*: when 3+ `success`-intent questions are generated, all are replaced by one `proc-global-success` question naming the relevant source steps.
- **Procedure completeness checkers** (PC-1 to PC-4) enhanced:
  - PC-2 now uses `buildProcedureModel()` to list the actual input-requiring steps by name in the question text.
  - PC-3 now uses `VERIFICATION_VERBS` / `ACTIVATION_VERBS` sets from the model instead of a fragile last-line pattern match.
- **`PREREQUISITE INVENTION PROHIBITION` in `governance.ts`** updated to explicitly carve out the procedure-document exception and reference the structural inference rules.

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