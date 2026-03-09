import * as vscode from "vscode";
import { GovernanceReport, RuleViolation, Severity } from "../engine/validation/types";
import { DiffResult } from "./diffUtils";
import { PreservedAmbiguity } from "../engine/ambiguityParser";
import { analyzeInvention, InventionReport } from "../engine/inventionAnalyzer";

// ---------------------------------------------------------------------------
// GovernancePanel
// ---------------------------------------------------------------------------
// Shows a WebviewPanel containing:
//   • Risk score banner (colour-coded)
//   • Governance metrics strip
//   • Violations list (grouped by severity)
//   • Side-by-side diff (source ↔ AI output)
//   • Accept / Override / Dismiss action buttons
// ---------------------------------------------------------------------------

interface PanelCallbacks {
  onAccept: (aiText: string) => void | Promise<void>;
  onOverride: (aiText: string, reason: string) => void | Promise<void>;
  /** Called when the user wants to resolve preserved ambiguities. */
  onResolve?: (ambiguities: PreservedAmbiguity[]) => void | Promise<void>;
}

export class GovernancePanel {
  public static readonly viewType = "docAgent.governancePanel";
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  // -------------------------------------------------------------------------
  // Factory
  // -------------------------------------------------------------------------

  public static create(
    extensionUri: vscode.Uri,
    report: GovernanceReport,
    diff: DiffResult,
    sourceText: string,
    aiText: string,
    profileName: string,
    callbacks: PanelCallbacks,
    ambiguities: PreservedAmbiguity[] = [],
    pass: number = 1
  ): GovernancePanel {
    const panel = vscode.window.createWebviewPanel(
      GovernancePanel.viewType,
      `Governance Report — Pass ${pass} · Risk ${report.riskScore}%`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    return new GovernancePanel(
      panel,
      report,
      diff,
      sourceText,
      aiText,
      profileName,
      callbacks,
      ambiguities,
      pass
    );
  }

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  private constructor(
    panel: vscode.WebviewPanel,
    report: GovernanceReport,
    diff: DiffResult,
    sourceText: string,
    aiText: string,
    profileName: string,
    callbacks: PanelCallbacks,
    private readonly _ambiguities: PreservedAmbiguity[] = [],
    private readonly _pass: number = 1,
    private readonly _sourceText: string = sourceText
  ) {
    this._panel = panel;
    this._panel.webview.html = this._buildHtml(report, diff, sourceText, aiText, profileName, _ambiguities, _pass);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message: { command: string; reason?: string }) => {
        switch (message.command) {
          case "accept":
            await callbacks.onAccept(aiText);
            this._panel.dispose();
            break;
          case "override":
            await callbacks.onOverride(aiText, message.reason ?? "(no reason given)");
            this._panel.dispose();
            break;
          case "dismiss":
            this._panel.dispose();
            break;
          case "resolve":
            if (callbacks.onResolve) {
              await callbacks.onResolve(this._ambiguities);
            }
            break;
        }
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  public dispose(): void {
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      d?.dispose();
    }
  }

  // -------------------------------------------------------------------------
  // HTML builder
  // -------------------------------------------------------------------------

  private _buildHtml(
    report: GovernanceReport,
    diff: DiffResult,
    sourceText: string,
    aiText: string,
    profileName: string,
    ambiguities: PreservedAmbiguity[] = [],
    pass: number = 1
  ): string {
    const { riskScore, status, metrics, violations } = report;

    const errors   = violations.filter((v) => v.severity === "error");
    const warnings = violations.filter((v) => v.severity === "warning");
    const infos    = violations.filter((v) => v.severity === "info");

    const bannerColor =
      riskScore < 20 ? "#2d7d2d" :
      riskScore < 50 ? "#8a6500" :
                       "#8b1a1a";

    const bannerBg =
      riskScore < 20 ? "#1a3a1a" :
      riskScore < 50 ? "#3a2f00" :
                       "#3a0a0a";

    const statusLabel =
      status === "passed"           ? "✅ PASSED" :
      status === "blocked"          ? "🚫 BLOCKED" :
                                     "⚠️ ADVISORY WARNING";

    const hasAmbiguities = ambiguities.length > 0;
    const ambigJson = JSON.stringify(ambiguities);

    const isBlocked = status === "blocked";

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Governance Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: 13px;
    color: var(--vscode-foreground, #ccc);
    background: var(--vscode-editor-background, #1e1e1e);
    padding: 0;
    overflow-x: hidden;
  }

  /* ---- Banner ---- */
  .banner {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 20px;
    background: ${bannerBg};
    border-bottom: 2px solid ${bannerColor};
  }
  .risk-score {
    font-size: 36px;
    font-weight: 700;
    color: ${bannerColor === "#2d7d2d" ? "#4ec94e" : bannerColor === "#8a6500" ? "#f0c040" : "#f04040"};
    line-height: 1;
    min-width: 56px;
  }
  .risk-label { font-size: 11px; color: #888; margin-top: 2px; }
  .banner-info { flex: 1; }
  .banner-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-foreground, #ddd);
  }
  .banner-meta { font-size: 11px; color: #888; margin-top: 3px; }
  .status-badge {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    background: ${bannerBg};
    border: 1px solid ${bannerColor};
    color: ${bannerColor === "#2d7d2d" ? "#4ec94e" : bannerColor === "#8a6500" ? "#f0c040" : "#f04040"};
  }

  /* ---- Metrics strip ---- */
  .metrics {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
  }
  .metric {
    flex: 1;
    padding: 10px 16px;
    border-right: 1px solid var(--vscode-panel-border, #333);
    text-align: center;
  }
  .metric:last-child { border-right: none; }
  .metric-value { font-size: 20px; font-weight: 700; }
  .metric-label { font-size: 10px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* ---- Two-column layout ---- */
  .main { display: flex; gap: 0; height: calc(100vh - 200px); }
  .pane {
    flex: 1;
    overflow-y: auto;
    border-right: 1px solid var(--vscode-panel-border, #333);
  }
  .pane:last-child { border-right: none; }
  .pane-header {
    position: sticky;
    top: 0;
    background: var(--vscode-editor-background, #1e1e1e);
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #888;
    z-index: 10;
  }

  /* ---- Violations pane ---- */
  .violations-pane {
    width: 320px;
    min-width: 280px;
    flex: 0 0 320px;
    overflow-y: auto;
    border-right: 1px solid var(--vscode-panel-border, #333);
  }
  .violation-group-header {
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: sticky;
    top: 32px;
    z-index: 9;
  }
  .vh-error   { background: #2a0a0a; color: #f04040; }
  .vh-warning { background: #2a1f00; color: #f0c040; }
  .vh-info    { background: #0a1a2a; color: #4090f0; }

  .violation-card {
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    cursor: default;
  }
  .violation-card:hover { background: var(--vscode-list-hoverBackground, #2a2a2a); }
  .vc-message { font-size: 12px; line-height: 1.4; }
  .vc-phrase {
    display: inline-block;
    margin-top: 4px;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    background: var(--vscode-textBlockQuote-background, #2a2a2a);
  }
  .vc-context {
    margin-top: 4px;
    font-size: 11px;
    color: #888;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .vc-confidence {
    margin-top: 4px;
    font-size: 10px;
    color: #666;
  }
  .no-violations {
    padding: 20px 12px;
    text-align: center;
    color: #4ec94e;
    font-size: 12px;
  }

  /* ---- Diff pane ---- */
  .diff-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
    font-size: 12px;
  }
  .diff-table td { padding: 0 8px; white-space: pre-wrap; word-break: break-word; vertical-align: top; }
  .diff-table .ln { width: 36px; text-align: right; color: #555; padding-right: 12px; user-select: none; border-right: 1px solid #333; }
  .diff-equal   { }
  .diff-removed { background: rgba(220, 50, 50, 0.18); color: #f08080; }
  .diff-added   { background: rgba(50, 180, 50,  0.18); color: #80c880; }
  .diff-removed .ln, .diff-added .ln { color: #777; }

  /* ---- Tabs ---- */
  .pane-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    background: var(--vscode-editor-background, #1e1e1e);
  }
  .pane-tab {
    flex: 0 0 auto;
    padding: 8px 16px;
    border: none;
    background: transparent;
    color: #888;
    cursor: pointer;
    font-size: 12px;
    border-bottom: 2px solid transparent;
    transition: all 0.15s ease;
  }
  .pane-tab:hover {
    color: #aaa;
  }
  .pane-tab.active {
    color: var(--vscode-foreground, #ccc);
    border-bottom-color: #4090f0;
  }
  .pane-tab-content {
    display: none;
    overflow-y: auto;
    flex: 1;
  }
  .pane-tab-content.active {
    display: block;
  }

  /* ---- Invention table ---- */
  .invention-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: 11px;
  }
  .invention-table th {
    position: sticky;
    top: 0;
    padding: 6px 8px;
    background: var(--vscode-editor-background, #1e1e1e);
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    text-align: left;
    font-weight: 600;
    color: #aaa;
    white-space: nowrap;
  }
  .invention-table td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
  }
  .invention-table tr:hover { background: var(--vscode-list-hoverBackground, #2a2a2a); }
  .inv-classified { font-weight: 600; }
  .inv-preserved { color: #4ec94e; }
  .inv-clarified { color: #4090f0; }
  .inv-inferred { color: #f09020; }
  .inv-invented { color: #f04040; }
  .inv-strengthened { color: #f0c040; }
  .inv-severity { font-size: 10px; padding: 2px 4px; border-radius: 2px; }
  .inv-severity.low { background: rgba(78, 201, 78, 0.2); color: #4ec94e; }
  .inv-severity.medium { background: rgba(240, 160, 32, 0.2); color: #f0a020; }
  .inv-severity.high { background: rgba(240, 64, 64, 0.2); color: #f04040; }

  /* ---- Invention summary ---- */
  .invention-summary {
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    background: var(--vscode-editor-background, #1e1e1e);
    font-size: 11px;
    line-height: 1.5;
  }
  .invention-summary-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
  }
  .invention-summary-stat { font-weight: 600; }
  .expansion-gauge {
    display: inline-block;
    width: 100px;
    height: 12px;
    border-radius: 2px;
    background: linear-gradient(90deg, #2d7d2d 0%, #f0c040 50%, #f04040 100%);
    opacity: 0.6;
    margin: 0 4px;
  }

  /* ---- Footer ---- */
  .footer {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background: var(--vscode-editor-background, #1e1e1e);
    border-top: 1px solid var(--vscode-panel-border, #333);
    z-index: 100;
  }
  .footer-stats { flex: 1; font-size: 11px; color: #888; }
  button {
    padding: 6px 16px;
    border-radius: 3px;
    font-size: 12px;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  .btn-accept {
    background: ${isBlocked ? "#333" : "#0f7b0f"};
    color: ${isBlocked ? "#666" : "#fff"};
    cursor: ${isBlocked ? "not-allowed" : "pointer"};
  }
  .btn-override {
    background: #5a3e00;
    color: #f0c040;
  }
  .btn-dismiss {
    background: var(--vscode-button-secondaryBackground, #3a3a3a);
    color: var(--vscode-button-secondaryForeground, #ccc);
  }
  .btn-resolve {
    background: #1a3a5a;
    color: #60b0f0;
    border: 1px solid #2a5a8a;
  }
  .btn-resolve:hover { background: #1e4a70; }
  .blocked-hint { color: #f04040; font-size: 11px; margin-right: 4px; }
</style>
</head>
<body>

<!-- ======== Banner ======== -->
<div class="banner">
  <div>
    <div class="risk-score">${riskScore}<span style="font-size:16px">%</span></div>
    <div class="risk-label">Invention Risk</div>
  </div>
  <div class="banner-info">
    <div class="banner-title">Governance Report &nbsp;<span style="font-size:12px;font-weight:400;color:#888">Pass ${pass}</span></div>
    <div class="banner-meta">Profile: ${this._esc(profileName)} &nbsp;·&nbsp; ${new Date(report.timestamp).toLocaleTimeString()} &nbsp;·&nbsp; src: <code>${report.sourceHash}</code> &nbsp; ai: <code>${report.aiOutputHash}</code></div>
  </div>
  <div class="status-badge">${statusLabel}</div>
</div>

<!-- ======== Metrics ======== -->
<div class="metrics">
  <div class="metric">
    <div class="metric-value" style="color:${metrics.expansionRatio > 1.3 ? '#f0c040' : '#ccc'}">${(metrics.expansionRatio * 100 - 100).toFixed(0)}%</div>
    <div class="metric-label">Expansion</div>
  </div>
  <div class="metric">
    <div class="metric-value" style="color:${metrics.newNounsCount > 0 ? '#f04040' : '#4ec94e'}">${metrics.newNounsCount}</div>
    <div class="metric-label">New Nouns</div>
  </div>
  <div class="metric">
    <div class="metric-value" style="color:${metrics.termSubstitutionsCount > 0 ? '#f07020' : '#4ec94e'}">${metrics.termSubstitutionsCount}</div>
    <div class="metric-label">Term Substitutions</div>
  </div>
  <div class="metric">
    <div class="metric-value" style="color:${metrics.structureChangesCount > 0 ? '#f0c040' : '#4ec94e'}">${metrics.structureChangesCount}</div>
    <div class="metric-label">Structure Changes</div>
  </div>
  <div class="metric">
    <div class="metric-value">${violations.length}</div>
    <div class="metric-label">Total Violations</div>
  </div>
  <div class="metric">
    <div class="metric-value" style="color:#80c880">${diff.addedCount}</div>
    <div class="metric-label">Lines Added</div>
  </div>
  <div class="metric">
    <div class="metric-value" style="color:#f08080">${diff.removedCount}</div>
    <div class="metric-label">Lines Removed</div>
  </div>
</div>

<!-- ======== Main panes ======== -->
<div class="main">

  <!-- Violations pane -->
  <div class="violations-pane">
    <div class="pane-header">Violations</div>
    ${violations.length === 0
      ? '<div class="no-violations">✅ No violations detected</div>'
      : [
          this._violationGroup("Errors",   errors,   "error"),
          this._violationGroup("Warnings", warnings, "warning"),
          this._violationGroup("Info",     infos,    "info"),
        ].join("")
    }
  </div>

  <!-- Diff pane -->
  <div class="pane" style="flex:1; display: flex; flex-direction: column;">
    <!-- Tab bar -->
    <div class="pane-tabs">
      <button class="pane-tab active" data-tab="diff-view">📄 Diff View</button>
      <button class="pane-tab" data-tab="invention-view">📊 Invention Tracker</button>
    </div>
    
    <!-- Diff tab content -->
    <div class="pane-tab-content active" data-tab="diff-view" style="overflow-y: auto; flex: 1;">
      <div class="pane-header" style="display:flex;gap:0">
        <span style="flex:1;padding-left:48px">Source</span>
        <span style="flex:1;padding-left:48px">AI Output</span>
      </div>
      ${this._buildDiffTable(diff)}
    </div>
    
    <!-- Invention tracker tab content -->
    <div class="pane-tab-content" data-tab="invention-view" style="overflow-y: auto; flex: 1;">
      ${this._buildInventionTracker(sourceText, aiText)}
    </div>
  </div>

</div>

<!-- ======== Footer ======== -->
<div class="footer">
  <span class="footer-stats">
    ${diff.addedCount} added &nbsp; ${diff.removedCount} removed &nbsp; ${diff.equalCount} unchanged
    &nbsp;·&nbsp; ${errors.length} error${errors.length !== 1 ? "s" : ""}
    &nbsp;·&nbsp; ${warnings.length} warning${warnings.length !== 1 ? "s" : ""}
  </span>
  ${isBlocked ? '<span class="blocked-hint">🚫 Fix errors to accept</span>' : ""}
  ${hasAmbiguities ? `<button class="btn-resolve" id="btnResolve" title="Answer the ${ambiguities.length} preserved ambiguit${ambiguities.length === 1 ? 'y' : 'ies'} to refine the document">🔍 Resolve Ambiguities (${ambiguities.length})</button>` : ""}
  <button class="btn-accept" id="btnAccept" ${isBlocked ? "disabled title='Resolve all errors before accepting'" : ""}>Accept Rewrite</button>
  <button class="btn-override" id="btnOverride">Override &amp; Log</button>
  <button class="btn-dismiss" id="btnDismiss">Dismiss</button>
</div>

<script>
  const vscode = acquireVsCodeApi();

  // Tab switching
  document.querySelectorAll('.pane-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      
      // Remove active state from all tabs and contents
      document.querySelectorAll('.pane-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pane-tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active state to clicked tab and corresponding content
      tab.classList.add('active');
      const selector = '[data-tab="' + tabName + '"]';
      document.querySelector(selector).classList.add('active');
    });
  });

  document.getElementById('btnAccept')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'accept' });
  });

  document.getElementById('btnOverride')?.addEventListener('click', () => {
    const reason = prompt('Enter reason for overriding governance violations (will be logged):');
    if (reason !== null) {
      vscode.postMessage({ command: 'override', reason });
    }
  });

  document.getElementById('btnDismiss')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'dismiss' });
  });

  document.getElementById('btnResolve')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'resolve' });
  });
</script>
</body>
</html>`;
  }

  // -------------------------------------------------------------------------
  // Violation group renderer
  // -------------------------------------------------------------------------

  private _violationGroup(
    label: string,
    violations: RuleViolation[],
    severity: Severity
  ): string {
    if (violations.length === 0) { return ""; }
    const cls = `vh-${severity}`;
    const cards = violations.map((v) => this._violationCard(v)).join("");
    return `
      <div class="violation-group-header ${cls}">${label} (${violations.length})</div>
      ${cards}
    `;
  }

  private _violationCard(v: RuleViolation): string {
    const phrase    = v.location?.offendingPhrase
      ? `<div class="vc-phrase">${this._esc(v.location.offendingPhrase)}</div>` : "";
    const context   = v.location?.contextSnippet
      ? `<div class="vc-context">${this._esc(v.location.contextSnippet.slice(0, 100))}</div>` : "";
    const confidence = `<div class="vc-confidence">Confidence: ${Math.round(v.confidence * 100)}% · Rule: ${v.ruleId}</div>`;

    return `
      <div class="violation-card">
        <div class="vc-message">${this._esc(v.message)}</div>
        ${phrase}${context}${confidence}
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Invention Tracker renderer
  // -------------------------------------------------------------------------

  private _buildInventionTracker(sourceText: string, aiText: string): string {
    const report = analyzeInvention(sourceText, aiText);
    
    // Build summary section
    const summaryHtml = `
      <div class="invention-summary">
        <div class="invention-summary-row">
          <span class="invention-summary-stat">✅ Preserved:</span>
          <span>${report.stats.preserved}</span>
          <span class="invention-summary-stat">🟡 Clarified:</span>
          <span>${report.stats.clarified}</span>
          <span class="invention-summary-stat">🟠 Inferred:</span>
          <span>${report.stats.inferred}</span>
        </div>
        <div class="invention-summary-row">
          <span class="invention-summary-stat">⚠️  Strengthened:</span>
          <span>${report.stats.strengthened}</span>
          <span class="invention-summary-stat">🔴 Invented:</span>
          <span>${report.stats.invented}</span>
          <span class="invention-summary-stat">Total Mappings:</span>
          <span>${report.stats.total}</span>
        </div>
        <div class="invention-summary-row">
          <span class="invention-summary-stat">Expansion Ratio:</span>
          <span>${report.expansionRatio.toFixed(1)}%</span>
          <span class="expansion-gauge"></span>
          <span style="font-size: 10px; color: #888;">
            ${report.expansionRatio <= 30 ? "✅" : report.expansionRatio <= 50 ? "🟡" : "⚠️ "}
            ${report.summary}
          </span>
        </div>
      </div>
    `;
    
    // Build mappings table
    const tableRows = report.mappings.map((mapping) => {
      const classIcon = {
        PRESERVED: "✅",
        CLARIFIED: "🟡",
        INFERRED: "🟠",
        INVENTED: "🔴",
        STRENGTHENED: "⚠️ ",
      }[mapping.classification] || "?";
      
      const classColor = {
        PRESERVED: "inv-preserved",
        CLARIFIED: "inv-clarified",
        INFERRED: "inv-inferred",
        INVENTED: "inv-invented",
        STRENGTHENED: "inv-strengthened",
      }[mapping.classification] || "";
      
      return `<tr>
        <td><span class="inv-classified ${classColor}">${classIcon} ${mapping.classification}</span></td>
        <td style="font-size:10px;color:#888">${mapping.category}</td>
        <td style="max-width: 250px; word-break: break-word;">${this._esc(mapping.sourcePhrase)}</td>
        <td style="max-width: 250px; word-break: break-word;">${this._esc(mapping.outputPhrase)}</td>
        <td><span class="inv-severity ${mapping.severity}">${mapping.severity.toUpperCase()}</span></td>
        <td style="font-size:10px;color:#999;max-width:200px">${this._esc(mapping.reason)}</td>
      </tr>`;
    }).join("");
    
    const tableHtml = `
      <table class="invention-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Category</th>
            <th>Source Phrase</th>
            <th>Output Phrase</th>
            <th>Severity</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
    
    return summaryHtml + tableHtml;
  }

  // -------------------------------------------------------------------------
  // Diff table renderer
  // -------------------------------------------------------------------------

  private _buildDiffTable(diff: DiffResult): string {
    const rows = diff.lines.map((line) => {
      const cls =
        line.type === "added"   ? "diff-added"   :
        line.type === "removed" ? "diff-removed"  :
                                  "diff-equal";

      const srcLn  = line.srcLine ? String(line.srcLine) : "";
      const aiLn   = line.aiLine  ? String(line.aiLine)  : "";
      const srcTxt = line.type !== "added"   ? this._esc(line.text) : "";
      const aiTxt  = line.type !== "removed" ? this._esc(line.text) : "";

      return `<tr class="${cls}">
        <td class="ln">${srcLn}</td><td>${srcTxt}</td>
        <td class="ln">${aiLn}</td><td>${aiTxt}</td>
      </tr>`;
    });

    return `<table class="diff-table"><tbody>${rows.join("")}</tbody></table>`;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private _esc(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
