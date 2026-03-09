/**
 * questionDetector.ts
 *
 * Analyses source content against a checklist of what a complete user manual
 * section requires. For every gap found, generates a question to ask the user
 * BEFORE the AI prompt is built — so the AI receives complete information on
 * the first call and produces a fully detailed document without a second pass.
 *
 * Contains 40 per-line pattern checkers + 2 global checkers.
 *
 * Approach:
 *   For every action step   → Does it say WHERE in the UI?
 *   For every action step   → Does it say what success looks like?
 *   For every set/configure → Does it say what VALUE to use?
 *   For every conditional   → Is the CONDITION defined?
 *   For every error branch  → Is the RECOVERY fully described?
 *   For every vague noun    → Is it specified?
 *   For multi-step actions  → Should it be broken down?
 *   For state transitions   → Is there a visible indicator?
 *   For deployments         → Is there a rollback path?
 *   For the whole source    → Are there implied PREREQUISITES?
 *
 * Rules:
 * - Never invent a question unrelated to the source.
 * - Each question must be traceable to a specific line in the source.
 * - One question per gap — do not ask the same thing twice.
 */

import { TaskType } from "./types";
import { getTemplateFor } from "./templates";

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
  // Any line starting with an action verb, or starting with a transitional word
  // followed by an action verb (e.g. "Then deploy ...", "Next, select ...").
  (line) => {
    // Strip a leading transitional word so "Then deploy ...", "Next select ..." are caught.
    const stripped = line.replace(/^(then|next|now|also|finally|after\s+that)[,\s]+/i, "").trim();
    const actionVerb = stripped.match(
      /^(add|build|click|check|close|configure|connect|create|delete|deploy|disable|download|edit|enable|enter|export|import|install|launch|load|log in|login|manage|map|navigate|open|remove|request|restart|run|save|select|set|start|stop|submit|switch|test|toggle|type|uninstall|update|upload|use|verify|view)\b/i
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
  // "Select the appropriate option" / "takes appropriate action" cannot be followed
  // without knowing which one or what it specifically means.
  (line) => {
    if (!/\b(appropriate|correct|proper|suitable|relevant|right)\s+(option|value|setting|mode|type|format|method|config|configuration|profile|role|level|permission|protocol|channel|source|target|device|server|certificate|cert|key|file|folder|path|field|parameter|param|action|behavior|behaviour|response|step|output|measure|procedure|process)\b/i.test(line)) {
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
  // "Refer to the guide", "see the documentation", "follow the instructions",
  // "See deploy section for more info", "see X section" — any cross-reference
  // where the actual steps are not present in the source.
  (line) => {
    const isDocRef =
      /\b(refer\s+to|see\s+the|follow\s+the|consult\s+the|per\s+the|according\s+to\s+the|check\s+the)\s+(guide|documentation|docs?|manual|instructions?|readme|wiki|runbook|kb|knowledge\s+base|article|spec|specification)\b/i.test(line) ||
      /\bsee\s+(\w[\w\s]{0,30}?)\s+section\b/i.test(line) ||
      /\b(more\s+info|more\s+information|more\s+details?)\b/i.test(line);
    if (!isDocRef) {
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

  // ── 20. Vague subset + requirement — "Some actions require approval." ────────
  // "some", "certain", "various" + noun + "require/need/must" with no named items.
  // Cannot document without knowing which specific items are subject to the rule.
  (line) => {
    const m = line.match(
      /\b(some|certain|several|various|multiple|many|a\s+few)\s+(\w+)\s+(require|need|must|are\s+subject\s+to|will\s+need)\s+(.+)$/i
    );
    if (!m) { return null; }
    const noun = m[2];
    const requirement = m[4].replace(/\.$/, "").trim();
    return {
      id: `vague-subset:${line.slice(0, 50)}`,
      question: `The source says "${line}" — which specific ${noun} require ${requirement}? What does the ${requirement} process involve?`,
      sourceContext: line,
      placeholder: `e.g., list the specific ${noun} and describe the ${requirement} workflow`,
    };
  },

  // ── 21. Passive voice without a named actor ───────────────────────────────
  // "the file is uploaded", "records are processed" — who or what does this?
  // Only fires on action-like past participles; ignores descriptive state verbs.
  (line) => {
    const m = line.match(/\b(is|are|was|were)\s+(\w+ed)\b/i);
    if (!m) { return null; }
    // Actor already named
    if (/\bby\s+(the\s+)?(user|system|admin|operator|service|job|agent|scheduler|platform|server|client|extension)\b/i.test(line)) { return null; }
    if (/\b(automatically|auto)\b/i.test(line)) { return null; }
    const pp = m[2].toLowerCase();
    const actionPastParticiples = [
      'uploaded', 'processed', 'deployed', 'created', 'deleted', 'sent', 'exported',
      'imported', 'transferred', 'submitted', 'triggered', 'executed', 'started',
      'stopped', 'restarted', 'configured', 'installed', 'removed', 'updated',
      'validated', 'checked', 'verified', 'generated', 'published', 'synced',
      'downloaded', 'applied', 'scheduled', 'parsed', 'loaded', 'saved',
    ];
    if (!actionPastParticiples.includes(pp)) { return null; }
    return {
      id: `passive-no-actor:${line.slice(0, 50)}`,
      question: `Who or what performs this action? Is this done by the user, the system, or an automated job? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., the user manually uploads the file; or the system processes records automatically after save",
    };
  },

  // ── 22. Frequency / schedule unspecified ─────────────────────────────────
  // "run the job", "execute the script" — no time, trigger, or frequency stated.
  (line) => {
    if (!/\b(run|execute|trigger|schedule|start|invoke|launch)\s+(the\s+)?(job|task|script|process|workflow|pipeline|batch|sync|backup|report|export|import)\b/i.test(line)) {
      return null;
    }
    if (/\b(daily|weekly|monthly|hourly|every|at\s+\d|cron|on\s+demand|manually|automatically|nightly|once|each|after|when)\b/i.test(line)) {
      return null;
    }
    return {
      id: `no-schedule:${line.slice(0, 50)}`,
      question: `When and how often is this run? Is it triggered manually or on a schedule? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., manually by the operator after each deployment; or nightly at 02:00 via cron",
    };
  },

  // ── 23. Multi-branch without convergence ─────────────────────────────────
  // "otherwise / else / if not" branch with no stated common next step.
  // Catches the second arm of an if/else where the doc never says what both
  // paths converge to.
  (line) => {
    const m = line.match(/^(otherwise|else|if\s+not|in\s+that\s+case)[,:]?\s+(.+)$/i);
    if (!m) { return null; }
    if (/\b(continue|proceed|go\s+to\s+step|then\s+continue|return\s+to|resume|end\s+the|complete|finish)\b/i.test(line)) { return null; }
    return {
      id: `branch-no-convergence:${line.slice(0, 50)}`,
      question: `After the "${m[1]}" branch, what is the next common step? Do both paths rejoin, or does this branch end the procedure? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., both paths continue to Step 5 — Enable Connector; or this branch ends the procedure here",
    };
  },

  // ── 24. Data format unspecified ───────────────────────────────────────────
  // "export the file", "import the data", "Export feature with multiple formats" — CSV? JSON? XML? XLSX?
  (line) => {
    const hasExportImportVerb = /\b(export|import|upload|download|send|transfer|load|read|write|parse|generate)\s+(the\s+)?(file|data|report|records?|output|input|spreadsheet|document|attachment)\b/i.test(line);
    // Also catch declarative feature descriptions: "export/import feature/support with multiple/various formats"
    const hasVagueFormatClaim = /\b(export|import|upload|download)\s+(feature|support|capability|option|function)\b.*\b(format|type)s?\b/i.test(line) ||
      /\b(multiple|various|several|many)\s+(file\s+)?(format|type)s?\b/i.test(line);
    if (!hasExportImportVerb && !hasVagueFormatClaim) {
      return null;
    }
    if (/\b(csv|json|xml|xlsx?|pdf|txt|yaml|yml|parquet|avro|html|sql|zip|tar|gz|binary|base64|markdown|md)\b/i.test(line)) {
      return null;
    }
    return {
      id: `data-format:${line.slice(0, 50)}`,
      question: `What specific file formats are supported or required? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., CSV, JSON, and XLSX; or CSV with UTF-8 encoding only",
    };
  },

  // ── 25. Version / environment unspecified ─────────────────────────────────
  // "the new version", "the latest release", "the production environment"
  // — cannot be documented without a specific identifier.
  (line) => {
    const m = line.match(/\b(new|latest|current|updated?|upgraded?|previous|old|legacy)\s+(version|release|build|environment|env|platform|system)\b/i);
    if (!m) { return null; }
    return {
      id: `version-unspecified:${line.slice(0, 50)}`,
      question: `Which specific version, build number, or environment does this apply to? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., v3.2.0 and later; production environment only; applies from build 2024.1",
    };
  },

  // ── 26. Success count ambiguity ───────────────────────────────────────────
  // "all records should be imported" — how many? what if fewer appear?
  (line) => {
    if (!/\b(all|every)\s+(\w+\s+)*(record|item|row|entry|file|user|device|result|document)s?\b.*(should|will|must|are\s+expected\s+to)\b/i.test(line)) {
      return null;
    }
    return {
      id: `success-count:${line.slice(0, 50)}`,
      question: `How many ${/records?/i.test(line) ? 'records' : 'items'} are expected in total? What should the user do if fewer appear? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., expect 1,200 records; if fewer, open the import log and look for SKIPPED entries",
    };
  },

  // ── 27. Past-tense fix/resolve with vague fault condition ────────────────────
  // "Fixed crash on startup in certain conditions" — which conditions specifically?
  // Covers release-note declarative past tense that checker 1 (imperative only) misses.
  (line) => {
    if (!/^(fixed|resolved|corrected|addressed|patched|repaired|prevented|eliminated|mitigated)\b/i.test(line)) { return null; }
    if (!/\b(certain|some|specific|particular|undetermined|unknown|various|multiple|select|edge)\s+(conditions?|cases?|scenarios?|circumstances?|situations?|environments?|configurations?|instances?)\b/i.test(line)) { return null; }
    return {
      id: `vague-fault-condition:${line.slice(0, 50)}`,
      question: `What are the specific conditions under which this occurred? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., occurred when the config file was missing; on Windows only; when network was unavailable at startup",
    };
  },

  // ── 28. Vague completion / incompleteness status ─────────────────────────
  // "Some translations incomplete" / "Various settings missing" — which ones?
  // Checker 20 only fires when followed by require/need/must; this catches bare
  // status descriptions common in release notes and status updates.
  (line) => {
    const m = line.match(
      /^(some|certain|various|multiple|several|many|a\s+few)\s+(\w+(?:\s+\w+)?)\s+(incomplete|missing|not\s+available|not\s+done|not\s+complete|not\s+finished|pending|absent|unfinished|untranslated|unavailable|broken|incorrect|incorrect)\b/i
    );
    if (!m) { return null; }
    const noun = m[2].trim();
    const status = m[3].trim();
    return {
      id: `vague-status:${line.slice(0, 50)}`,
      question: `The source says "${line}" — which specific ${noun} are ${status}? List them or describe the scope.`,
      sourceContext: line,
      placeholder: `e.g., German and Japanese ${noun} are ${status}; affects the Settings and Notifications screens`,
    };
  },

  // ── 29. Declarative vague enumeration — "various/multiple/several [noun]" ────────
  // "Fixed various UI glitches" / "Export feature with multiple formats"
  // Checker 13 catches trailing "etc."/"or whatever"; this catches leading
  // vague quantifiers in declarative (non-imperative) statements.
  // Checker 20 only fires with require/need/must — this catches the rest.
  (line) => {
    const m = line.match(
      /\b(various|multiple|several|numerous|assorted)\s+(\w+(?:\s+\w+){0,2})\b/i
    );
    if (!m) { return null; }
    // Already caught by checker 20 (with require/need/must)
    if (/\b(require|need|must|are\s+subject\s+to|will\s+need)\b/i.test(line)) { return null; }
    // Skip if the noun phrase is already a specific named list
    if (/\b(\d+|first|second|third|following|listed|above|below)\b/i.test(line)) { return null; }
    const noun = m[2].trim();
    return {
      id: `declarative-vague-enum:${line.slice(0, 50)}`,
      question: `The source says "${line}" — what are the specific ${noun}? List each one individually.`,
      sourceContext: line,
      placeholder: `e.g., list each specific ${noun} by name`,
    };
  },

  // ── 30. Past-tense fix with no described symptom or affected scope ─────────
  // "Fixed memory leak in background process" is specific enough.
  // "Fixed an issue" / "Resolved a problem" / "Addressed a bug" — these have
  // no information and cannot be documented without knowing what the issue was.
  (line) => {
    if (!/^(fixed|resolved|corrected|addressed|patched)\b/i.test(line)) { return null; }
    if (!/\b(an?\s+)?(issue|problem|bug|error|defect|fault|glitch)\b/i.test(line)) { return null; }
    // Skip if a description follows: "Fixed an issue where..." / "Fixed an issue with X"
    if (/\b(where|when|with|in|that|causing|related\s+to)\b/i.test(line)) { return null; }
    return {
      id: `fix-no-description:${line.slice(0, 50)}`,
      question: `What was this issue? What symptom did the user experience, and in which part of the application? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., the Save button became unresponsive after uploading a file larger than 10 MB",
    };
  },

  // ── 31. Third-person user-subject action with no UI location ──────────────────
  // Checker 1 only fires on bare imperative verbs ("Enter x", "Select y").
  // Sources like Jira tickets, user stories, and acceptance criteria describe
  // actions in third person: "User sets new password", "User can request reset",
  // "Users need to reset their password" — checker 1 misses all of these.
  // This checker catches any third-person user-subject action sentence and asks
  // for the UI location when none is stated.
  (line) => {
    // Match: "User [modal] verb", "Users [modal] verb", "The user [modal] verb"
    const m = line.match(
      /^(?:the\s+)?users?(?:\s+(?:can|should|must|will|need\s+to|needs\s+to|is\s+able\s+to|are\s+able\s+to))?\s+(\w+)\b/i
    );
    if (!m) { return null; }
    // Only fire for action verbs — skip state/auxiliary verbs
    const verb = m[1].toLowerCase();
    const nonActionVerbs = new Set([
      'be', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does',
      'did', 'get', 'gets', 'got', 'see', 'sees', 'know', 'knows', 'need',
      'needs', 'want', 'wants', 'receive', 'receives', 'find', 'finds',
    ]);
    if (nonActionVerbs.has(verb)) { return null; }
    if (hasUiLocation(line)) { return null; }
    // Skip if it's a CLI/terminal action
    if (/\b(terminal|command\s+line|cli|shell|npm|pip|git\s+|bash|powershell)\b/i.test(line)) { return null; }
    return {
      id: `user-subject-no-location:${line.slice(0, 50)}`,
      question: `Where in the UI does the user perform this action? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., on the Login page, click 'Forgot password?'; or Settings > Account > Reset Password",
    };
  },

  // ── 32. Incomplete step annotation — "(needs design)", "(TBD)", "(TODO)", "(pending)" ──
  // Any workflow step annotated as not yet designed or defined cannot be
  // documented — the content of the step is unknown. Ask what the actual
  // steps are before generating.
  (line) => {
    if (!/\(\s*(needs?\s+design|tbd|todo|pending|needs?\s+input|to\s+be\s+confirmed|to\s+be\s+defined|not\s+designed|not\s+yet\s+defined|\?)\s*\)/i.test(line)) {
      return null;
    }
    return {
      id: `incomplete-annotation:${line.slice(0, 50)}`,
      question: `This step is marked as incomplete: "${line}" — what are the actual steps the user performs here?`,
      sourceContext: line,
      placeholder: "Describe the specific UI steps, fields, or actions involved",
    };
  },

  // ── 33. Navigation to named destination without definition or path ───────────
  // "redirect to dashboard", "go to home", "navigate to settings"
  // — Destination is named but lacks definition: is it a page, section, what URL, how is user taken there?
  // User cannot understand what screen they're navigating to or locate it in the UI.
  (line) => {
    const m = line.match(
      /\b(redirect|navigate|go|forward|return|link|proceed|direct|move)\s+to\s+(?:the\s+)?([a-z][a-z\s]*?)(?:\s*(?:[,;.:]|$))/i
    );
    if (!m) { return null; }
    const dest = m[2].trim();
    // Skip if destination is a step/flow reference ("step 5", "next", "previous")
    if (/^(step|next|previous|the\s+next|here|there)/.test(dest)) { return null; }
    // Skip if destination already has path detail ("Settings > Security", "Home/Dashboard")
    if (/[>\/\-]|settings|config|admin/i.test(dest)) { return null; }
    // Skip if line already clarifies it's automatic or self-explanatory
    if (/\b(automatic|automatically|auto|appears|opens|displays|loads|system|bounces|refreshes|immediately)\b/i.test(line)) {
      return null;
    }
    return {
      id: `unspec-nav-dest:${line.slice(0, 50)}`,
      question: `What is the "${dest}"? What page or section is it, where does it appear in the UI, and how is the user taken there? (Source: "${line}")`,
      sourceContext: line,
      placeholder: `e.g., the ${dest} is the main workspace at /app/home, accessed automatically after login; or at the top navigation menu`,
    };
  },

  // ── 34. Multi-step action collapsed into single sentence ──────────────────
  // "Open settings and configure the timeout and enable the service"
  // Multiple verbs in sequence that should be broken down into individual steps.
  (line) => {
    // Count action verbs in the line
    const actionVerbs = [
      'add', 'build', 'click', 'close', 'configure', 'connect', 'create', 'delete',
      'deploy', 'disable', 'download', 'edit', 'enable', 'enter', 'export', 'import',
      'install', 'launch', 'load', 'manage', 'map', 'navigate', 'open', 'remove',
      'restart', 'run', 'save', 'select', 'set', 'start', 'stop', 'submit', 'toggle',
      'type', 'update', 'upload', 'verify', 'view'
    ];
    const words = line.toLowerCase().split(/\s+/);
    const verbCount = words.filter(w => actionVerbs.includes(w)).length;
    
    // Only trigger if 3+ action verbs in one sentence
    if (verbCount < 3) { return null; }
    
    return {
      id: `multi-step-collapsed:${line.slice(0, 50)}`,
      question: `This sentence contains multiple actions: "${line}" — break this into individual numbered steps, each with its own UI location.`,
      sourceContext: line,
      placeholder: "e.g., Step 1: Open Settings > System. Step 2: Set timeout to 30 seconds. Step 3: Click Enable Service.",
    };
  },

  // ── 35. State transition without visible indicator ────────────────────────
  // "Service becomes active", "system is ready", "deployment completes"
  // User cannot know when the state has changed without a visible indicator.
  (line) => {
    const m = line.match(/\b(becomes?|is\s+now|transitions?\s+to|changes?\s+to|goes?\s+to|enters?|reaches?)\s+(active|ready|available|online|idle|running|stopped|complete|finished|deployed|operational|initialized|configured)\b/i);
    if (!m) { return null; }
    // Skip if an indicator is already mentioned
    if (/\b(indicator|status|message|prompt|appears?|shows?|displays?|icon|color|light|led|banner|notification|alert|dialog)\b/i.test(line)) {
      return null;
    }
    const state = m[2];
    return {
      id: `state-transition:${line.slice(0, 50)}`,
      question: `What visible indicator shows the user that the state is now "${state}"? (Source: "${line}")`,
      sourceContext: line,
      placeholder: `e.g., the status indicator turns green; a banner displays 'Service ${state}'; the connection icon changes to a checkmark`,
    };
  },

  // ── 36. Navigation missing starting point ─────────────────────────────────
  // "Go to Settings" — from where? Main menu? Dashboard? Burger menu?
  // Navigation assumes the user knows the starting context.
  (line) => {
    if (!/^(go\s+to|navigate\s+to|open|access|click)\s+/i.test(line)) { return null; }
    // Skip if the path is already complete (contains > or / path separators)
    if (/[>\/]/.test(line)) { return null; }
    // Skip if it's a top-level menu that's self-explanatory
    if (/\b(home|dashboard|main\s+menu|start\s+page|login\s+page)\b/i.test(line)) { return null; }
    return {
      id: `partial-nav-path:${line.slice(0, 50)}`,
      question: `From where does the user start this navigation? What's the full path? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., from the main dashboard, click hamburger menu > Settings > Connectors",
    };
  },

  // ── 37. Deployment/configuration change without rollback procedure ────────
  // "Deploy to production", "Apply configuration changes", "Migrate database"
  // User needs to know how to revert if something goes wrong.
  (line) => {
    if (!/\b(deploy|release|publish|apply|migrate|upgrade|update|push\s+to)\b/i.test(line)) {
      return null;
    }
    // Skip if rollback/revert is mentioned in the same sentence
    if (/\b(rollback|revert|undo|restore|back\s+out)\b/i.test(line)) { return null; }
    // Only trigger for production/critical operations
    if (!/\b(production|prod|live|critical|database|db|schema|migration)\b/i.test(line)) {
      return null;
    }
    return {
      id: `no-rollback:${line.slice(0, 50)}`,
      question: `If this operation fails or needs to be reverted, what are the rollback steps? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., run rollback script in /scripts/rollback.sh; or restore from backup at /backups/pre-deploy",
    };
  },

  // ── 38. Scope selection without method ─────────────────────────────────────
  // "Import selected tags", "Export chosen records", "Delete specific items"
  // — "selected", "chosen", "specific" implies user selection but doesn't say how.
  (line) => {
    if (!/\b(selected|chosen|specific|specified|desired|relevant|applicable|marked|flagged|checked)\s+(\w+)s?\b/i.test(line)) {
      return null;
    }
    // Skip if the selection method is already stated
    if (/\b(check|select|choose|mark|flag|filter|click|pick|highlight)\b/i.test(line)) {
      return null;
    }
    return {
      id: `scope-selection-method:${line.slice(0, 50)}`,
      question: `How does the user select or specify these items? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., checkboxes next to each item; or filter dialog with search criteria",
    };
  },

  // ── 39. Prerequisite stated with conditional trigger undefined ─────────────
  // "May need elevated permissions", "Might require VPN connection"
  // — under what specific conditions?
  (line) => {
    const m = line.match(/\b(may|might|could|sometimes)\s+(need|require)\s+(.+)$/i);
    if (!m) { return null; }
    const requirement = m[3].replace(/\.$/, "").trim();
    return {
      id: `conditional-prereq:${line.slice(0, 50)}`,
      question: `Under what specific conditions is "${requirement}" required? (Source: "${line}")`,
      sourceContext: line,
      placeholder: `e.g., ${requirement} is required only when accessing production systems; or when the file size exceeds 100MB`,
    };
  },

  // ── 40. Success outcome missing ────────────────────────────────────────────
  // Action completes but no visible result stated.
  // "Upload files." — then what? User needs to know what happens next.
  (line) => {
    if (!/^(upload|download|save|submit|send|transfer|deploy|apply|create|delete|remove|install|uninstall)\b/i.test(line)) {
      return null;
    }
    // Skip if outcome is already stated
    if (hasOutcome(line)) { return null; }
    // Skip if it's a terminal step (period at end with no following context)
    if (/\.$/.test(line) && line.split(/\s+/).length < 5) {
      return {
        id: `success-outcome:${line.slice(0, 50)}`,
        question: `What does the user see when this step completes successfully? (Source: "${line}")`,
        sourceContext: line,
        placeholder: "e.g., a progress bar shows 100%, then a confirmation message appears; or the file list updates",
      };
    }
    return null;
  },
];

// ---------------------------------------------------------------------------
// Global source-level checks (run once on the full source, not per line)
// ---------------------------------------------------------------------------

type GlobalChecker = (source: string) => DetectedQuestion[];

const globalCheckers: GlobalChecker[] = [

  // Open questions / TBD section — each bullet or numbered item is a blocking unknown.
  // Sources such as feature specs, user stories, and Jira tickets frequently contain
  // an explicit "Open questions" or "TBD" section. Every item in that section must be
  // answered before documentation can be generated without inventing information.
  (source) => {
    const results: DetectedQuestion[] = [];
    const lines = source.split(/\r?\n/);
    let inOpenQuestionsSection = false;
    for (const raw of lines) {
      const line = raw.trim();
      // Detect section heading (Markdown heading or bold label)
      if (
        /^#+\s*(open\s+questions?|questions?|gaps?|unknowns?|tbd|pending|open\s+items?):?\s*$/i.test(line) ||
        /^\*\*(open\s+questions?|questions?|gaps?|unknowns?|tbd|pending|open\s+items?):?\s*\*\*\s*:?\s*$/i.test(line)
      ) {
        inOpenQuestionsSection = true;
        continue;
      }
      // Exit section on any subsequent heading or horizontal rule
      if (inOpenQuestionsSection && (/^#+\s+\S/.test(line) || /^---+$/.test(line))) {
        inOpenQuestionsSection = false;
        continue;
      }
      if (!inOpenQuestionsSection) { continue; }
      // Capture bullet or numbered list items
      const m = line.match(/^[-*+•]\s+(.+)$/) ?? line.match(/^\d+\.\s+(.+)$/);
      if (!m) { continue; }
      const itemText = m[1].trim();
      results.push({
        id: `open-question:${itemText.slice(0, 50)}`,
        question: `The source lists this as an open question: "${itemText}" — what is the answer?`,
        sourceContext: line,
        placeholder: "Provide the specific answer to be included in the documentation",
      });
    }
    return results;
  },

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
  taskType: TaskType,
  templateText?: string,
  userIntent?: string
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
  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) { continue; }
    // Strip leading list markers (e.g. "8. ", "- ", "* ") so checkers match
    // action verbs correctly regardless of whether the source uses a numbered
    // or bulleted list.
    const normalized = trimmed.replace(/^(\d+[.)]\s+|[-*+•]\s+)/, "").trim();

    for (const checker of checkers) {
      const q = checker(normalized, idx);
      if (q) { addIfNew(q); }
    }
  }

  // Global source-level checks
  for (const gc of globalCheckers) {
    for (const q of gc(source)) {
      addIfNew(q);
    }
  }

  // Template-required sections check: prefer user-supplied template text
  // (from editor) if provided, otherwise use canonical template for taskType.
  try {
    let requiredSections: string[] = [];
    if (templateText && templateText.trim()) {
      // extract top-level headings from the template text
      const lines = templateText.split(/\r?\n/);
      for (const l of lines) {
        const m = l.match(/^\s*#{1,4}\s*(.+)$/);
        if (m) { requiredSections.push(m[1].trim()); }
      }
    }
    if (requiredSections.length === 0 && taskType) {
      const tmpl = getTemplateFor(taskType);
      requiredSections = tmpl.requiredSections.slice();
    }

    for (const section of requiredSections) {
      const re = new RegExp('^\\s*#{1,4}\\s*' + section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'im');
      if (!re.test(source)) {
        addIfNew({
          id: `missing-section:${section}`,
          question: `The template requires a "${section}" section. Please provide content for this section.`,
          sourceContext: '(whole source)',
          placeholder: `Provide the ${section} content as a paragraph or bullet list.`,
        });
      }
    }
  } catch (e) {
    // ignore template parsing errors
  }

  // Intent-source mismatch check
  if (userIntent) {
    const stopwords = new Set([
      "the", "a", "an", "and", "or", "for", "of", "in", "on", "to", "is",
      "are", "was", "were", "be", "been", "being", "have", "has", "had",
      "do", "does", "did", "will", "would", "could", "should", "may", "might",
      "this", "that", "with", "from", "by", "at", "as", "it", "its",
      "user", "users", "document", "documentation", "how", "what", "write",
      "create", "generate", "make", "about", "process", "describe",
    ]);
    const intentKeywords = userIntent
      .toLowerCase()
      .split(/[\s,./\\]+/)
      .filter(w => w.length > 3 && !stopwords.has(w));
    const sourceLower = source.toLowerCase();
    const matchedAny = intentKeywords.some(kw => sourceLower.includes(kw));
    if (!matchedAny && intentKeywords.length > 0) {
      addIfNew({
        id: `intent-source-mismatch:${userIntent.slice(0, 50)}`,
        question: `Your intent is "${userIntent}" but the source does not mention any related terms (${intentKeywords.slice(0, 3).join(", ")}…). Is this the correct source file? If yes, which part of the source covers this topic?`,
        sourceContext: "(whole source)",
        placeholder: "e.g., Yes, the Admin Settings section covers the login flow — proceed with this source",
      });
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

