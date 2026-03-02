export type Severity = "error" | "warning" | "info";

export type RuleCategory =
  | "invention"
  | "terminology"
  | "structure"
  | "ambiguity"
  | "quality";

export interface Step {
  index: number;
  text: string;
  isConditional: boolean;
  actionVerbs: string[];
}

export interface NormalizedDocument {
  rawText: string;
  wordCount: number;
  sentences: string[];
  nounSet: Set<string>;
  verbSet: Set<string>;
  uiLabels: Set<string>;
  capitalizedEntities: Set<string>;
  stepStructure: Step[];
}

export interface RuleLocation {
  sentenceIndex?: number;
  offendingPhrase?: string;
  contextSnippet?: string;
}

export interface RuleViolation {
  ruleId: string;
  category: RuleCategory;
  severity: Severity;
  message: string;
  location?: RuleLocation;
  confidence: number;
}

export interface GovernanceProfile {
  id: string;
  name: string;
  allowNewNouns: boolean;
  allowNewVerbs: boolean;
  maxExpansionRatio: number;
  allowStepDrift: number;
  requireTerminologyLock: boolean;
  blockOnErrors: boolean;
  weights?: {
    error: number;
    warning: number;
    info: number;
  };
}

export interface ValidationRule {
  id: string;
  category: RuleCategory;
  evaluate: (
    source: NormalizedDocument,
    ai: NormalizedDocument,
    profile: GovernanceProfile
  ) => RuleViolation[];
}

export interface GovernanceMetrics {
  expansionRatio: number;
  newNounsCount: number;
  termSubstitutionsCount: number;
  structureChangesCount: number;
}

export interface GovernanceReport {
  timestamp: string;
  riskScore: number;
  status: "passed" | "blocked" | "advisory_warning";
  metrics: GovernanceMetrics;
  violations: RuleViolation[];
  sourceHash: string;
  aiOutputHash: string;
}
