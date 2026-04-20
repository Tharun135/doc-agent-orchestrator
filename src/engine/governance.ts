export const GOVERNANCE_RULES = `
GOVERNANCE RULES — ZERO INVENTION POLICY:
- Every word must be traceable to the source. When in doubt, omit.
- DO NOT ADD: Purpose clauses ("to do X"), navigation paths, parameter details (e.g. expanding "credentials"), prerequisites, confirmation steps, or softened language unless verbatim in source.
- TERMINOLOGY: Use exact terms from source. Do not expand or rename.
- AMBIGUITY HANDLING:
    - PRESERVE: Descriptive/non-blocking vagueness. Put in Notes or Known Gaps.
    - ASK: Blocking gaps (no UI location, unknown validation, unknown error path).
- NOTES: Copy exact words. Do not append reasons or context.
- ANSWER FIDELITY: Preserve exact wording and casing from clarifications.
- PREREQUISITES: For non-procedures, omit unless explicit in source. For procedures, follow structural inference rules.
- KNOWN GAPS: Include ONLY blocking gaps or unresolved ambiguities.
`;
`;

export const LIGHT_GOVERNANCE_RULES = `
GOVERNANCE RULES — ADVISORY MODE:
- Ground the documentation in the source content provided.
- You may use natural phrasing and common-sense inferences to make the guide readable.
- If a UI location is missing, you may use general terms like "Navigate to the appropriate section".
- Preserve the technical meaning of the source, but focus on creating a fluent first draft.
- List any major uncertainties under "Known Gaps".
`;
