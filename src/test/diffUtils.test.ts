import * as assert from "assert";
import { computeDiff } from "../ui/diffUtils";
import { DiffLine } from "../ui/diffUtils";

// ---------------------------------------------------------------------------
// diffUtils unit tests
// ---------------------------------------------------------------------------

suite("computeDiff", () => {
  // -------------------------------------------------------------------------
  // Identical input
  // -------------------------------------------------------------------------
  test("all lines equal for identical documents", () => {
    const text = "Line one\nLine two\nLine three";
    const result = computeDiff(text, text);
    assert.ok(result.lines.every((l: DiffLine) => l.type === "equal"));
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 0);
  });

  // -------------------------------------------------------------------------
  // Single addition
  // -------------------------------------------------------------------------
  test("detects a single added line", () => {
    const src = "Line one\nLine two";
    const ai  = "Line one\nLine two\nLine three";
    const result = computeDiff(src, ai);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 0);
    const added = result.lines.find((l: DiffLine) => l.type === "added");
    assert.ok(added, "Should have an added line");
    assert.strictEqual(added!.text, "Line three");
  });

  // -------------------------------------------------------------------------
  // Single removal
  // -------------------------------------------------------------------------
  test("detects a single removed line", () => {
    const src = "Line one\nLine two\nLine three";
    const ai  = "Line one\nLine three";
    const result = computeDiff(src, ai);
    assert.strictEqual(result.removedCount, 1);
    const removed = result.lines.find((l: DiffLine) => l.type === "removed");
    assert.ok(removed, "Should have a removed line");
    assert.strictEqual(removed!.text, "Line two");
  });

  // -------------------------------------------------------------------------
  // Replacement (one removed, one added)
  // -------------------------------------------------------------------------
  test("detects a replaced line as one removal and one addition", () => {
    const src = "Click Submit.\nVerify the page.";
    const ai  = "Click the Submit button.\nVerify the page.";
    const result = computeDiff(src, ai);
    assert.strictEqual(result.removedCount, 1);
    assert.strictEqual(result.addedCount, 1);
  });

  // -------------------------------------------------------------------------
  // Counts
  // -------------------------------------------------------------------------
  test("equalCount reflects unchanged lines", () => {
    const src = "a\nb\nc\nd";
    const ai  = "a\nb\ne\nd";
    const result = computeDiff(src, ai);
    assert.strictEqual(result.equalCount, 3, `equalCount: ${result.equalCount}`);
    assert.strictEqual(result.removedCount, 1);
    assert.strictEqual(result.addedCount, 1);
  });

  test("total lines = added + removed + equal", () => {
    const src = "one\ntwo\nthree\nfour";
    const ai  = "one\nTWO\nthree\nfour\nfive";
    const result = computeDiff(src, ai);
    assert.strictEqual(
      result.lines.length,
      result.addedCount + result.removedCount + result.equalCount
    );
  });

  // -------------------------------------------------------------------------
  // Line numbers
  // -------------------------------------------------------------------------
  test("equal lines have both srcLine and aiLine", () => {
    const text = "alpha\nbeta\ngamma";
    const result = computeDiff(text, text);
    for (const line of result.lines) {
      assert.ok(line.srcLine !== undefined, "srcLine missing on equal line");
      assert.ok(line.aiLine  !== undefined, "aiLine missing on equal line");
    }
  });

  test("added lines have aiLine but not srcLine", () => {
    const src = "alpha\ngamma";
    const ai  = "alpha\nbeta\ngamma";
    const result = computeDiff(src, ai);
    const added = result.lines.filter((l: DiffLine) => l.type === "added");
    for (const line of added) {
      assert.ok(line.aiLine  !== undefined, "aiLine missing on added line");
      assert.ok(line.srcLine === undefined, "srcLine should be absent on added line");
    }
  });

  test("removed lines have srcLine but not aiLine", () => {
    const src = "alpha\nbeta\ngamma";
    const ai  = "alpha\ngamma";
    const result = computeDiff(src, ai);
    const removed = result.lines.filter((l: DiffLine) => l.type === "removed");
    for (const line of removed) {
      assert.ok(line.srcLine !== undefined, "srcLine missing on removed line");
      assert.ok(line.aiLine  === undefined, "aiLine should be absent on removed line");
    }
  });

  // -------------------------------------------------------------------------
  // Empty inputs
  // -------------------------------------------------------------------------
  test("empty source and empty AI produces no lines", () => {
    const result = computeDiff("", "");
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 0);
  });

  test("empty source with AI content is all additions", () => {
    const result = computeDiff("", "line one\nline two");
    assert.ok(result.addedCount > 0);
    assert.strictEqual(result.removedCount, 0);
    assert.ok(result.lines.every((l: DiffLine) => l.type === "added"));
  });

  test("source with content and empty AI is all removals", () => {
    const result = computeDiff("line one\nline two", "");
    assert.ok(result.removedCount > 0);
    assert.strictEqual(result.addedCount, 0);
    assert.ok(result.lines.every((l: DiffLine) => l.type === "removed"));
  });

  // -------------------------------------------------------------------------
  // Multi-line realistic case
  // -------------------------------------------------------------------------
  test("realistic procedure diff — detects hallucinated step", () => {
    const src = [
      "## Configure the Service",
      "",
      "1. Open the Settings panel.",
      "2. Enter your API key.",
      "3. Click Save.",
    ].join("\n");

    const ai = [
      "## Configure the Service",
      "",
      "1. Open the Settings panel.",
      "2. Enter your API key.",
      "3. Verify the connection to the remote endpoint.",   // hallucinated
      "4. Click Save.",
    ].join("\n");

    const result = computeDiff(src, ai);
    assert.ok(result.addedCount >= 1, "Should detect the hallucinated step as an addition");
  });
});
