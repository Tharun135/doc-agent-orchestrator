import { TaskType } from "./types";

export interface Template {
  title: string;
  requiredSections: string[];
  content: string;
}

export const TASK_TEMPLATES: Record<TaskType, Template> = {
  "procedure": {
    title: "Procedure",
    requiredSections: ["Task title", "Prerequisites", "Procedure", "Result"],
    content: `## [Procedure name in -ing form]
Brief summary of what you accomplish.

### Prerequisites:
- List required tools, access, or configurations.

### Procedure
1. [Action verb] [UI element].
2. [Action verb] [Target]. 
    Result description for this step.

### Result
Summary of the final state.`
  },
  "concept": {
    title: "Concept",
    requiredSections: ["Concept name", "Key characteristics", "How it works", "Use cases", "Comparison with related concepts", "Example", "Related topics"],
    content: `## [Concept name]
Concise explanation of the purpose.

### Key characteristics
- Feature 1
- Feature 2

### How it works
Overview of the mechanism and primary steps.

### Use cases
When and why to use this concept.

### Comparison
Table or list comparing this with alternatives.

### Example
\`\`\`language
// Minimal code example
\`\`\`

### Related topics
- Links to related concepts or procedures.`
  },
  "troubleshooting": {
    title: "Troubleshooting",
    requiredSections: ["Troubleshooting topic", "Diagnostic steps", "Common problems and solutions", "Advanced diagnostics", "Related topics"],
    content: `## Troubleshooting [Problem]
Brief description of the symptom.

### Diagnostic steps
1. [Action] to verify the issue.
2. [Command] to check status.
    Expected healthy output.

### Common problems
#### Problem: [Error]
- **Cause**: Why it happens.
- **Solution**: Numbered fix steps.

### Advanced diagnostics
Escalation steps or debug command usage.

### Related topics
- Links to related guides.`
  },
  "reference": {
    title: "Reference",
    requiredSections: ["Reference component", "Configuration parameters", "Command-line options", "API endpoints", "Configuration file structure", "Environment variables", "Exit codes", "Related topics"],
    content: `## [Component] reference
Short overview.

### Parameters
| Name | Type | Description | Range |
| --- | --- | --- | --- |
| \`name\` | Type | Purpose | Values |

### Commands
\`\`\`bash
command [Options]
\`\`\`
Brief explanation of usage and key flags.

### API endpoints
#### [Method] [Path]
Description and request/response example.

### Exit codes
| Code | Meaning | Cause |
| --- | --- | --- |
| 0 | Success | Completed |

### Related topics
- Links to related guides.`
  },
  "tutorial": {
    title: "Tutorial",
    requiredSections: ["Tutorial title", "What you will learn", "Prerequisites", "Overview", "Steps", "Testing your implementation", "Summary", "Next steps", "Troubleshooting"],
    content: `## [Tutorial] Goal
Quick summary of learning outcome.

### Prerequisites
Software and knowledge required.

### Steps
1. **[Milestone]**: Action and result.
2. **[Milestone]**: Action and result.

### Verification
How to confirm success.

### Summary
Recap of skills learned.

### Next steps
Links to advanced topics.

### Troubleshooting
Common errors during this tutorial.`
  },
  "release-notes": {
    title: "Release notes",
    requiredSections: ["Release notes title", "Overview", "New features", "Improvements", "Bug fixes", "Breaking changes", "Deprecated features", "Security updates", "Known issues", "Upgrade instructions", "System requirements", "Download", "Contributors"],
    content: `## Release notes version X.Y.Z
Date: YYYY-MM-DD

### Overview
Summary of major changes.

### New features
- **[Feature]**: Description and how to use.

### Improvements
- **[Component]**: Performance or UX enhancement.

### Bug fixes
- **[Component]**: Fixed issue #ID (Symptom).

### Breaking changes
Impact and migration path.

### Known issues
Current limitations and workarounds.

### Upgrade
Quick steps to update.`
  },
  "api-documentation": {
    title: "API documentation",
    requiredSections: ["Endpoint / Function", "Description", "Service details", "Request Parameters", "Sample Request", "Response Parameters", "Sample Response"],
    content: `## [Operation Name]
Endpoint: [METHOD] [URL]

### Request Parameters
| Name | Type | Req | Description |
| --- | --- | --- | --- |
| [Field] | [Type] | Yes | [Purpose] |

### Sample Response
\`\`\`json
{ "status": "success" }
\`\`\`

!!!info "Notice"
URL encoding is required for special characters.`
  }

};

export function getTemplateFor(taskType: TaskType): Template {
  return TASK_TEMPLATES[taskType];
}
