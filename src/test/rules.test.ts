import * as assert from "assert";
import { DocumentNormalizer } from "../engine/validation/normalizer";
import { noNewInventions } from "../engine/validation/rules/noNewInventions";
import { termSubstitution } from "../engine/validation/rules/termSubstitution";
import { structureDrift } from "../engine/validation/rules/structureDrift";
import { GOVERNANCE_PROFILES } from "../engine/validation/profiles";
import { GovernanceProfile } from "../engine/validation/types";

// ---------------------------------------------------------------------------
// Rule Engine unit tests
// ---------------------------------------------------------------------------

const n = new DocumentNormalizer();
const strict   = GOVERNANCE_PROFILES.SAFETY_CRITICAL;
const standard = GOVERNANCE_PROFILES.STANDARD_DOCS;
const advisory = GOVERNANCE_PROFILES.FAST_DRAFT;

// ---------------------------------------------------------------------------
// noNewInventions
// ---------------------------------------------------------------------------

suite("Rule: NO_NEW_INVENTIONS", () => {
  test("no violations when AI output matches source vocabulary", () => {
    const src = n.normalize("The Runtime Manager validates the deployment configuration.");
    const ai  = n.normalize("The Runtime Manager validates the deployment configuration.");
    const violations = noNewInventions.evaluate(src, ai, standard);
    assert.strictEqual(violations.length, 0);
  });

  test("flags a new noun not in source", () => {
    const src = n.normalize("The Runtime Manager starts the service.");
    const ai  = n.normalize("The Runtime Manager starts the microservice using a sidecar proxy.");
    const violations = noNewInventions.evaluate(src, ai, standard);
    const nounsViolations = violations.filter((v) => v.message.startsWith("New noun"));
    assert.ok(nounsViolations.length > 0,
      `Expected noun violations but got: ${violations.map((v) => v.message).join("; ")}`);
  });

  test("severity is 'error' when allowNewNouns=false (strict)", () => {
    const src = n.normalize("Click the button to save.");
    const ai  = n.normalize("Click the button to save the configuration profile.");
    const violations = noNewInventions.evaluate(src, ai, strict);
    const nounErrors = violations.filter((v) => v.severity === "error" && v.message.startsWith("New noun"));
    assert.ok(nounErrors.length > 0, "Expect errors in strict mode for new nouns");
  });

  test("severity is 'warning' when allowNewNouns=false but not strict", () => {
    const src = n.normalize("Connect to the database.");
    const ai  = n.normalize("Connect to the primary database cluster.");
    const violations = noNewInventions.evaluate(src, ai, standard);
    const nounWarnings = violations.filter((v) => v.severity === "warning" && v.message.startsWith("New noun"));
    assert.ok(nounWarnings.length > 0, "Expect warnings in standard mode for new nouns");
  });

  test("severity is 'info' when allowNewNouns=true (advisory)", () => {
    const src = n.normalize("Connect to the database.");
    const ai  = n.normalize("Connect to the primary database cluster.");
    const violations = noNewInventions.evaluate(src, ai, advisory);
    const errorOrWarning = violations.filter(
      (v) => v.severity === "error" || (v.severity === "warning" && v.message.startsWith("New noun"))
    );
    assert.strictEqual(errorOrWarning.length, 0, "Advisory mode should not error or warn on new nouns");
  });

  test("each violation has an offendingPhrase", () => {
    const src = n.normalize("Start the service.");
    const ai  = n.normalize("Start the microservice orchestrator.");
    const violations = noNewInventions.evaluate(src, ai, standard);
    for (const v of violations) {
      assert.ok(v.location?.offendingPhrase, `Violation missing offendingPhrase: ${v.message}`);
    }
  });

  test("confidence is between 0 and 1", () => {
    const src = n.normalize("Deploy the application.");
    const ai  = n.normalize("Deploy the containerized application image.");
    const violations = noNewInventions.evaluate(src, ai, standard);
    for (const v of violations) {
      assert.ok(v.confidence >= 0 && v.confidence <= 1,
        `confidence out of range: ${v.confidence}`);
    }
  });
});

// ---------------------------------------------------------------------------
// termSubstitution
// ---------------------------------------------------------------------------

suite("Rule: TERM_SUBSTITUTION", () => {
  test("no violations when all entities are preserved", () => {
    const src = n.normalize('Use the Runtime Manager to configure the service. Click "Apply".');
    const ai  = n.normalize('Use the Runtime Manager to configure the service. Click "Apply".');
    const violations = termSubstitution.evaluate(src, ai, standard);
    assert.strictEqual(violations.length, 0);
  });

  test("flags a renamed capitalized entity", () => {
    const src = n.normalize("The Runtime Manager controls all deployments.");
    const ai  = n.normalize("The Runtime Controller controls all deployments.");
    const violations = termSubstitution.evaluate(src, ai, standard);
    assert.ok(violations.length > 0,
      "Expected a violation for Runtime Manager → Runtime Controller substitution");
    assert.ok(
      violations.some((v) => v.location?.offendingPhrase?.includes("Runtime Manager")),
      `Expected offendingPhrase containing 'Runtime Manager' in: ${violations.map((v) => v.location?.offendingPhrase).join(", ")}`
    );
  });

  test("flags a deleted UI label", () => {
    const src = n.normalize('Click "Submit" to save your changes.');
    const ai  = n.normalize("Click the save button to save your changes.");
    const violations = termSubstitution.evaluate(src, ai, standard);
    const labelViolation = violations.find((v) => v.location?.offendingPhrase === "Submit");
    assert.ok(labelViolation, `Expected 'Submit' UI label violation`);
    assert.strictEqual(labelViolation!.severity, "error");
  });

  test("returns no violations when requireTerminologyLock=false", () => {
    const src = n.normalize('Use the Runtime Manager. Click "Save".');
    const ai  = n.normalize("Use the Runtime Controller. Click the Save option.");
    const violations = termSubstitution.evaluate(src, ai, advisory);
    assert.strictEqual(violations.length, 0, "Advisory profile should skip terminology check");
  });

  test("detects likely synonym substitution in violation message", () => {
    const src = n.normalize("Open the Connection Manager to configure settings.");
    const ai  = n.normalize("Open the Connection Controller to configure settings.");
    const violations = termSubstitution.evaluate(src, ai, standard);
    const subViolation = violations.find((v) => v.message.includes("renamed"));
    assert.ok(subViolation, "Expected a 'renamed' substitution message");
    assert.ok(subViolation!.message.includes("Connection Controller"),
      `Expected substitute in message: ${subViolation!.message}`);
  });

  test("UI label violation has confidence 1.0", () => {
    const src = n.normalize('Press "OK" to confirm.');
    const ai  = n.normalize("Press Confirm to proceed.");
    const violations = termSubstitution.evaluate(src, ai, standard);
    const labelViolation = violations.find((v) => v.location?.offendingPhrase === "OK");
    assert.ok(labelViolation, "Expected 'OK' label violation");
    assert.strictEqual(labelViolation!.confidence, 1.0);
  });
});

// ---------------------------------------------------------------------------
// structureDrift
// ---------------------------------------------------------------------------

suite("Rule: STRUCTURE_DRIFT", () => {
  test("no violations when step counts match", () => {
    const src = n.normalize("1. Click Submit.\n2. Verify the result.\n3. Close the dialog.");
    const ai  = n.normalize("1. Click Submit.\n2. Verify the result.\n3. Close the dialog.");
    const violations = structureDrift.evaluate(src, ai, standard);
    assert.strictEqual(violations.length, 0);
  });

  test("no violations when non-procedural text (no steps)", () => {
    const src = n.normalize("The Runtime Manager validates all deployments in the cluster.");
    const ai  = n.normalize("The Runtime Manager handles all deployment validation.");
    const violations = structureDrift.evaluate(src, ai, standard);
    assert.strictEqual(violations.length, 0, "Non-step docs should not trigger structure drift");
  });

  test("flags step addition beyond drift threshold", () => {
    const src = n.normalize("1. Click Submit.\n2. Verify the result.");
    const ai  = n.normalize("1. Click Submit.\n2. Verify the result.\n3. Check the logs.\n4. Restart the service.");
    // standard allows drift=1, adding 2 steps exceeds it
    const violations = structureDrift.evaluate(src, ai, standard);
    const driftViolation = violations.find((v) => v.ruleId === "STRUCTURE_DRIFT" && v.message.includes("Step count"));
    assert.ok(driftViolation, "Expected step count drift violation");
  });

  test("no step count violation within allowed drift", () => {
    const src = n.normalize("1. Click Submit.\n2. Verify the result.");
    const ai  = n.normalize("1. Click Submit.\n2. Verify the result.\n3. Close the dialog.");
    // standard drift=1, adding exactly 1 step is fine
    const violations = structureDrift.evaluate(src, ai, standard);
    const driftViolation = violations.find((v) => v.message.includes("Step count"));
    assert.ok(!driftViolation, "One extra step should be within standard drift tolerance");
  });

  test("flags step count drift as error in strict mode (drift=0)", () => {
    const src = n.normalize("1. Click Submit.\n2. Verify the result.");
    const ai  = n.normalize("1. Click Submit.\n2. Verify the result.\n3. Restart.");
    const violations = structureDrift.evaluate(src, ai, strict);
    const driftViolation = violations.find((v) => v.message.includes("Step count"));
    assert.ok(driftViolation, "Expected step count violation in strict mode");
    assert.strictEqual(driftViolation!.severity, "error");
  });

  test("flags new conditional logic in a step", () => {
    const src = n.normalize("1. Click Submit.\n2. Save the file.");
    const ai  = n.normalize("1. Click Submit.\n2. If a dialog appears, click OK. Save the file.");
    const violations = structureDrift.evaluate(src, ai, standard);
    const conditionalViolation = violations.find((v) => v.message.includes("conditional logic"));
    assert.ok(conditionalViolation, "Expected conditional logic violation");
    assert.strictEqual(conditionalViolation!.severity, "warning");
  });
});
