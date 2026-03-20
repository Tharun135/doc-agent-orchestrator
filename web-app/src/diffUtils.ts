// ---------------------------------------------------------------------------
// diffUtils.ts
// ---------------------------------------------------------------------------
// Line-level Longest Common Subsequence (LCS) diff.
// Returns a flat array of DiffLine objects the webview uses to draw the
// side-by-side diff panel.
// ---------------------------------------------------------------------------

export type DiffLineType = "equal" | "added" | "removed";

export interface DiffLine {
  type: DiffLineType;
  text: string;
  /** 1-based line number in the source document (undefined for "added" lines) */
  srcLine?: number;
  /** 1-based line number in the AI output (undefined for "removed" lines) */
  aiLine?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  equalCount: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeDiff(sourceText: string, aiText: string): DiffResult {
  // Split and drop trailing empty-string entries from empty inputs so that
  // computeDiff("", "…") doesn't produce a false "removed" line for the empty source.
  const splitLines = (t: string): string[] => {
    if (t === "") { return []; }
    return t.split("\n");
  };
  const srcLines = splitLines(sourceText);
  const aiLines  = splitLines(aiText);

  const raw = lcsEditScript(srcLines, aiLines);

  let addedCount = 0;
  let removedCount = 0;
  let equalCount = 0;

  for (const line of raw) {
    if      (line.type === "added")   { addedCount++; }
    else if (line.type === "removed") { removedCount++; }
    else                              { equalCount++; }
  }

  return { lines: raw, addedCount, removedCount, equalCount };
}

// ---------------------------------------------------------------------------
// LCS edit-script  (Myers-inspired, O(ND) space, good enough for docs)
// ---------------------------------------------------------------------------

function lcsEditScript(a: string[], b: string[]): DiffLine[] {
  const m = a.length;
  const n = b.length;

  // dp[i][j] = length of LCS of a[0..i-1] and b[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build the edit script
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  let srcLineNum = m;
  let aiLineNum  = n;

  // We build in reverse, then reverse at the end
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: "equal", text: a[i - 1], srcLine: i, aiLine: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "added", text: b[j - 1], aiLine: j });
      j--;
    } else {
      result.push({ type: "removed", text: a[i - 1], srcLine: i });
      i--;
    }
  }

  return result.reverse();
}
