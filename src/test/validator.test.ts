import * as assert from "assert";
import { GovernanceValidator } from "../engine/validation/validator";
import { GOVERNANCE_PROFILES, DEFAULT_PROFILE } from "../engine/validation/profiles";

// ---------------------------------------------------------------------------
// GovernanceValidator + Profile integration tests
// ---------------------------------------------------------------------------

const validator = new GovernanceValidator();

// -------------------------------------------------------------------------
// Risk score basics
// -------------------------------------------------------------------------

suite("GovernanceValidator — risk score", () => {
  test("score is 0 for identical source and AI text", () => {
    const text = "The Runtime Manager validates the deployment configuration.";
    const report = validator.validate(text, text, DEFAULT_PROFILE);
    assert.strictEqual(report.riskScore, 0, `Expected 0, got ${report.riskScore}`);
  });

  test("score is > 0 when AI introduces new nouns", () => {
    const src = "Start the service.";
    const ai  = "Start the containerized microservice using a sidecar orchestrator proxy.";
    const report = validator.validate(src, ai, DEFAULT_PROFILE);
    assert.ok(report.riskScore > 0, `Expected risk > 0, got ${report.riskScore}`);
  });

  test("score is higher under strict profile than advisory for same change", () => {
    const src = "The Runtime Manager starts the service.";
    const ai  = "The Runtime Controller starts the containerized service.";
    const strictReport   = validator.validate(src, ai, GOVERNANCE_PROFILES.SAFETY_CRITICAL);
    const advisoryReport = validator.validate(src, ai, GOVERNANCE_PROFILES.FAST_DRAFT);
    assert.ok(
      strictReport.riskScore >= advisoryReport.riskScore,
      `Strict (${strictReport.riskScore}) should be >= Advisory (${advisoryReport.riskScore})`
    );
  });

  test("score is capped at 100", () => {
    const src = "Click the button.";
    const ai  = `The containerized Runtime Controller initializes the sidecar proxy, validates
the microservice mesh configuration, synchronizes the event-driven deployment pipeline,
and triggers the automated rollback procedure when the distributed tracing telemetry
exceeds the configured latency threshold. Verify the Kubernetes orchestration layer.`;
    const report = validator.validate(src, ai, GOVERNANCE_PROFILES.SAFETY_CRITICAL);
    assert.ok(report.riskScore <= 100, `Score ${report.riskScore} exceeds cap of 100`);
  });

  test("score is >= 0 (never negative)", () => {
    const report = validator.validate("hello world", "hello world", DEFAULT_PROFILE);
    assert.ok(report.riskScore >= 0);
  });
});

// -------------------------------------------------------------------------
// Status determination
// -------------------------------------------------------------------------

suite("GovernanceValidator — status", () => {
  test("status is 'passed' for identical documents", () => {
    const text = "The Runtime Manager validates the configuration.";
    const report = validator.validate(text, text, DEFAULT_PROFILE);
    assert.strictEqual(report.status, "passed");
  });

  test("status is 'blocked' in strict mode when errors exist", () => {
    const src = "Click Submit.";
    const ai  = "Click Submit. Then verify the sidecar proxy logs.";
    const report = validator.validate(src, ai, GOVERNANCE_PROFILES.SAFETY_CRITICAL);
    // Safety critical: allowNewNouns=false → new nouns are errors → blocks
    if (report.violations.some((v) => v.severity === "error")) {
      assert.strictEqual(report.status, "blocked");
    }
  });

  test("status is 'advisory_warning' in standard mode when errors exist", () => {
    const src = "The Runtime Manager controls deployments.";
    const ai  = "The Runtime Controller manages containerized deployments via orchestration.";
    const report = validator.validate(src, ai, GOVERNANCE_PROFILES.STANDARD_DOCS);
    // Standard: blockOnErrors=false → should be advisory_warning not blocked
    if (report.violations.some((v) => v.severity === "error")) {
      assert.notStrictEqual(report.status, "blocked");
      assert.strictEqual(report.status, "advisory_warning");
    }
  });

  test("status is 'advisory_warning' when only warnings exist", () => {
    const src = "Deploy the service to the server.";
    const ai  = "Deploy the service to the production server environment.";
    const report = validator.validate(src, ai, DEFAULT_PROFILE);
    if (report.violations.some((v) => v.severity === "warning") &&
        !report.violations.some((v) => v.severity === "error")) {
      assert.strictEqual(report.status, "advisory_warning");
    }
  });
});

// -------------------------------------------------------------------------
// GovernanceReport shape
// -------------------------------------------------------------------------

suite("GovernanceValidator — report shape", () => {
  test("report contains timestamp in ISO format", () => {
    const report = validator.validate("test", "test", DEFAULT_PROFILE);
    const d = new Date(report.timestamp);
    assert.ok(!isNaN(d.getTime()), `timestamp '${report.timestamp}' is not a valid ISO date`);
  });

  test("report contains non-empty source and AI hashes", () => {
    const report = validator.validate("source text", "ai text", DEFAULT_PROFILE);
    assert.ok(report.sourceHash.length > 0);
    assert.ok(report.aiOutputHash.length > 0);
  });

  test("hashes differ between source and AI", () => {
    const report = validator.validate("source text", "different ai text", DEFAULT_PROFILE);
    assert.notStrictEqual(report.sourceHash, report.aiOutputHash);
  });

  test("hashes are identical for identical text", () => {
    const report = validator.validate("same text", "same text", DEFAULT_PROFILE);
    assert.strictEqual(report.sourceHash, report.aiOutputHash);
  });

  test("metrics.expansionRatio is 1 for identical text", () => {
    const text = "Click Submit to save your changes.";
    const report = validator.validate(text, text, DEFAULT_PROFILE);
    assert.strictEqual(report.metrics.expansionRatio, 1);
  });

  test("metrics.expansionRatio > 1 for longer AI output", () => {
    const src = "Click Submit.";
    const ai  = "Click the Submit button to save all your pending changes to the database.";
    const report = validator.validate(src, ai, DEFAULT_PROFILE);
    assert.ok(report.metrics.expansionRatio > 1,
      `expansionRatio should be > 1, got ${report.metrics.expansionRatio}`);
  });

  test("violations array is always present", () => {
    const report = validator.validate("hello", "hello", DEFAULT_PROFILE);
    assert.ok(Array.isArray(report.violations));
  });
});

// -------------------------------------------------------------------------
// Governance profiles
// -------------------------------------------------------------------------

suite("GovernanceProfiles", () => {
  test("all four profiles are defined", () => {
    assert.ok(GOVERNANCE_PROFILES.SAFETY_CRITICAL);
    assert.ok(GOVERNANCE_PROFILES.STANDARD_DOCS);
    assert.ok(GOVERNANCE_PROFILES.INTERNAL_DOCS);
    assert.ok(GOVERNANCE_PROFILES.FAST_DRAFT);
  });

  test("SAFETY_CRITICAL blocks on errors", () => {
    assert.strictEqual(GOVERNANCE_PROFILES.SAFETY_CRITICAL.blockOnErrors, true);
  });

  test("FAST_DRAFT does not block on errors", () => {
    assert.strictEqual(GOVERNANCE_PROFILES.FAST_DRAFT.blockOnErrors, false);
  });

  test("SAFETY_CRITICAL has tighter expansion ratio than FAST_DRAFT", () => {
    assert.ok(
      GOVERNANCE_PROFILES.SAFETY_CRITICAL.maxExpansionRatio <
      GOVERNANCE_PROFILES.FAST_DRAFT.maxExpansionRatio
    );
  });

  test("SAFETY_CRITICAL disallows new nouns and verbs", () => {
    assert.strictEqual(GOVERNANCE_PROFILES.SAFETY_CRITICAL.allowNewNouns, false);
    assert.strictEqual(GOVERNANCE_PROFILES.SAFETY_CRITICAL.allowNewVerbs, false);
  });

  test("FAST_DRAFT allows new nouns and verbs", () => {
    assert.strictEqual(GOVERNANCE_PROFILES.FAST_DRAFT.allowNewNouns, true);
    assert.strictEqual(GOVERNANCE_PROFILES.FAST_DRAFT.allowNewVerbs, true);
  });

  test("each profile has a non-empty id and name", () => {
    for (const p of Object.values(GOVERNANCE_PROFILES)) {
      assert.ok(p.id.length > 0, `Profile.id should not be empty`);
      assert.ok(p.name.length > 0, `Profile.name should not be empty`);
    }
  });

  test("DEFAULT_PROFILE is STANDARD_DOCS", () => {
    assert.strictEqual(DEFAULT_PROFILE.id, GOVERNANCE_PROFILES.STANDARD_DOCS.id);
  });
});
