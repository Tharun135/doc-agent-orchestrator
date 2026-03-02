import * as assert from "assert";
import { DocumentNormalizer } from "../engine/validation/normalizer";

// ---------------------------------------------------------------------------
// DocumentNormalizer unit tests
// ---------------------------------------------------------------------------

suite("DocumentNormalizer", () => {
  const n = new DocumentNormalizer();

  // -------------------------------------------------------------------------
  // Markdown stripping
  // -------------------------------------------------------------------------
  suite("stripMarkdown", () => {
    test("removes ATX headings", () => {
      const result = n.normalize("## Configure the Runtime Manager\nClick Submit.");
      assert.ok(!result.sentences.some((s: string) => s.includes("##")));
    });

    test("removes bold markers", () => {
      const result = n.normalize("Click the **Submit** button.");
      assert.ok(result.rawText.includes("Submit"));
      assert.ok(!result.sentences.join(" ").includes("**"));
    });

    test("removes fenced code blocks", () => {
      const result = n.normalize("Do this:\n```bash\nnpm install\n```\nThen restart.");
      assert.ok(!result.nounSet.has("bash"));
    });

    test("preserves quoted UI labels inside code blocks stripped text", () => {
      const result = n.normalize('Click the "Save" button.');
      assert.ok(result.uiLabels.has("Save"));
    });
  });

  // -------------------------------------------------------------------------
  // Word count
  // -------------------------------------------------------------------------
  suite("wordCount", () => {
    test("counts space-separated tokens", () => {
      const result = n.normalize("one two three four five");
      assert.strictEqual(result.wordCount, 5);
    });

    test("is higher for longer documents", () => {
      const short = n.normalize("Click Submit.");
      const long  = n.normalize("Click Submit. Then verify the connection. Navigate to the dashboard and check the status indicator.");
      assert.ok(long.wordCount > short.wordCount);
    });
  });

  // -------------------------------------------------------------------------
  // Noun extraction
  // -------------------------------------------------------------------------
  suite("extractNouns", () => {
    test("extracts singular form from plural", () => {
      const result = n.normalize("The servers handle all requests.");
      assert.ok(result.nounSet.has("server") || result.nounSet.has("request"),
        `nounSet: ${[...result.nounSet].join(", ")}`);
    });

    test("does not include stopwords", () => {
      const result = n.normalize("The user can do this action.");
      for (const stopword of ["the", "can", "do", "this"]) {
        assert.ok(!result.nounSet.has(stopword), `Stopword "${stopword}" should not be in nounSet`);
      }
    });

    test("extracts domain nouns", () => {
      const result = n.normalize("The Runtime Manager validates the deployment configuration.");
      // At least one of these domain nouns should be present
      const has = result.nounSet.has("deployment") || result.nounSet.has("configuration") || result.nounSet.has("runtime");
      assert.ok(has, `nounSet: ${[...result.nounSet].join(", ")}`);
    });
  });

  // -------------------------------------------------------------------------
  // Verb extraction
  // -------------------------------------------------------------------------
  suite("extractVerbs", () => {
    test("lemmatizes -ing form to infinitive", () => {
      const result = n.normalize("The system is running the validation.");
      assert.ok(result.verbSet.has("run") || result.verbSet.has("validate"),
        `verbSet: ${[...result.verbSet].join(", ")}`);
    });

    test("lemmatizes -ed form to infinitive", () => {
      const result = n.normalize("The user clicked the button.");
      assert.ok(result.verbSet.has("click"),
        `verbSet: ${[...result.verbSet].join(", ")}`);
    });

    test("lemmatizes configured correctly", () => {
      const result = n.normalize("The engineer configured the database.");
      assert.ok(result.verbSet.has("configure"),
        `verbSet: ${[...result.verbSet].join(", ")}`);
    });

    test("lemmatizes deployed correctly", () => {
      const result = n.normalize("The team deployed the service.");
      assert.ok(result.verbSet.has("deploy"),
        `verbSet: ${[...result.verbSet].join(", ")}`);
    });
  });

  // -------------------------------------------------------------------------
  // Capitalized entity extraction
  // -------------------------------------------------------------------------
  suite("capitalizedEntities", () => {
    test("extracts multi-word product names", () => {
      const result = n.normalize("Use the Runtime Manager to configure your deployment.");
      assert.ok(result.capitalizedEntities.has("Runtime Manager"),
        `entities: ${[...result.capitalizedEntities].join(", ")}`);
    });

    test("extracts ALL_CAPS acronyms", () => {
      const result = n.normalize("Send the request to the API endpoint.");
      assert.ok(result.capitalizedEntities.has("API"),
        `entities: ${[...result.capitalizedEntities].join(", ")}`);
    });
  });

  // -------------------------------------------------------------------------
  // UI label extraction
  // -------------------------------------------------------------------------
  suite("uiLabels", () => {
    test("extracts double-quoted labels", () => {
      const result = n.normalize('Click "Submit" to save.');
      assert.ok(result.uiLabels.has("Submit"),
        `uiLabels: ${[...result.uiLabels].join(", ")}`);
    });

    test("extracts backtick labels", () => {
      const result = n.normalize("Press `Ctrl+S` to save.");
      assert.ok(result.uiLabels.has("Ctrl+S"),
        `uiLabels: ${[...result.uiLabels].join(", ")}`);
    });

    test("extracts bracket labels", () => {
      const result = n.normalize("Click the [Save] button.");
      assert.ok(result.uiLabels.has("Save"),
        `uiLabels: ${[...result.uiLabels].join(", ")}`);
    });

    test("does not include URLs as labels", () => {
      const result = n.normalize('See [the docs](https://example.com) for details.');
      for (const label of result.uiLabels) {
        assert.ok(!label.startsWith("http"), `URL "${label}" should not be a UI label`);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Step structure parsing
  // -------------------------------------------------------------------------
  suite("parseSteps", () => {
    test("parses numbered steps", () => {
      const result = n.normalize("1. Click Submit.\n2. Verify the page loads.\n3. Close the dialog.");
      assert.strictEqual(result.stepStructure.length, 3);
      assert.strictEqual(result.stepStructure[0].index, 1);
      assert.strictEqual(result.stepStructure[2].index, 3);
    });

    test("flags conditional steps", () => {
      const result = n.normalize("1. Click Submit.\n2. If an error appears, retry.\n3. Close.");
      const conditionalStep = result.stepStructure.find((s: import("../engine/validation/types").Step) => s.index === 2);
      assert.ok(conditionalStep?.isConditional, "Step 2 should be flagged conditional");
      assert.ok(!result.stepStructure[0].isConditional, "Step 1 should not be conditional");
    });

    test("extracts action verbs from steps", () => {
      const result = n.normalize("1. Click the Submit button.\n2. Navigate to the dashboard.");
      const s1 = result.stepStructure[0];
      assert.ok(s1.actionVerbs.length > 0, "Step 1 should have action verbs");
    });
  });

  // -------------------------------------------------------------------------
  // Ambiguity detection
  // -------------------------------------------------------------------------
  suite("detectAmbiguities", () => {
    test("flags 'if necessary'", () => {
      const found = n.detectAmbiguities("Configure the settings if necessary.");
      assert.ok(found.length > 0, "Should detect 'if necessary'");
    });

    test("flags 'as required'", () => {
      const found = n.detectAmbiguities("Adjust the values as required.");
      assert.ok(found.length > 0, "Should detect 'as required'");
    });

    test("returns empty for clear text", () => {
      const found = n.detectAmbiguities("Click Submit. The form saves.");
      assert.strictEqual(found.length, 0);
    });
  });
});
