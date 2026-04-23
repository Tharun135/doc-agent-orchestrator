
/**
 * auditEngine.ts
 * 
 * Compares the AI output against the source text and user clarifications 
 * to detect potential "inventions" (hallucinations).
 * 
 * Logic:
 * 1. Extract all significant tokens (nouns, technical terms) from source + answers.
 * 2. Scan added lines in the AI output for tokens that don't belong to the source set.
 * 3. Flag lines containing high-risk novel terms for manual verification.
 */

const STOP_WORDS = new Set([
  'the', 'and', 'a', 'to', 'of', 'in', 'is', 'for', 'on', 'with', 'at', 'by', 'an', 'be', 'this', 'that', 'from', 'it', 'as', 'are', 'if', 'or', 'will', 'you', 'your', 'has', 'have', 'can', 'should',
  'then', 'next', 'after', 'before', 'once', 'when', 'where', 'how', 'why', 'what', 'which', 'who', 'whom', 'whose', 'wherever', 'whenever', 'however', 'nonetheless', 'therefore', 'consequently',
  'using', 'follows', 'following', 'below', 'above', 'shown', 'displayed', 'navigated', 'clicked', 'selected', 'entered', 'specified', 'defined',
  'guide', 'manual', 'article', 'documentation', 'document', 'docs', 'report', 'summary', 'overview',
  'diagnose', 'diagnostic', 'diagnostics', 'troubleshoot', 'troubleshooting',
  'follow', 'these', 'order', 'steps', 'step', 'process', 'procedure', 'workflow', 'task',
  'status', 'condition', 'state', 'result', 'outcome',
  'common', 'problems', 'solutions', 'problem', 'solution', 'causes', 'cause', 'issues', 'issue',
  'table', 'lists', 'list', 'provide', 'provides', 'additional', 'information', 'info', 'details', 'detail',
  'advanced', 'basic', 'standard', 'simple', 'general',
  'contact', 'support', 'officer', 'team', 'help', 'assist',
  'topics', 'related', 'see', 'refer', 'reference', 'link', 'urls', 'url',
  'known', 'gaps', 'unknown', 'tbd', 'todo', 'pending',
  'available', 'listed', 'completing', 'complete', 'completes', 'done', 'finished',
  'duration', 'depends', 'depending', 'size', 'mode', 'within', 'during', 'their', 'they', 'our', 'out',
  'detected', 'background', 'content', 'required', 'necessary', 'optional', 'placeholder', 'token',
  'provide', 'provides', 'providing', 'provided', 'displays', 'shown', 'shows',
  'appears', 'appearing', 'appear', 'failure', 'fail', 'fails', 'none', 'titles', 'title', 'referenced',
  'resolve', 'resolving', 'resolved', 'source', 'above',
  'performing', 'perform', 'performed', 'performs', 'remains', 'remain', 'remaining',
  'continues', 'continue', 'continuing', 'adjust', 'adjusting', 'adjusted', 'adjusts',
  'addressing', 'address', 'addressed', 'stopped', 'stop', 'stops', 'stopping',
  'responding', 'respond', 'responds', 'open', 'opens', 'opening', 'opened',
  'repairing', 'repair', 'repaired', 'repairs', 'contain', 'contains', 'containing',
  'viewing', 'view', 'views', 'viewed', 'access', 'accessing', 'accessed',
  'configure', 'configuring', 'configured', 'navigation', 'path', 'paths', 'setting', 'settings', 'link', 'links',
  'missing', 'unknown', 'undefined', 'unspecified', 'known', 'gaps', 'gap',
  'command', 'commands', 'file', 'files', 'recommended', 'recommend', 'recommendation',
  'within', 'during', 'strength', 'events', 'event',
  'initial', 'finally', 'last', 'does', 'doing', 'specify', 'specifies', 'specifying',
  'location', 'locations', 'target', 'targets', 'always', 'never',
  'topic', 'topics', 'include', 'includes', 'including', 'included',
  'summarises', 'summarise', 'summarizes', 'summarize', 'summary', 'changes', 'change', 'changed',
  'introduced', 'introduce', 'introduces', 'optimizations', 'optimization', 'fixes', 'fix', 'fixed',
  'library', 'libraries', 'updates', 'update', 'updated', 'improvement', 'improvements', 'improved', 'improve',
  'removed', 'remove', 'removes', 'customer', 'customers', 'administrator', 'admin', 'admins',
  'feature', 'features', 'deprecated', 'absent', 'cannot', 'without', 'described', 'describe', 'describes',
  'upgrade', 'upgrades', 'migration', 'migrations', 'scripts', 'script', 'named', 'name', 'names',
  'system', 'systems', 'requirements', 'requirement', 'mentioned', 'mention', 'mentions',
  'download', 'downloads', 'contributors', 'contributor', 'version', 'versions', 'release', 'releases',
  'requires', 'require', 'required', 'requires', 'necessary', 'optional', 'placeholder'
]);

export interface AuditWarning {
  lineIndex: number;
  lineText: string;
  novelTerms: string[];
  severity: 'high' | 'medium';
}

export function performAudit(sourceText: string, clarifications: string[], aiResponse: string): AuditWarning[] {
  const referenceText = (sourceText + ' ' + clarifications.join(' ')).toLowerCase();
  
  // Reference tokens (lowercased for broad matching)
  const getTokens = (text: string) => {
    return text
      .split(/[^a-zA-Z0-9]/)
      .map(t => t.trim())
      .filter(t => t.length > 3);
  };

  const getReferenceSet = (text: string) => {
    const tokens = getTokens(text).map(t => t.toLowerCase());
    return new Set(tokens);
  };

  const referenceTokens = getReferenceSet(referenceText);
  const aiLines = aiResponse.split('\n');
  const warnings: AuditWarning[] = [];

  for (let index = 0; index < aiLines.length; index++) {
    const line = aiLines[index];
    
    // Stop audit when hitting the Known Gaps section
    if (line.trim().toLowerCase().startsWith('## known gaps')) {
      break;
    }

    const lineTokens = getTokens(line);
    const novelTerms: string[] = [];

    lineTokens.forEach(token => {
      const lowerToken = token.toLowerCase();
      
      // If the word doesn't exist in our reference material (source + answers)
      if (!referenceTokens.has(lowerToken) && !STOP_WORDS.has(lowerToken)) {
        
        // ONLY flag if it's a "Technical/Structural" candidate:
        // 1. It starts with a Capital letter (likely UI Label, Page name, Feature name)
        // 2. OR it contains digits (like Port numbers, version strings, or IDs)
        // 3. OR it's a very short but non-English looking word (future proofing)
        
        const isCapitalized = /^[A-Z]/.test(token);
        const hasDigits = /\d/.test(token);

        if (isCapitalized || hasDigits) {
          novelTerms.push(token);
        }
      }
    });

    if (novelTerms.length > 0) {
      // Check if it's a high-risk line (contains action verbs)
      const isAction = /\b(click|select|open|enter|type|configure|navigate|run|test|verify|set)\b/i.test(line);
      
      warnings.push({
        lineIndex: index + 1,
        lineText: line,
        novelTerms: novelTerms,
        severity: isAction ? 'high' : 'medium'
      });
    }
  }

  return warnings;
}
