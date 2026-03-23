# Documentation Agent Orchestrator

Generate governance-driven AI prompts for technical documentation and preview rewrites with side-by-side diffs.

---

## Documentation agent orchestrator

Documentation agent orchestrator is an AI-powered assistant designed to help technical writers and documentation engineers create accurate, trustworthy documentation. Unlike traditional AI writing tools that prioritize fluency over correctness, this extension enforces strict governance rules to ensure AI never invents features, implies non-existent steps, or fills gaps with guesses.

### How documentation agent orchestrator works

Documentation Agent Orchestrator is a workflow orchestrator, not a writing assistant. It operates in four stages:

1. **Pre-AI structural validation** — scans your source for information gaps before anything is sent to the AI
2. **Interactive clarification** — asks you targeted questions for each gap and collects authoritative answers
3. **Governance rule enforcement** — builds a prompt with strict rules that prevent the AI from inventing, inferring, or paraphrasing
4. **Post-AI diff validation** — shows a side-by-side diff of every change so you can verify nothing was added that wasn't in the source

The result is a structurally complete document based strictly on the information provided — not a fluent document that filled the gaps with guesses.

The extension bridges VS Code with your preferred AI assistant (ChatGPT, Claude, Copilot, etc.) by generating governed prompts and providing diff previews so you can validate every change before accepting it.

### Key features

**Structural Gap Classification**: Before building the AI prompt, the extension classifies your source against 19 structural gap patterns—UI locations, undefined conditions, vague enumerations, missing units, absent documents, embedded conditional actions, role-based access gaps, and more. For every gap found, it asks you a targeted question inside VS Code. Your answers are injected into the prompt as authoritative facts, so the AI never has to guess.

**Two-Tier Ambiguity Handling**: Not all vagueness is equal. The extension distinguishes between ambiguity that *can* be preserved faithfully ("shows a message", "extra options") and gaps that *block* the user from acting (missing UI location, "validates something", bare "check logs"). The first kind is documented as-is. The second triggers a question before generation.

**Governance-Driven Prompts**: Generates AI prompts with strict rules that prevent feature invention, terminology changes, and silent assumptions.

**Side-by-Side Diff Preview**: Compare original content with AI-generated documentation in a visual diff view before accepting changes.

**Post-Generation Clarification Workflow**: If gaps are skipped at the question stage, the AI identifies what is still unclear in a Preserved Ambiguities section. You can then provide answers and regenerate.

**Multiple Documentation Types**: Supports Procedures, Concepts, and Troubleshooting guides—document types where correctness matters more than phrasing.

**Remember**: Documentation Agent Orchestrator is a tool to enforce correctness, not to improve writing style. It exists to make AI output trustworthy and defensible.

---

## Getting started

### Install extension

Simply install the extension from the VS Code marketplace. Search for "Documentation Agent Orchestrator" and click install.

You can also visit the [GitHub repository](https://github.com/Tharun135/doc-agent-orchestrator) for manual installation instructions.

### Requirements

- **VS Code**: Version 1.104.0 or later
- **AI Assistant**: Access to ChatGPT, Claude, GitHub Copilot, or any AI assistant that accepts text prompts

You're now ready to use Documentation Agent Orchestrator.

---

## Basic example

Let's walk through a simple documentation generation workflow:

### Step 1: Prepare your source content

Create a new file called `deployment-notes.md` and add some rough notes:

```markdown
# Database Migration

Need to run migrations before deploying
Use the migration script
Backup database first maybe?
```

### Step 2: Generate the prompt

1. Select all the content in your file
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type "Generate Documentation (Governed Mode)" and select the command
4. Choose **Procedure** as the documentation type

**The extension classifies your source for structural gaps before building the prompt.**

For the example above it will detect:
- `"Backup database first maybe?"` — conditional note, does not block action (PRESERVE)
- `"Use the migration script"` — no script name or location, blocks documentation (ASK)

For each ASK-level gap a VS Code input box appears. You type the answer and it is injected into the prompt as an authoritative fact. If you skip a question, the gap is documented in Preserved Ambiguities instead.

The final prompt includes:
- Your source content
- Your answers to gap questions (as PRE-CLARIFICATIONS)
- Strict rules preventing AI from inventing details
- Instructions to preserve remaining ambiguities

### Step 3: Use your AI assistant

1. Copy the generated prompt (it's automatically copied to your clipboard)
2. Paste it into your AI assistant (ChatGPT, Claude, etc.)
3. Review the AI's response

The AI might generate something like:

```markdown
# Database Migration Procedure

## Prerequisites
- Database backup (method not specified)
- Access to migration script

## Steps
1. Create a database backup
2. Run the migration script

## Preserved Ambiguities
- **"Backup database first maybe?"**: It is unclear whether the backup is required or optional
- **"Use the migration script"**: The specific migration script name, location, and parameters are not specified
- **"Need to run migrations before deploying"**: The timing relationship and deployment process are not detailed
```

Notice how the AI preserved ambiguities instead of inventing details? That's governance in action.

### Step 4: Preview the diff

1. Copy the AI's response
2. Return to VS Code
3. Run "Preview Documentation Rewrite Diff" from the Command Palette
4. Paste the AI response when prompted

You'll see a side-by-side diff showing:

- **Left**: Your original content
- **Right**: AI-generated documentation

Review the changes carefully. Check the "Preserved Ambiguities" section to see what the AI identified as unclear.

### Step 5: Accept or iterate

- If the documentation looks correct and ambiguities are accurately identified, create a new file with the generated content
- If you need to clarify ambiguous points, run "Provide Clarifications and Regenerate Prompt" to answer the AI's questions and generate an updated prompt

---

## Structural gap classes

Before building the AI prompt, the extension classifies your source against 19 structural gap patterns. Each class represents a category of missing information that would force the AI to invent an answer if left unresolved.

This is not a list of keyword triggers — it is a classification model. Each class has a defined detection rule, a specific question template, and a known failure mode it prevents.

| Class | Gap type | Example source line | Failure prevented |
|---|---|---|---|
| 1 | Action verb, no UI location | `"Click to edit."` | AI invents a navigation path |
| 2 | System acts on "something" | `"System validates something."` | AI substitutes a plausible object |
| 3 | Pass condition undefined | `"If ok → deploy."` | AI invents a success indicator |
| 4 | Error recovery undefined | `"If error → check logs."` | AI invents recovery steps |
| 5 | Log reference, no log name | `"Check the logs."` | AI invents a log file name |
| 6 | Verify step, no method or success | `"Test connection."` | AI invents a test procedure |
| 7 | Configure step, no value | `"Set the interval."` | AI invents a value or range |
| 8 | Default stated as unknown | `"Defaults to TBD."` | AI substitutes a plausible default |
| 9 | Unfilled template token | `"Enter [SERVER_IP]."` | AI substitutes a sample value |
| 10 | Auth reference, no method | `"Use credentials."` | AI expands to "username and password" |
| 11 | Reference to unnamed process | `"Follow the normal process."` | AI fabricates process steps |
| 12 | Restart, no wait condition | `"Restart the service."` | AI adds an implied wait or ready state |
| 13 | Vague enumeration | `"Change the interval or whatever."` | AI invents a field list |
| 14 | Unqualified adjective + noun | `"Select the appropriate option."` | AI selects a specific option |
| 15 | Bare number, no unit | `"Set timeout to 30."` | AI appends a unit (e.g. seconds) |
| 16 | Reference to absent document | `"Refer to the guide."` | AI summarises a document it doesn't have |
| 17 | Wait step, no completion indicator | `"Wait for it to finish."` | AI adds an implied visual indicator |
| 18 | Embedded conditional action | `"Admin may need to configure advanced settings."` | AI invents what the settings are and where to find them |
| 19 | Role-based vague access | `"Admins get extra options."` | AI invents what the options are and where they appear |

Each detected gap produces a targeted question with a placeholder example. Answers are injected as PRE-CLARIFICATIONS into the prompt. Skipped gaps are passed to the AI and appear in the Preserved Ambiguities section of the output.

---

## Two-tier ambiguity handling

Not all vagueness in source content requires action. The extension distinguishes two categories:

### PRESERVE — document as-is

Vagueness that does not block the user from acting. These go into the document unchanged and are listed under Preserved Ambiguities.

- Descriptive vagueness: `"shows a message"`, `"extra options available"`
- Conditional notes: `"might need a firewall exception"` — keep the conditional word, place in Notes
- Wording that can be reproduced faithfully from the source

### Ask — stop and ask before generating

Gaps that would force the AI to invent an answer. These trigger a pre-generation question.

- A step has no UI location and one is required to act
- A validation says `"something"` and what it checks is unknown
- A conditional branch (`"if ok"`, `"if error"`) has no defined outcome or next action
- `"check logs"` with no log name
- A verification step has no method and no success criteria
- A restart has no stated wait condition
- A field list ends with `"or whatever"` / `"etc."`
- `"appropriate option"` with no definition of which option
- A number with no unit
- A reference to a document not included in the source
- `"wait for it"` with no completion indicator

---

## Understanding the governance model

Documentation Agent Orchestrator enforces these non-negotiable rules in every prompt:

### What AI Must Not Do

- **No Feature Invention**: AI cannot add features, steps, or behaviors not present in the source
- **No Terminology Changes**: Existing terms must be preserved exactly as written
- **No Implied Steps**: AI cannot infer steps or processes not explicitly stated
- **No Silent Assumptions**: AI cannot fill gaps by guessing
- **No Navigation Path Invention**: If a UI location is missing, the AI asks — it does not invent a path
- **No Prerequisite Derivation**: Prerequisites must come from the source — not from reading the steps

### What AI must do

- **Preserve Ambiguity**: When source content is vague but not blocking, AI explicitly documents this in a "Preserved Ambiguities" section
- **Use Pre-Clarifications**: Answers collected before generation are treated as authoritative facts and used directly
- **Document Exactly**: AI structures and formats the provided information according to the selected document type
- **Omit Empty Sections**: If Prerequisites, Notes, or Preserved Ambiguities have no source-supported content, those sections are omitted entirely — not filled with "None"

This makes AI behavior constrained, inspectable, and defensible.

---

## Supported documentation types

The extension supports three documentation types, each with specific governance rules and structures:

### Procedures

Step-by-step instructions for completing a task. Procedures must:

- List prerequisites explicitly
- Define steps in sequential order
- Specify expected outcomes
- Preserve any ambiguous steps or requirements

**Best for**: Installation guides, configuration instructions, deployment processes

### Concepts

Explanatory content that describes what something is and how it works. Concepts must:

- Define the subject clearly
- Explain relationships and dependencies
- Avoid instructional language
- Preserve ambiguities about behavior or implementation

**Best for**: Architecture overviews, feature explanations, technology primers

### Troubleshooting

Diagnostic and resolution guidance for specific problems. Troubleshooting guides must:

- Describe the problem and symptoms
- List possible causes
- Provide resolution steps
- Preserve ambiguities about environment or conditions

**Best for**: Error resolution, debugging guides, FAQ entries

---

## Detailed workflow

### 1. Preparing source content

The quality of AI output depends on the source content you provide. You can use:

- **Selected Text**: Highlight any text in VS Code (notes, code comments, specifications)
- **Open Files**: The full contents of the active file
- **Code Snippets**: Relevant code with comments explaining behavior
- **Existing Documentation**: Previous documentation that needs restructuring

**Tip**: Include as much context as possible, but don't worry about formatting or completeness—the AI will identify gaps rather than filling them.

### 2. Choosing documentation type

When you run "Generate Documentation (Governed Mode)", you'll be asked to select a documentation type:

- **Procedure**: For task-oriented instructions
- **Concept**: For explanatory content
- **Troubleshooting**: For problem-solving guidance

The selected type determines:

- The structure of the generated documentation
- The specific governance rules applied
- The instructions given to the AI

### 3. Structural gap classification and Q&A

After you select the documentation type, the extension classifies your source against 18 structural gap patterns. For every gap that would force the AI to invent an answer, a VS Code input box appears with a specific question and a placeholder example.

You have three choices for each question:

- **Answer it** — your answer is injected into the prompt as an authoritative fact
- **Skip it** — the gap is passed to the AI, which will list it in Preserved Ambiguities
- **Skip all** — generate immediately from the source as-is

Answering questions produces a complete document in one pass. Skipping produces a document with an accurate Preserved Ambiguities section that you can address later.

### 4. Working with AI responses

After pasting the prompt into your AI assistant:

**If the AI response includes "Preserved Ambiguities":**

- This is expected and correct behavior
- Review each ambiguity carefully
- Decide whether to provide clarifications or accept the ambiguity

**If the AI response includes "Clarifying Questions":**

- The AI determined it cannot proceed without inventing details
- Answer the questions with specific information
- Use "Provide Clarifications and Regenerate Prompt" to create an updated prompt

**If the AI response looks suspiciously complete:**

- The AI may have ignored governance rules
- Check if features, steps, or behaviors were added that weren't in your source
- Regenerate with stricter emphasis on the governance rules

### 5. Reviewing diffs

The diff preview shows you:

- **Additions**: New content generated by AI (in green)
- **Deletions**: Original content removed (in red)
- **Preserved Content**: What stayed the same
- **Structure Changes**: How content was reorganized

Always check:

- No invented features or steps
- Ambiguities are properly preserved
- Terminology is consistent with source
- Structure matches the selected document type

---

## Why this extension exists

AI is fluent but unreliable. When rewriting documentation, AI often:

- Invents features that don't exist
- Implies steps not present in the source
- Changes established terminology inconsistently
- Fills gaps with plausible-sounding guesses

These mistakes are hard to notice and costly to fix later.

Documentation Agent Orchestrator prevents this by making AI behavior constrained, inspectable, and defensible. It enforces correctness over fluency.

---

## What this extension does NOT do

This is important.

The extension does **not**:

- Polish sentences for readability
- Improve wording or tone
- Simplify language or jargon
- Add missing details to incomplete documentation
- "Help" by filling in gaps with assumptions

**If you want better writing, use a different tool.**  
**If you want AI to stop lying, use this one.**

---

## Two-mode architecture

This extension implements one mode only: **Governance Mode**. Generative completion belongs outside the extension, in a direct AI assistant session.

### Mode A — Governance Mode (this extension)

**Goal:** Structurally complete only if the user provides the missing data. No invention. No guessing.

**Pipeline:**
```
Source
  ↓
Structural Gap Classification (18 classes)
  ↓
ASK-level questions → User answers
  ↓
Governed prompt build
  ↓
AI (formatting and structure only)
  ↓
Diff + validation
```

**Rules:**
- AI must not add facts not present in the source
- Missing information becomes a pre-generation question or Preserved Ambiguity
- Pre-clarifications are authoritative facts — not suggestions
- Terminology is locked to the source
- Empty sections are omitted, never filled

This mode prioritizes **defensibility**. Output is compliance-grade.

---

### Mode B — Generative mode (direct AI assistant)

**Goal:** Produce a useful, complete document even when gaps exist.

**Pipeline:**
```
Source
  ↓
AI reasoning + domain knowledge
  ↓
Assumption filling
  ↓
Structured document + Assumptions Declared section
```

**Rules:**
- AI may infer typical defaults
- AI may propose standard values
- AI may resolve ambiguity using domain knowledge
- All inferred content must be declared in an **Assumptions Made** section

This mode prioritizes **speed and usability**. Output is productivity-grade.

---

### Behavioral comparison

| Gap in source | Governance Mode (extension) | Generative Mode (direct AI) |
|---|---|---|
| Missing UI location | Ask the user | Infer typical UI path |
| Bare number, no unit | Ask for unit | Assume seconds |
| "Use credentials" | Ask for auth method | Assume username/password |
| "Restart service" | Ask for wait condition | Add standard readiness check |
| Undefined default | Ask | Suggest typical default |

### The boundary rule

These modes must never be blended.

- If Governance Mode allows knowledge-based filling, it collapses as a compliance tool.
- If Generative Mode starts asking blocking questions, it loses its speed advantage.
- The user must choose intentionally. The extension does not auto-switch.

**Extension = Governance Mode only.**  
**Generative exploration = direct AI assistant session.**

---

## Commands and shortcuts

### VS Code commands

You can access these commands through the Command Palette (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on macOS):

**Generate Documentation (Governed Mode)**: Scans your source for structural gaps, asks targeted questions to fill them, then builds a governance-driven AI prompt. You choose the documentation type (Procedure, Concept, or Troubleshooting). The prompt is automatically copied to your clipboard.

**Preview Documentation Rewrite Diff**: Compares your original content with AI-generated documentation in a side-by-side diff view. You'll be prompted to paste the AI response. The diff highlights additions, deletions, and structural changes.

**Provide Clarifications and Regenerate (Governed Mode)**: When the AI has identified Preserved Ambiguities, use this command to provide answers and regenerate the governed prompt with those answers injected as authoritative facts.

### Typical usage pattern

1. Write rough notes or select existing content
2. Run **Generate Documentation (Governed Mode)** → Choose document type
3. Answer gap questions (or skip to pass gaps to AI as Preserved Ambiguities)
4. Paste prompt into your AI assistant
5. Copy AI response
6. Run **Preview Documentation Rewrite Diff** → Paste AI response
7. Review changes and Preserved Ambiguities
8. If needed, run **Provide Clarifications and Regenerate (Governed Mode)**

---

## Known limitations

These limitations are intentional design decisions:

- **Vague input stays vague**: If your source is ambiguous, the output will document that ambiguity instead of resolving it
- **No automatic improvement**: The extension will not "fix" incomplete requirements or polish writing
- **Feels less helpful**: Compared to general AI tools, this may seem more restrictive
- **Human review required**: You must still validate output for correctness and completeness

This tradeoff ensures correctness over convenience.

---

## Who this is for

Documentation Agent Orchestrator is designed for:

- **Technical Writers**: Who need to ensure documentation accuracy and consistency
- **Documentation Engineers**: Building and maintaining docs-as-code workflows
- **Software Engineers**: Writing accurate technical documentation for complex systems
- **DevOps Teams**: Creating reliable runbooks and operational procedures
- **Anyone Accountable for Documentation Accuracy**: Where incorrect documentation has real consequences

**If you want AI to write more elegantly, this tool is not for you.**  
**If you want AI output you can defend and trust, it is.**

---

## Support

For comprehensive documentation and guides, visit:

- [Getting Started Guide](https://tharun.gitbook.io/documentation-agent-orchestrator/)
- [GitHub Repository](https://github.com/Tharun135/doc-agent-orchestrator)

If you encounter bugs or have feature requests:

- [Open an issue on GitHub](https://github.com/Tharun135/doc-agent-orchestrator/issues)

---

## Version history

### 1.0.1

- Initial marketplace release
- Core governance-driven prompt generation
- Side-by-side diff preview
- Support for Procedures, Concepts, and Troubleshooting documentation types
- **Structural gap classification** — 19 structural gap classes scan source before the AI prompt is built
- **Interactive Q&A** — VS Code input boxes collect answers for each detected gap; answers are injected as PRE-CLARIFICATIONS
- **Two-tier ambiguity handling** — PRESERVE for non-blocking vagueness, ASK for gaps that would require invention
- **Two-mode architecture defined** — extension is Governance Mode only; Generative Mode (AI-assisted completion with declared assumptions) belongs in direct AI assistant sessions\n- **Commands renamed** — `Generate Documentation (Governed Mode)`, `Provide Clarifications and Regenerate (Governed Mode)`
- **New gap patterns**: arrow-syntax conditionals (`valid →`, `invalid →`), role-based vague access (`Admins get extra options`), vague enumeration (`or whatever`), unqualified adjectives, bare numbers without units, references to absent documents, wait steps without completion indicators

### 1.0.0

- Initial development release

---

## Categories

**Other** | **Formatters** | **Snippets**

## Tags

`documentation` `ai` `prompt` `technical writing` `governance` `diff` `claude` `copilot` `markdown`

## Works With

Universal

---

## Project details

**Repository**: [github.com/Tharun135/doc-agent-orchestrator](https://github.com/Tharun135/doc-agent-orchestrator)  
**License**: MIT  
**Publisher**: TharunSebastian  
**Unique Identifier**: `TharunSebastian.doc-agent-orchestrator`  
**Version**: 1.0.1  
**Engine**: VS Code ^1.104.0

---

© 2026 TharunSebastian
