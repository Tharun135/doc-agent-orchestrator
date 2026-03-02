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
  /**
   * Pre-clarifications collected from the user BEFORE the first AI call.
   * Injected into Pass 1 so the AI has complete information upfront.
   */
  preClarifications?: string;
  /** Clarifications collected after the AI's first pass (ambiguity resolution). */
  clarifications?: string;
  /** 1-based pass number. Pass 1 = initial generation; 2+ = ambiguity resolution rounds. */
  pass?: number;
}
