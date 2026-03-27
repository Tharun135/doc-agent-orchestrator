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
  const sectionMatch = markdown.match(
    /^#{1,4}\s*(?:Known Gaps|Preserved Ambiguities)\s*\n([\s\S]*?)(?=^#{1,4}\s|\Z)/im
  );

  let body = sectionMatch ? sectionMatch[1] : "";

  // 2. Fallback: If no dedicated heading, look for Admonition blocks (like !!!note)
  // that contain keywords about "incomplete", "unspecified", "not documented", or "unknown"
  if (!body) {
    const noteMatch = markdown.match(
      /!!!(?:note|info|warning)\s*(?:[\s\S]*?)(?:incomplete|unspecified|unknown|future version|not specified|not documented)([\s\S]*?)(?=^#{1,4}\s|\Z|!!!)/im
    );
    if (noteMatch) {
      body = noteMatch[0].replace(/^!!!\w+\n\s*/i, '');
    }
  }

  if (!body) { return []; }

  const results: PreservedAmbiguity[] = [];

  // Primary: bullets with **bold label** followed by separator and description
  const boldBulletRe = /^[-*]\s+\*\*([^*]+)\*\*[\s:—–-]*(.*)/gm;
  let match: RegExpExecArray | null;
  while ((match = boldBulletRe.exec(body)) !== null) {
    results.push({
      label: match[1].trim().replace(/[""'']/g, ""),
      description: match[2].trim(),
    });
  }

  // Fallback: plain bullets or just lines with no bold formatting
  if (results.length === 0) {
    const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    lines.forEach(l => {
      const cleaned = l.replace(/^[-*]\s+/, '').trim();
      if (cleaned.length > 0) {
        results.push({ label: cleaned, description: "" });
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
