/**
 * extensionController.ts
 *
 * VS Code extension entry point.
 *
 * Flow:
 *   Pass 0  — detectQuestions()    → show Q&A panel to user
 *   Pass 1  — generatePrompt()     → generate structured doc with full context
 *   Pass N  — generatePrompt()     → resolve any Preserved Ambiguities
 *
 * questionDetector.ts owns ALL gap detection.
 * promptBuilder.ts owns ONLY prompt assembly.
 * These two responsibilities never mix.
 */

import * as vscode from "vscode";
import { detectQuestions, formatPreClarifications, DetectedQuestion } from "./questionDetector";
import { generatePrompt, validatePromptInput } from "./promptBuilder";
import { parsePreservedAmbiguities, formatClarifications } from "./ambiguityParser";
import { PromptInput, TaskType } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Main command handler — triggered when user selects text and runs the command
// ─────────────────────────────────────────────────────────────────────────────

export async function handleGenerateDoc(
  selectedText: string,
  taskType: TaskType,
  userIntent: string,
  templateContent?: string,
  callAI?: (prompt: string) => Promise<string>,
): Promise<void> {

  // ── Validate inputs early ─────────────────────────────────────────────────
  if (!selectedText.trim()) {
    vscode.window.showErrorMessage("Please select some text before running this command.");
    return;
  }

  const aiCall = callAI ?? defaultAICall;

  try {
    // ── PASS 0: Question extraction ──────────────────────────────────────────
    const questions = detectQuestions(
      selectedText,
      taskType,
      templateContent,
      userIntent,
    );

    let preClarifications = "";

    if (questions.length > 0) {
      // Show Q&A panel and collect answers before any AI call
      const answers = await showQAPanel(questions);

      if (answers === null) {
        // User cancelled
        return;
      }

      preClarifications = formatPreClarifications(questions, answers);
    }

    // ── PASS 1: Generate structured document ─────────────────────────────────
    const input: PromptInput = {
      taskType,
      userIntent,
      context: selectedText,
      preClarifications: preClarifications || undefined,
      templateContent,
      pass: 1,
    };

    validatePromptInput(input);

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Generating document…", cancellable: false },
      async () => {
        const prompt = generatePrompt(input);
        const generatedDoc = await aiCall(prompt);

        // ── PASS N: Resolve Preserved Ambiguities (optional loop) ────────────
        const finalDoc = await resolveAmbiguitiesIfNeeded(
          generatedDoc,
          input,
          aiCall,
        );

        await insertIntoEditor(finalDoc);
      }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Document generation failed: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preserved ambiguity resolution loop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * If the generated document contains a non-empty "Preserved Ambiguities"
 * section, offer to resolve them. Loops until the section is empty or
 * the user declines.
 */
async function resolveAmbiguitiesIfNeeded(
  doc: string,
  baseInput: PromptInput,
  aiCall: (prompt: string) => Promise<string>,
  maxPasses = 3,
): Promise<string> {
  let currentDoc = doc;
  let pass = 2;

  while (pass <= maxPasses + 1) {
    const ambiguities = parsePreservedAmbiguities(currentDoc);

    if (ambiguities.length === 0) { break; }

    const resolve = await vscode.window.showInformationMessage(
      `${ambiguities.length} ambiguity/ies remain. Would you like to resolve them?`,
      "Yes", "No"
    );

    if (resolve !== "Yes") { break; }

    // Collect answers for each preserved ambiguity
    const answers: string[] = [];
    for (const amb of ambiguities) {
      const answer = await vscode.window.showInputBox({
        prompt: amb.label + (amb.description ? ` — ${amb.description}` : ""),
        placeHolder: "Your answer",
        ignoreFocusOut: true,
      });
      answers.push(answer ?? "");
    }

    const clarifications = formatClarifications(ambiguities, answers);

    const nextInput: PromptInput = {
      ...baseInput,
      clarifications,
      pass,
    };

    const prompt = generatePrompt(nextInput);
    currentDoc = await aiCall(prompt);
    pass++;
  }

  return currentDoc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Q&A WebView panel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shows a WebView panel with one input per question.
 * Returns an array of answer strings in the same order as questions,
 * or null if the user cancelled.
 */
async function showQAPanel(questions: DetectedQuestion[]): Promise<string[] | null> {
  return new Promise((resolve) => {
    const panel = vscode.window.createWebviewPanel(
      "docGenQA",
      `Answer ${questions.length} question${questions.length !== 1 ? "s" : ""} before generating`,
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    panel.webview.html = buildQAHtml(questions);

    panel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === "submit") {
        panel.dispose();
        resolve(msg.answers as string[]);
      } else if (msg.type === "cancel") {
        panel.dispose();
        resolve(null);
      }
    });

    panel.onDidDispose(() => resolve(null));
  });
}

function buildQAHtml(questions: DetectedQuestion[]): string {
  const fields = questions.map((q, i) => `
    <div class="field">
      <label for="q${i}">
        <span class="qnum">Q${i + 1}</span>
        ${escHtml(q.question)}
      </label>
      ${q.sourceContext !== "(whole source)"
        ? `<div class="source">Source: <em>${escHtml(q.sourceContext)}</em></div>`
        : ""}
      <input
        id="q${i}"
        type="text"
        placeholder="${escHtml(q.placeholder ?? "Your answer")}"
        autocomplete="off"
      />
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Q&amp;A</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    h2 { margin-top: 0; font-size: 1rem; }
    .intro { margin-bottom: 16px; font-size: 0.85rem; opacity: 0.8; }
    .field { margin-bottom: 20px; }
    label { display: block; font-weight: 600; margin-bottom: 4px; }
    .qnum { color: var(--vscode-textLink-foreground); margin-right: 6px; }
    .source { font-size: 0.78rem; opacity: 0.65; margin: 2px 0 6px; }
    input[type=text] {
      width: 100%; box-sizing: border-box; padding: 6px 8px;
      font-size: 0.9rem;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, #555);
      border-radius: 3px;
    }
    .actions { display: flex; gap: 8px; margin-top: 24px; }
    button {
      padding: 6px 16px; border: none; border-radius: 3px; cursor: pointer;
      font-size: 0.9rem;
    }
    #btnSubmit { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    #btnSubmit:hover { background: var(--vscode-button-hoverBackground); }
    #btnCancel { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  </style>
</head>
<body>
  <h2>Before generating, please answer these questions</h2>
  <p class="intro">
    The source text is missing specific details needed to write a complete,
    accurate document. Answer as many as you can — leave blank if unknown.
  </p>
  <form id="qa">
    ${fields}
    <div class="actions">
      <button type="button" id="btnSubmit">Generate Document</button>
      <button type="button" id="btnCancel">Cancel</button>
    </div>
  </form>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('btnSubmit').addEventListener('click', () => {
      const inputs = document.querySelectorAll('input[type=text]');
      const answers = Array.from(inputs).map(el => el.value.trim());
      vscode.postMessage({ type: 'submit', answers });
    });
    document.getElementById('btnCancel').addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });
    // Submit on Enter in last field
    document.querySelectorAll('input[type=text]').forEach((el, i, arr) => {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (i < arr.length - 1) { arr[i + 1].focus(); }
          else { document.getElementById('btnSubmit').click(); }
        }
      });
    });
  </script>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────────────────────────────
// Insert generated document into editor
// ─────────────────────────────────────────────────────────────────────────────

async function insertIntoEditor(content: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({
    language: "markdown",
    content,
  });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Active);
}

// ─────────────────────────────────────────────────────────────────────────────
// Default AI call (replace with your actual implementation)
// ─────────────────────────────────────────────────────────────────────────────

async function defaultAICall(prompt: string): Promise<string> {
  // Replace this with your actual Anthropic / OpenAI SDK call.
  // Example using the Anthropic SDK:
  //
  // const { Anthropic } = await import("@anthropic-ai/sdk");
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // const message = await client.messages.create({
  //   model: "claude-opus-4-5",
  //   max_tokens: 4096,
  //   messages: [{ role: "user", content: prompt }],
  // });
  // return message.content[0].type === "text" ? message.content[0].text : "";

  throw new Error("defaultAICall() is not implemented. Provide a callAI function.");
}
