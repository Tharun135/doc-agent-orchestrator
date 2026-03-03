import * as vscode from "vscode";
import { generatePrompt } from "./engine/promptGenerator";
import { TaskType } from "./engine/types";
import { GovernanceValidator } from "./engine/validation/validator";
import { GOVERNANCE_PROFILES, DEFAULT_PROFILE } from "./engine/validation/profiles";
import { GovernanceProfile } from "./engine/validation/types";
import { GovernancePanel } from "./ui/GovernancePanel";
import { computeDiff } from "./ui/diffUtils";
import { parsePreservedAmbiguities, formatClarifications } from "./engine/ambiguityParser";
import { detectQuestions, formatPreClarifications } from "./engine/questionDetector";

let lastRewriteContext: {
  originalText: string;
  languageId: string;
  documentUri?: vscode.Uri;
  selection?: vscode.Selection;
} | null = null;

let lastPromptContext: {
  taskType: TaskType;
  userIntent: string;
  context: string;
  clarifications?: string;
} | null = null;

/** The most recent AI-generated output text (used to parse preserved ambiguities). */
let lastAiOutput: string | null = null;

/** 1-based generation pass counter. Resets to 1 on each new docAgent.generateDocumentation run. */
let currentPass: number = 1;

/** The active governance profile — persists across commands within a session. */
let activeProfile: GovernanceProfile = DEFAULT_PROFILE;

/** Output channel for governance override audit log. */
let governanceLog: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  governanceLog = vscode.window.createOutputChannel("Governance Audit Log");
  context.subscriptions.push(governanceLog);
  const generateCmd = vscode.commands.registerCommand(
    "docAgent.generateDocumentation",
    async () => {
      try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("No active editor found. Please open a file first.");
          return;
        }

        const selection = editor.selection;
        const contextText = selection.isEmpty
          ? editor.document.getText()
          : editor.document.getText(selection);

        if (!contextText.trim()) {
          vscode.window.showErrorMessage("No content found. Please select text or ensure the file has content.");
          return;
        }

        lastRewriteContext = {
          originalText: contextText,
          languageId: editor.document.languageId,
          documentUri: editor.document.isUntitled ? undefined : editor.document.uri,
          selection: selection.isEmpty ? undefined : selection,
        };

        const taskPick = await vscode.window.showQuickPick<
          { label: string; value: TaskType }
        >(
          [
            { label: "Write / Rewrite Procedure", value: "procedure" },
            { label: "Explain a Technical Concept", value: "concept" },
            { label: "Create Troubleshooting Guide", value: "troubleshooting" },
            { label: "Create Reference Documentation", value: "reference" },
            { label: "Write a Tutorial", value: "tutorial" },
            { label: "Generate Release Notes", value: "release-notes" },
            { label: "Document an API", value: "api-documentation" },
          ],
          { placeHolder: "Select documentation task" }
        );

        if (!taskPick) {
          return;
        }

        const userIntent = await vscode.window.showInputBox({
          prompt: "Describe what you want to achieve",
          placeHolder: "e.g., Document the user login process",
        });

        if (!userIntent) {
          return;
        }

        // ── Upfront Q&A: detect gaps in source and ask user before first AI call ──
        const detectedQuestions = detectQuestions(contextText, taskPick.value);
        let preClarifications: string | undefined;

        if (detectedQuestions.length > 0) {
          const proceed = await vscode.window.showInformationMessage(
            `📋 ${detectedQuestions.length} question${detectedQuestions.length === 1 ? '' : 's'} detected in your source. Answering them now will produce a complete document in one pass.`,
            { modal: true },
            "Answer Questions",
            "Skip & Generate Anyway"
          );

          if (proceed === "Answer Questions") {
            const answers: string[] = [];
            for (let i = 0; i < detectedQuestions.length; i++) {
              const q = detectedQuestions[i];
              const answer = await vscode.window.showInputBox({
                title: `Question ${i + 1} of ${detectedQuestions.length}`,
                prompt: q.question,
                placeHolder: q.placeholder ?? "Enter your answer",
                ignoreFocusOut: true,
              });
              if (answer === undefined) {
                // User cancelled — stop asking, proceed without pre-clarifications
                answers.splice(0);
                break;
              }
              answers.push(answer.trim());
            }
            if (answers.length === detectedQuestions.length) {
              preClarifications = formatPreClarifications(detectedQuestions, answers);
            }
          }
        }

        const prompt = generatePrompt({
          taskType: taskPick.value,
          userIntent,
          context: contextText,
          preClarifications,
        });

        // Reset pass counter for a fresh generation run
        currentPass = 1;
        lastAiOutput = null;

        // Store context for potential clarifications
        lastPromptContext = {
          taskType: taskPick.value,
          userIntent,
          context: contextText,
        };

        // Copy to clipboard
        await vscode.env.clipboard.writeText(prompt);

        // Open prompt in new document for review and easy copying
        const promptDoc = await vscode.workspace.openTextDocument({
          content: prompt,
          language: "markdown",
        });
        await vscode.window.showTextDocument(promptDoc, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: false,
        });

        vscode.window.showInformationMessage(
          preClarifications
            ? `✅ Prompt generated with ${detectedQuestions.length} pre-answered question${detectedQuestions.length === 1 ? '' : 's'} and copied to clipboard. Review and paste into AI agent.`
            : "✅ Prompt generated and copied to clipboard. Review and paste into AI agent."
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        console.error("Error in generateDocumentation:", error);
      }
    }
  );

  const profileCmd = vscode.commands.registerCommand(
    "docAgent.selectGovernanceProfile",
    async () => {
      const picks = Object.values(GOVERNANCE_PROFILES).map((p) => ({
        label: p.name,
        description: `Max expansion ${Math.round(p.maxExpansionRatio * 100 - 100)}% · Step drift ±${p.allowStepDrift} · ${p.blockOnErrors ? "Strict" : "Advisory"}`,
        value: p,
        picked: p.id === activeProfile.id,
      }));

      const chosen = await vscode.window.showQuickPick(picks, {
        placeHolder: `Current profile: ${activeProfile.name}. Select a governance profile.`,
      });
      if (chosen) {
        activeProfile = chosen.value;
        vscode.window.showInformationMessage(
          `Governance profile set to: ${activeProfile.name}`
        );
      }
    }
  );

  const diffCmd = vscode.commands.registerCommand(
    "docAgent.previewRewriteDiff",
    async () => {
      try {
        if (!lastRewriteContext) {
          vscode.window.showErrorMessage(
            "No rewrite context found. Please run 'Generate Documentation (Governed Mode)' first."
          );
          return;
        }

        // ── 1. Get AI output ─────────────────────────────────────────────
        let rewrittenText = "";
        const editor = vscode.window.activeTextEditor;

        if (editor && !editor.document.isUntitled && editor.document.getText().trim()) {
          rewrittenText = editor.document.getText().trim();
        } else if (editor && editor.document.isUntitled && editor.document.getText().trim()) {
          rewrittenText = editor.document.getText().trim();
        } else {
          const clipboardText = await vscode.env.clipboard.readText();
          if (!clipboardText.trim()) {
            vscode.window.showErrorMessage(
              "Clipboard is empty. Please copy the AI response first."
            );
            return;
          }
          rewrittenText = clipboardText.trim();
          vscode.window.showInformationMessage("✅ Reading AI response from clipboard…");
        }

        // ── 2. Profile quick-pick (pre-select current) ───────────────────
        const profilePicks = Object.values(GOVERNANCE_PROFILES).map((p) => ({
          label: p.name,
          description: [
            `Expansion ≤${Math.round(p.maxExpansionRatio * 100 - 100)}%`,
            `Step drift ±${p.allowStepDrift}`,
            p.blockOnErrors ? "Strict mode" : "Advisory mode",
          ].join(" · "),
          value: p,
          picked: p.id === activeProfile.id,
        }));

        const profileChoice = await vscode.window.showQuickPick(profilePicks, {
          placeHolder: `Select governance profile (current: ${activeProfile.name})`,
          ignoreFocusOut: true,
        });

        const profile = profileChoice?.value ?? activeProfile;
        // Remember for next run
        activeProfile = profile;

        // ── 3. Run governance validation ─────────────────────────────────
        const validator = new GovernanceValidator();
        const report = validator.validate(
          lastRewriteContext.originalText,
          rewrittenText,
          profile
        );

        // ── 4. Compute diff ───────────────────────────────────────────────
        const diff = computeDiff(lastRewriteContext.originalText, rewrittenText);

        // ── 5. Parse preserved ambiguities from the AI output ─────────────
        lastAiOutput = rewrittenText;
        const ambiguities = parsePreservedAmbiguities(rewrittenText);

        // ── 6. Open GovernancePanel ───────────────────────────────────────
        GovernancePanel.create(
          context.extensionUri,
          report,
          diff,
          lastRewriteContext.originalText,
          rewrittenText,
          profile.name,
          {
            // Accept: apply AI text to the original editor document
            onAccept: async (aiText) => {
              await applyRewrite(lastRewriteContext!, aiText);
              governanceLog.appendLine(
                `[${new Date().toISOString()}] ACCEPTED · Pass: ${currentPass} · Profile: ${profile.name} · Risk: ${report.riskScore}% · Source: ${report.sourceHash} · AI: ${report.aiOutputHash}`
              );
            },

            // Override: apply despite violations, log reason
            onOverride: async (aiText, reason) => {
              await applyRewrite(lastRewriteContext!, aiText);
              governanceLog.appendLine(
                `[${new Date().toISOString()}] OVERRIDE · Pass: ${currentPass} · Profile: ${profile.name} · Risk: ${report.riskScore}% · Violations: ${report.violations.length} · Reason: ${reason} · Source: ${report.sourceHash} · AI: ${report.aiOutputHash}`
              );
              governanceLog.show(true);
              vscode.window.showWarningMessage(
                `⚠️ Governance override logged. Risk score: ${report.riskScore}%`
              );
            },

            // Resolve: collect answers for each ambiguity, generate Pass N+1 prompt
            onResolve: async (resolveAmbiguities) => {
              if (!lastPromptContext) { return; }
              if (resolveAmbiguities.length === 0) { return; }

              const answers: string[] = [];
              for (let i = 0; i < resolveAmbiguities.length; i++) {
                const a = resolveAmbiguities[i];
                const answer = await vscode.window.showInputBox({
                  title: `Resolve ambiguity ${i + 1} of ${resolveAmbiguities.length}`,
                  prompt: a.description
                    ? `"${a.label}" — ${a.description}`
                    : `Clarify: "${a.label}"`,
                  placeHolder: "Enter the factual answer (will be used as-is in the document)",
                  ignoreFocusOut: true,
                });
                if (answer === undefined) {
                  vscode.window.showInformationMessage("Ambiguity resolution cancelled.");
                  return;
                }
                answers.push(answer.trim());
              }

              const clarifications = formatClarifications(resolveAmbiguities, answers);
              currentPass += 1;

              // Store clarifications so a manual re-run also has them
              if (lastPromptContext) {
                lastPromptContext = { ...lastPromptContext, clarifications };
              }

              const newPrompt = generatePrompt({
                taskType: lastPromptContext.taskType,
                userIntent: lastPromptContext.userIntent,
                context: lastPromptContext.context,
                clarifications,
                pass: currentPass,
              });

              await vscode.env.clipboard.writeText(newPrompt);
              const promptDoc = await vscode.workspace.openTextDocument({
                content: newPrompt,
                language: "markdown",
              });
              await vscode.window.showTextDocument(promptDoc, {
                viewColumn: vscode.ViewColumn.Beside,
                preview: false,
              });

              const resolved = answers.filter((a) => a.length > 0).length;
              vscode.window.showInformationMessage(
                `✅ Pass ${currentPass} prompt ready — ${resolved} of ${resolveAmbiguities.length} ambiguit${resolveAmbiguities.length === 1 ? "y" : "ies"} resolved. Paste into AI and run Governance Check again.`
              );
            },
          },
          ambiguities,
          currentPass
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to run governance check: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        console.error("Error in previewRewriteDiff:", error);
      }
    }
  );

  const clarifyCmd = vscode.commands.registerCommand(
    "docAgent.provideClarifications",
    async () => {
      try {
        if (!lastPromptContext) {
          vscode.window.showErrorMessage(
            "No prompt context found. Please run 'Generate Documentation (Governed Mode)' first."
          );
          return;
        }

        const clarifications = await vscode.window.showInputBox({
          prompt: "Provide answers to the AI's questions",
          placeHolder: "Paste your answers here (can be multiple lines or paragraphs)",
          value: "",
          validateInput: (value) => {
            if (!value.trim()) {
              return "Please provide clarifications";
            }
            return null;
          },
        });

        if (!clarifications) {
          return;
        }

        // Generate new prompt with clarifications
        const prompt = generatePrompt({
          taskType: lastPromptContext.taskType,
          userIntent: lastPromptContext.userIntent,
          context: lastPromptContext.context,
          clarifications: clarifications,
        });

        // Copy to clipboard
        await vscode.env.clipboard.writeText(prompt);

        // Open prompt in new document
        const promptDoc = await vscode.workspace.openTextDocument({
          content: prompt,
          language: "markdown",
        });
        await vscode.window.showTextDocument(promptDoc, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: false,
        });

        vscode.window.showInformationMessage(
          "✅ Prompt regenerated with clarifications and copied to clipboard."
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to regenerate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        console.error("Error in provideClarifications:", error);
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Demo scenarios
  // ---------------------------------------------------------------------------
  const DEMO_SCENARIOS = [
    {
      label: "$(beaker) API Configuration — backend connection",
      description: "Low-medium risk · 4 steps · term substitution + new nouns",
      sourceText: `# API Configuration Guide

Configure the API endpoint to connect to the backend server.

Set the API_URL environment variable.
Use the config file if needed.
Restart the service after changes.

Authentication is required but exact method unclear.`,
      aiText: `## Backend Server Connection Procedure

### Prerequisites

- Access to the server environment where the service is running
- Permission to set environment variables or modify the configuration file
- Authentication credentials (see Preserved Ambiguities)

### Procedure

1. Set the \`API_URL\` environment variable to the backend server endpoint address.
2. If the environment variable cannot be set directly, open the configuration file and update the API URL value there.
3. Restart the service to apply the changes.
4. Verify the authentication credentials are available and configured according to the required method.

### Notes

- Environment variable values take effect after the service restarts.
- The configuration file can be used as an alternative to the environment variable.

### Preserved Ambiguities

- **Authentication method**: The source states authentication is required but does not specify the method (API key, OAuth, basic auth, certificate, etc.). This has been documented as-is.
- **Config file location and name**: The source references "the config file" without specifying a path or filename.
- **Service restart method**: The source does not specify how to restart the service (system command, service manager, container restart, etc.).`,
    },
    {
      label: "$(plug) OPC UA Connector — add new connector",
      description: "Medium risk · 9 steps · invented navigation + term drift + new nouns",
      sourceText: `Setting up OPC UA connector:

Add new connector.
Enter server address.
Port defaults to something.
Authentication - use credentials or cert.
Set scan rate.
Map data points.
Enable connector.
Check status indicator.
Should see data flowing.
Might need firewall exception.`,
      aiText: `## Add New OPC UA Connector

### Prerequisites

- Access to the connector management interface
- OPC UA server address and port number
- Authentication credentials or client certificate, depending on server configuration
- Firewall access to the OPC UA server port (if applicable)

### Procedure

1. Navigate to the connector management section and select **Add new connector**.
2. Enter the OPC UA server address in the server address field.
3. Confirm or change the default port number.
4. Configure authentication by selecting either credentials (username and password) or a certificate.
5. Set the scan rate to define how frequently data points are polled.
6. Map the required data points to the appropriate fields.
7. Enable the connector to activate the connection.
8. Check the status indicator to verify the connector is running.
9. Confirm that data is flowing as expected.

### Notes

- A firewall exception may be required depending on your network configuration.
- The default port value was not specified in the source; verify the correct value before deployment.

### Preserved Ambiguities

- **Default port value**: The source states "port defaults to something" without specifying the value.
- **Authentication method**: Either credentials or a certificate can be used; the source does not clarify when each applies.
- **Scan rate units and range**: No units or recommended values were specified.
- **Status indicator location**: The source does not specify where the status indicator appears in the UI.
- **Data flowing confirmation**: "Should see data flowing" is preserved as-is; no specific metric or view was defined.`,
    },
  ];

  const demoCmd = vscode.commands.registerCommand(
    "docAgent.runDemo",
    async () => {
      // 1. Scenario picker
      const scenarioPick = await vscode.window.showQuickPick(
        DEMO_SCENARIOS.map((s) => ({ label: s.label, description: s.description, value: s })),
        { placeHolder: "Select a demo scenario", ignoreFocusOut: true }
      );
      if (!scenarioPick) { return; }
      const { sourceText, aiText } = scenarioPick.value;

      // 2. Profile picker
      const profilePicks = Object.values(GOVERNANCE_PROFILES).map((p) => ({
        label: p.name,
        description: [
          `Expansion ≤${Math.round(p.maxExpansionRatio * 100 - 100)}%`,
          `Step drift ±${p.allowStepDrift}`,
          p.blockOnErrors ? "Strict mode" : "Advisory mode",
        ].join(" · "),
        value: p,
        picked: p.id === activeProfile.id,
      }));

      const profileChoice = await vscode.window.showQuickPick(profilePicks, {
        placeHolder: "Select a governance profile",
        ignoreFocusOut: true,
      });
      const profile = profileChoice?.value ?? activeProfile;
      activeProfile = profile;

      // 3. Validate + diff
      const validator = new GovernanceValidator();
      const report = validator.validate(sourceText, aiText, profile);
      const diff   = computeDiff(sourceText, aiText);

      lastRewriteContext = { originalText: sourceText, languageId: "markdown" };

      GovernancePanel.create(
        context.extensionUri,
        report,
        diff,
        sourceText,
        aiText,
        profile.name,
        {
          onAccept: async (text) => {
            await applyRewrite(lastRewriteContext!, text);
            governanceLog.appendLine(
              `[${new Date().toISOString()}] DEMO ACCEPTED · Scenario: ${scenarioPick.label} · Profile: ${profile.name} · Risk: ${report.riskScore}%`
            );
          },
          onOverride: async (text, reason) => {
            await applyRewrite(lastRewriteContext!, text);
            governanceLog.appendLine(
              `[${new Date().toISOString()}] DEMO OVERRIDE · Scenario: ${scenarioPick.label} · Profile: ${profile.name} · Risk: ${report.riskScore}% · Reason: ${reason}`
            );
            governanceLog.show(true);
          },
        }
      );
    }
  );

  // ---------------------------------------------------------------------------
  // Paste AI Response — reads clipboard, opens beside source, auto-runs governance
  // ---------------------------------------------------------------------------
  const pasteAiCmd = vscode.commands.registerCommand(
    "docAgent.pasteAiResponse",
    async () => {
      try {
        if (!lastRewriteContext) {
          vscode.window.showErrorMessage(
            "No source context found. Please run 'Generate Documentation (Governed Mode)' first, then paste your AI response."
          );
          return;
        }

        const clipboardText = await vscode.env.clipboard.readText();
        if (!clipboardText.trim()) {
          vscode.window.showErrorMessage(
            "Clipboard is empty. Copy the AI response to the clipboard, then run this command."
          );
          return;
        }

        // Open the AI response in an untitled editor beside the source
        const aiDoc = await vscode.workspace.openTextDocument({
          content: clipboardText.trim(),
          language: "markdown",
        });
        await vscode.window.showTextDocument(aiDoc, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: false,
          preserveFocus: false,
        });

        // Automatically trigger the governance check against this document
        await vscode.commands.executeCommand("docAgent.previewRewriteDiff");
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to load AI response: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        console.error("Error in pasteAiResponse:", error);
      }
    }
  );

  context.subscriptions.push(generateCmd, diffCmd, clarifyCmd, profileCmd, demoCmd, pasteAiCmd);
}

// ---------------------------------------------------------------------------
// Helper: write the accepted AI text back to the source document/selection
// ---------------------------------------------------------------------------
async function applyRewrite(
  ctx: { documentUri?: vscode.Uri; selection?: vscode.Selection; languageId: string },
  newText: string
): Promise<void> {
  if (ctx.documentUri) {
    const doc = await vscode.workspace.openTextDocument(ctx.documentUri);
    const edit = new vscode.WorkspaceEdit();
    if (ctx.selection && !ctx.selection.isEmpty) {
      edit.replace(ctx.documentUri, ctx.selection, newText);
    } else {
      const fullRange = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end
      );
      edit.replace(ctx.documentUri, fullRange, newText);
    }
    await vscode.workspace.applyEdit(edit);
    await vscode.window.showTextDocument(doc);
  } else {
    // Untitled or clipboard-sourced: open in a new editor
    const newDoc = await vscode.workspace.openTextDocument({
      content: newText,
      language: ctx.languageId,
    });
    await vscode.window.showTextDocument(newDoc, { preview: false });
  }
  vscode.window.showInformationMessage("✅ Rewrite applied successfully.");
}

export function deactivate() {}
