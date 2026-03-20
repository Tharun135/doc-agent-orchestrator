import { GovernanceProfile } from "./types";

// ---------------------------------------------------------------------------
// Governance Profile Registry
// ---------------------------------------------------------------------------
// Each profile defines the tolerances the Rule Engine and Scoring Engine use.
// Rules read the profile before assigning severity; the validator reads
// blockOnErrors to decide on report.status.
// ---------------------------------------------------------------------------

export const GOVERNANCE_PROFILES: Record<string, GovernanceProfile> = {
  /**
   * SAFETY_CRITICAL
   * For regulated documentation (medical devices, safety procedures, legal).
   * Zero tolerance for invented content, synonym drift, or step changes.
   * Blocks the "Accept" action if any error-level violation exists.
   */
  SAFETY_CRITICAL: {
    id: "safety_critical",
    name: "Safety Critical",
    allowNewNouns: false,
    allowNewVerbs: false,
    maxExpansionRatio: 1.05,
    allowStepDrift: 0,
    requireTerminologyLock: true,
    blockOnErrors: true,
    weights: { error: 25, warning: 10, info: 2 },
  },

  /**
   * STANDARD_DOCS
   * For production technical documentation (API references, user guides).
   * Terminology lock enforced; minor verb variation tolerated.
   * Errors shown prominently but the writer can override with acknowledgment.
   */
  STANDARD_DOCS: {
    id: "standard_docs",
    name: "Standard Documentation",
    allowNewNouns: false,
    allowNewVerbs: true,
    maxExpansionRatio: 1.20,
    allowStepDrift: 1,
    requireTerminologyLock: true,
    blockOnErrors: false,
    weights: { error: 15, warning: 5, info: 1 },
  },

  /**
   * INTERNAL_DOCS
   * For internal wikis, runbooks, and team knowledge bases.
   * Moderate tolerance — catches major hallucinations but allows paraphrase.
   */
  INTERNAL_DOCS: {
    id: "internal_docs",
    name: "Internal Documentation",
    allowNewNouns: false,
    allowNewVerbs: true,
    maxExpansionRatio: 1.35,
    allowStepDrift: 2,
    requireTerminologyLock: false,
    blockOnErrors: false,
    weights: { error: 10, warning: 3, info: 0 },
  },

  /**
   * FAST_DRAFT
   * For brainstorming, blog posts, and first-pass drafts.
   * Governance is advisory only — all changes allowed, violations noted.
   */
  FAST_DRAFT: {
    id: "fast_draft",
    name: "Fast Draft / Brainstorm",
    allowNewNouns: true,
    allowNewVerbs: true,
    maxExpansionRatio: 1.50,
    allowStepDrift: 3,
    requireTerminologyLock: false,
    blockOnErrors: false,
    weights: { error: 5, warning: 2, info: 0 },
  },
};

/** The profile used when none is explicitly specified. */
export const DEFAULT_PROFILE: GovernanceProfile = GOVERNANCE_PROFILES.STANDARD_DOCS;
