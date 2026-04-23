
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
  'using', 'using', 'follows', 'following', 'below', 'above', 'shown', 'displayed', 'navigated', 'clicked', 'selected', 'entered', 'specified', 'defined'
]);

export interface AuditWarning {
  lineIndex: number;
  lineText: string;
  novelTerms: string[];
  severity: 'high' | 'medium';
}

export function performAudit(sourceText: string, clarifications: string[], aiResponse: string): AuditWarning[] {
  const referenceText = (sourceText + ' ' + clarifications.join(' ')).toLowerCase();
  
  // Extract technical tokens (words starting with capitals or CamelCase usually signify UI labels/terms, 
  // but since we lowercase for comparison, we just look for significant words)
  const getTokens = (text: string) => {
    return text
      .split(/[^a-zA-Z0-9]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 3 && !STOP_WORDS.has(t));
  };

  const referenceTokens = new Set(getTokens(referenceText));
  const aiLines = aiResponse.split('\n');
  const warnings: AuditWarning[] = [];

  aiLines.forEach((line, index) => {
    const lineTokens = getTokens(line);
    const novelTerms = lineTokens.filter(t => !referenceTokens.has(t));

    if (novelTerms.length > 0) {
      // Check if it's a high-risk line (contains action verbs + novel terms)
      const isAction = /\b(click|select|open|enter|type|configure|navigate|run|test|verify|set)\b/i.test(line);
      
      warnings.push({
        lineIndex: index + 1,
        lineText: line,
        novelTerms: novelTerms,
        severity: isAction ? 'high' : 'medium'
      });
    }
  });

  return warnings;
}
