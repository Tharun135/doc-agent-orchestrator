import * as assert from "assert";
import { detectQuestions } from "../engine/questionDetector";

suite("Template-driven gap detection", () => {
  test("detects missing required section from canonical procedure template", () => {
    const source = `# Overview\nThis is a short description.\n\n# Procedure\n1. Do X.`;
    const questions = detectQuestions(source, "procedure");
    const missing = questions.find((q) => q.id.startsWith("missing-section:"));
    assert.ok(missing, `Expected missing-section question but got: ${JSON.stringify(questions)}`);
    assert.ok(missing!.question.includes("Prerequisites") || missing!.question.includes("Result"), "Expected question about Prerequisites or Result");
  });

  test("no missing-section when source includes all required headings", () => {
    const source = `# Overview\nIntro.\n\n# Prerequisites\nNone.\n\n# Procedure\n1. Do X.\n\n# Result\nSuccess.`;
    const questions = detectQuestions(source, "procedure");
    const missing = questions.find((q) => q.id.startsWith("missing-section:"));
    assert.strictEqual(missing, undefined, `Did not expect missing-section but found: ${JSON.stringify(missing)}`);
  });

  test("uses user-edited template headings when provided", () => {
    const source = `# Overview\nIntro.`;
    const editedTemplate = `# Intro\n# Prereqs\n# Steps\n# Outcome`;
    const questions = detectQuestions(source, "procedure", editedTemplate);
    // should ask for Prereqs, Steps, Outcome (or at least one missing-section)
    const missing = questions.filter((q) => q.id.startsWith("missing-section:"));
    assert.ok(missing.length >= 1, `Expected missing-section items but got: ${JSON.stringify(questions)}`);
    const ids = missing.map((m) => m.id).join(",");
    assert.ok(ids.includes("missing-section:Prereqs") || ids.includes("missing-section:Steps") || ids.includes("missing-section:Outcome") || ids.includes("missing-section:Intro"));
  });
});
