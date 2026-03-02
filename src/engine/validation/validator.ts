import {
  NormalizedDocument,
  ValidationRule,
  RuleViolation,
  GovernanceProfile,
  GovernanceReport,
  GovernanceMetrics,
  Severity,
} from "./types";
import { DocumentNormalizer } from "./normalizer";
import { DEFAULT_RULES } from "./rules";
import { DEFAULT_PROFILE } from "./profiles";

// ---------------------------------------------------------------------------
// GovernanceValidator
// ---------------------------------------------------------------------------
// Orchestrates the full validation pipeline:
//   normalize → run rules → score → assemble GovernanceReport
//
// Usage:
//   const validator = new GovernanceValidator();
//   const report = validator.validate(sourceText, aiText, profile);
// ---------------------------------------------------------------------------

export class GovernanceValidator {
  private readonly normalizer: DocumentNormalizer;
  private readonly rules: ValidationRule[];

  constructor(rules: ValidationRule[] = DEFAULT_RULES) {
    this.normalizer = new DocumentNormalizer();
    this.rules = rules;
  }

  // -------------------------------------------------------------------------
  // Primary entry point
  // -------------------------------------------------------------------------

  public validate(
    sourceText: string,
    aiText: string,
    profile: GovernanceProfile = DEFAULT_PROFILE
  ): GovernanceReport {
    // 1. Normalize both documents
    const sourceDoc = this.normalizer.normalize(sourceText);
    const aiDoc = this.normalizer.normalize(aiText);

    // 2. Run every rule and collect all violations
    const allViolations: RuleViolation[] = [];
    for (const rule of this.rules) {
      const violations = rule.evaluate(sourceDoc, aiDoc, profile);
      allViolations.push(...violations);
    }

    // 3. Compute metrics
    const metrics = this.computeMetrics(sourceDoc, aiDoc, allViolations);

    // 4. Score
    const riskScore = this.calculateRiskScore(allViolations, metrics, profile);

    // 5. Determine pass / block / advisory status
    const hasErrors = allViolations.some((v) => v.severity === "error");
    let status: GovernanceReport["status"] = "passed";
    if (hasErrors) {
      status = profile.blockOnErrors ? "blocked" : "advisory_warning";
    } else if (allViolations.some((v) => v.severity === "warning")) {
      status = "advisory_warning";
    }

    return {
      timestamp: new Date().toISOString(),
      riskScore,
      status,
      metrics,
      violations: allViolations,
      sourceHash: this.djb2Hash(sourceText),
      aiOutputHash: this.djb2Hash(aiText),
    };
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  private computeMetrics(
    source: NormalizedDocument,
    ai: NormalizedDocument,
    violations: RuleViolation[]
  ): GovernanceMetrics {
    return {
      expansionRatio:
        source.wordCount > 0 ? +(ai.wordCount / source.wordCount).toFixed(3) : 1,
      newNounsCount: violations.filter(
        (v) => v.ruleId === "NO_NEW_INVENTIONS" && v.message.startsWith("New noun")
      ).length,
      termSubstitutionsCount: violations.filter(
        (v) => v.category === "terminology"
      ).length,
      structureChangesCount: violations.filter(
        (v) => v.category === "structure"
      ).length,
    };
  }

  // -------------------------------------------------------------------------
  // Risk Score
  // -------------------------------------------------------------------------
  // Score = Σ(violation × weight) + expansion_penalty, clamped 0–100.
  //
  // Weights come from the active profile so Safety Critical scores higher
  // than Fast Draft for the same set of violations.

  private calculateRiskScore(
    violations: RuleViolation[],
    metrics: GovernanceMetrics,
    profile: GovernanceProfile
  ): number {
    if (violations.length === 0 && metrics.expansionRatio <= profile.maxExpansionRatio) {
      return 0;
    }

    const weights: Record<Severity, number> = profile.weights ?? {
      error: 15,
      warning: 5,
      info: 1,
    };

    // Base penalty from violations, weighted by confidence so low-confidence
    // heuristic matches contribute proportionally less.
    const violationPenalty = violations.reduce(
      (acc, v) => acc + weights[v.severity] * v.confidence,
      0
    );

    // Expansion penalty: every 1% over maxExpansionRatio adds 2 points.
    const overExpansion = Math.max(
      0,
      metrics.expansionRatio - profile.maxExpansionRatio
    );
    const expansionPenalty = overExpansion * 200; // 0.10 over → +20 pts

    const raw = violationPenalty + expansionPenalty;
    return Math.min(Math.max(Math.round(raw), 0), 100);
  }

  // -------------------------------------------------------------------------
  // Audit hash  (DJB2 — fast, deterministic, no crypto dependency needed)
  // -------------------------------------------------------------------------

  private djb2Hash(text: string): string {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
      hash |= 0; // keep 32-bit int
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
}
