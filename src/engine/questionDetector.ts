/**
 * questionDetector.ts
 *
 * Analyses source content against a checklist of what a complete user manual
 * section requires. For every gap found, generates a question to ask the user
 * BEFORE the AI prompt is built — so the AI receives complete information on
 * the first call and produces a fully detailed document without a second pass.
 *
 * Approach:
 *   For every action step   → Does it say WHERE in the UI?
 *   For every action step   → Does it say what success looks like?
 *   For every set/configure → Does it say what VALUE to use?
 *   For every conditional   → Is the CONDITION defined?
 *   For every error branch  → Is the RECOVERY fully described?
 *   For every vague noun    → Is it specified?
 *   For the whole source    → Are there implied PREREQUISITES?
 *
 * Rules:
 * - Never invent a question unrelated to the source.
 * - Each question must be traceable to a specific line in the source.
 * - One question per gap — do not ask the same thing twice.
 */

import { TaskType } from "./types";

export interface DetectedQuestion {
  /** Unique identifier (used to match answer back to question). */
  id: string;
  /** The question shown to the user in the VS Code input box. */
  question: string;
  /** The source line/phrase that triggered this question. */
  sourceContext: string;
  /** Optional placeholder text for the input box. */
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True if the line already contains a UI location indicator. */
function hasUiLocation(line: string): boolean {
  return /\b(in the|on the|from the|via the|using the|menu|page|screen|panel|dialog|tab|section|sidebar|toolbar|dashboard|window|form|dropdown|list|grid|table|button|icon|field|header|footer|nav|navigation|homepage|home page)\b/i.test(line);
}

/** True if the line already states an expected outcome or result. */
function hasOutcome(line: string): boolean {
  return /\b(should|will|must|appears?|displays?|shows?|opens?|completes?|succeeds?|confirms?|returns?|navigates?|redirects?|updates?|refreshes?|loads?|becomes?)\b/i.test(line);
}

/** True if the line already states an explicit value, number, or unit. */
function hasValue(line: string): boolean {
  return /\b\d+|\b(true|false|yes|no|enabled|disabled|high|medium|low|default|auto|none|all)\b/i.test(line);
}

/** True if the line already names the specific logs or recovery action. */
function hasRecoveryDetail(line: string): boolean {
  return /\b(application log|system log|event log|error log|console|terminal|log file|retry|restart|contact|escalate|re-run|re-upload|re-enter)\b/i.test(line);
}

// ---------------------------------------------------------------------------
// Per-line checkers  (each returns a question or null)
// ---------------------------------------------------------------------------

type Checker = (line: string, lineIndex: number) => DetectedQuestion | null;

const checkers: Checker[] = [

  // ── 1. Action step with no UI location ────────────────────────────────────
  // Any line starting with an action verb and not already naming a UI location.
  (line) => {
    const actionVerb = line.match(
      /^(add|build|click|check|close|configure|connect|create|delete|deploy|disable|download|edit|enable|enter|export|import|install|launch|load|log in|login|manage|map|navigate|open|remove|restart|run|save|select|set|start|stop|submit|switch|test|toggle|type|uninstall|update|upload|use|verify|view)\b/i
    );
    if (!actionVerb) { return null; }
    if (hasUiLocation(line)) { return null; }
    // Only suppress if line is explicitly CLI/terminal in context — not just because it mentions "script"
    if (/\b(in\s+the\s+terminal|from\s+the\s+terminal|command\s+line|cli|shell|npm\s+run|pip\s+install|git\s+|bash\s|powershell\s)\b/i.test(line)) { return null; }
    return {
      id: `ui-location:${line.slice(0, 50)}`,
      question: `Where in the UI does the user perform this step? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., Settings > Connectors > Add New, or the Deploy toolbar",
    };
  },

  // ── 2. Vague object — "something", "it", "this", "that" as the direct object ──
  (line) => {
    if (!/\b(validates?|processes?|verifies?|checks?|performs?|does|runs?|executes?|scans?)\s+(something|it|this|that|the\s+data|the\s+files?)\b/i.test(line)) {
      return null;
    }
    return {
      id: `vague-object:${line.slice(0, 50)}`,
      question: `What exactly does the system validate/process here? What is being checked? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., validates the file format and size, checks device connectivity",
    };
  },

  // ── 3. Conditional with undefined pass condition ("if ok", "if successful") ──
  (line) => {
    const arrowPass = line.match(/^(valid|ok|success(?:ful)?|passed?|done|complete)\s*[→>]\s*(.*)$/i);
    const ifPass = /^\s*(if|when)\s+(ok|good|successful|success|it works?|that works?|passed?|valid|ready|done|complete)\b/i.test(line);
    if (!arrowPass && !ifPass) { return null; }
    // Arrow with a named result already (e.g. "Valid → dashboard") is specific — don't ask
    if (arrowPass && arrowPass[2].trim() && !/^(something|it|this|that|\?)$/i.test(arrowPass[2].trim())) {
      return null;
    }
    return {
      id: `condition-pass:${line.slice(0, 50)}`,
      question: `What specific indicator means the condition is met? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., status shows 'Connected', green indicator, no errors in the log",
    };
  },

  // ── 4. Conditional error branch — undefined recovery ──────────────────────
  (line) => {
    const arrowFail = line.match(/^(invalid|error|fail(?:ure)?|not\s+ok|unsuccessful|wrong|bad|incorrect)\s*[→>]\s*(.*)$/i);
    const ifFail = /^\s*(if|when)\s+(error|fail|failure|not ok|invalid|unsuccessful|wrong|bad)\b/i.test(line);
    if (!arrowFail && !ifFail) { return null; }
    if (hasRecoveryDetail(line)) { return null; }
    // Arrow with a specific recovery already stated — don't ask
    if (arrowFail && arrowFail[2].trim() && hasRecoveryDetail(arrowFail[2])) { return null; }
    return {
      id: `error-recovery:${line.slice(0, 50)}`,
      question: `What should the user do when this occurs? What does the error look like and what is the next action? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., an error message appears, user re-enters credentials; or open deployment log and look for error code",
    };
  },

  // ── 5. "Check logs" with no log name ──────────────────────────────────────
  (line) => {
    if (!/\bcheck\s+(the\s+)?(logs?|log\s+file|errors?|warnings?)\b/i.test(line)) { return null; }
    if (hasRecoveryDetail(line)) { return null; }
    return {
      id: `check-logs:${line.slice(0, 50)}`,
      question: `Which log should the user check and what should they look for? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., deployment.log in C:\\Logs, look for ERROR entries",
    };
  },

  // ── 6. Verification step with no method or success criteria ───────────────
  (line) => {
    if (!/^(test|verify|confirm|validate|check)\s+/i.test(line)) { return null; }
    if (hasOutcome(line)) { return null; }
    if (hasUiLocation(line)) { return null; }
    return {
      id: `verify-method:${line.slice(0, 50)}`,
      question: `How does the user perform this verification and what does a successful result look like? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., click Test Connection — a green tick and 'Connected' message should appear",
    };
  },

  // ── 7. Set / configure / enter with no value ──────────────────────────────
  (line) => {
    const m = line.match(/^(set|configure|enter|specify|define|assign|input|type)\s+(?:the\s+)?(.+)$/i);
    if (!m) { return null; }
    if (hasValue(line)) { return null; }
    // Skip lines that are just pointing to a field by name (address, url, name, etc.)
    const noun = m[2].replace(/\.$/, "").trim().toLowerCase();
    const skipNouns = ["address", "url", "name", "title", "description", "path", "hostname", "ip", "email"];
    if (skipNouns.some(s => noun.includes(s))) { return null; }
    return {
      id: `set-no-value:${noun.slice(0, 40)}`,
      question: `What value or range should be used for "${m[2].replace(/\.$/, "").trim()}"? Include units if applicable. (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., 1000 ms, 500, High, enabled",
    };
  },

  // ── 8. Default value stated as unknown ────────────────────────────────────
  (line) => {
    if (!/defaults?\s+to\s+(something|unknown|tbd|\?|x)\b/i.test(line)) { return null; }
    return {
      id: `unknown-default:${line.slice(0, 50)}`,
      question: `What is the actual default value? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., 4840",
    };
  },

  // ── 9. Placeholder tokens <VALUE>, [PORT], {name} ─────────────────────────
  (line) => {
    const m = line.match(/[\<\[]\s*([A-Za-z0-9_\- ]{1,30})\s*[\>\]]/);
    if (!m) { return null; }
    return {
      id: `placeholder:${m[1].trim()}`,
      question: `What is the actual value for "${m[1].trim()}"? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "Enter the real value",
    };
  },

  // ── 10. Authentication with no method detail ──────────────────────────────
  (line) => {
    if (!/\b(credentials?|authentication|auth|login|sign[\s-]?in)\b/i.test(line)) { return null; }
    if (/\b(username|password|token|certificate|cert|api[\s-]?key|oauth|saml|ldap|sso)\b/i.test(line)) { return null; }
    return {
      id: `auth-detail:${line.slice(0, 40)}`,
      question: `What form do the credentials take? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., username and password, certificate file, API token",
    };
  },

  // ── 11. Reference to undefined standard / usual process ───────────────────
  (line) => {
    if (!/\b(standard|usual|normal|typical)\s+(process|procedure|workflow|method|way|steps?)\b/i.test(line)) { return null; }
    return {
      id: `undefined-process:${line.slice(0, 50)}`,
      question: `What specifically is this process? List the steps. (Source: "${line}")`,
      sourceContext: line,
      placeholder: "Describe the specific steps",
    };
  },

  // ── 12. Step that restarts / reboots without stating impact or wait time ───
  (line) => {
    if (!/^(restart|reboot|reset|reload)\s+/i.test(line)) { return null; }
    if (/\b(wait|after|once|when|minutes?|seconds?|automatically)\b/i.test(line)) { return null; }
    return {
      id: `restart-wait:${line.slice(0, 50)}`,
      question: `After this restart, does the user need to wait or watch for something before continuing? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., wait ~30 seconds, watch for 'Runtime started' in the status bar",
    };
  },

  // ── 13. Vague enumeration — "or whatever", "or something", "etc." ─────────
  // Author waves off additional items without naming them; cannot be documented.
  (line) => {
    if (!/\b(or\s+whatever|or\s+something|or\s+anything(\s+else)?|and\s+so\s+on|etc\.?|and\s+whatnot|or\s+other\s+\w+)\b/i.test(line)) {
      return null;
    }
    return {
      id: `vague-enum:${line.slice(0, 50)}`,
      question: `The source says "${line}" — what are the actual fields or options the user may need to change? List them specifically.`,
      sourceContext: line,
      placeholder: "e.g., polling interval, retry count, timeout value",
    };
  },

  // ── 14. Unqualified adjective — "appropriate/correct/proper/suitable" + noun ──
  // "Select the appropriate option" cannot be followed without knowing which one.
  (line) => {
    if (!/\b(appropriate|correct|proper|suitable|relevant|right)\s+(option|value|setting|mode|type|format|method|config|configuration|profile|role|level|permission|protocol|channel|source|target|device|server|certificate|cert|key|file|folder|path|field|parameter|param)\b/i.test(line)) {
      return null;
    }
    return {
      id: `vague-adjective:${line.slice(0, 50)}`,
      question: `The source says "${line}" — what specifically is the correct/appropriate choice? What should the user actually select or enter?`,
      sourceContext: line,
      placeholder: "e.g., select 'OPC UA', enter the server certificate, choose 'Read-only'",
    };
  },

  // ── 15. Number with no unit ────────────────────────────────────────────────
  // "Set timeout to 30" — 30 what? Without a unit the step cannot be followed.
  (line) => {
    // Must contain a bare number (not already followed by a unit or a version-like pattern)
    if (!/\b(set|enter|use|specify|configure|assign|type|input)\b.+\bto\s+\d+\s*[.,]?\s*$/i.test(line)) {
      return null;
    }
    // Skip if a unit is already present right after the number
    if (/\b\d+\s*(ms|milliseconds?|seconds?|minutes?|hours?|days?|kb|mb|gb|hz|khz|mhz|rpm|px|dp|pt|em|rem|%|bytes?)\b/i.test(line)) {
      return null;
    }
    return {
      id: `no-unit:${line.slice(0, 50)}`,
      question: `The source says "${line}" — what is the unit for this value? (e.g., milliseconds, seconds, bytes)`,
      sourceContext: line,
      placeholder: "e.g., milliseconds, seconds, KB",
    };
  },

  // ── 16. Reference to absent external document ─────────────────────────────
  // "Refer to the guide", "see the documentation", "follow the instructions"
  // The referenced document is not present — the user cannot follow the step.
  (line) => {
    if (!/\b(refer\s+to|see\s+the|follow\s+the|consult\s+the|per\s+the|according\s+to\s+the|check\s+the)\s+(guide|documentation|docs?|manual|instructions?|readme|wiki|runbook|kb|knowledge\s+base|article|spec|specification)\b/i.test(line)) {
      return null;
    }
    return {
      id: `absent-doc:${line.slice(0, 50)}`,
      question: `The source says "${line}" — what are the specific steps from that document that the user must follow here? (The document itself is not part of the source.)`,
      sourceContext: line,
      placeholder: "List the steps the user should take at this point",
    };
  },

  // ── 17. "Wait until complete" with no completion indicator ────────────────
  // "Wait for it to finish" / "wait until the process completes" —
  // the user cannot proceed without knowing what signals completion.
  (line) => {
    if (!/\b(wait\s+(for|until)|wait\s+while)\b/i.test(line)) { return null; }
    // Skip if a time duration or a visible indicator is already stated
    if (/\b(minutes?|seconds?|hours?|green|done|complete[sd]?|finished?|status|indicator|message|prompt|appears?|shows?)\b/i.test(line)) {
      return null;
    }
    return {
      id: `wait-no-indicator:${line.slice(0, 50)}`,
      question: `The source says "${line}" — what does the user see or watch for to know it has finished? What is the completion indicator?`,
      sourceContext: line,
      placeholder: "e.g., the progress bar disappears, status changes to 'Ready', a confirmation dialog appears",
    };
  },
  // ── 18. Embedded conditional action — "[role/user] may/might need to [verb] [vague noun]" ──
  // e.g. "Admin may need to configure advanced settings."
  // The action verb is buried inside a conditional clause; checker 1 misses it because
  // the line does not start with an action verb. This class catches it and asks for
  // both the UI location and what specifically needs to be done.
  (line) => {
    const m = line.match(
      /\b(may|might|could|should|will\s+need\s+to|needs?\s+to)\s+(configure|set|update|change|enter|specify|select|enable|disable|access|open|adjust|modify|review|provide|upload|download|restart|run)\s+(.+)$/i
    );
    if (!m) { return null; }
    const subject = m[3].replace(/\.$/, "").trim();
    if (hasUiLocation(line)) {
      // Location known but subject is still vague
      return {
        id: `conditional-action-what:${line.slice(0, 50)}`,
        question: `The source says "${line}" — what specifically is "${subject}"? List the fields or actions involved.`,
        sourceContext: line,
        placeholder: "e.g., timeout value, retry count, log level",
      };
    }
    return {
      id: `conditional-action-where:${line.slice(0, 50)}`,
      question: `The source says "${line}" — where in the UI is this done, and what specifically is "${subject}"?`,
      sourceContext: line,
      placeholder: "e.g., Settings > Advanced > configure timeout and retry values",
    };
  },

  // ── 19. Role-based vague access — "[role] get/have/see [vague noun]" ────────────
  // e.g. "Admins get extra options.", "Managers have additional features."
  // The access granted is not defined — the document cannot describe it without asking.
  (line) => {
    const m = line.match(
      /\b(admins?|managers?|operators?|supervisors?|users?|roles?|members?|staff)\s+(get|have|receive|see|can\s+access|can\s+see|can\s+view|are\s+shown)\s+(.+)$/i
    );
    if (!m) { return null; }
    const what = m[3].replace(/\.$/, "").trim();
    // If the noun is already a specific named feature, don't ask
    if (/\b(the\s+)?(admin|settings?|dashboard|panel|console|report|log|tool|menu|page|screen|tab)\b/i.test(what)) { return null; }
    return {
      id: `role-vague-access:${line.slice(0, 50)}`,
      question: `The source says "${line}" — what specifically are "${what}"? Where do they appear and what can the user do with them?`,
      sourceContext: line,
      placeholder: "e.g., a 'Manage Users' menu item and a 'System Logs' tab appear in the top navigation bar",
    };
  },
];

// ---------------------------------------------------------------------------
// Global source-level checks (run once on the full source, not per line)
// ---------------------------------------------------------------------------

type GlobalChecker = (source: string) => DetectedQuestion[];

const globalCheckers: GlobalChecker[] = [

  // Prerequisites: does the source imply anything must exist/be ready first?
  (source) => {
    const results: DetectedQuestion[] = [];
    const prereqHints = [
      { rx: /\b(upload|deploy|transfer)\b/i,       q: "What must already exist or be prepared before the user starts? (e.g., build output, credentials, target device powered on)" },
      { rx: /\b(select\s+target|target\s+device)\b/i, q: "Must the target device already be connected or registered before this procedure starts?" },
      { rx: /\b(credentials?|auth|login)\b/i,      q: "Must the user already have credentials created, or are they created during this procedure?" },
    ];
    for (const hint of prereqHints) {
      if (hint.rx.test(source)) {
        results.push({
          id: `prereq:${hint.q.slice(0, 40)}`,
          question: hint.q,
          sourceContext: "(whole source)",
          placeholder: "e.g., build output must be in /dist, device must be powered on and reachable",
        });
      }
    }
    return results;
  },
];

// ---------------------------------------------------------------------------
// Main detector
// ---------------------------------------------------------------------------

/**
 * Detects questions that need to be answered by the user before documentation
 * can be generated without inventing information.
 */
export function detectQuestions(
  source: string,
  _taskType: TaskType
): DetectedQuestion[] {
  const lines = source.split(/\r?\n/);
  const seen = new Set<string>();
  const results: DetectedQuestion[] = [];

  const addIfNew = (q: DetectedQuestion) => {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      results.push(q);
    }
  };

  // Per-line checks
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) { continue; }

    for (const checker of checkers) {
      const q = checker(trimmed, lines.indexOf(line));
      if (q) { addIfNew(q); }
    }
  }

  // Global source-level checks
  for (const gc of globalCheckers) {
    for (const q of gc(source)) {
      addIfNew(q);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

/**
 * Formats answered questions into the PRE-CLARIFICATIONS block injected
 * into the AI prompt.
 */
export function formatPreClarifications(
  questions: DetectedQuestion[],
  answers: string[]
): string {
  return questions
    .map((q, i) => {
      const answer = answers[i]?.trim() || "(no answer provided)";
      return `[Q${i + 1}] ${q.question}\n` +
        (q.sourceContext !== "(whole source)"
          ? `       Source line: "${q.sourceContext}"\n`
          : "") +
        `[A${i + 1}] ${answer}`;
    })
    .join("\n\n");
}

