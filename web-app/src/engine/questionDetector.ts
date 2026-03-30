/**
 * questionDetector.ts
 *
 * Analyses source content against a checklist of what a complete user manual
 * section requires. For every gap found, generates a question to ask the user
 * BEFORE the AI prompt is built — so the AI receives complete information on
 * the first call and produces a fully detailed document without a second pass.
 *
 * Contains 42 per-line pattern checkers + 2 global checkers.
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

export type QuestionIntent =
  | "location"     // where the action occurs in the UI
  | "input"        // values or data the user must supply
  | "success"      // what a successful outcome looks like
  | "environment"  // application or system context
  | "actor"        // who performs the action
  | "value"        // specific numeric/text value for a parameter
  | "error"        // error appearance or recovery path
  | "timing"       // schedule, frequency, or wait condition
  | "format"       // data format or file type
  | "scope"        // how items are selected or scoped
  | "major-gap"    // missing required section or topic
  | "other";       // catch-all

export interface DetectedQuestion {
  /** Unique identifier (used to match answer back to question). */
  id: string;
  /** The question shown to the user in the VS Code input box. */
  question: string;
  /** The source line/phrase that triggered this question. */
  sourceContext: string;
  /** Optional placeholder text for the input box. */
  placeholder?: string;
  /** Semantic category used for intent-based deduplication. */
  intent?: QuestionIntent;
  /** Explanation of why this gap was flagged (for context). */
  rationale?: string;
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
      question: `For the step "${line}": (a) Where in the UI does the user perform this? Provide the full navigation path or exact UI label. (b) What is the purpose of this step — what does it start, trigger, or enable?`,
      sourceContext: line,
      placeholder: "e.g., (a) Connector page > click Run Setup  (b) starts the deployment process",
      rationale: "Action steps must specify a UI location so users know where to perform the task. Without it, the AI might invent a location.",
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
      rationale: "Vague terms like 'it' or 'something' lead to ambiguous documentation. Specifying the object ensures technical accuracy.",
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
      question: `For the step "${line}": (a) Does the user need to actively check a status indicator before proceeding, or does the next step happen automatically? (b) If they check, where is the indicator in the UI? (c) What exactly does it look like when the condition is met — color, label, icon, or message?`,
      sourceContext: line,
      placeholder: "e.g., (a) user checks manually  (b) status bar at top of Connector page  (c) indicator turns green and shows 'Running'",
      rationale: "Conditional transitions ('if successful') require a clear indicator. Users need to know exactly how to recognize success before moving on.",
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
      rationale: "Negative flows must have a recovery path. Without this, the manual leaves the user stuck when an error occurs.",
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
      rationale: "Reviewers and users need to know exactly which log files to inspect. General 'check logs' instructions are often ignored or cause confusion.",
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
      rationale: "Verification steps are only useful if they provide a clear 'pass/fail' criteria. Stating the method and expected result prevents user error.",
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
      rationale: "Missing values (ports, URLs, timeouts) make the documentation impossible to follow. The AI needs these specific facts to generate a complete guide.",
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
      rationale: "Default values are critical for 'zero-config' documentation. Without them, users don't know the starting state or if they even need to change the setting.",
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
      rationale: "Placeholder tokens like <VALUE> or [PORT] are meant for templates, not final manuals. The AI needs the real examples to generate clear instructions.",
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
      rationale: "Authentication requirements are the #1 source of user friction. Specifying the exact method (e.g., API Key vs OAuth) prevents setup failure.",
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
      rationale: "Vague terms like 'usual process' assume the user is already an expert. Documentation must be explicit to support new users and automation.",
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
      rationale: "Restarts introduce a gap in the workflow. Users need to know how long to wait or which indicator signals the system is back online.",
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
      rationale: "Casual phrases like 'etc.' or 'or whatever' leave the user guessing. A technical manual must be exhaustive to be reliable.",
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
      rationale: "Adjectives like 'appropriate' are subjective. Documentation must provide the specific criteria or value to remove ambiguity.",
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
      rationale: "Numerical values without units (e.g., '30') are dangerous. Users need to know if it's 30 seconds, 30 minutes, or 30 bytes.",
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
      rationale: "Cross-references to external docs ('see the guide') break the flow. The AI needs the actual steps to keep the manual self-contained.",
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
      rationale: "Users often get stuck at 'Wait' steps. Providing a clear indicator (e.g., 'Status changes to Ready') tells them when they can safely move on.",
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
        question: `For the step "${line}": (a) where in the UI is this done? Provide the full navigation path. (b) what specific settings or parameters does the user configure here? List each one by name. (c) under what condition is this required — always, or only in specific scenarios?`,
        sourceContext: line,
        placeholder: "e.g., (a) Settings > Advanced  (b) timeout (ms), retry count, log level  (c) only when deploying to production",
        rationale: "Phrases like 'may need to configure' signal a buried step. We need the UI location and exact parameters to document this step properly.",
      };
    }
    return {
      id: `conditional-action-where:${line.slice(0, 50)}`,
      question: `For the step "${line}": (a) Where in the UI is this done? Provide the full navigation path. (b) What specific settings or parameters does the user configure here? List each one by name. (c) Under what condition is this required — always, or only in specific scenarios?`,
      sourceContext: line,
      placeholder: "e.g., (a) Settings > Advanced  (b) timeout (ms), retry count, log level  (c) only when deploying to production",
      rationale: "Phrases like 'may need to configure' signal a buried step. We need the UI location and exact parameters to document this step properly.",
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
      rationale: "Knowing which roles see which specific features is essential for access control documentation. It prevents users from looking for menus they can't see.",
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
      rationale: "Broad claims about 'some actions' or 'certain items' are vague. The manual must list exactly which items have special requirements.",
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
      rationale: "Passive voice ('is uploaded') hides the actor. This is critical for distinguishing between a manual user task and an automatic system process.",
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
      rationale: "Recurring tasks must specify a trigger or schedule. This helps users understand if they need to act now or if the task is scheduled.",
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
      rationale: "Conditional branches ('otherwise...') must eventually converge or terminate. Without this, the workflow becomes a dead end in the documentation.",
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
      rationale: "Technical users need to know specific file formats (e.g., JSON vs XML) to prepare their data correctly for import/export.",
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
      rationale: "Ambiguous terms like 'latest' or 'new' become outdated quickly. Explicit versioning ensures the manual remains accurate over time.",
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
      rationale: "Quantifying success (e.g., 'all 100 records') is the best way to verify an operation. It also provides a trigger for troubleshooting if counts don't match.",
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
      rationale: "When a bug is mentioned as fixed, the manual should explain the trigger or environment to help users confirm if it applies to them.",
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
      rationale: "When something is 'incomplete' or 'missing', specifying the exact scope (e.g., which languages) prevents users from wasting time searching for it.",
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
      rationale: "Adjectives like 'various' or 'multiple' leave the document thin. Naming every item ensuring the guide is authoritative and complete.",
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
      rationale: "Phrases like 'Fixed an issue' are meaningless without a symptom description. Explaining the actual bug help users recognize it in their logs.",
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
      rationale: "User stories ('User logs in') describe actions but often skip the 'how'. We need the exact UI labels and paths to turn this into a manual.",
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
      rationale: "TODO/TBD markers indicate missing knowledge. Resolving these is a hard requirement before the AI can generate a factual document.",
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
      rationale: "Navigation destinations need a definition (e.g., is it a page, a tab, or a pop-up?) so the user can easily find them in the interface.",
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
      rationale: "Sentences with multiple verbs are hard to follow. Breaking them into numbered steps makes the documentation more readable and scannable.",
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
      rationale: "Transitions ('becomes active') are invisible to the user unless we describe the visual feedback (e.g., 'Status turns green').",
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
      rationale: "Navigation steps (e.g., 'Go to Settings') are only useful if they start from a known location. Providing the full path prevents user confusion.",
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
      rationale: "High-risk operations like deployment or database migration must include a rollback plan. This ensures the user is prepared for worst-case scenarios.",
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
      rationale: "Selection criteria ('choose the records') must be clear. Specifying the method (e.g., checkboxes) keeps the instructions concrete and actionable.",
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
      rationale: "Ambiguous prerequisites ('may need VPN') cause setup delays. Clarifying the exact condition helps users prepare their environment in advance.",
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
        rationale: "Every action should have a clear success outcome. This confirms to the user that the step was successful and they can safely move to the next one.",
      };
    }
    return null;
  },

  // ── 42. System performs background action — should user wait? ─────────────────
  // "System validates configuration", "Service initializes", "Platform loads data"
  // User needs to know: (a) should they wait, (b) is there an indicator,
  // (c) what specifically is being acted on.
  (line) => {
    if (!/^(system|service|application|platform|runtime)\s+(validates?|processes?|checks?|verifies?|initializes?|loads?|starts?|deploys?|configures?|scans?)\b/i.test(line)) {
      return null;
    }
    if (/\b(wait|while|until|progress|indicator|status|automatically)\b/i.test(line)) {
      return null;
    }
    const actionWord = line.match(/validates?|processes?|checks?|verifies?|initializes?|loads?|starts?|deploys?|configures?|scans?/i)?.[0] ?? "processes";
    return {
      id: `system-background:${line.slice(0, 50)}`,
      question: `For the step "${line}": (a) Should the user wait while this happens, or does it occur automatically in the background? (b) Is there a visible progress indicator or status message? (c) What specifically is being ${actionWord} — what is the object (e.g., "connector configuration", "device settings")?`,
      sourceContext: line,
      placeholder: "e.g., (a) user waits  (b) no indicator  (c) connector configuration",
      rationale: "Background system actions can be confusing if the user doesn't know whether to wait. Specifying the object and wait time provides needed clarity.",
    };
  },

  // ── 41. Vague search/find with no identification criteria ─────────────────────
  // "Find the one you need.", "Locate the record.", "Search for the item." —
  // the user cannot identify the correct item without knowing the lookup
  // criteria (name, type, status, id). This blocks action.
  (line) => {
    if (!/^(find|locate|search\s+for|look\s+for|identify|select)\s+/i.test(line)) {
      return null;
    }
    // Skip if identification criteria are already stated
    if (/\b(named|called|with\s+the\s+name|where|that\s+(has|contains|matches)|by\s+(name|id|type|status))\b/i.test(line)) {
      return null;
    }
    return {
      id: `find-no-criteria:${line.slice(0, 50)}`,
      question: `How does the user identify the correct item? What should they look for? (Source: "${line}")`,
      sourceContext: line,
      placeholder: "e.g., find it by name in the list; or look for the one with status 'Active'",
      rationale: "Search/find instructions are bridge steps. Users need to know exactly which property (ID, Name, Date) identifies the 'correct' item to proceed.",
    };
  },
];

const SECTION_CUES: Record<string, RegExp[]> = {
  "prerequisites": [/\b(prerequisite|requirement|before\s+you\s+start|access|credentials|software|tools|vpn|connection|environment|account)\b/i],
  "procedure": [/\b(procedure|steps?|action|how-to|guide|process|instruction|click|select|enter|open|run|deploy|execute)\b/i],
  "result": [/\b(result|outcome|success|after|confirmation|expected|verified|now\s+you\s+can|output)\b/i],
  "key characteristics": [/\b(characteristic|feature|capability|property|attribute|benefit|key|main|core)\b/i],
  "how it works": [/\b(architecture|how\s+it\s+works|mechanism|principle|workflow|under-the-hood|process|logic|flow|internal)\b/i],
  "use cases": [/\b(use[ -]?case|scenario|example|application|when\s+to\s+use|context|usage)\b/i],
  "comparison with related concepts": [/\b(comparison|vs\.?|versus|alternative|difference|similar|related|unlike|instead\s+of)\b/i],
  "example": [/\b(example|sample|demo|walkthrough|illustration|case\s+study|scenario)\b/i],
  "troubleshooting topic": [/\b(troubleshoot|fault|error|issue|problem|broken|fix|crash|failure|diagnostic)\b/i],
  "diagnostic steps": [/\b(diagnostic|debug|identify|locate|isolate|verify|check|logs|symptoms|cause)\b/i],
  "common problems and solutions": [/\b(common|solution|fix|resolution|workaround|remedy|corrective|problem)\b/i],
  "advanced diagnostics": [/\b(advanced|deep\s+dive|internal|complex|logs|stack\s+trace|technical|debug|expert|support)\b/i],
  "reference component": [/\b(component|feature|service|module|tool|system|area|scope|reference)\b/i],
  "configuration parameters": [/\b(parameter|setting|config|option|flag|field|value|timeout|port|host|address)\b/i],
  "command-line options": [/\b(command|cli|option|flag|argument|syntax|usage|switch|args)\b/i],
  "api endpoints": [/\b(endpoint|uri|url|path|route|method|get|post|put|delete|request|response|header|body)\b/i],
  "configuration file structure": [/\b(yaml|json|xml|config|yml|structure|schema|file|format|example|location)\b/i],
  "environment variables": [/\b(environment|variable|env|export|path|key|secret|token|val)\b/i],
  "exit codes": [/\b(exit|return|code|status|error|success|0|1|failure|meaning)\b/i],
  "what you will learn": [/\b(learn|goal|objective|outcome|knowledge|skill|purpose|after\s+this|tutorial)\b/i],
  "overview": [/\b(overview|summary|introduction|abstract|description|about|context|goal)\b/i],
  "steps": [/\b(step|task|process|action|interactive|guide|tutorial|milestone)\b/i],
  "testing your implementation": [/\b(test|verify|validate|confirm|run|check|output|expected|outcome)\b/i],
  "summary": [/\b(summary|conclusion|recap|wrap-up|final|closing|learned|accomplished)\b/i],
  "next steps": [/\b(next|follow-up|advanced|further|related|continue|additional|read\s+more)\b/i],
  "troubleshooting": [/\b(troubleshoot|error|fix|help|common|issue|problem|broken)\b/i],
  "new features": [/\b(new|added|introduced|feature|capability|functionality|addition|enhancement)\b/i],
  "improvements": [/\b(improvement|enhanced|updated|optimized|better|faster|fix|stability|performance)\b/i],
  "bug fixes": [/\b(fix|resolve|correct|address|patch|bug|issue|defect|fault|crash)\b/i],
  "breaking changes": [/\b(breaking|incompatible|migration|change|removed|deprecated|impact|warning|caution)\b/i],
  "deprecated features": [/\b(deprecated|removal|legacy|old|obsolete|replaced|alternative)\b/i],
  "security updates": [/\b(security|cve|vulnerability|vulnerable|patch|risk|exploit|threat|fix|advisor)\b/i],
  "known issues": [/\b(known|limitation|unresolved|pending|open|bug|issue|workaround|constraint)\b/i],
  "upgrade instructions": [/\b(upgrade|migration|update|install|backup|restore|steps|version)\b/i],
  "system requirements": [/\b(requirement|compatibility|os|memory|ram|disk|dependency|system|hardware|software|version)\b/i],
  "download": [/\b(download|install|package|bundle|installer|link|url|repo|source)\b/i],
  "contributors": [/\b(contributor|author|thanks|acknowledgement|team|developer|maintainer|github)\b/i],
  "endpoint / function": [/\b(endpoint|function|method|api|call|operation|handler|route)\b/i],
  "service details": [/\b(service|application|app|base\s+url|provider|backend|host|environment)\b/i],
  "request parameters": [/\b(request|parameter|param|body|header|query|input|field|mandatory|optional)\b/i],
  "sample request": [/\b(sample|example|request|json|http|curl|body)\b/i],
  "response parameters": [/\b(response|parameter|param|body|header|output|field|status|type)\b/i],
  "sample response": [/\b(sample|example|response|json|http|body|outcome)\b/i],
  "related topics": [/\b(related|links|topics|read\s+more|see\s+also|further|additional|resources)\b/i]
};

// ---------------------------------------------------------------------------
// Procedure model (lightweight structural extraction)
// ---------------------------------------------------------------------------

interface ProcedureStep {
  action: string;  // lowercase first verb
  object: string;  // rest of the phrase (noun/object)
  raw: string;     // original trimmed text
}

interface ProcedureModel {
  title: string | undefined;
  steps: ProcedureStep[];
}

const INPUT_VERBS        = new Set(["enter", "provide", "supply", "upload", "specify", "type", "input", "set", "configure", "add", "map"]);
const ACTIVATION_VERBS  = new Set(["enable", "start", "deploy", "activate", "run", "launch", "apply", "create"]);
export const VERIFICATION_VERBS = new Set(["check", "verify", "confirm", "validate", "monitor", "test"]);

function buildProcedureModel(source: string): ProcedureModel {
  const lines = source.split(/\r?\n/);
  let title: string | undefined;
  const steps: ProcedureStep[] = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!title && /^#+\s+/.test(trimmed)) {
      title = trimmed.replace(/^#+\s+/, "").trim();
      continue;
    }
    const stripped = trimmed.replace(/^(\d+[.)]\s+|[-*+\u2022]\s+)/, "").trim();
    if (!stripped || stripped === trimmed) { continue; }
    const tokens = stripped.split(/\s+/);
    if (tokens.length === 0) { continue; }
    steps.push({
      action: tokens[0].toLowerCase().replace(/\.$/, ""),
      object: tokens.slice(1).join(" ").replace(/\.$/, "").trim(),
      raw: stripped,
    });
  }
  return { title, steps };
}

// ---------------------------------------------------------------------------
// Intent inference — maps question IDs to semantic intent categories
// ---------------------------------------------------------------------------

function inferIntent(id: string): QuestionIntent {
  if (id.startsWith("macro-gap:")) { return "major-gap"; }
  if (/^(ui-location:|user-subject-no-location:|partial-nav-path:|unspec-nav-dest:|conditional-action-where:|proc-global-location)/.test(id)) { return "location"; }
  if (/^(auth-detail:|prereq:|proc-no-prerequisites)/.test(id)) { return "input"; }
  if (/^(verify-method:|condition-pass:|wait-no-indicator:|state-transition:|success-outcome:|proc-no-success-indicator|success-count:)/.test(id)) { return "success"; }
  if (/^(proc-no-env-context|version-unspecified:)/.test(id)) { return "environment"; }
  if (/^(passive-no-actor:|system-background:)/.test(id)) { return "actor"; }
  if (/^(set-no-value:|no-unit:|unknown-default:|placeholder:)/.test(id)) { return "value"; }
  if (/^(error-recovery:|check-logs:|no-rollback:)/.test(id)) { return "error"; }
  if (/^(no-schedule:|restart-wait:)/.test(id)) { return "timing"; }
  if (/^(data-format:)/.test(id)) { return "format"; }
  if (/^(scope-selection-method:)/.test(id)) { return "scope"; }
  return "other";
}

// ---------------------------------------------------------------------------
// Procedure-specific completeness checks (run only for procedure task type)
// ---------------------------------------------------------------------------

type ProcedureChecker = (source: string) => DetectedQuestion | null;

const procedureCompletenessCheckers: ProcedureChecker[] = [

  // PC-1. No environment or application context anywhere in the source.
  // If no UI/app mention exists, the user cannot know where to perform any step.
  // This fires once at the source level — not per step.
  (source) => {
    const hasEnvContext = /\b(application|app|interface|ui|page|panel|screen|window|portal|dashboard|console|editor|manager|connector|menu|tab|dialog|module|platform|runtime|service|tool|system)\b/i.test(source);
    if (hasEnvContext) { return null; }
    return {
      id: `proc-no-env-context`,
      question: `In which application or interface does this procedure take place? Provide the application name and the starting page or section.`,
      sourceContext: "(whole source)",
      placeholder: "e.g., Industrial Edge Management UI > Connectors page; or MyApp > Settings > Integrations",
      rationale: "Without application context, a procedure is just a list of abstract verbs. Naming the app and starting page grounds the entire guide.",
    };
  },

  // PC-2. No prerequisite section and steps imply required concrete inputs.
  // Uses the procedure model to identify which specific steps require user-supplied
  // inputs, naming them in the question to make the ask more actionable.
  (source) => {
    const hasPrereqSection = /^\s*#{1,4}\s*(prerequisites?|before\s+you\s+start|requirements?)\b/im.test(source);
    if (hasPrereqSection) { return null; }
    const model = buildProcedureModel(source);
    const inputSteps = model.steps.filter(s => INPUT_VERBS.has(s.action) && s.object);
    if (inputSteps.length === 0) { return null; }
    const examples = inputSteps.slice(0, 3).map(s => `"${s.raw}"`).join(", ");
    return {
      id: `proc-no-prerequisites`,
      question: `Some steps require the user to supply or configure an input (e.g., ${examples}). What must the user have available before starting this procedure?`,
      sourceContext: "(whole source)",
      placeholder: "e.g., server address and port; valid credentials; configuration file in hand",
      rationale: "Missing prerequisites lead to mid-procedure failure. Identifying required inputs upfront ensures a smooth, non-stop experience for the user.",
    };
  },

  // PC-3. No clear success indicator at the end of the procedure.
  // Uses the procedure model: only fires when activation steps exist but no
  // verification steps and no outcome language appear anywhere in the source.
  (source) => {
    const model = buildProcedureModel(source);
    if (model.steps.length === 0) { return null; }
    // If any verification steps exist, the procedure already has a success check
    const hasVerification = model.steps.some(s => VERIFICATION_VERBS.has(s.action));
    if (hasVerification) { return null; }
    // If source already contains outcome/result language, no need to ask
    if (/\b(should\s+see|will\s+see|appears?|displays?|shows?|confirms?|completes?|succeeds?)\b/i.test(source)) { return null; }
    // Only ask if the procedure has activation steps (something to confirm works)
    const hasActivation = model.steps.some(s => ACTIVATION_VERBS.has(s.action));
    if (!hasActivation) { return null; }
    return {
      id: `proc-no-success-indicator`,
      question: `What does the user see or experience when the procedure completes successfully? What is the final outcome?`,
      sourceContext: "(whole source)",
      placeholder: "e.g., a green status indicator appears; a confirmation message is shown; the connector shows 'Running'",
      rationale: "A guide with no success indicator is like a map with no destination. Users need to know exactly what 'finished' looks like to be confident.",
    };
  },

  // PC-4. All numbered steps are very short (≤ 4 words) — likely shallow notes,
  // not fully described steps. This signals that the procedure needs elaboration.
  (source) => {
    const stepLines = source.split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => /^(\d+[.)]\s+|[-*+•]\s+)/.test(l))
      .map(l => l.replace(/^(\d+[.)]\s+|[-*+•]\s+)/, "").trim());
    if (stepLines.length < 3) { return null; }
    const shortSteps = stepLines.filter(l => l.split(/\s+/).length <= 4);
    if (shortSteps.length < stepLines.length) { return null; } // some steps are longer — not shallow
    return {
      id: `proc-shallow-steps`,
      question: `All steps in this procedure are very brief. For each step, can you provide more detail about what the user does and where? (e.g., which UI element to interact with and what input to provide)`,
      sourceContext: "(whole source)",
      placeholder: "e.g., 'Add connector' → In the Connectors list, click + Add and choose OPC UA from the dropdown",
      rationale: "Shallow, brief steps are often just 'notes to self'. Elaborating on each step ensures the final manual is professional and truly helpful.",
    };
  },
];

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
        rationale: "Items listed in an 'Open Questions' or 'TBD' section are explicit gaps identified by the author. They must be resolved before the guide can be considered complete.",
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
          rationale: "Prerequisites are the foundation of a successful procedure. Stating them upfront prevents users from failing mid-way due to missing components.",
        });
      }
    }
    return results;
  },
];

// ---------------------------------------------------------------------------
// Gap classifier constants
// ---------------------------------------------------------------------------

/**
 * Structural section names that are generated by the AI.
 * Any source line that matches one of these (after stripping trailing punctuation)
 * is silently skipped — the user is never asked to provide structural content.
 */
const STRUCTURAL_SECTIONS = new Set([
  "overview", "prerequisites", "prerequisite", "procedure", "result", "results",
  "notes", "note", "summary", "description", "steps", "objective", "verification",
  "symptoms", "causes", "resolution", "key components", "how it works",
  "important considerations", "new features", "improvements", "bug fixes",
  "breaking changes", "known issues", "endpoint / function", "examples",
  "error handling", "request / parameters", "response / return value",
  "related information", "parameters / options", "next steps", "example",
]);

/**
 * Returns true when a source line is soft-ambiguity language.
 * The AI rewrites these naturally — no user question is generated.
 */
function isSoftAmbiguityLine(line: string): boolean {
  return /\b(maybe|if needed|if necessary|as needed|if applicable|or something|or whatever|etc\.?|and\s+so\s+on|and\s+whatnot|optionally|depending\s+on|at\s+your\s+discretion|as\s+appropriate|if\s+required|when\s+needed|where\s+applicable|as\s+necessary)\b/i.test(line);
}

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

    // Skip structural section headings (AI generates these — user never provides them)
    const normalizedKey = normalized.toLowerCase().replace(/[:#\s]+$/, "").trim();
    if (STRUCTURAL_SECTIONS.has(normalizedKey)) { continue; }

    // Skip soft-ambiguity lines (AI rewrites hedging language without user input)
    if (isSoftAmbiguityLine(normalized)) { continue; }

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

  // ── Macro-Gap Detection (Missing Sections) ───────────────────────────────
  // Compare source content against the template's requiredSections.
  // If a required topic is completely missing (no header, no keywords), ask.
  const template = getTemplateFor(taskType);
  if (template) {
    for (const section of template.requiredSections) {
      // "Task title", "Concept name", etc. are usually the overall subject.
      // If userIntent exists, we assume the title is covered.
      if (/title|name/i.test(section) && (userIntent || lines[0]?.startsWith("#"))) {
        continue;
      }

      const cues = SECTION_CUES[section.toLowerCase()];
      if (!cues) { continue; } // No cues defined for this section yet

      // Check for section header or characteristic keywords
      const hasHeading = new RegExp(`^\\s*#{1,6}\\s*${section.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}`, "im").test(source);
      const hasKeywords = cues.some((cue: RegExp) => cue.test(source));

      if (!hasHeading && !hasKeywords) {
        addIfNew({
          id: `macro-gap:${section.toLowerCase().replace(/\s+/g, "-")}`,
          intent: "major-gap",
          question: `The template for "${template.title}" requires a section for "${section}". What information should be included here?`,
          sourceContext: "(whole source)",
          placeholder: `e.g., describe the ${section.toLowerCase()}...`,
          rationale: `Section-level validation ensures your document covers all required topics. A complete "${template.title}" usually includes ${section}.`,
        });
      }
    }
  }

  // Procedure-specific completeness checks and intent-based deduplication
  if (taskType === "procedure") {
    for (const pc of procedureCompletenessCheckers) {
      const q = pc(source);
      if (q) { addIfNew(q); }
    }

    // ── Apply intent tags to all gathered questions ────────────────────────
    // Done here (after all checks) so every question has an intent tag
    // before the collapse passes run.
    for (const q of results) {
      if (!q.intent) { q.intent = inferIntent(q.id); }
    }

    // ── Collapse location questions ────────────────────────────────────────
    // When no UI context exists anywhere in the source and 2+ questions with
    // location intent were generated, replace them with one global question.
    // Rationale: asking "where for each step?" creates question fatigue; one
    // broad "where does this procedure take place?" is more useful and still
    // collects the same information.
    const sourceHasAnyUiContext = hasUiLocation(source);
    if (!sourceHasAnyUiContext) {
      const locationIds = results
        .filter(q => q.intent === "location" && q.id !== "proc-global-location")
        .map(q => q.id);
      if (locationIds.length >= 2) {
        for (const id of locationIds) {
          const idx = results.findIndex(q => q.id === id);
          if (idx !== -1) { results.splice(idx, 1); seen.delete(id); }
        }
        addIfNew({
          id: `proc-global-location`,
          intent: "location",
          question: `This procedure contains no UI location information for any step. Where in the application does the user perform these steps? Provide the application name and the full navigation path to the starting point.`,
          sourceContext: "(whole source)",
          placeholder: "e.g., Industrial Edge Management UI > Connectors > OPC UA Connectors > Add Connector",
          rationale: "When multiple steps lack UI locations, it's more efficient to define the global context once. This ensures the AI doesn't hallucinate locations for each step.",
        });
      }
    }

    // ── Collapse success questions ─────────────────────────────────────────
    // When 3+ questions share the "success" intent they are all asking variants
    // of "what does a successful result look like?". Replace with one global
    // question that names the relevant source steps, so the author answers once.
    const successQuestions = results.filter(q => q.intent === "success");
    if (successQuestions.length >= 3) {
      const sourceCues = successQuestions
        .filter(q => q.sourceContext !== "(whole source)")
        .map(q => `"${q.sourceContext}"`)
        .slice(0, 4)
        .join(", ");
      for (const sq of successQuestions) {
        const idx = results.findIndex(q => q.id === sq.id);
        if (idx !== -1) { results.splice(idx, 1); seen.delete(sq.id); }
      }
      addIfNew({
        id: `proc-global-success`,
        intent: "success",
        question: `This procedure contains several verification or confirmation steps (${sourceCues || "see source"}) but none describe what a successful result looks like. For each, what should the user see, observe, or receive to know it succeeded?`,
        sourceContext: "(whole source)",
        placeholder: "e.g., status indicator turns green; 'Running' label appears; data values appear in the tag list",
        rationale: "When many verification steps are missing outcomes, we collapse them into one request. Describing the success state is vital for user confidence.",
      });
    }
  }

  // Structural sections (Overview, Prerequisites, Procedure, Result, Notes, etc.) are
  // AI-generated and must never be requested from the user. The template-required
  // sections check that used to live here has been removed.

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
        rationale: "This safety check ensures you're working with the right file. If the keywords don't match your intent, the AI might generate irrelevant content.",
      });
    }
  }

  // Cap total questions to prevent question fatigue.
  // Priority order: explicit values/placeholders, then location/input facts, then success.
  const MAX_QUESTIONS = 3;
  if (results.length > MAX_QUESTIONS) {
    for (const q of results) {
      if (!q.intent) { q.intent = inferIntent(q.id); }
    }
    const priority = (q: DetectedQuestion): number => {
      switch (q.intent) {
        case "value":    return 0;
        case "input":    return 1;
        case "location": return 2;
        case "success":  return 3;
        case "error":    return 4;
        default:         return 5;
      }
    };
    results.sort((a, b) => priority(a) - priority(b));
    results.splice(MAX_QUESTIONS);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Multi-action answer splitter
// ---------------------------------------------------------------------------

const ACTION_VERBS = new Set([
  'add','build','click','close','configure','connect','create','delete','deploy',
  'disable','download','edit','enable','enter','export','import','install','launch',
  'load','manage','map','navigate','open','remove','restart','run','save','select',
  'set','start','stop','submit','toggle','type','update','upload','verify','view',
  'find','locate','choose',
]);

/**
 * Splits an answer string into discrete steps when it contains multiple
 * sequential actions joined by "and", commas, semicolons, or "then".
 *
 * "Open Connector page and select the connector, click on deploy"
 *   → ["Open Connector page", "select the connector", "click on deploy"]
 *
 * Single-action answers and path-notation answers (e.g. "Settings > Advanced")
 * are returned unchanged as a single-element array.
 */
function splitAnswerIntoSteps(answer: string): string[] {
  // Leave path-notation answers untouched (they contain > or =>)
  if (/[>]/.test(answer)) {
    return [answer];
  }

  const parts = answer
    .split(/,\s+(?=[a-z])|;\s*|\s+and\s+(?=[a-z])|\s+then\s+/i)
    .map(p => p.trim())
    .filter(Boolean);

  const validParts = parts.filter(p => {
    const firstWord = p.split(/\s+/)[0].toLowerCase().replace(/[.,]/, '');
    return ACTION_VERBS.has(firstWord);
  });

  // Only split if every part starts with a recognised action verb
  return validParts.length >= 2 ? validParts : [answer];
}

/**
 * Formats answered questions into the PRE-CLARIFICATIONS block injected
 * into the AI prompt.
 *
 * Multi-action answers are automatically expanded into numbered sub-steps
 * so the AI sees them as distinct steps, not a single collapsed unit.
 *
 * Example input answer:  "Open Connector page and select the connector, click on deploy"
 * Example output block:
 *   [Q1] ...
 *   [A1] This answer contains multiple sequential actions — treat each as a separate
 *        numbered step in the procedure:
 *     Step 1: Open Connector page
 *     Step 2: select the connector
 *     Step 3: click on deploy
 */
export function formatPreClarifications(
  questions: DetectedQuestion[],
  answers: string[]
): string {
  return questions
    .map((q, i) => {
      const raw = answers[i]?.trim() || "(no answer provided)";
      const steps = splitAnswerIntoSteps(raw);

      let answerBlock: string;
      if (steps.length > 1) {
        const numbered = steps.map((s, j) => `    Step ${j + 1}: ${s}`).join("\n");
        answerBlock =
          `[A${i + 1}] This answer contains multiple sequential actions — ` +
          `treat each as a separate numbered step in the procedure:\n${numbered}`;
      } else {
        answerBlock = `[A${i + 1}] ${raw}`;
      }

      return (
        `[Q${i + 1}] ${q.question}\n` +
        (q.sourceContext !== "(whole source)"
          ? `       Source line: "${q.sourceContext}"\n`
          : "") +
        answerBlock
      );
    })
    .join("\n\n");
}

