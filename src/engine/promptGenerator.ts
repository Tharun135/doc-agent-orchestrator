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
    default:
      throw new Error("Unsupported task type");
  }
}

function procedureOutputSpec(): string {
  return `
TASK:
Rewrite the source content into a user-facing procedure.

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
