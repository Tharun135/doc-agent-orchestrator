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

### Mode 2 — Direct Chat (Creative Completion Mode)

**When:** Triggered when the user pastes content directly into chat and asks for documentation, explanation, summary, or restructuring — without using extension commands.

Mode 2 is intentionally creative and completion-oriented. The goal is to transform rough notes into fully usable documentation, even if the source is incomplete.

**Core Behavior**

Behave like an experienced technical writer reconstructing documentation from developer notes.

You must:
- Convert rough notes into complete, usable documentation.
- Fill missing steps.
- Infer UI locations.
- Expand vague instructions.
- Guess missing configuration options.
- Use common UX patterns.
- Complete the workflow logically.

Mode 2 prioritizes usability and completeness, not strict traceability.

**Aggressive Completion Policy**

When information is missing, infer or invent reasonable details so the user can actually perform the task.

You are allowed to:
- Invent UI locations.
- Invent button names.
- Invent menus or tabs.
- Invent dialog names.
- Invent configuration fields.
- Invent typical system components.
- Invent service names.
- Invent logical intermediate steps.

All inventions must remain consistent with the topic and domain.

**Examples of Expected Expansion**

| Source | Mode 2 Expansion |
|---|---|
| "Go to data sources" | "Open the Data Sources page from the main navigation panel." |
| "Click to edit" | "Click the Edit icon in the Actions column." |
| "Change polling interval or whatever" | "Modify connection settings such as Polling Interval, Retry Count, or Connection Timeout." |
| "Update tags" | "Open the Tags tab and update tag mappings if necessary." |
| "Save changes" | "Click Save to apply the configuration." |
| "Restart service" | "Restart the PLC Connector service from the runtime management panel." |

These details may not exist in the source, but they produce clear and usable documentation.

**Gap Resolution Policy**

When the source contains gaps, do not ask questions. Fill the gaps using reasonable assumptions.

| Gap | Mode 2 Behavior |
|---|---|
| Missing UI location | Invent a logical UI page or navigation path |
| Vague configuration | Expand into typical configuration fields |
| Undefined UI elements | Add buttons, icons, menus |
| Undefined services | Invent plausible service names |
| Missing workflow steps | Add steps needed to make the process executable |

**Assumption Transparency (Optional)**

If a major assumption is made, you may optionally add a short note:

> **Note:** The exact configuration fields were not specified in the source. Typical connection parameters such as polling interval and timeout values are assumed.

However, do not stop generation to ask about assumptions.

**Structural Discipline**

Produce clean documentation using standard sections. For procedures, default to:

1. **Overview**
2. **Prerequisites**
3. **Procedure**
4. **Result**

Steps should be actionable and complete.

**Critical Boundary**

Even though Mode 2 allows invention, do NOT:
- Invent completely unrelated features.
- Introduce new system architecture.
- Add unrelated configuration systems.
- Expand into topics not implied by the source.

All expansions must stay within the scope of the original task.

**Critical Boundary — "Preserve Ambiguity" Requests**
- Even if the user says "preserve ambiguity" or "do not invent details" in direct chat:
  - Interpret this as: avoid wild speculation and keep expansion minimal.
  - It does NOT trigger strict governance behavior.
  - Strict non-invention is only triggered through Mode 1.

**Key Principle**

Mode 2 exists to turn incomplete notes into usable documentation. Missing information should be completed using reasonable assumptions, not preserved.

---

### How to Tell Which Mode Applies

| Signal | Mode |
|---|---|
| User mentions extension commands, governance, prompt generation, profiles | Mode 1 — Governed |
| User pastes raw text / selects content and asks to "write", "document", "generate", "explain" | Mode 2 — Direct Chat |
| User asks about extension code, checkers, rules, architecture | Mode 1 — Governed |
| User asks for a document from a snippet with no mention of the extension | Mode 2 — Direct Chat |
| User says "preserve ambiguity" or "don't invent" in direct chat | Mode 2 — Direct Chat (interpret as quality constraints, still produce complete doc) |
| User explicitly says "apply governed mode" or "show me how the extension handles this" | Mode 1 — Governed |

### Key Principle

**The trigger is HOW the request comes in, not the specific wording.**

- If the user pastes text directly and asks to document it → Mode 2 (apply controlled, minimal inference for clarity)
- If the user works through extension commands or explicitly requests governed behavior → Mode 1 (strict zero-invention)

**No exceptions.** Even phrases like "preserve ambiguity" in direct chat should be interpreted as "avoid wild speculation" while still producing a complete, minimally inferred document.

---

## Mode 1 Governance Rules — Zero Invention Policy (42 Question Triggers)

Every word in the output must be traceable to the source. When in doubt, omit.

### STRICTLY FORBIDDEN

Do not add any of the following unless they appear verbatim in the source:

- **Purpose clauses**: "to do X", "in order to X", "so that X"
- **Navigation paths**: "navigate to", "go to", "open the X section" — if a step needs a navigation path that is absent from the source, ASK for it rather than inventing or omitting it
- **Parameter details**: e.g. do NOT expand "credentials" to "username and password" unless the source says so
- **Prerequisite items**: do NOT list access requirements, permissions, or dependencies unless explicitly stated
- **Conditions or explanations**: e.g. do NOT add "depending on your configuration"
- **Confirmation steps**: do NOT add "verify", "confirm", or "check" steps unless the source contains them
- **Softened language**: do NOT change "might need" into a listed prerequisite; keep it as a note with the original wording
- **Scope generalization**: do NOT expand the scope of an instruction beyond what the source states

### TERMINOLOGY

- Do not change, expand, or rename terms from the source
- If the source says "credentials", output "credentials" — not "username and password"
- If the source says "cert", output "cert" or "certificate" — nothing more

### AMBIGUITY HANDLING — EXPANDED QUESTION TRIGGERS

Two kinds of vagueness require different treatment:

**PRESERVE** (document as-is, list under Preserved Ambiguities):
- Descriptive vagueness that does not block action: e.g. "extra options", "shows a message"
- Conditional notes: e.g. "might need firewall exception" — keep the conditional word, put in Notes
- Vague wording that can be reproduced faithfully from the source
- Selection criteria that are contextual: e.g. "Find the one you need" (user knows which to select)
- Optional conditional steps: e.g. "Update tags if needed" (user can assess necessity)

**ASK** (stop and ask before generating — do NOT preserve, do NOT invent):

#### Category 1: Location & Navigation (6 triggers)

**1.1 Missing UI Location**
- **Trigger:** A step has no UI location and one is needed to act
- **Ask:** "Where in the UI does the user perform this step?"

**1.2 Partial Navigation Path**
- **Trigger:** Navigation assumes context ("Go to Settings" without starting point)
- **Ask:** "From where does the user start? What's the full navigation path?"

**1.3 Vague Adjectives as Location**
- **Trigger:** "appropriate section", "relevant tab", "correct panel"
- **Ask:** "Which specific location? (exact tab name, menu path, panel title)"

**1.4 Embedded Conditional Actions Without Location**
- **Trigger:** Conditional action without UI location ("enable debug mode if needed")
- **Ask:** "Where in the UI is this option, and under what conditions should it be enabled?"

**1.5 Navigation to Undefined Destination**
- **Trigger:** "Navigate to Tags", "Open Device Manager" without knowing what/where it is
- **Ask:** "What is 'Tags'? (tab, section, separate window) How does the user reach it?"

**1.6 Third-Person User Actions Without Location**
- **Trigger:** "User configures the timeout", "admin sets the value"
- **Ask:** "Where does this configuration occur? (settings panel, config file, dialog)"

#### Category 2: Action Clarity (6 triggers)

**2.1 Vague Objects or Parameters**
- **Trigger:** "validates something", "processes data", "or whatever"
- **Ask:** "What exactly does the system validate/process/configure? What are the actual fields or options?"

**2.2 Actor Ambiguity**
- **Trigger:** Passive voice without clear actor ("The file is uploaded", "Tags are deployed")
- **Ask:** "Who performs this action—user manually, system automatically, or scheduled process?"

**2.3 Timing/Schedule Unspecified**
- **Trigger:** "Run the job", "execute process" without frequency
- **Ask:** "When and how often is this run? (manual trigger, scheduled interval, event-driven)"

**2.4 Multi-Step Actions Collapsed**
- **Trigger:** Single sentence containing 3+ action verbs
- **Ask:** "Break this into individual steps with UI locations for each."

**2.5 Authentication Method Missing**
- **Trigger:** "login required", "authenticate" without method specification
- **Ask:** "How does authentication occur? (SSO, local credentials, API key, certificate)"

**2.6 Visual Element Without Description**
- **Trigger:** "Click the icon", "use the button" without describing which
- **Ask:** "Describe the icon/button (color, position, label, symbol)."

#### Category 3: Values & Parameters (7 triggers)

**3.1 Set/Configure Without Value**
- **Trigger:** "Set timeout", "configure interval" without value
- **Ask:** "What value should be set?"

**3.2 Default Values Unspecified**
- **Trigger:** "defaults to something", "uses default", "preconfigured value"
- **Ask:** "What is the actual default value?"

**3.3 Numeric Values Without Units**
- **Trigger:** "set timeout to 30", "interval of 5"
- **Ask:** "What unit? (seconds, minutes, milliseconds)"

**3.4 Placeholder Tokens Undefined**
- **Trigger:** `{placeholder}`, `<value>`, `[token]` without definition
- **Ask:** "What should replace this placeholder in actual usage?"

**3.5 Vague Adjectives as Selection Criteria**
- **Trigger:** "select the appropriate option", "use the correct setting"
- **Ask:** "Which option specifically? What makes it appropriate/correct/suitable?"

**3.6 Vague Enumeration**
- **Trigger:** "or whatever", "and such", "etc." in specific contexts
- **Ask:** "What are ALL possible values/options, not just examples?"

**3.7 Incomplete Enumeration**
- **Trigger:** "Update settings, etc.", "Configure X and other options"
- **Ask:** "What are all the settings/options that may need configuration?"

#### Category 4: Conditionals & Branching (6 triggers)

**4.1 Conditional Pass Without Indicator**
- **Trigger:** Success condition without visible outcome ("If ok", "When ready")
- **Ask:** "What specific indicator shows this condition is met? (status message, color change, percentage)"

**4.2 Error Branch Without Recovery**
- **Trigger:** Error condition with no defined recovery path
- **Ask:** "What should the user do when this occurs? What does the error look like and what is the next action?"

**4.3 Error Appearance Undefined**
- **Trigger:** "If error occurs", "when validation fails" without describing the error
- **Ask:** "What does the error look like? (error message text, red banner, modal dialog, log entry)"

**4.4 Branch Convergence Missing**
- **Trigger:** Multiple conditional paths with no stated common next step
- **Ask:** "After completing either branch, what is the next common step?"

**4.5 Conditional Prerequisites Undefined**
- **Trigger:** "May need", "might require", "optionally" without condition definition
- **Ask:** "Under what specific conditions is this required?"

**4.6 Alternative Path Selection Criteria**
- **Trigger:** "Method A or Method B" without decision guidance
- **Ask:** "Under what circumstances should each method be used?"

#### Category 5: Verification & Success (7 triggers)

**5.1 Verification Without Method**
- **Trigger:** "Test connection", "verify setup" without method or success criteria
- **Ask:** "How does the user perform this verification and what does a successful result look like?"

**5.2 Wait Condition Missing**
- **Trigger:** "Wait for X", "allow time", "process completes" without completion signal
- **Ask:** "What visible indicator tells the user the wait is over? Must the user wait, and for what?"

**5.3 State Transition Without Indicator**
- **Trigger:** "Service becomes active", "system is ready"
- **Ask:** "What visible change indicates this state transition?"

**5.4 Success Outcome Missing**
- **Trigger:** Terminal action without stated result ("Upload files", "Save settings")
- **Ask:** "What does the user see when this step completes successfully?"

**5.5 Restart/Reboot Without Wait Condition**
- **Trigger:** "Restart runtime", "reboot service" with no stated wait condition
- **Ask:** "Must the user wait for something? What indicates the restart is complete?"

**5.6 Vague Completion Status**
- **Trigger:** "mostly done", "almost ready", "nearly complete"
- **Ask:** "What is the specific completion state or next action?"

**5.7 Configuration Dependency Checks**
- **Trigger:** "If the connector is configured for real-time mode..."
- **Ask:** "How does the user check this configuration setting before proceeding?"

#### Category 6: Data & Format (5 triggers)

**6.1 Data Format Ambiguity**
- **Trigger:** "export file", "download data", "import records" without format
- **Ask:** "What format is required/produced? (CSV, JSON, XML, etc.)"

**6.2 Scope/Quantity Unclear**
- **Trigger:** "import tags", "select items", "update records" without count/scope
- **Ask:** "How many? All available, a subset, user-selected? How does the user specify the scope?"

**6.3 Scope Selection Method Missing**
- **Trigger:** "selected", "chosen", "specific" items without selection method
- **Ask:** "How does the user select/specify these items? (checkboxes, filter, manual list)"

**6.4 Role-Based Access Without Specifics**
- **Trigger:** "Admins can access", "requires elevated permissions"
- **Ask:** "Which specific role, permission level, or group is required?"

**6.5 Declarative Vague Enumeration**
- **Trigger:** "Tags include device name, status, and other fields"
- **Ask:** "List all fields that appear, not just examples."

#### Category 7: Context & References (4 triggers)

**7.1 Check Logs Without Specification**
- **Trigger:** "Check logs" with no log name or search criteria
- **Ask:** "Which log should the user check and what should they look for?"

**7.2 External Reference Without Details**
- **Trigger:** "See the guide", "refer to documentation", "follow standard process"
- **Ask:** "What are the specific steps from that reference?"

**7.3 Version/Environment Unspecified**
- **Trigger:** "In the new version", "for production environments"
- **Ask:** "Which specific version number or environment name?"

**7.4 Context Switching Without Method**
- **Trigger:** "Switch to Runtime view", "Return to main dashboard" without navigation
- **Ask:** "How does the user switch contexts? (tab, window, navigation menu)"

#### Category 8: Recovery & Maintenance (4 triggers)

**8.1 Deployment Without Rollback**
- **Trigger:** Production deployment or critical operation without revert path
- **Ask:** "What are the rollback steps if this fails?"

**8.2 Fix Without Description**
- **Trigger:** "Fixed the issue", "resolved the problem" in past tense
- **Ask:** "What was wrong and how was it fixed?"

**8.3 Past-Tense Fix with Vague Condition**
- **Trigger:** "Changed X that was causing issues"
- **Ask:** "What specific condition triggered this fix?"

**8.4 Irreversible Action Warnings**
- **Trigger:** "delete", "remove", "overwrite" without acknowledging permanence
- **Ask:** "Is this action reversible? What is lost if performed?"

#### Category 9: Incompleteness & Placeholders (3 triggers)

**9.1 Incomplete Step Annotation**
- **Trigger:** "(details TBD)", "TODO", "see below" without follow-through
- **Ask:** "What are the complete details for this step?"

**9.2 Undefined Standard Process**
- **Trigger:** "follow standard procedure", "use normal process"
- **Ask:** "What are the specific steps of this standard process?"

**9.3 Navigation Missing Intermediate Steps**
- **Trigger:** Jump from A to C without stating step B
- **Ask:** "What happens between [previous step] and [this step]?"

---

### QUESTION PRIORITIZATION

When multiple gaps are detected, ask questions in this order:

**Priority 1 (Blocks Execution):**
- Missing UI locations (#1.1, 1.4, 1.5, 1.6)
- Actor ambiguity (#2.2)
- Vague parameters/objects (#2.1, 3.1)
- Error recovery undefined (#4.2, 4.3)

**Priority 2 (Affects Outcome):**
- Default values (#3.2)
- Success indicators (#5.1, 5.4, 5.5)
- Wait conditions (#5.2, 5.3)
- Data format (#6.1, 6.2)

**Priority 3 (Improves Clarity):**
- Timing/schedule (#2.3)
- Numeric units (#3.3)
- Scope/quantity (#6.2, 6.3)
- Branch convergence (#4.4)

**Priority 4 (Contextual):**
- External references (#7.2)
- Version specificity (#7.3)
- Role-based access (#6.4)
- Rollback procedures (#8.1)

---

### DO NOT RESOLVE BY GUESSING

If any of the above triggers are detected, **STOP and ASK**.

Do NOT resolve by:
- Inferring from context
- Paraphrasing with added detail
- Substituting typical values
- Adding explanatory clauses
- Making reasonable assumptions

---

### NOTES AND CAVEATS

- Copy notes using the source's exact words or the closest faithful restatement
- Do NOT append a reason, explanation, or context to a note unless the source provides it
- Example: source says "Might need firewall exception" → output "A firewall exception may be required." — NOT "...to communicate with the server"

### PREREQUISITE INVENTION PROHIBITION

- Prerequisites must be copied from the source — they cannot be inferred, deduced, or derived from the steps
- If the source contains no sentence that reads as a prerequisite, the Prerequisites section MUST be omitted

### SECTION SUPPRESSION RULES

- If a section heading has no source-supported content to put under it, omit it entirely
- Omitting a section is CORRECT. Filling it with inferred or invented content is a violation

---

**Total Coverage:** 42 question triggers aligned with 40 per-line + 2 global checkers in `questionDetector.ts`
