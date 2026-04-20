# Copilot Workspace Instructions

## Documentation Modes

This workspace uses the `doc-agent-orchestrator` extension. Follow these instructions based on the interaction mode.

### Mode 1 — Governed Mode (Extension Commands)
**Trigger:** User uses extension commands or asks about governance/validation.
**Core Policy:** Strict Zero-Invention.
- Every word must be traceable to the source.
- Do NOT infer UI locations, navigation paths, or prerequisites.
- If the source is vague, list it as a gap; do NOT fill it in.
- Follow rules in `src/engine/governance.ts`.
- **Note:** For the full list of 42 gap detection triggers, see `docs/technical/GOVERNANCE-TRIGGERS.md`.

### Mode 2 — Direct Chat (Creative Completion)
**Trigger:** User pastes text directly into chat and asks to "document" or "rewrite".
**Core Policy:** Completion-Oriented.
- Transform rough notes into fully usable documentation.
- Fill missing steps and infer reasonable UI locations.
- Expand vague instructions using common UX patterns.
- Prioritize usability over strict traceability.

---

## Governance Principles (Mode 1)

1. **Zero Hallucination:** If a detail is missing, flag it. Never guess a button name or menu path.
2. **Terminology Fidelity:** Use exact terms from the source.
3. **Implicit Prerequisite Prohibition:** Do not add prerequisites unless explicitly stated.
4. **Section Suppression:** Omit any section that lacks source-grounded content.

## Performance Note
To ensure fast generation, avoid listing specific triggers in the prompt. Refer to the detection engine's output and the grounding rules.
