# Technical Documentation: Documentation Agent Orchestrator

## Table of contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Gap Detection System](#gap-detection-system)
4. [The Three-Phase Pre-Generation Pipeline](#the-three-phase-pre-generation-pipeline)
5. [How It Works](#how-it-works)
6. [Core Components](#core-components)
7. [Command Details](#command-details)
8. [Governance System](#governance-system)
9. [Prompt Generation Logic](#prompt-generation-logic)
10. [Workflow Details](#workflow-details)
11. [Extension API](#extension-api)
12. [Visual Workflow Guide](WORKFLOW-GUIDE.md)

---

## Overview

**Documentation Agent Orchestrator** is a VS Code extension that acts as a governance layer between raw content and AI-generated documentation. It enforces strict rules to prevent AI hallucination while enabling AI to create structured documentation from rough notes, code comments, or incomplete specifications.

The extension now includes:

* A structured **gap detection engine** that proactively identifies documentation risks before generation.
* A new end-to-end command that pastes AI output and immediately runs governance diff preview.

### Key principles

- **Correctness over fluency** - Accurate documentation is prioritized over well-written documentation
- **Preserve ambiguity** - Vague source content should produce vague but accurate documentation
- **No invention** - AI cannot add features, steps, or details not present in source material
- **Explicit uncertainty** - Ambiguous elements are explicitly documented in "Preserved Ambiguities" sections
- **Question-driven clarification** - AI asks questions only when documentation generation is blocked
- **Structured gap detection before rewrite** - Source is analysed for structural weaknesses before the prompt is built

---

## Architecture

### High-level design

```txt
┌─────────────────────┐
│   User Content      │ (Rough notes, code comments, specs)
│   (VS Code Editor)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Extension Layer    │ (extension.ts)
│  - Command handlers │
│  - State management │
│  - UI interactions  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Engine Layer        │
│  - promptGenerator    │ (Core logic)
│  - governance         │ (Rules)
│  - questionDetector   │ (Gap detection)
│  - types              │ (Type system)
└──────────┬────────────┘
           │
           ▼
┌─────────────────────────┐
│  Generated Prompt       │ (Markdown document)
│  + Clipboard copy       │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  External AI            │ (Claude, ChatGPT, etc.)
│  (User pastes)          │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  AI Response            │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Paste AI Response Cmd  │
│  (reads clipboard,      │
│   opens beside source)  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Diff Preview +         │ (VS Code diff viewer)
│  Governance Panel       │  auto-triggered
└─────────────────────────┘
```

### Project structure
```
doc-agent-orchestrator/
├── src/                          # Extension source (TypeScript)
│   ├── extension.ts              # Entry point, command registration
│   └── engine/                   # Core governance & detection logic
├── out/                          # Compiled JavaScript (build output)
├── docs/                         # Projects documentation
│   ├── guides/                   # User guides and quickstarts
│   ├── technical/                # Deep dives into system logic
│   ├── demo/                     # Sample inputs and walkthroughs
│   └── CHANGELOG.md              # Project history
├── tests/                        # Manual test cases and validation scripts
├── releases/                     # Compiled VSIX packages
├── web-app/                      # Standalone web version of the orchestrator
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Main repository landing page
```

---

## Gap detection system

The extension includes a dedicated gap detection engine in `questionDetector.ts`. Before a prompt is ever built, the source is scanned line-by-line and globally for structural documentation weaknesses that typically cause AI hallucination.

### How gap detection works

For each line of source content, 40 pattern-based checkers run in sequence. When a gap is detected, the user is prompted to answer the specific question inside VS Code before the AI call is made. Answers are injected into the prompt as **pre-clarifications** — authoritative facts the AI uses directly.

This means gaps are resolved by the human, not filled by the AI.

### Gap checker categories

#### Per-line checkers

| # | Gap Type | Example Trigger | Question Asked |
|---|---|---|---|
| 1 | Action step with no UI location | `Upload files.` | Where in the UI does the user perform this step? |
| 2 | Vague object | `System validates something.` | What exactly does the system validate? |
| 3 | Undefined pass condition | `If ok → deploy.` | What specific indicator means the condition is met? |
| 4 | Undefined error recovery | `If error → check logs.` | What should the user do? What does the error look like? |
| 5 | Check logs with no log name | `Check logs.` | Which log? What to look for? |
| 6 | Verification with no method | `Test connection.` | How? What does success look like? |
| 7 | Set/configure with no value | `Set scan rate.` | What value or range? Include units. |
| 8 | Default stated as unknown | `Port defaults to something.` | What is the actual default value? |
| 9 | Placeholder tokens | `Enter <VALUE>.` | What is the actual value? |
| 10 | Auth with no method | `Authentication required.` | What form do credentials take? |
| 11 | Undefined standard process | `Follow the usual process.` | What specifically is this process? |
| 12 | Restart with no wait condition | `Restart runtime.` | Must the user wait? For what? |
| 13 | Vague enumeration | `Change settings, etc.` | What are the actual settings? |
| 14 | Unqualified adjective | `Select the appropriate option.` | Which option specifically? |
| 15 | Number with no unit | `Set timeout to 30.` | 30 what — ms, seconds, minutes? |
| 16 | Reference to absent document | `Refer to the guide.` | What are the steps from that guide? |
| 17 | Wait with no completion indicator | `Wait for it to finish.` | What does the user see when it finishes? |
| 18 | Embedded conditional action | `May need to configure advanced settings.` | Where? What settings specifically? |
| 19 | Role-based vague access | `Admins get extra options.` | Which options? Where do they appear? |
| 20 | Vague subset requirement | `Some actions require approval.` | Which actions? What does approval involve? |
| 21 | Passive voice without actor | `The file is uploaded.` | Who performs this — user, system, or scheduled job? |
| 22 | Frequency/schedule unspecified | `Run the job.` | When? How often? Manual or scheduled? |
| 23 | Multi-branch without convergence | `Otherwise, restart the service.` | After this branch, what is the next common step? |
| 24 | Data format unspecified | `Export the file.` | What format — CSV, JSON, XML, XLSX? |
| 25 | Version/environment unspecified | `In the new version.` | Which specific version or environment? |
| 26 | Success count ambiguity | `All records should be imported.` | How many expected? What if fewer appear? |
| 27 | Past-tense fix with vague condition | `Fixed crash in certain conditions.` | Which conditions specifically? |
| 28 | Vague incompleteness status | `Some translations incomplete.` | Which translations? |
| 29 | Declarative vague enumeration | `Fixed various UI glitches.` | Which glitches specifically? |
| 30 | Fix with no described symptom | `Fixed an issue.` | What was the issue? Where did it occur? |
| 31 | Third-person user action, no location | `User sets new password.` | Where in the UI? |
| 32 | Navigation to undefined destination | `Redirect to dashboard.` | What is the dashboard? Where in the UI? How accessed? |
| 33 | Incomplete step annotation | `(needs design)`, `(TBD)` | What are the actual steps? |
| 34 | Multi-step action collapsed | `Open settings and configure timeout` | Break into individual steps with UI locations. |
| 35 | State transition without indicator | `Service becomes active.` | What visible indicator shows this state change? |
| 36 | Navigation missing starting point | `Go to Settings.` | From where? What's the full path? |
| 37 | Deployment without rollback | `Deploy to production.` | What are the rollback steps if needed? |
| 38 | Scope selection without method | `Import selected tags.` | How does user select/specify items? |
| 39 | Conditional prerequisite undefined | `May need VPN connection.` | Under what specific conditions? |
| 40 | Success outcome missing | `Upload files.` | What does user see when this completes? |

#### Global (whole-source) checkers

| Checker | Trigger | Question |
|---|---|---|
| Implied prerequisites | Source contains `upload`, `deploy`, `credentials` | What must already exist before starting? |
| Intent–source mismatch | Intent keywords not found in source | Is this the correct source file? |

### False positive avoidance

Checkers are deliberately constrained to avoid noise:

- Checker 21 only triggers on curated action past participles, not state verbs like `is required`.
- Checker 22 skips lines already containing timing words (`daily`, `every`, `nightly`, etc.).
- Checker 23 skips lines that already declare convergence (`continue`, `proceed`, `return to step`).
- Checker 24 skips lines that already name a format (`CSV`, `JSON`, `XML`, etc.).
- Checker 29 skips if the vague quantifier is already followed by `require/need/must` (covered by checker 20).
- Checker 31 skips lines where the action is clearly CLI/terminal.
- Checker 32 skips lines where automaticity is explicit (`system automatically redirects`, `appears immediately`, etc.).
- Checker 34 only triggers when 3+ action verbs appear in one sentence.
- Checker 35 skips lines that already mention visible indicators.
- Checker 36 skips top-level navigation items (home, dashboard, main menu).
- Checker 37 only triggers for production/critical operations.
- Checker 38 skips lines where selection method is already stated.
- Checker 40 checks for terminal action steps without visible outcome.

### Why This Matters

Most AI hallucination is triggered by implicit assumptions in the source. Each checker targets a structural ambiguity pattern:

| Pattern class | Checkers |
|---|---|
| Actor ambiguity | 21, 31 |
| Navigation ambiguity | 32 |
| Temporal / schedule ambiguity | 22, 12 |
| Branch logic ambiguity | 3, 4, 23 |
| Data contract ambiguity | 24, 8, 9, 15 |
| Version / scope ambiguity | 25, 11 |
| Quantitative ambiguity | 26, 29 |
| Location ambiguity | 1, 14, 18, 31, 32, 36 |
| Incompleteness ambiguity | 27, 28, 30, 33 |

New checkers added:
- Multi-step collapse detection (34)
- State transition indicators (35)
- Navigation path completeness (36)
- Deployment rollback procedures (37)
- Scope selection methods (38)
- Conditional prerequisite triggers (39)
- Success outcome visibility (40)

Resolving these before the AI runs reduces governance violations and eliminates the need for multi-pass clarification in most cases.

---

## The three-phase pre-generation pipeline

The extension operates on a strict **analyse → question → generate** pipeline. No AI call is made until every blocking gap in the source has been answered by a human. This is the core mechanism that enforces the zero-invention policy.

```txt
┌─────────────────────────────────────────────────────────┐
│  PHASE 1 — GAP ANALYSIS                                 │
│  Source content is scanned before any prompt is built.  │
│  40 per-line checkers + 2 global checkers run in full.  │
│  Every structural weakness is catalogued into a         │
│  prioritised list of DetectedQuestion objects.          │
└───────────────────────────┬─────────────────────────────┘
                            │  gaps found?
                            ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 2 — INTERACTIVE QUESTIONING                      │
│  Each gap is shown to the user as a VS Code input box.  │
│  The user answers in plain language.                    │
│  Answers are captured as pre-clarifications.            │
│  No AI involvement at this stage — human fills gaps.    │
└───────────────────────────┬─────────────────────────────┘
                            │  all answers collected
                            ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 3 — ZERO-INVENTION PROMPT GENERATION             │
│  Prompt is built from: source + answers + governance.   │
│  Pre-clarifications are injected as authoritative facts.│
│  AI is forbidden from adding anything not in this set.  │
│  Output is a governed, complete, traceable document.    │
└─────────────────────────────────────────────────────────┘
```

---

### Phase 1 — gap analysis

**What happens:** The source content is passed to `detectQuestions()` in `questionDetector.ts`. Every line is stripped of list markers (e.g., `"1. "`, `"- "`) and run through all 40 per-line checkers. Two global checkers then run across the full source.

**What it detects:** The checkers target 9 structural ambiguity classes:

| Class | What it means | Example trigger |
|---|---|---|
| Location ambiguity | Step has no UI location | `Upload files.` |
| Actor ambiguity | No named performer | `The file is uploaded.` |
| Value ambiguity | No value, unit, or default given | `Set timeout.` |
| Branch logic ambiguity | Conditional with no defined outcome | `If ok → deploy.` |
| Temporal ambiguity | Action with no timing or schedule | `Run the job.` |
| Data contract ambiguity | Format, scope, or count unspecified | `Export the file.` |
| Navigation ambiguity | Destination exists but path does not | `Go to Settings.` |
| Verification ambiguity | Verification step with no method or success criteria | `Test connection.` |
| Incompleteness ambiguity | Placeholder, TBD, or collapsed multi-step action | `(needs design)` |

**Output:** A list of `DetectedQuestion` objects. Each carries:
- A unique `id` (used to match answers back)
- The `question` text shown to the user
- The `sourceContext` — the exact source line that triggered it
- An optional `placeholder` — a hint shown in the VS Code input box

**Key rule:** If no gaps are detected, Phase 2 is skipped entirely and the system proceeds directly to Phase 3.

**List-marker stripping (critical fix):** Before each line is passed to checkers, leading list markers are stripped:

```typescript
const normalized = trimmed.replace(/^(\d+[.)]\s+|[-*+•]\s+)/, "").trim();
```

This ensures that a step written as `"8. Check the status indicator."` is evaluated as `"Check the status indicator."` by checkers — so verb-anchored regex patterns such as `^(check|verify|confirm)` correctly fire. Without this, numbered or bulleted steps silently bypass checkers and gaps go undetected.

**Deduplication:** Each question carries a deterministic `id`. The `seen` set in the main loop ensures the same gap is never asked twice, even if multiple lines trigger the same checker.

---

### Phase 2 — interactive questioning

**What happens:** Each `DetectedQuestion` is presented to the user as a VS Code `showInputBox` call. The user types an answer in plain language. The system waits for each answer before proceeding — questions are asked sequentially.

**Question ordering:** Questions are not re-prioritised at runtime. They are asked in the order checkers fire: per-line checkers run first (in line order), then global checkers. This naturally surfaces location and actor gaps first, because those checkers (1, 21, 31) run early in the checker array.

**What the user provides:** Plain-language answers. Examples:

| Question | Typical answer |
|---|---|
| Where in the UI does the user perform this step? | `Connector > Upload` |
| What exactly does the system validate? | `Device connectivity` |
| What specific indicator means the condition is met? | `No error in log` |
| How does the user perform this verification and what does success look like? | `Click Validate — green tick appears` |

**What happens to answers:** Each answer is stored alongside its question in an ordered list. After all questions are answered, the full Q+A list is passed to `formatPreClarifications()`, which formats it into a `PRE-CLARIFICATIONS` block:

```
PRE-CLARIFICATIONS (collected before generation — authoritative facts, use directly):
[Q1] Where in the UI does the user perform this step? (Source: "Upload files.")
       Source line: "Upload files."
[A1] Connector > Upload

[Q2] What exactly does the system validate? (Source: "System validates something.")
       Source line: "System validates something."
[A2] Device connectivity
```

**Why this matters:** Answers come from the human who knows the system — not from the AI. This is the only point in the pipeline where new information enters. After this phase, the information set is closed. The AI may not add anything beyond what is now in the source plus the pre-clarifications.

**Skipping questions:** If the user leaves an answer blank, the system records `"(no answer provided)"`. The AI prompt instructs the AI to treat this as an unresolved gap and document it under Preserved Ambiguities — not to guess.

---

### Phase 3 — zero-invention prompt generation

**What happens:** `generatePrompt()` in `promptGenerator.ts` assembles the final prompt from four authoritative inputs:

1. **Governance rules** — injected verbatim from `governance.ts`
2. **Pre-clarifications block** — the formatted Q+A from Phase 2
3. **Source content** — the original text, marked as authoritative
4. **Task-specific output structure** — defined by task type

**The zero-invention contract:** The prompt instructs the AI that its information set is now complete and closed:

```
PRE-CLARIFICATIONS (collected before generation — authoritative facts, use directly):
...

SOURCE CONTENT (authoritative):
...
```

The AI is told to treat both the source and the clarifications as the totality of available facts. It may not supplement them.

**What the AI is explicitly forbidden from adding:**

| Forbidden addition | Governance rule that blocks it |
|---|---|
| Purpose clauses (`"to do X"`, `"so that X"`) | Rewrite policy: one sentence = one step |
| Navigation paths not in source or clarifications | Location gaps must be asked in Phase 2 |
| Parameter details not stated (e.g., expanding `"credentials"` to `"username and password"`) | Terminology rule |
| Prerequisite items inferred from steps | Prerequisite invention prohibition |
| Confirmation or verification steps not in source | Strict forbidden list |
| Scope generalisation (e.g., `"always restart"` from `"restart after deploy"`) | Strict forbidden list |

**Ambiguity handling in Phase 3:** Even after Phase 2 questioning, some vagueness may remain — specifically vagueness that does not block action. The prompt distinguishes two types:

- **ASK** — blocks action; must have been resolved in Phase 2
- **PRESERVE** — does not block action; documented as-is under Preserved Ambiguities

Examples of preserve cases:
- `"Find the one you need."` — vague selection criteria, but user knows which one
- `"Shows a message."` — message content unknown, but step is still actionable
- `"May need firewall exception."` — conditional note; kept with original conditional wording

**Section suppression:** If no prerequisites exist in the source or clarifications, the Prerequisites section is omitted entirely. If nothing was vague, Preserved Ambiguities is omitted. Empty sections are never generated.

**Result:** A prompt that the AI can execute in a single pass, with no questions remaining and no information gaps that would require invention to fill.

---

### Why this order is non-negotiable

The pipeline must run in the sequence analyse → question → generate. Reversing or skipping phases produces predictable failures:

| If you skip... | What happens |
|---|---|
| Phase 1 (gap analysis) | Gaps reach the AI; AI fills them by hallucinating |  
| Phase 2 (questioning) | Source is incomplete; AI invents to cover gaps |
| Phase 3 governance rules | AI generates fluent but unreliable documentation |

The extension enforces this by gating prompt construction: `generatePrompt()` is only called after question answers are collected.

---

## How it works

### End-to-end flow

#### Phase 1: prompt generation
1. **User selects content** in VS Code (or uses entire file)
2. **User triggers command**: "Generate Documentation Prompt"
3. **Extension captures**:
   - Selected text or full document content
   - Document language ID
   - Original text for later diff comparison
4. **User selects task type** from quick pick menu (7 options)
5. **User provides intent** via input box (e.g., "Document login process")
6. **Engine generates governed prompt**:
   - Applies governance rules
   - Injects task-specific output structure
   - Includes source content
   - Adds missing information policy
7. **Extension displays prompt**:
   - Opens in new editor (split view)
   - Automatically copies to clipboard
   - Shows success notification

#### Phase 2: AI interaction (external)
8. **User pastes prompt** into AI assistant (Claude, ChatGPT, etc.)
9. **AI generates response** following governance rules
10. **User receives**:
    - Structured documentation, OR
    - Clarifying questions if generation is blocked

#### Phase 3: paste AI response + immediate governance check (NEW)

Instead of manually copying the response and triggering the diff:

11. **User runs `docAgent.pasteAiResponse`** — "Paste AI Response and Run Governance Check"
12. **Extension**:
    - Verifies source context exists (generateDocumentation was run first)
    - Reads AI response from clipboard
    - Opens it in a new untitled markdown editor **beside the source file** (`ViewColumn.Beside`)
    - Automatically triggers `docAgent.previewRewriteDiff`
13. **Profile picker opens** → user selects governance profile
14. **Governance Panel opens immediately** — no manual steps required

This creates a true end-to-end workflow with no manual editor setup.

#### Phase 4: clarification loop (optional)

11. **If AI asks questions**:

    - User runs "Provide Clarifications and Regenerate Prompt"
    - User enters answers to AI's questions
    - Extension regenerates prompt with clarifications section
    - Prompt includes: "Clarifications have been provided - treat as authoritative facts"
    - User pastes updated prompt into AI
    - AI generates documentation using clarifications

#### Phase 4: diff preview
12. **User triggers**: "Preview Documentation Rewrite Diff"
13. **Extension retrieves AI response** from:
    - Current editor content (if available), OR
    - Clipboard content
14. **Extension opens diff view**:
    - Left panel: Original content
    - Right panel: AI-generated content
    - Side-by-side comparison with inline changes highlighted
15. **User reviews**:
    - Check "Preserved Ambiguities" section
    - Verify no invented features
    - Validate terminology consistency
    - Review "Governance Notes" if present (indicates violations)

---

## Core components

### 1. Extension entry point (`src/extension.ts`)

**Responsibilities:**
- Register **four** commands with VS Code
- Manage state between commands (context persistence)
- Handle user input and validation
- Coordinate with prompt generation engine
- Manage clipboard operations
- Open diff views

**Registered Commands:**
- `docAgent.generateDocumentation`
- `docAgent.previewRewriteDiff`
- `docAgent.provideClarifications`
- `docAgent.pasteAiResponse` ← NEW

**Key State Variables:**
```typescript
// Stores original content for diff comparison
let lastRewriteContext: {
  originalText: string;
  languageId: string;
} | null = null;

// Stores prompt context for clarification regeneration
let lastPromptContext: {
  taskType: TaskType;
  userIntent: string;
  context: string;
} | null = null;
```

**Activation:**
- Extension activates when VS Code loads (no specific activation events)
- Commands are immediately available in command palette

### 2. Governance rules (`src/engine/governance.ts`)

**Purpose:** Define the immutable rules that govern all AI behavior

**Rules:**
```typescript
export const GOVERNANCE_RULES = `
GOVERNANCE RULES:
- Do not invent features, permissions, or behavior that are not stated or implied
- Do not change established terminology from the source
- Do not add steps that require inventing information
- Preserve ambiguity when the source is vague - document it as-is
- Do not rewrite for style or elegance
`;
```

**Why these rules:**
- **No invention**: Prevents AI from adding features that don't exist
- **No terminology changes**: Preserves domain-specific language
- **No invented steps**: Ensures procedures reflect actual behavior
- **Preserve ambiguity**: Documents uncertainty instead of guessing
- **No style rewriting**: Focuses on correctness, not elegance

### 3. Prompt generator (`src/engine/promptGenerator.ts`)

**Purpose:** Core engine that constructs governance-driven prompts

**Key Function:**
```typescript
export function generatePrompt(input: PromptInput): string
```

**Input Interface:**
```typescript
export interface PromptInput {
  taskType: TaskType;        // Task type
  userIntent: string;         // User's description
  context: string;            // Source content
  clarifications?: string;    // Optional answers to AI questions
}
```

**Prompt Structure:**

Every generated prompt contains:

1. **System Instructions**
   - Role definition: "You are a Technical Documentation Agent"
   - Governance rules (from governance.ts)
   - Rewrite policy

2. **Missing Information Policy** (conditional)
   - **Without clarifications**: Instructions on when to ask questions vs. preserve ambiguity
   - **With clarifications**: Instructions to treat clarifications as authoritative

3. **User Intent**
   - The description user provided (e.g., "Document the login process")

4. **Source Content**
   - The actual text selected/opened by user
   - Marked as "authoritative"

5. **Clarifications Section** (optional)
   - Present only when regenerating after AI asked questions
   - Marked as "authoritative - treat as facts"

6. **Task-Specific Output Structure**
   - Defined by task type
   - Includes mandatory headings
   - Always includes "Preserved Ambiguities" and "Governance Notes" sections

**Missing Information Handling Logic:**

The extension uses sophisticated logic to determine when AI should ask questions:

**Ask questions when:**
- Documentation requires inventing specific steps or features not mentioned
- There are undefined references (e.g., "standard workflow", "usual process")
- Logical gaps make the task impossible to complete factually

**DO NOT ask questions about:**
- Vague but valid descriptions (e.g., "extra options", "show error")
- Missing context that doesn't block the core task
- Details that can be documented with preserved ambiguity

This creates a "smart ambiguity tolerance" - AI can proceed with vague inputs as long as it documents the vagueness explicitly.

### 4. Type system (`src/engine/types.ts`)

**Supported Task Types:**
```typescript
export type TaskType =
  | "procedure"           // Step-by-step instructions
  | "concept"            // Technical explanations
  | "troubleshooting"    // Problem-solving guides
  | "reference"          // API/feature reference docs
  | "tutorial"           // Learning-focused guides
  | "release-notes"      // Version change documentation
  | "api-documentation"; // API endpoint documentation
```

---

## Command details

### Command 1: `docAgent.generateDocumentation`

**Display Name:** "Generate Documentation Prompt"

**Purpose:** Generate a governance-driven AI prompt from selected content

**Trigger:** Command Palette → "Generate Documentation Prompt"

**Workflow:**
1. Check if editor is active
2. Get selected text (or full document if no selection)
3. Validate content exists
4. Store original content for later diff
5. Show quick pick menu with 7 task types
6. Show input box for user intent
7. Generate prompt using engine
8. Store prompt context for clarifications
9. Copy prompt to clipboard
10. Open prompt in new editor (split view)
11. Show success notification

**Error Handling:**
- No active editor → Error: "No active editor found"
- Empty content → Error: "No content found"
- User cancels type selection → Silent exit
- User cancels intent input → Silent exit
- Generation fails → Error with exception message

**User Experience:**
- Prompt opens beside current editor
- Clipboard is pre-populated for easy pasting
- Original editor remains open for reference

### Command 2: `docAgent.previewRewriteDiff`

**Display Name:** "Preview Documentation Rewrite Diff"

**Purpose:** Compare original content with AI-generated documentation

**Trigger:** Command Palette → "Preview Documentation Rewrite Diff"

**Prerequisites:**
- User must have previously run "Generate Documentation Prompt"
- AI response must be available (in editor or clipboard)

**Workflow:**
1. Check if rewrite context exists
2. Attempt to get AI response from multiple sources (priority order):
   - Current active editor (saved file with content)
   - Current active editor (untitled document with content)
   - Clipboard content
3. Validate AI response exists
4. Create temporary document with original content
5. Create temporary document with AI response
6. Open VS Code diff view (side-by-side)
7. Title diff: "Documentation Rewrite Preview"

**Error Handling:**
- No prior prompt generation → Error: "No rewrite context found. Please run 'Generate Documentation Prompt' first."
- Empty clipboard and no editor content → Error: "Clipboard is empty. Please copy the AI response first."
- Diff command fails → Error with exception message

**User Experience:**
- Original content on left (marked as read-only)
- AI response on right (marked as read-only)
- Changes highlighted with VS Code's diff colors
- Can scroll both panels synchronously
- User decides whether to accept, reject, or modify

### Command 3: `docAgent.provideClarifications`

**Display Name:** "Provide Clarifications and Regenerate Prompt"

**Purpose:** Answer AI questions and regenerate prompt with clarifications

**Trigger:** Command Palette → "Provide Clarifications and Regenerate Prompt"

**Prerequisites:**
- User must have previously run "Generate Documentation Prompt"
- AI must have asked clarifying questions

**Workflow:**
1. Check if prompt context exists
2. Show input box for clarifications
3. Validate clarifications are provided
4. Regenerate prompt with same context + clarifications
5. Copy new prompt to clipboard
6. Open new prompt in editor (split view)
7. Show success notification

**Clarifications Integration:**
The regenerated prompt includes:
```
CLARIFICATIONS (authoritative - treat as facts):
[User's answers to AI questions]
```

And modified missing information policy:
```
MISSING INFORMATION HANDLING:
- Clarifications have been provided below that resolve missing information
- Use the clarifications as authoritative facts
- Only ask about information NOT covered by the clarifications
- If clarifications resolve all gaps, proceed with generation
```

**Error Handling:**
- No prior prompt generation → Error: "No prompt context found"
- Empty clarifications → Validation error in input box
- Regeneration fails → Error with exception message

---

### Command 4: `docAgent.pasteAiResponse`

**Display Name:** "Paste AI Response and Run Governance Check"

**Purpose:** Full automation of the post-AI review cycle — reads the AI response from clipboard, opens it beside the source, and immediately triggers governance validation.

**Trigger:** Command Palette → "Paste AI Response and Run Governance Check"

**Prerequisites:**
- User must have previously run "Generate Documentation Prompt"
- AI response must be copied to clipboard

**Workflow:**
1. Check if source context exists (`lastRewriteContext`)
2. Read AI response from clipboard
3. Validate clipboard is not empty
4. Open AI response as an untitled markdown document in `ViewColumn.Beside`
5. Automatically execute `docAgent.previewRewriteDiff`
6. Profile picker opens → Governance Panel opens immediately

**Error Handling:**
- No prior prompt generation → Error: "No source context found. Run 'Generate Documentation Prompt' first."
- Empty clipboard → Error: "Clipboard is empty. Copy the AI response first."
- Command fails → Error with exception message

**Result:**
- AI response is visible in a clean editor beside the source
- Diff preview and governance check are triggered automatically
- No manual editor setup or diff trigger required

### Philosophy

The governance system is the core differentiator of this extension. It transforms AI from a "helpful assistant that often lies" into a "constrained agent that preserves truth."

Governance is now strengthened by:

* **Structural ambiguity detection before generation** — 32 gap checkers catch missing actors, formats, schedules, branch convergence, version scopes, navigation destinations, and quantitative ambiguity before the AI is called.
* **Explicit quantitative and version validation** — checkers 15, 25, 26 enforce numeric and scope precision.
* **Branch convergence enforcement** — checker 23 ensures multi-branch logic has a defined common path.
* **Actor accountability enforcement** — checkers 21 and 31 ensure every action has a named performer.
* **Navigation clarity enforcement** — checker 32 ensures every navigation statement specifies the destination, path, and method.

The system now addresses both **semantic hallucination** and **structural incompleteness**.

### Enforcement mechanism

Governance is enforced through **prompt engineering**, not through technical controls. The extension:

1. Injects governance rules into every prompt
2. Instructs AI to continue even if it violates rules
3. Requires AI to document violations in "Governance Notes" section

This creates **observable governance** - violations are visible, not prevented.

### Rule breakdown

#### Rule 1: no feature invention
**What it prevents:**
- Adding features that don't exist
- Implying capabilities not mentioned
- Extrapolating from similar products

**Example:**
- ❌ Bad: "User clicks login, enters credentials, or uses SSO"
- ✅ Good: "User clicks login and enters credentials" (if SSO not mentioned)

#### Rule 2: no terminology changes
**What it prevents:**
- Replacing domain-specific terms with "clearer" alternatives
- Normalizing inconsistent terminology
- Using industry-standard terms when source uses different terms

**Example:**
- Source says: "refresh token rotation"
- ❌ Bad: AI changes to "token refresh mechanism"
- ✅ Good: AI keeps "refresh token rotation"

#### Rule 3: No Invented Steps
**What it prevents:**
- Adding steps that "should" exist
- Filling logical gaps with assumptions
- Borrowing steps from similar processes

**Example:**
- Source: "User clicks submit. Data is validated."
- ❌ Bad: "User fills form, clicks submit, data is validated"
- ✅ Good: Document as-is (or ask: "What happens before submit?")

#### Rule 4: Preserve Ambiguity
**What it prevents:**
- Resolving vague language with guesses
- Converting "some", "various", "extra" into specifics
- Making absolute statements from relative ones

**Example:**
- Source: "Admin users get extra features"
- ❌ Bad: "Admin users can manage users and view reports"
- ✅ Good: "Admin users get extra features" + note in Preserved Ambiguities

#### Rule 5: No Style Rewriting
**What it prevents:**
- Polishing rough language
- Improving sentence structure when meaning is clear
- Making documentation "sound better"

**Example:**
- Source: "Thing happens. Then other thing happens."
- ❌ Bad: "When the first event occurs, it triggers a subsequent event."
- ✅ Good: Reorder for clarity if needed, but keep informal tone

### Preserved Ambiguities Section

Every output includes a **Preserved Ambiguities** section that lists:
- Vague terms documented as-is
- Undefined references
- Implicit assumptions
- Missing details

**Purpose:**
- Makes uncertainty visible to reviewers
- Helps identify gaps in source material
- Distinguishes "incomplete docs" from "complete docs of incomplete specs"

**Example:**
```markdown
## Preserved Ambiguities
- "Extra features" for admin users - not specified in source
- "Standard workflow" - undefined reference
- Error handling behavior - not mentioned in source
```

### Governance Notes Section

Only included when AI violates governance rules.

**Purpose:**
- Documents where AI couldn't follow rules
- Helps improve source content or prompts
- Maintains transparency about AI limitations

**Example:**
```markdown
## Governance Notes
- Added "typically" when describing behavior to avoid stating certainty
- Reordered steps for logical flow (source order was unclear)
```

---

## Prompt Generation Logic

### Task-Specific Output Structures

Each documentation type has a predefined structure:

#### 1. Procedure
```markdown
Prerequisites
Procedure
Notes
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
```

**Use case:** Step-by-step user instructions, deployment guides, setup procedures

#### 2. Concept
```markdown
Overview
Key Components
Process Flow
Important Considerations
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
```

**Use case:** Architectural explanations, system designs, technical concepts

#### 3. Troubleshooting
```markdown
Symptoms
Possible Causes
Verification Steps
Resolution
Prevention
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
```

**Use case:** Problem-solving guides, error resolution, diagnostic procedures

#### 4. Reference
```markdown
Description
Parameters / Options
Examples
Related Information
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
```

**Use case:** Configuration references, command references, feature catalogs

#### 5. Tutorial
```markdown
Objective
Prerequisites
Steps
Verification
Next Steps
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
```

**Use case:** Learning-focused guides, getting started guides, hands-on tutorials

#### 6. Release Notes
```markdown
New Features
Improvements
Bug Fixes
Breaking Changes (if applicable)
Known Issues (if applicable)
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
```

**Use case:** Version releases, changelog entries, update announcements

#### 7. API Documentation
```markdown
Endpoint / Function
Description
Request / Parameters
Response / Return Value
Examples
Error Handling
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
```

**Use case:** REST API docs, function documentation, SDK references

### Dynamic Sections

Some sections are **conditional**:

- **Preserved Ambiguities**: Only if source content has vague elements
- **Governance Notes**: Only if AI violated rules
- **Breaking Changes**: Only for release notes with breaking changes
- **Known Issues**: Only for release notes with known issues

This prevents empty sections in output.

---

## Workflow Details

### Workflow 1: Fast Path (NEW — Recommended)

**Scenario:** Clean source, single pass, no manual steps

1. Select content in VS Code
2. Run "Generate Documentation Prompt"
3. Answer any gap detection questions (or skip)
4. Paste prompt into AI
5. Copy AI response
6. Run "Paste AI Response and Run Governance Check"
7. Review Governance Panel → Accept or Override

**Timeline:** 2–3 minutes. No manual editor setup required.

### Workflow 2: Simple Documentation Generation

**Scenario:** User has complete, clear source material

1. Select content in VS Code
2. Run "Generate Documentation Prompt"
3. Choose documentation type (e.g., "Procedure")
4. Describe intent: "Document the deployment process"
5. Paste prompt into Claude/ChatGPT
6. Receive structured documentation
7. Run "Preview Documentation Rewrite Diff"
8. Review changes and preserved ambiguities
9. Accept or modify as needed

**Timeline:** 2-3 minutes

### Workflow 2: Documentation with Clarifications

**Scenario:** Source material has critical gaps

1. Select incomplete content
2. Run "Generate Documentation Prompt"
3. Choose task type
4. Describe intent
5. Paste prompt into AI
6. **AI responds with questions** (e.g., "What happens after validation fails?")
7. Run "Provide Clarifications and Regenerate Prompt"
8. Enter answers to AI questions
9. Paste regenerated prompt into AI
10. Receive complete documentation
11. Preview diff and review

**Timeline:** 5-7 minutes

### Workflow 3: Iterative Refinement

**Scenario:** Multiple rounds of clarification needed

1. Generate initial prompt → AI asks questions (batch 1)
2. Provide clarifications → AI asks more questions (batch 2)
3. Provide more clarifications → AI generates documentation
4. Preview and review

**Timeline:** 10-15 minutes

**Note:** Extension stores prompt context throughout, so each regeneration preserves:
- Task type
- User intent
- Original source content
- All previous clarifications (cumulative)

---

## Extension API

### Exported Activation Function

```typescript
export function activate(context: vscode.ExtensionContext): void
```

**Registers:**
- `docAgent.generateDocumentation`
- `docAgent.previewRewriteDiff`
- `docAgent.provideClarifications`
- `docAgent.pasteAiResponse` ← NEW

### Exported Deactivation Function

```typescript
export function deactivate(): void
```

**Purpose:** Cleanup (currently no-op)

### Dependencies

**Runtime Dependencies:**
```json
{
  "vscode": "^1.104.0"  // VS Code Extension API
}
```

**Development Dependencies:**
```json
{
  "@types/vscode": "^1.104.0",
  "@types/node": "^22.10.2",
  "typescript": "^5.7.2",
  "esbuild": "^0.24.2"
}
```

### Build System

- **Compiler:** TypeScript 5.7.2
- **Bundler:** esbuild 0.24.2
- **Target:** ES2022
- **Module:** CommonJS
- **Output:** `out/extension.js` (single file bundle)

**Build Commands:**
```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch mode for development
npm run package    # Create .vsix package
npm run publish    # Publish to marketplace
```

### Configuration

**Extension Manifest (package.json):**
- **Name:** `doc-agent-orchestrator`
- **Display Name:** "Documentation Agent Orchestrator"
- **Version:** 1.0.0
- **Publisher:** TharunSebastian
- **License:** MIT
- **Activation:** On VS Code startup (no specific events)

**No User Settings:**
- Extension has no configurable settings
- All behavior is hardcoded for consistency
- Governance rules are immutable

---

## Advanced Topics

### State Management

The extension uses **module-level variables** for state persistence:

```typescript
let lastRewriteContext: {
  originalText: string;
  languageId: string;
} | null = null;
```

**Lifecycle:**
- Set when "Generate Documentation Prompt" runs
- Read when "Preview Documentation Rewrite Diff" runs
- Persists until VS Code closes
- Lost on window reload

```typescript
let lastPromptContext: {
  taskType: TaskType;
  userIntent: string;
  context: string;
} | null = null;
```

**Lifecycle:**
- Set when "Generate Documentation Prompt" runs
- Read when "Provide Clarifications and Regenerate Prompt" runs
- Updated with each regeneration
- Lost on window reload

**Design Decision:** No persistent storage (workspace state, global state) because:
- State is short-lived (minutes, not hours)
- Re-running generation is fast if context is lost
- Simpler implementation
- No cleanup needed

### Clipboard Integration

The extension uses VS Code's clipboard API:

```typescript
await vscode.env.clipboard.writeText(prompt);  // Write
const text = await vscode.env.clipboard.readText();  // Read
```

**Write Strategy:**
- Automatic copy on prompt generation
- User doesn't need to manually copy
- Can still review in editor before pasting

**Read Strategy:**
- Fallback for diff preview
- Used when AI response not in editor
- No parsing or validation (trusts clipboard content)

### Diff View

Uses VS Code's built-in diff command:

```typescript
await vscode.commands.executeCommand(
  "vscode.diff",
  originalDoc.uri,
  rewrittenDoc.uri,
  "Documentation Rewrite Preview"
);
```

**Parameters:**
- `originalDoc.uri`: Left side (original content)
- `rewrittenDoc.uri`: Right side (AI response)
- `"Documentation Rewrite Preview"`: Tab title

**Features Inherited from VS Code:**
- Syntax highlighting
- Inline diff markers
- Synchronized scrolling
- Jump to next/previous change
- No save capability (read-only preview)

### Error Handling Philosophy

**User Errors (Expected):**
- Shown via `vscode.window.showErrorMessage()`
- Clear, actionable messages
- No stack traces

**System Errors (Unexpected):**
- Shown via `vscode.window.showErrorMessage()` with exception message
- Logged to console: `console.error()`
- Includes full error object for debugging

**Silent Failures:**
- User cancels operation → No notification
- Optional inputs skipped → No warning

### Extension Security

**No Network Calls:**
- Extension doesn't communicate with external services
- AI interaction is manual (copy/paste)
- No API keys or credentials needed

**No File System Writes:**
- Except when user explicitly saves documents
- No automatic file creation or modification
- Generated prompts are temporary documents

**No Telemetry:**
- No usage tracking
- No error reporting to external services
- No analytics

**Content Privacy:**
- Source content stays local
- Only leaves VS Code when user manually pastes into AI
- No logging of sensitive content

---

## Performance Characteristics

### Prompt Generation
- **Time:** < 50ms (instant)
- **Memory:** Minimal (single string concatenation)
- **CPU:** Negligible

### Diff Preview
- **Time:** < 200ms (dominated by VS Code rendering)
- **Memory:** Holds two copies of content in memory
- **CPU:** VS Code's diff algorithm (optimized)

### Large Documents
- **Tested up to:** 10,000 lines
- **Performance:** Remains instant for generation
- **Limitation:** AI context window, not extension

---

## Testing

### Test Suite Location
`TESTING/` directory contains:
- 25 test input files
- 15+ test response files
- Test report with findings

### Test Categories
1. **Complete input** - All necessary information provided
2. **Incomplete input** - Missing critical details
3. **Ambiguous input** - Vague but documentable content
4. **Edge cases** - Unusual content types

### Manual Testing Workflow
1. Open test input file
2. Run "Generate Documentation Prompt"
3. Paste into AI (Claude recommended)
4. Compare AI response with expected behavior:
   - Did AI invent features? (Should not)
   - Did AI preserve ambiguities? (Should)
   - Did AI ask questions when needed? (Should)
   - Did AI follow output structure? (Should)

### No Automated Tests
- Extension testing would require VS Code test environment
- Core logic (prompt generation) is deterministic
- AI behavior testing requires external services
- Manual testing is sufficient for current scope

---

## Limitations and Known Issues

### Current Limitations

1. **Context lost on reload**
   - Rewrite context doesn't persist across VS Code restarts
   - User must regenerate prompt after reload

2. **No multi-document support**
   - Can only generate from one document at a time
   - No aggregation of multiple files

3. **No prompt templates**
   - Output structures are fixed
   - Cannot customize governance rules per user

4. **Manual AI interaction**
   - No direct AI integration
   - Requires copy/paste workflow

5. **No response validation**
   - Extension doesn't parse AI responses
   - Cannot verify AI followed governance rules
   - User must manually review

### Design Limitations (Intentional)

1. **No AI API integration**
   - Keeps extension AI-agnostic
   - Works with any AI assistant
   - No API costs or rate limits

2. **No automatic acceptance**
   - Forces human review
   - Maintains accountability

3. **No style improvements**
   - Deliberately excluded
   - Focuses on correctness only

### Future Considerations

**Possible Enhancements:**
- Persistent context storage
- Custom governance rule templates
- Multi-file aggregation
- AI response parsing and validation
- Direct AI integration (optional)
- Workspace-level configuration

**Not Planned:**
- Style/grammar improvements
- Automatic documentation
- AI model training
- Content generation without source

---

## Troubleshooting

### Problem: "No active editor found"
**Cause:** No editor window is open or focused
**Solution:** Open a file before running the command

### Problem: "No rewrite context found"
**Cause:** Haven't run "Generate Documentation Prompt" yet
**Solution:** Generate prompt first, then preview diff

### Problem: Clipboard is empty for diff preview
**Cause:** AI response not copied or lost
**Solution:** 
1. Paste AI response into a new VS Code file
2. Run diff preview (will use editor content instead)

### Problem: Prompt regeneration fails
**Cause:** Context was lost (VS Code reload)
**Solution:** Re-run "Generate Documentation Prompt" from beginning

### Problem: AI doesn't follow governance rules
**Cause:** AI model doesn't respect instructions
**Solution:**
1. Try different AI model (Claude > GPT-4 > GPT-3.5)
2. Regenerate and paste prompt again
3. Report in "Governance Notes" section if AI documents violations

### Problem: Extension commands not visible
**Cause:** Extension not activated or installed
**Solution:**
1. Check Extensions panel: "Documentation Agent Orchestrator" installed
2. Reload VS Code
3. Run command from Command Palette (Ctrl+Shift+P)

---

## Contributing and Development

### Development Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/Tharun135/doc-agent-orchestrator
   cd doc-agent-orchestrator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile TypeScript:**
   ```bash
   npm run compile
   ```

4. **Run in Extension Development Host:**
   - Press F5 in VS Code
   - New VS Code window opens with extension loaded

5. **Make changes:**
   - Edit files in `src/`
   - Run `npm run watch` for auto-compilation
   - Reload extension host (Ctrl+R in dev window)

### Code Style

- **Language:** TypeScript 5.7
- **Formatting:** None enforced (use default TypeScript style)
- **Linting:** ESLint configured (see `eslint.config.mjs`)

### Adding New Task Types

1. **Add type to `src/engine/types.ts`:**
   ```typescript
   export type TaskType =
     | "procedure"
     | "concept"
     // ... existing types
     | "your-new-type";
   ```

2. **Add to quick pick in `src/extension.ts`:**
   ```typescript
   { label: "Your New Type", value: "your-new-type" }
   ```

3. **Create output spec function in `src/engine/promptGenerator.ts`:**
   ```typescript
   function yourNewTypeOutputSpec(): string {
     return `
   TASK:
   Rewrite the source content into [your type].
   
   OUTPUT STRUCTURE (use exactly these headings):
   Heading 1
   Heading 2
   ...
   `;
   }
   ```

4. **Add case to switch statement:**
   ```typescript
   case "your-new-type":
     return base + yourNewTypeOutputSpec();
   ```

### Publishing

```bash
npm run package  # Creates .vsix file
npm run publish  # Publishes to marketplace (requires PAT)
```

**Requirements:**
- VS Code Extension Manager (vsce) installed
- Publisher account on VS Code Marketplace
- Personal Access Token (PAT) from Azure DevOps

---

## Appendix

### Full Prompt Example

**Input:**
- Task type: Procedure
- User intent: "Document the login process"
- Source content: "User enters username and password, clicks submit. System validates credentials. Redirect to dashboard on success."

**Generated Prompt:**
```markdown
SYSTEM:
You are a Technical Documentation Agent.

GOVERNANCE RULES:
- Do not invent features, permissions, or behavior that are not stated or implied
- Do not change established terminology from the source
- Do not add steps that require inventing information
- Preserve ambiguity when the source is vague - document it as-is
- Do not rewrite for style or elegance

REWRITE POLICY:
- Rewrite the source content into structured documentation
- Preserve original meaning and intent
- Reorder or clarify only when necessary for correctness

MISSING INFORMATION HANDLING:
- Ask questions ONLY when documentation cannot be generated without inventing behavior
- Preserve ambiguity from the source content - document vague details as-is
- Stop and ask questions if:
  • The task requires inventing specific steps or features not mentioned
  • There are undefined references (e.g., "standard workflow", "usual process")
  • Logical gaps make the task impossible to complete factually
- Do NOT ask questions about:
  • Vague but valid descriptions (e.g., "extra options", "show error")
  • Missing context that doesn't block the core task
  • Details that can be documented with preserved ambiguity

GOVERNANCE ENFORCEMENT:
- If any governance rule is violated:
  - Continue generation
  - Add a "Governance Notes" section listing the issues

PRESERVED AMBIGUITIES:
- When source content is vague but documentable, explicitly list what was preserved
- Add a "Preserved Ambiguities" section noting any vague terms documented as-is
- This helps reviewers understand intentional vagueness vs. missing research

USER INTENT:
Document the login process

SOURCE CONTENT (authoritative):
User enters username and password, clicks submit. System validates credentials. Redirect to dashboard on success.

TASK:
Rewrite the source content into a user-facing procedure.

OUTPUT STRUCTURE (use exactly these headings):
Prerequisites
Procedure
Notes
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
```

### Example AI Response

```markdown
# User Login

## Prerequisites
- Valid username and password credentials

## Procedure
1. Enter your username in the username field
2. Enter your password in the password field
3. Click the submit button
4. System validates your credentials
5. If credentials are valid, you are redirected to the dashboard

## Notes
- Invalid credentials are not described in the source material

## Preserved Ambiguities
- "Dashboard" destination - no details provided about dashboard content or URL
- Error handling for invalid credentials - behavior not specified in source
- Form field labels - assumed "username" and "password" based on source terminology
```

---

## Summary

**Documentation Agent Orchestrator** is a VS Code extension that bridges the gap between AI capability and documentation trustworthiness. It works by:

1. **Running gap detection** on the source — 40 checkers identify structural weaknesses before the AI is called
2. **Injecting governance rules** into AI prompts — zero-invention policy enforced at every generation
3. **Structuring output** with task-specific templates
4. **Preserving ambiguity** instead of inventing details
5. **Enabling clarification loops** when needed
6. **Providing diff previews and governance scoring** for validation
7. **Automating the review cycle** — paste AI response and governance check trigger in one command

The extension doesn't try to make AI smarter — it makes AI behaviour **constrained, observable, and defensible**.

**Core insight:** AI is fluent but unreliable. By proactively resolving structural gaps before generation, enforcing zero-invention rules in the prompt, and making all governance violations visible, the extension transforms AI into a tool for creating accurate documentation from incomplete specifications.

**Gap detection is not about catching bad AI. It is about not giving AI bad inputs.**
