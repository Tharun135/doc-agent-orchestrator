export type TaskType =
  | "procedure"
  | "concept"
  | "troubleshooting";

export interface PromptInput {
  taskType: TaskType;
  userIntent: string;
  context: string;
  clarifications?: string;
}
