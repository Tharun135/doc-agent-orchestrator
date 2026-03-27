/**
 * Parses the "Known Gaps" (or "Preserved Ambiguities") section from an AI-generated
 * markdown document into a structured list of items.
 */

export interface PreservedAmbiguity {
  /** The bold label from the bullet, e.g. "Edit data source" */
  label: string;
  /** The full descriptive text that follows the label */
  description: string;
}

/**
 * Extracts preserved ambiguities from a markdown string.
 * Returns an empty array if the section is absent or empty.
 *
 * Supports both:
 *   - `- **label** — description`
 *   - `- **label**: description`
 *   - `- **label** description`
 */
export function parsePreservedAmbiguities(markdown: string): PreservedAmbiguity[] {
  // 1. Primary: Match the Known Gaps/Preserved Ambiguities section (any heading level)
  // We make it more flexible with trailing spaces and multiple newlines
  const sectionMatch = markdown.match(
    /^#{1,4}\s*(?:Known Gaps|Preserved Ambiguities|Gaps Identified|Detected Ambiguities)[^:\n]*\n+([\s\S]*?)(?=^#{1,4}\s|\Z|!!!)/im
  );

  let body = sectionMatch ? sectionMatch[1].trim() : "";

  // 2. Fallback: Check for Admonition blocks as backup
  if (!body) {
    const noteMatch = markdown.match(
      /!!!(?:note|info|warning|caution)\s*[^\n]*\n+([\s\S]*?)(?=^#{1,4}\s|\Z|!!!)/im
    );
    if (noteMatch && (noteMatch[0].toLowerCase().includes('gap') || noteMatch[0].toLowerCase().includes('ambiguity') || noteMatch[0].toLowerCase().includes('future') || noteMatch[0].toLowerCase().includes('incomplete'))) {
      body = noteMatch[0].replace(/^!!!\w+\n\s*/i, '').trim();
    }
  }

  if (!body) { return []; }

  const results: PreservedAmbiguity[] = [];

  // Match: - **Label**: Description OR - **Label** - Description OR - **Label** Description
  // We allow the colon to be inside OR outside the asterisks
  const bulletRe = /^[-*+]\s+(?:\*\*|__)?([^*_:]+)(?::(?:\*\*|__)?)?[\s:—–-]*([\s\S]*?)(?=\n[-*+]|\n\n|\Z)/gm;

  let match: RegExpExecArray | null;
  while ((match = bulletRe.exec(body)) !== null) {
    const label = match[1].trim();
    const desc  = match[2].trim().replace(/\n\s+/g, ' '); // unwrap multi-line bullets
    
    if (label.length > 2) {
      results.push({
        label: label,
        description: desc,
      });
    }
  }

  // Final Fallback: if we found a section but the bullets didn't match the regex,
  // just take every line that starts with a bullet.
  if (results.length === 0) {
    const lines = body.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
    lines.forEach(l => {
      const text = l.replace(/^[-*+]\s+/, '').trim();
      if (text.length > 5) {
        results.push({ label: text, description: "" });
      }
    });
  }

  return results;
}



/**
 * Formats a list of answered ambiguities into the structured clarifications
 * block that `generatePrompt` injects into the AI prompt.
 */
export function formatClarifications(
  ambiguities: PreservedAmbiguity[],
  answers: string[]
): string {
  return ambiguities
    .map((a, i) => {
      const answer = answers[i]?.trim() || "(no answer provided)";
      return `[Q${i + 1}] "${a.label}"\n` +
        (a.description ? `       Context: ${a.description}\n` : "") +
        `[A${i + 1}] ${answer}`;
    })
    .join("\n\n");
}
