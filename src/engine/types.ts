export type TaskType =
  | "procedure"
  | "concept"
  | "troubleshooting"
  | "reference"
  | "tutorial"
  | "release-notes"
  | "api-documentation";

export interface PromptInput {
  taskType: TaskType;
  userIntent: string;
  context: string;
  clarifications?: string;
}
