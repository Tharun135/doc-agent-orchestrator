import './style.css';
import { detectQuestions, formatPreClarifications, DetectedQuestion } from './engine/questionDetector';
import { generatePrompt } from './engine/promptGenerator';
import { TaskType } from './engine/types';
import { getTemplateFor } from './engine/templates';
import { computeDiff, DiffResult } from './diffUtils';
import { parsePreservedAmbiguities, formatClarifications } from './engine/ambiguityParser';
import type { PreservedAmbiguity } from './engine/ambiguityParser';
import { DEFAULT_STYLE_GUIDE } from './engine/defaultStyleGuide';
import Tesseract from 'tesseract.js';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
interface AppState {
  step: 1 | 2 | 3 | 4;
  sourceText: string;
  taskType: TaskType | null;
  userIntent: string;
  detectedQuestions: DetectedQuestion[];
  answers: string[];
  skipped: boolean[];
  generatedPrompt: string;
  preClarifications: string | undefined;
  aiResponse: string;
  diffResult: DiffResult | null;
  ambiguities: PreservedAmbiguity[];
  resolveAnswers: string[];
  pass: number;
  templateOverride: string | null;
  styleGuideRules: string;
}

const state: AppState = {
  step: 1,
  sourceText: '',
  taskType: null,
  userIntent: '',
  detectedQuestions: [],
  answers: [],
  skipped: [],
  generatedPrompt: '',
  preClarifications: undefined,
  aiResponse: '',
  diffResult: null,
  ambiguities: [],
  resolveAnswers: [],
  pass: 1,
  templateOverride: null,
  styleGuideRules: DEFAULT_STYLE_GUIDE,
};

// ─────────────────────────────────────────────────────────────────────────────
// Task type definitions
// ─────────────────────────────────────────────────────────────────────────────
const TASK_TYPES: { value: TaskType; icon: string; label: string; desc: string }[] = [
  { value: 'procedure',         icon: '📋', label: 'Procedure',         desc: 'Step-by-step instructions for a task' },
  { value: 'concept',           icon: '💡', label: 'Concept',           desc: 'Explain what something is and how it works' },
  { value: 'troubleshooting',   icon: '🔧', label: 'Troubleshooting',   desc: 'Diagnose and resolve a specific problem' },
  { value: 'reference',         icon: '📖', label: 'Reference',         desc: 'Parameters, options, or config values' },
  { value: 'tutorial',          icon: '🎓', label: 'Tutorial',          desc: 'Guided learning with a clear objective' },
  { value: 'release-notes',     icon: '🚀', label: 'Release Notes',     desc: 'Changes introduced in a version or release' },
  { value: 'api-documentation', icon: '⚙️', label: 'API Docs',          desc: 'Endpoints, parameters, and responses' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Gap type labels
// ─────────────────────────────────────────────────────────────────────────────
function gapTypeFromId(id: string): { label: string; icon: string } {
  const prefix = id.split(':')[0];
  const MAP: Record<string, { label: string; icon: string }> = {
    'ui-location':              { label: 'UI Location Missing',               icon: '🗺️' },
    'vague-object':             { label: 'Vague Action Object',               icon: '❓' },
    'condition-pass':           { label: 'Success Indicator Missing',         icon: '✅' },
    'error-recovery':           { label: 'Error Recovery Undefined',          icon: '🚨' },
    'check-logs':               { label: 'Log Reference Missing',             icon: '📋' },
    'verify-method':            { label: 'Verification Method Missing',       icon: '🔍' },
    'set-no-value':             { label: 'Parameter Value Missing',           icon: '⚙️' },
    'unknown-default':          { label: 'Default Value Unspecified',         icon: '📌' },
    'placeholder':              { label: 'Placeholder Token Undefined',       icon: '🔧' },
    'auth-detail':              { label: 'Authentication Method Missing',     icon: '🔑' },
    'undefined-process':        { label: 'Process Steps Undefined',           icon: '📋' },
    'restart-wait':             { label: 'Restart Wait Condition Missing',    icon: '⏳' },
    'vague-enum':               { label: 'Incomplete Enumeration',            icon: '📝' },
    'vague-adjective':          { label: 'Vague Selection Criteria',          icon: '❓' },
    'no-unit':                  { label: 'Numeric Units Missing',             icon: '📏' },
    'absent-doc':               { label: 'External Reference Incomplete',     icon: '🔗' },
    'wait-no-indicator':        { label: 'Wait Completion Indicator Missing', icon: '⏳' },
    'conditional-action-what':  { label: 'Conditional Action Undefined',      icon: '🔀' },
    'conditional-action-where': { label: 'Conditional Location Missing',      icon: '🗺️' },
    'role-vague-access':        { label: 'Role / Access Undefined',           icon: '👤' },
    'vague-subset':             { label: 'Scope Selection Undefined',         icon: '🔍' },
    'actor-ambiguity':          { label: 'Actor Ambiguity',                   icon: '👥' },
    'data-format':              { label: 'Data Format Missing',               icon: '📁' },
    'no-schedule':              { label: 'Schedule Undefined',                icon: '🗓️' },
    'partial-nav-path':         { label: 'Navigation Path Incomplete',        icon: '🗺️' },
    'state-transition':         { label: 'State Transition Indicator Missing',icon: '🔄' },
    'multi-step-collapsed':     { label: 'Multi-step Action Collapsed',       icon: '📝' },
    'scope-selection-method':   { label: 'Scope Selection Method Missing',    icon: '🔍' },
    'no-rollback':              { label: 'Rollback Procedure Missing',        icon: '↩️' },
    'conditional-prereq':       { label: 'Conditional Prerequisite Unclear',  icon: '⚠️' },
    'success-outcome':          { label: 'Success Outcome Missing',           icon: '✅' },
    'passive-no-actor':         { label: 'Passive Voice — Actor Unknown',     icon: '👤' },
    'user-subject-no-location': { label: 'UI Location Missing',               icon: '🗺️' },
    'incomplete-annotation':    { label: 'Incomplete Step Annotation',        icon: '🚧' },
    'unspec-nav-dest':          { label: 'Navigation Destination Unclear',    icon: '🗺️' },
    'success-count':            { label: 'Success Count Ambiguous',           icon: '🔢' },
    'vague-fault-condition':    { label: 'Fault Condition Vague',             icon: '🚨' },
    'vague-status':             { label: 'Completion Status Vague',           icon: '📊' },
    'declarative-vague-enum':   { label: 'Declarative Vague Enumeration',     icon: '📝' },
    'fix-no-description':       { label: 'Fix Lacks Description',             icon: '🔧' },
    'branch-no-convergence':    { label: 'Branch Convergence Undefined',      icon: '🔀' },
    'version-unspecified':      { label: 'Version Unspecified',               icon: '🏷️' },
    'intent-source-mismatch':   { label: 'Source / Intent Mismatch',          icon: '⚠️' },
  };
  return MAP[prefix] ?? { label: 'Information Needed', icon: '❓' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container')!;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stepper
// ─────────────────────────────────────────────────────────────────────────────
function updateStepper() {
  const steps = document.querySelectorAll('.step-item');
  const lines = document.querySelectorAll('.step-line');
  steps.forEach((el, i) => {
    const stepNum = i + 1;
    el.classList.remove('active', 'done');
    if (stepNum === state.step) el.classList.add('active');
    if (stepNum < state.step)  el.classList.add('done');
  });
  lines.forEach((el, i) => {
    el.classList.toggle('done', i + 1 < state.step);
  });
  // Progress bar
  const fill = document.getElementById('progress-fill') as HTMLElement;
  if (fill) fill.style.width = `${((state.step - 1) / 3) * 100}%`;
}

function goToStep(step: 1 | 2 | 3 | 4) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`step${step}`);
  if (target) target.classList.add('active');
  state.step = step;
  updateStepper();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Source + Task type
// ─────────────────────────────────────────────────────────────────────────────
function renderStep1() {
  const view = document.getElementById('step1')!;
  view.innerHTML = `
    <div class="section-header">
      <div class="section-title">Source Content</div>
      <div class="section-desc">Paste your rough notes, existing documentation, code comments, or anything you want to turn into proper documentation.</div>
    </div>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
        <label class="field-label" for="source-input" style="margin-bottom: 0;">Your source text</label>
        <label class="ocr-btn" id="ocr-upload-btn" title="Extract text from an image">
          📸 Upload Image (OCR)
          <input type="file" id="ocr-file-input" accept="image/*" style="display:none;">
        </label>
      </div>
      <div id="ocr-loading" style="display:none; color:var(--accent); font-size:12px; margin-bottom:8px; animation: pulse 1.5s infinite;">⏳ Initializing Local OCR engine & Extracting... Please wait.</div>
      <textarea id="source-input" placeholder="Paste or type your rough notes here...
e.g.
# Database Migration
Need to run migrations before deploying
Use the migration script
Backup database first maybe?"></textarea>
    </div>

    <div class="card mt-16">
      <label class="field-label">Documentation type</label>
      <div class="task-grid" id="task-grid"></div>
    </div>

    <div class="card mt-16" id="template-card" style="display: none;">
      <div class="qa-header" style="margin-bottom: 10px; cursor: pointer; user-select: none;" id="toggle-template-btn">
        <label class="field-label" style="margin:0; cursor: pointer;">📝 Template Editor (Optional)</label>
        <span id="template-toggle-icon" style="color:var(--text-muted); font-size: 12px;">▼ Show</span>
      </div>
      <div id="template-editor-content" style="display: none;">
        <div class="text-muted" style="margin-bottom: 12px;">Customize the structure section for the generated prompt here. Doing so will override the default template.</div>
        <textarea id="template-input" style="min-height: 200px;"></textarea>
      </div>
    </div>

    <div class="card mt-16" id="style-card">
      <div class="qa-header" style="margin-bottom: 10px; cursor: pointer; user-select: none;" id="toggle-style-btn">
        <label class="field-label" style="margin:0; cursor: pointer;">💅 Custom Style Guide (Optional)</label>
        <span id="style-toggle-icon" style="color:var(--text-muted); font-size: 12px;">▼ Show</span>
      </div>
      <div id="style-editor-content" style="display: none;">
        <div class="text-muted" style="margin-bottom: 12px;">Paste your organization's terminology, tone, or formatting rules here. These will be strictly enforced by the AI.</div>
        <textarea id="style-input" placeholder="e.g. Always capitalize 'Platform'. Never use the word 'simply'. Use active voice." style="min-height: 120px;"></textarea>
      </div>
    </div>

    <div class="card mt-16">
      <label class="field-label" for="intent-input">What do you want to achieve?</label>
      <input type="text" id="intent-input" placeholder="e.g. Document the database migration process for the ops team" />
    </div>

    <div class="btn-row">
      <button class="btn-primary" id="step1-next">
        <span>Analyse for gaps</span>
        <span>→</span>
      </button>
      <span class="text-muted">The extension will scan your source for missing information before building the AI prompt.</span>
    </div>
  `;

  // Populate task grid
  const grid = document.getElementById('task-grid')!;
  TASK_TYPES.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card' + (state.taskType === t.value ? ' selected' : '');
    card.dataset.value = t.value;
    card.innerHTML = `
      <div class="task-icon">${t.icon}</div>
      <div>
        <div class="task-name">${t.label}</div>
        <div class="task-desc">${t.desc}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      state.taskType = t.value;
      state.templateOverride = null;
      document.querySelectorAll('.task-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const tplCard = document.getElementById('template-card')!;
      tplCard.style.display = 'block';
      const tplInput = document.getElementById('template-input') as HTMLTextAreaElement;
      tplInput.value = getTemplateFor(t.value).content;
    });
    grid.appendChild(card);
  });

  // Restore state
  const srcInput = document.getElementById('source-input') as HTMLTextAreaElement;
  const intentInput = document.getElementById('intent-input') as HTMLInputElement;
  srcInput.value = state.sourceText;
  intentInput.value = state.userIntent;

  srcInput.addEventListener('input', () => { state.sourceText = srcInput.value; });
  intentInput.addEventListener('input', () => { state.userIntent = intentInput.value; });

  const ocrInput = document.getElementById('ocr-file-input') as HTMLInputElement;
  const ocrBtn = document.getElementById('ocr-upload-btn')!;
  const ocrLoading = document.getElementById('ocr-loading')!;

  async function performOCR(file: File) {
    ocrBtn.style.pointerEvents = 'none';
    ocrBtn.style.opacity = '0.5';
    ocrLoading.style.display = 'block';
    
    try {
      showToast('Downloading OCR model & Extracting text...', 'info');
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text.trim();
      
      if (text) {
        state.sourceText = state.sourceText ? state.sourceText + '\\n\\n' + text : text;
        srcInput.value = state.sourceText;
        showToast('Text extracted successfully!', 'success');
      } else {
        showToast('No readable text found in the image.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('OCR failed. Could not read image.', 'error');
    } finally {
      ocrBtn.style.pointerEvents = 'auto';
      ocrBtn.style.opacity = '1';
      ocrLoading.style.display = 'none';
      ocrInput.value = ''; // reset file input
    }
  }

  ocrInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    performOCR(file);
  });

  srcInput.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image/') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          performOCR(file);
          break;
        }
      }
    }
  });

  const toggleBtn = document.getElementById('toggle-template-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const content = document.getElementById('template-editor-content')!;
      const icon = document.getElementById('template-toggle-icon')!;
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲ Hide';
      } else {
        content.style.display = 'none';
        icon.textContent = '▼ Show';
      }
    });
  }

  const tplInput = document.getElementById('template-input') as HTMLTextAreaElement;
  if (tplInput) {
    if (state.taskType) {
      document.getElementById('template-card')!.style.display = 'block';
      tplInput.value = state.templateOverride ?? getTemplateFor(state.taskType).content;
    }
    tplInput.addEventListener('input', () => {
      state.templateOverride = tplInput.value;
    });
  }

  const toggleStyleBtn = document.getElementById('toggle-style-btn');
  if (toggleStyleBtn) {
    toggleStyleBtn.addEventListener('click', () => {
      const content = document.getElementById('style-editor-content')!;
      const icon = document.getElementById('style-toggle-icon')!;
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲ Hide';
      } else {
        content.style.display = 'none';
        icon.textContent = '▼ Show';
      }
    });
  }

  const styleInput = document.getElementById('style-input') as HTMLTextAreaElement;
  if (styleInput) {
    styleInput.value = state.styleGuideRules;
    styleInput.addEventListener('input', () => {
      state.styleGuideRules = styleInput.value;
    });
  }

  document.getElementById('step1-next')!.addEventListener('click', () => {
    if (!state.sourceText.trim()) { showToast('Please enter your source text.', 'error'); return; }
    if (!state.taskType)          { showToast('Please select a documentation type.', 'error'); return; }
    if (!state.userIntent.trim()) { showToast('Please describe what you want to achieve.', 'error'); return; }

    // Detect gaps
    state.detectedQuestions = detectQuestions(state.sourceText, state.taskType, '', state.userIntent);
    state.answers = new Array(state.detectedQuestions.length).fill('');
    state.skipped = new Array(state.detectedQuestions.length).fill(false);

    if (state.detectedQuestions.length === 0) {
      // No gaps — skip Q&A, go straight to prompt generation
      buildPromptAndGoToStep3();
    } else {
      renderStep2();
      goToStep(2);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Gap Q&A
// ─────────────────────────────────────────────────────────────────────────────
function renderStep2() {
  const view = document.getElementById('step2')!;
  const q = state.detectedQuestions;

  view.innerHTML = `
    <div class="section-header">
      <div class="qa-header">
        <div>
          <div class="section-title">Gap Questions</div>
          <div class="section-desc">Answer these questions to give the AI complete information. Skip any you can't answer now.</div>
        </div>
        <div class="qa-count-badge">⚠️ ${q.length} gap${q.length !== 1 ? 's' : ''} detected</div>
      </div>
    </div>

    <div class="info-banner">
      <span class="info-icon">💡</span>
      <span>Each gap below would force the AI to <strong>invent an answer</strong> if left unresolved. Your answers are injected as authoritative facts — the AI treats them as truth, not suggestions.</span>
    </div>

    <div id="qa-cards"></div>

    <div class="btn-row">
      <button class="btn-primary" id="step2-generate">
        <span>Generate prompt</span>
        <span>→</span>
      </button>
      <button class="btn-ghost" id="step2-skip-all">Skip all questions</button>
      <button class="btn-ghost" id="step2-back">← Back</button>
    </div>
  `;

  const container = document.getElementById('qa-cards')!;
  q.forEach((question, i) => {
    const { label, icon } = gapTypeFromId(question.id);
    const shortSource = question.sourceContext.length > 80
      ? question.sourceContext.slice(0, 77) + '…'
      : question.sourceContext;

    const card = document.createElement('div');
    card.className = 'gap-card';
    card.id = `gap-card-${i}`;
    card.innerHTML = `
      <div class="gap-card-head">
        <div class="gap-type-badge">
          <span class="gap-icon">${icon}</span>
          <span>${label}</span>
        </div>
        <div class="gap-source" title="${escHtml(question.sourceContext)}">${escHtml(shortSource)}</div>
      </div>
      <div class="gap-card-body">
        <div class="gap-question">${escHtml(question.question)}</div>
        <input type="text"
          id="answer-${i}"
          placeholder="${escHtml(question.placeholder ?? 'Enter your answer…')}"
          value="${escHtml(state.answers[i] ?? '')}"
        />
        <div class="gap-skip-row">
          <label class="skip-toggle">
            <input type="checkbox" id="skip-${i}" ${state.skipped[i] ? 'checked' : ''} />
            <span>Skip this question (preserve ambiguity)</span>
          </label>
        </div>
      </div>
    `;
    container.appendChild(card);

    const answerInput = card.querySelector(`#answer-${i}`) as HTMLInputElement;
    const skipCheck   = card.querySelector(`#skip-${i}`) as HTMLInputElement;

    answerInput.addEventListener('input', () => {
      state.answers[i] = answerInput.value;
    });

    skipCheck.addEventListener('change', () => {
      state.skipped[i] = skipCheck.checked;
      card.classList.toggle('skipped', skipCheck.checked);
      answerInput.disabled = skipCheck.checked;
      answerInput.style.opacity = skipCheck.checked ? '0.4' : '1';
    });

    if (state.skipped[i]) {
      card.classList.add('skipped');
      answerInput.disabled = true;
      answerInput.style.opacity = '0.4';
    }
  });

  document.getElementById('step2-back')!.addEventListener('click', () => { renderStep1(); goToStep(1); });
  document.getElementById('step2-skip-all')!.addEventListener('click', () => {
    state.skipped.fill(true);
    state.answers.fill('');
    buildPromptAndGoToStep3();
  });
  document.getElementById('step2-generate')!.addEventListener('click', () => {
    buildPromptAndGoToStep3();
  });
}

function buildPromptAndGoToStep3() {
  // collect answered questions
  const answeredQuestions = state.detectedQuestions.filter((_, i) => !state.skipped[i] && state.answers[i]?.trim().length > 0);
  const answeredValues    = state.detectedQuestions
    .map((_, i) => state.answers[i])
    .filter((_, i) => !state.skipped[i] && state.answers[i]?.trim().length > 0);

  state.preClarifications = answeredQuestions.length > 0
    ? formatPreClarifications(answeredQuestions, answeredValues)
    : undefined;

  state.generatedPrompt = generatePrompt({
    taskType: state.taskType!,
    userIntent: state.userIntent,
    context: state.sourceText,
    preClarifications: state.preClarifications,
    pass: state.pass,
    templateContent: state.templateOverride || undefined,
    styleGuideRules: state.styleGuideRules || undefined,
  });

  renderStep3();
  goToStep(3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Prompt output
// ─────────────────────────────────────────────────────────────────────────────
function renderStep3() {
  const view = document.getElementById('step3')!;
  const answered = state.detectedQuestions.filter((_, i) => !state.skipped[i] && state.answers[i]?.trim()).length;
  const skipped  = state.detectedQuestions.filter((_, i) => state.skipped[i] || !state.answers[i]?.trim()).length;

  view.innerHTML = `
    <div class="section-header">
      <div class="section-title">Governed Prompt — Pass ${state.pass}</div>
      <div class="section-desc">This prompt enforces strict rules that prevent the AI from inventing features, implying steps, or guessing gaps.</div>
    </div>

    <div class="stats-bar" style="border-top:none;padding-top:0;margin-bottom:20px;">
      <div class="stat">
        <span class="stat-value" style="color:var(--success)">${answered}</span>
        <span class="stat-label">Gaps answered</span>
      </div>
      <div class="stat">
        <span class="stat-value" style="color:var(--warning)">${skipped}</span>
        <span class="stat-label">Gaps preserved</span>
      </div>
      <div class="stat">
        <span class="stat-value">${state.generatedPrompt.split(/\s+/).length.toLocaleString()}</span>
        <span class="stat-label">Prompt words</span>
      </div>
    </div>

    <div class="info-banner">
      <span class="info-icon">🎯</span>
      <span>Copy this prompt and paste it into <strong>ChatGPT, Claude, Gemini, or any AI assistant</strong>. Then paste the AI's response in the next step for diff validation.</span>
    </div>

    <div class="card">
      <div class="prompt-output-area">
        <button class="copy-btn" id="copy-prompt-btn">📋 Copy</button>
        <textarea class="prompt-textarea" id="prompt-output" readonly>${escHtml(state.generatedPrompt)}</textarea>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn-primary" id="step3-next">
        <span>Paste AI response & validate</span>
        <span>→</span>
      </button>
      <button class="btn-ghost" id="step3-back">← Back to questions</button>
      <button class="btn-ghost" id="step3-restart">↺ Start over</button>
    </div>
  `;

  document.getElementById('copy-prompt-btn')!.addEventListener('click', async () => {
    await navigator.clipboard.writeText(state.generatedPrompt);
    const btn = document.getElementById('copy-prompt-btn')!;
    btn.textContent = '✅ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
    showToast('Prompt copied to clipboard!', 'success');
  });

  document.getElementById('step3-back')!.addEventListener('click', () => {
    if (state.detectedQuestions.length > 0) { renderStep2(); goToStep(2); }
    else { renderStep1(); goToStep(1); }
  });

  document.getElementById('step3-restart')!.addEventListener('click', () => {
    resetState();
    renderStep1();
    goToStep(1);
  });

  document.getElementById('step3-next')!.addEventListener('click', () => {
    renderStep4();
    goToStep(4);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — AI response + diff + ambiguity resolution
// ─────────────────────────────────────────────────────────────────────────────
function renderStep4(showDiff = false) {
  const view = document.getElementById('step4')!;

  view.innerHTML = `
    <div class="section-header">
      <div class="section-title">AI Response Validation</div>
      <div class="section-desc">Paste the AI's response below. The diff view shows every change the AI made to your source.</div>
    </div>

    <div class="card">
      <label class="field-label" for="ai-response-input">AI Response</label>
      <div class="ai-response-area">
        <button class="copy-btn" id="paste-ai-btn" style="top:12px;right:12px;">📥 Paste</button>
        <textarea id="ai-response-input" placeholder="Paste the AI's response here…" style="min-height:200px;">${escHtml(state.aiResponse)}</textarea>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn-primary" id="run-diff-btn">Run diff validation →</button>
      <button class="btn-ghost" id="step4-back">← Back to prompt</button>
    </div>

    <div id="diff-section" class="${showDiff ? '' : 'hidden'}">
      <div class="section-header mt-24">
        <div class="section-title">Side-by-side Diff</div>
        <div class="section-desc">Green = added by AI · Red = removed from source · Grey = unchanged</div>
      </div>
      <div id="diff-stats-row" class="diff-stats-row"></div>
      <div class="diff-grid" id="diff-grid"></div>

      <div id="ambiguity-section" class="hidden">
        <div class="section-header mt-24">
          <div class="section-title">Resolve Known Gaps</div>
          <div class="section-desc">The AI identified these ambiguities. Provide answers to generate a refined Pass ${state.pass + 1} prompt.</div>
        </div>
        <div id="resolve-cards"></div>
        <div class="btn-row">
          <button class="btn-primary" id="regenerate-btn">Generate Pass ${state.pass + 1} prompt →</button>
          <button class="btn-ghost" id="accept-btn">Accept output without resolving</button>
        </div>
      </div>
    </div>
  `;

  const aiInput = document.getElementById('ai-response-input') as HTMLTextAreaElement;
  aiInput.addEventListener('input', () => { state.aiResponse = aiInput.value; });

  document.getElementById('paste-ai-btn')!.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      aiInput.value = text;
      state.aiResponse = text;
      showToast('Pasted from clipboard', 'success');
    } catch {
      showToast('Could not read clipboard. Please paste manually.', 'error');
    }
  });

  document.getElementById('step4-back')!.addEventListener('click', () => { renderStep3(); goToStep(3); });

  document.getElementById('run-diff-btn')!.addEventListener('click', () => {
    if (!state.aiResponse.trim()) { showToast('Please paste the AI response first.', 'error'); return; }
    state.diffResult = computeDiff(state.sourceText, state.aiResponse);
    state.ambiguities = parsePreservedAmbiguities(state.aiResponse);
    state.resolveAnswers = new Array(state.ambiguities.length).fill('');
    renderDiffSection();
  });

  if (showDiff && state.diffResult) {
    renderDiffSection();
  }
}

function renderDiffSection() {
  const section = document.getElementById('diff-section')!;
  section.classList.remove('hidden');

  // Stats
  const statsRow = document.getElementById('diff-stats-row')!;
  const d = state.diffResult!;
  statsRow.innerHTML = `
    <div class="diff-stat"><span class="pill pill-add">+${d.addedCount}</span> lines added</div>
    <div class="diff-stat"><span class="pill pill-rem">−${d.removedCount}</span> lines removed</div>
    <div class="diff-stat"><span class="pill pill-eql">${d.equalCount}</span> lines unchanged</div>
  `;

  // Diff grid
  const grid = document.getElementById('diff-grid')!;
  // We render the diff by iterating d.lines directly, distinguishing sides per line type

  grid.innerHTML = `
    <div class="diff-pane">
      <div class="diff-pane-header">
        <div class="diff-dot-red"></div>
        <span>Original source</span>
      </div>
      <div id="diff-src-lines"></div>
    </div>
    <div class="diff-pane">
      <div class="diff-pane-header">
        <div class="diff-dot-green"></div>
        <span>AI-generated output</span>
      </div>
      <div id="diff-ai-lines"></div>
    </div>
  `;

  const srcContainer = document.getElementById('diff-src-lines')!;
  const aiContainer  = document.getElementById('diff-ai-lines')!;

  let srcLineNum = 0;
  let aiLineNum  = 0;

  d.lines.forEach(line => {
    if (line.type === 'removed' || line.type === 'equal') {
      srcLineNum++;
      const el = document.createElement('div');
      el.className = `diff-line ${line.type}`;
      el.innerHTML = `<span class="diff-line-num">${srcLineNum}</span><span class="diff-line-text">${escHtml(line.text) || '&nbsp;'}</span>`;
      srcContainer.appendChild(el);
    }
    if (line.type === 'added' || line.type === 'equal') {
      aiLineNum++;
      const el = document.createElement('div');
      el.className = `diff-line ${line.type}`;
      el.innerHTML = `<span class="diff-line-num">${aiLineNum}</span><span class="diff-line-text">${escHtml(line.text) || '&nbsp;'}</span>`;
      aiContainer.appendChild(el);
    }
  });

  // Ambiguity section
  if (state.ambiguities.length > 0) {
    renderAmbiguitySection();
  } else {
    document.getElementById('ambiguity-section')!.classList.add('hidden');
  }

  // Scroll to diff
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAmbiguitySection() {
  const section = document.getElementById('ambiguity-section')!;
  section.classList.remove('hidden');

  // Update labels
  const regenBtn = document.getElementById('regenerate-btn')!;
  regenBtn.innerHTML = `Generate Pass ${state.pass + 1} prompt →`;

  const acceptBtn = document.getElementById('accept-btn')!;

  const cardsContainer = document.getElementById('resolve-cards')!;
  cardsContainer.innerHTML = '';

  // Show ambiguity count
  const ambigCount = document.createElement('div');
  ambigCount.className = 'info-banner mb-16';
  ambigCount.innerHTML = `<span class="info-icon">🔍</span><span>The AI identified <strong>${state.ambiguities.length}</strong> known gap${state.ambiguities.length !== 1 ? 's' : ''}. Provide answers to regenerate a refined prompt, or accept the output as-is.</span>`;
  cardsContainer.appendChild(ambigCount);

  state.ambiguities.forEach((amb, i) => {
    const card = document.createElement('div');
    card.className = 'resolve-card';
    card.innerHTML = `
      <div class="resolve-label">
        <span>🔍</span>
        <span>${escHtml(amb.label)}</span>
      </div>
      ${amb.description ? `<div class="resolve-desc">${escHtml(amb.description)}</div>` : ''}
      <input type="text"
        id="resolve-${i}"
        placeholder="Your answer (will be injected as an authoritative fact)…"
        value="${escHtml(state.resolveAnswers[i] ?? '')}"
      />
    `;
    cardsContainer.appendChild(card);

    const input = card.querySelector(`#resolve-${i}`) as HTMLInputElement;
    input.addEventListener('input', () => { state.resolveAnswers[i] = input.value; });
  });

  regenBtn.addEventListener('click', () => {
    const answeredAmbigs = state.ambiguities.filter((_, i) => state.resolveAnswers[i]?.trim().length > 0);
    const answeredVals   = state.resolveAnswers.filter(a => a?.trim().length > 0);

    if (answeredAmbigs.length === 0) {
      showToast('Please provide at least one answer.', 'error');
      return;
    }

    const newClarifications = formatClarifications(answeredAmbigs, answeredVals);
    state.pass += 1;

    state.generatedPrompt = generatePrompt({
      taskType: state.taskType!,
      userIntent: state.userIntent,
      context: state.sourceText,
      preClarifications: state.preClarifications,
      clarifications: newClarifications,
      pass: state.pass,
      templateContent: state.templateOverride || undefined,
      styleGuideRules: state.styleGuideRules || undefined,
    });

    showToast(`Pass ${state.pass} prompt generated with ${answeredAmbigs.length} resolved gap${answeredAmbigs.length !== 1 ? 's' : ''}!`, 'success');
    renderStep3();
    goToStep(3);
  });

  acceptBtn.addEventListener('click', () => {
    showToast('Output accepted. You can start a new session anytime.', 'success');
    renderAcceptedView();
  });
}

function renderAcceptedView() {
  const view = document.getElementById('step4')!;
  view.innerHTML = `
    <div class="card" style="text-align:center;padding:48px 24px;">
      <div style="font-size:48px;margin-bottom:16px;">✅</div>
      <div class="section-title">Output Accepted</div>
      <div class="section-desc" style="max-width:480px;margin:12px auto 28px;">Your governed documentation has been accepted after ${state.pass} generation pass${state.pass !== 1 ? 'es' : ''}. All AI changes were verified against your source.</div>
      <div class="btn-row" style="justify-content:center;">
        <button class="btn-primary" id="new-session-btn">Start a new document →</button>
      </div>
    </div>
  `;
  document.getElementById('new-session-btn')!.addEventListener('click', () => {
    resetState();
    renderStep1();
    goToStep(1);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resetState() {
  Object.assign(state, {
    step: 1,
    sourceText: '',
    taskType: null,
    userIntent: '',
    detectedQuestions: [],
    answers: [],
    skipped: [],
    generatedPrompt: '',
    preClarifications: undefined,
    aiResponse: '',
    diffResult: null,
    ambiguities: [],
    resolveAnswers: [],
    pass: 1,
    templateOverride: null,
    styleGuideRules: DEFAULT_STYLE_GUIDE,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap — render shell HTML
// ─────────────────────────────────────────────────────────────────────────────
function bootstrap() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <!-- Header -->
    <header class="app-header">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24">
          <path class="logo-doc-path" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline class="logo-doc-path" points="14 2 14 8 20 8"></polyline>
          <line class="logo-line d1" x1="16" y1="13" x2="8" y2="13"></line>
          <line class="logo-line d2" x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      </div>
      <div>
        <div class="app-title">Documentation Agent Orchestrator</div>
        <div class="app-subtitle">Governance-driven AI prompts for technical writers</div>
      </div>
      <div class="header-badge">Web App</div>
    </header>

    <!-- Hero -->
    <div class="hero">
      <h1>Stop AI from<br>inventing documentation</h1>
      <p>Detect information gaps before the AI sees your source. Provide authoritative answers. Get documentation you can defend.</p>
      <div class="hero-pills">
        <div class="hero-pill"><span class="dot"></span>42 gap pattern detectors</div>
        <div class="hero-pill"><span class="dot"></span>7 documentation types</div>
        <div class="hero-pill"><span class="dot"></span>Zero invention policy</div>
        <div class="hero-pill"><span class="dot"></span>No account required</div>
      </div>
    </div>

    <!-- Progress -->
    <div class="progress-bar" style="margin:0;border-radius:0;">
      <div class="progress-fill" id="progress-fill" style="width:0%"></div>
    </div>

    <!-- Stepper -->
    <div class="stepper">
      <div class="step-item active" id="stepper-1">
        <div class="step-circle">1</div>
        <div class="step-label">Source & Type</div>
      </div>
      <div class="step-line" id="step-line-1"></div>
      <div class="step-item" id="stepper-2">
        <div class="step-circle">2</div>
        <div class="step-label">Gap Q&A</div>
      </div>
      <div class="step-line" id="step-line-2"></div>
      <div class="step-item" id="stepper-3">
        <div class="step-circle">3</div>
        <div class="step-label">Governed Prompt</div>
      </div>
      <div class="step-line" id="step-line-3"></div>
      <div class="step-item" id="stepper-4">
        <div class="step-circle">4</div>
        <div class="step-label">Diff & Validate</div>
      </div>
    </div>

    <!-- Main content -->
    <main class="main-content">
      <div class="view active" id="step1"></div>
      <div class="view" id="step2"></div>
      <div class="view" id="step3"></div>
      <div class="view" id="step4"></div>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-left">
          <div class="copyright">© 2026 Documentation Agent Orchestrator. All rights reserved.</div>
          <div class="author-tag">
            Handcrafted with ❤️ by <a href="https://linkedin.com/in/tharun-sebastian" target="_blank" class="author-name">Tharun Sebastian</a>
          </div>
        </div>
        <div class="footer-right">
          <span class="license-pill">MIT License</span>
          <a href="https://github.com/Tharun135/doc-agent-orchestrator" target="_blank" class="footer-link">
            GitHub Repository
          </a>
        </div>
      </div>
    </footer>

    <!-- Toast container -->
    <div class="toast-container" id="toast-container"></div>
  `;

  // Stepper click navigation (only allow going back)
  document.getElementById('stepper-1')!.addEventListener('click', () => {
    if (state.step > 1) { renderStep1(); goToStep(1); }
  });
  document.getElementById('stepper-2')!.addEventListener('click', () => {
    if (state.step > 2 && state.detectedQuestions.length > 0) { renderStep2(); goToStep(2); }
  });
  document.getElementById('stepper-3')!.addEventListener('click', () => {
    if (state.step > 3 && state.generatedPrompt) { renderStep3(); goToStep(3); }
  });

  renderStep1();
  updateStepper();
}

bootstrap();
