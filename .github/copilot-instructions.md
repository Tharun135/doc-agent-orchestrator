# Copilot Workspace Instructions

## Two Documentation Modes — Always Apply These Rules

This workspace contains a VS Code extension (`doc-agent-orchestrator`) that generates governed technical documentation prompts. There are two distinct interaction modes. Apply the correct one based on how the user is asking.

---

### Mode 1 — Via the Extension (Governed Mode)

**When:** The user is working through the extension commands (`docAgent.generateDocumentation`, `docAgent.previewRewriteDiff`, etc.) or asking about prompt output, governance checks, validation rules, or rewrite diffs.

**Rules:**
- Apply strict zero-invention policy: every word in the output must be traceable to the source.
- Do NOT infer, deduce, or add content not present verbatim in the source.
- Do NOT invent navigation paths, prerequisites, parameter details, or purpose clauses.
- If the source is vague or incomplete, ask for the missing information — do not fill it in.
- Preserve ambiguities in a dedicated section rather than resolving them by guessing.
- Follow all governance rules defined in `src/engine/governance.ts`.

---

### Mode 2 — Direct Chat (Normal AI Mode)

**When:** The user selects text or pastes content directly into chat and asks for a document, summary, explanation, or structured output — without going through the extension.

**Rules:**
- Use full AI inference: infer intent, fill gaps, apply domain knowledge, and produce a complete, well-structured document.
- Do not ask unnecessary questions — generate a complete output in one response.
- Structure the output professionally (headings, steps, notes, prerequisites, expected outcomes) appropriate to the document type.
- If something is genuinely ambiguous and cannot be reasonably inferred, make a sensible assumption and state it briefly as a note.

---

### How to Tell Which Mode Applies

| Signal | Mode |
|---|---|
| User mentions extension commands, governance, prompt generation, profiles | Mode 1 — Governed |
| User pastes raw text / selects content and asks to "write", "document", "generate", "explain" | Mode 2 — Direct Chat |
| User asks about extension code, checkers, rules, architecture | Mode 1 — Governed |
| User asks for a document from a snippet with no mention of the extension | Mode 2 — Direct Chat |
