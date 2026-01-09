import * as vscode from "vscode";
import { generatePrompt } from "./engine/promptGenerator";
import { TaskType } from "./engine/types";

let lastRewriteContext: {
  originalText: string;
  languageId: string;
} | null = null;

let lastPromptContext: {
  taskType: TaskType;
  userIntent: string;
  context: string;
} | null = null;

export function activate(context: vscode.ExtensionContext) {
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
        };

        const taskPick = await vscode.window.showQuickPick<
          { label: string; value: TaskType }
        >(
          [
            { label: "Write / Rewrite Procedure", value: "procedure" },
            { label: "Explain a Technical Concept", value: "concept" },
            { label: "Create Troubleshooting Guide", value: "troubleshooting" },
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

        const prompt = generatePrompt({
          taskType: taskPick.value,
          userIntent,
          context: contextText,
        });

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
          "✅ Prompt generated and copied to clipboard. Review and paste into AI agent."
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        console.error("Error in generateDocumentation:", error);
      }
    }
  );

  const diffCmd = vscode.commands.registerCommand(
    "docAgent.previewRewriteDiff",
    async () => {
      try {
        if (!lastRewriteContext) {
          vscode.window.showErrorMessage(
            "No rewrite context found. Please run 'Generate Documentation Prompt' first."
          );
          return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage(
            "No active editor found. Please open the AI-generated documentation file."
          );
          return;
        }

        const rewrittenText = editor.document.getText().trim();
        if (!rewrittenText) {
          vscode.window.showErrorMessage(
            "Current file is empty. Please paste the AI-generated documentation first."
          );
          return;
        }

        const originalDoc = await vscode.workspace.openTextDocument({
          content: lastRewriteContext.originalText,
          language: lastRewriteContext.languageId,
        });

        const rewrittenDoc = await vscode.workspace.openTextDocument({
          content: rewrittenText,
          language: lastRewriteContext.languageId,
        });

        await vscode.commands.executeCommand(
          "vscode.diff",
          originalDoc.uri,
          rewrittenDoc.uri,
          "Documentation Rewrite Preview"
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to preview diff: ${error instanceof Error ? error.message : 'Unknown error'}`
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
            "No prompt context found. Please run 'Generate Documentation Prompt' first."
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

  context.subscriptions.push(generateCmd, diffCmd, clarifyCmd);
}

export function deactivate() {}
