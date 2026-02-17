import { PromptInput } from "./types";
import { GOVERNANCE_RULES } from "./governance";

export function generatePrompt(input: PromptInput): string {
  const missingInfoPolicy = input.clarifications 
    ? `MISSING INFORMATION HANDLING:
- Clarifications have been provided below that resolve missing information
- Use the clarifications as authoritative facts
- Only ask about information NOT covered by the clarifications
- If clarifications resolve all gaps, proceed with generation`
    : `MISSING INFORMATION HANDLING:
- Ask questions ONLY when documentation cannot be generated without inventing behavior
- Preserve ambiguity from the source content - document vague details as-is
- Stop and ask questions if:
  • The task requires inventing specific steps or features not mentioned
  • There are undefined references (e.g., "standard workflow", "usual process")
  • Logical gaps make the task impossible to complete factually
- Do NOT ask questions about:
  • Vague but valid descriptions (e.g., "extra options", "show error")
  • Missing context that doesn't block the core task
  • Details that can be documented with preserved ambiguity`;

  const clarificationsSection = input.clarifications 
    ? `
CLARIFICATIONS (authoritative - treat as facts):
${input.clarifications}
`
    : '';

  const base = `
SYSTEM:
You are a Technical Documentation Agent.

${GOVERNANCE_RULES}

REWRITE POLICY:
- Rewrite the source content into structured documentation
- Preserve original meaning and intent
- Reorder or clarify only when necessary for correctness

${missingInfoPolicy}

GOVERNANCE ENFORCEMENT:
- If any governance rule is violated:
  - Continue generation
  - Add a "Governance Notes" section listing the issues

PRESERVED AMBIGUITIES:
- When source content is vague but documentable, explicitly list what was preserved
- Add a "Preserved Ambiguities" section noting any vague terms documented as-is
- This helps reviewers understand intentional vagueness vs. missing research

USER INTENT:
${input.userIntent}

SOURCE CONTENT (authoritative):
${input.context}
${clarificationsSection}
`;

  switch (input.taskType) {
    case "procedure":
      return base + procedureOutputSpec();
    case "concept":
      return base + conceptOutputSpec();
    case "troubleshooting":
      return base + troubleshootingOutputSpec();
    case "reference":
      return base + referenceOutputSpec();
    case "tutorial":
      return base + tutorialOutputSpec();
    case "release-notes":
      return base + releaseNotesOutputSpec();
    case "api-documentation":
      return base + apiDocumentationOutputSpec();
    default:
      throw new Error("Unsupported task type");
  }
}

function procedureOutputSpec(): string {
  return `
TASK:
Rewrite the source content into a user-facing procedure.

PROCEDURE STEP FORMATTING:
- Each step should contain the action and its result (if applicable) in the same step
- Only create separate steps for distinct actions
- Do NOT create a new step for the result of a previous action
- Combine action and result: "Action. Result." instead of "1. Action" then "2. Result."
- Example: "Click Submit. The form is validated." NOT "1. Click Submit. 2. The form is validated."

OUTPUT STRUCTURE (use exactly these headings):
Prerequisites
Procedure
Notes
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
`;
}

function conceptOutputSpec(): string {
  return `
TASK:
Rewrite the source content into a formal concept explanation.

OUTPUT STRUCTURE (use exactly these headings):
Overview
Key Components
Process Flow
Important Considerations
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
`;
}

function troubleshootingOutputSpec(): string {
  return `
TASK:
Rewrite the source content into a troubleshooting guide.

OUTPUT STRUCTURE (use exactly these headings):
Symptoms
Possible Causes
Verification Steps
Resolution
Prevention
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
`;
}

function referenceOutputSpec(): string {
  return `
TASK:
Rewrite the source content into a reference document.

OUTPUT STRUCTURE (use exactly these headings):
Description
Parameters / Options
Examples
Related Information
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
`;
}

function tutorialOutputSpec(): string {
  return `
TASK:
Rewrite the source content into a tutorial.

OUTPUT STRUCTURE (use exactly these headings):
Objective
Prerequisites
Steps
Verification
Next Steps
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
`;
}

function releaseNotesOutputSpec(): string {
  return `
TASK:
Rewrite the source content into release notes.

OUTPUT STRUCTURE (use exactly these headings):
New Features
Improvements
Bug Fixes
Breaking Changes (if applicable)
Known Issues (if applicable)
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
`;
}

function apiDocumentationOutputSpec(): string {
  return `
TASK:
Rewrite the source content into API documentation.

OUTPUT STRUCTURE (use exactly these headings):
Endpoint / Function
Description
Request / Parameters
Response / Return Value
Examples
Error Handling
Preserved Ambiguities (only if applicable)
Governance Notes (only if applicable)
`;
}
