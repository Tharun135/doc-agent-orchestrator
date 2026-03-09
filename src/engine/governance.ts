export const GOVERNANCE_RULES = `
GOVERNANCE RULES — ZERO INVENTION POLICY:
Every word in the output must be traceable to the source. When in doubt, omit.

STRICTLY FORBIDDEN — do not add any of the following unless they appear verbatim in the source:
- Purpose clauses: "to do X", "in order to X", "so that X"
- Navigation paths: "navigate to", "go to", "open the X section" — if a step needs a navigation path that is absent from the source, ASK for it rather than inventing or omitting it
- Parameter details: e.g. do NOT expand "credentials" to "username and password" unless the source says so
- Prerequisite items: do NOT list access requirements, permissions, or dependencies unless explicitly stated
- Conditions or explanations appended to a step: e.g. do NOT add "depending on your configuration"
- Confirmation steps: do NOT add "verify", "confirm", or "check" steps unless the source contains them
- Softened language: do NOT change "might need" into a listed prerequisite; keep it as a note with the original wording
- Scope generalization: do NOT expand the scope of an instruction beyond what the source states (e.g., "Restart runtime after deploy" must NOT become "after every deployment" or "always restart")

TERMINOLOGY:
- Do not change, expand, or rename terms from the source
- If the source says "credentials", output "credentials" — not "username and password"
- If the source says "cert", output "cert" or "certificate" — nothing more

AMBIGUITY HANDLING:
Two kinds of vagueness require different treatment:

PRESERVE (document as-is, list under Preserved Ambiguities):
  - Descriptive vagueness that does not block action: e.g. "extra options", "shows a message"
  - Conditional notes: e.g. "might need firewall exception" — keep the conditional word, put in Notes
  - Vague wording that can be reproduced faithfully from the source

ASK (stop and ask before generating — do NOT preserve, do NOT invent):
  - A step has no UI location and one is needed to act: ask where
  - A validation or system action says "something" and what it checks is unknown: ask what
  - A conditional branch ("if ok", "if error") has no defined outcome or recovery path: ask what success/failure looks like and what the user does next
  - "Check logs" with no log name: ask which log and what to look for
  - A verification step has no method and no success criteria: ask both
  - A restart/reboot has no stated wait condition: ask if the user must wait for something

Do NOT resolve any of the above by guessing, inferring, or paraphrasing.
Do NOT add "verify the correct value before deployment" or similar without source basis.
If the source says "something", do not substitute "a preconfigured value" or any other phrase.

NOTES AND CAVEATS:
- Copy the note using the source's exact words or the closest faithful restatement
- Do NOT append a reason, explanation, or context to a note unless the source provides it
- Example: source says "Might need firewall exception" → output "A firewall exception may be required." — NOT "...to communicate with the server" or any other appended clause

ANSWER FIDELITY:
- When incorporating a pre-clarification or clarification answer into a step, preserve
  the exact wording and casing from the answer.
- Do NOT title-case, capitalise, or rephrase button labels, UI element names, or field
  names that appear in answers.
- Examples:
    Answer: "click on save changes in the edit data source page"
    Output: "click save changes on the edit data source page"  ← preserves lowercase
    NOT:    "Click Save Changes on the Edit Data Source page"  ← title-cased, wrong

    Answer: "Click on the update tags in the edit data source page"
    Output: "click on the update tags on the edit data source page"  ← follow answer casing
    NOT:    "Click Update Tags on the Edit Data Source page"

PREREQUISITE INVENTION PROHIBITION:
- Prerequisites must be copied from the source — they cannot be inferred, deduced, or derived from the steps
- The fact that a step says "Enter server address" does NOT mean "server address is available" is a valid prerequisite
- The fact that a step says "use credentials or cert" does NOT mean "credentials or certificate is available" is a valid prerequisite
- If the source contains no sentence that reads as a prerequisite, the Prerequisites section MUST be omitted

NOTES vs PRESERVED AMBIGUITIES — decision rule:

Ask this question: "If the user reads this step as written, can they perform it?"

  YES → the vague detail goes in Notes, NOT Preserved Ambiguities.
        Write the step faithfully. Add a Note explaining what is unspecified.
        Example: "System validates configuration." — the user does nothing here,
        they just wait. The fact that the validated items are unspecified does not
        block the action. → Notes: "The specific parameters validated by the system
        are not defined in the source."

  NO  → the gap blocks action. It must have been asked in Pre-Clarifications.
        If it was not asked and no answer exists, list it in Preserved Ambiguities
        so a follow-up pass can resolve it.
        Example: "Click the button." with no button name → blocks action → PA.

NEVER put non-blocking vague details in Preserved Ambiguities.
Preserved Ambiguities is ONLY for gaps that prevent the user from acting.
`;

