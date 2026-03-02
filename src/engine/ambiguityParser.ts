/**
 * Parses the "Preserved Ambiguities" section from an AI-generated markdown
 * document into a structured list of items.
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
  // Match the Preserved Ambiguities section (any heading level)
  const sectionMatch = markdown.match(
    /^#{1,4}\s*Preserved Ambiguities\s*\n([\s\S]*?)(?=^#{1,4}\s|\Z)/im
  );
  if (!sectionMatch) { return []; }

  const body = sectionMatch[1];
  const results: PreservedAmbiguity[] = [];

  // Primary: bullets with **bold label** followed by separator and description
  // Handles —, –, -, :, or just a space after the closing **
  const boldBulletRe = /^[-*]\s+\*\*([^*]+)\*\*[\s:—–-]*(.*)/gm;
  let match: RegExpExecArray | null;
  while ((match = boldBulletRe.exec(body)) !== null) {
    results.push({
      label: match[1].trim().replace(/["""'']/g, ""),
      description: match[2].trim(),
    });
  }

  // Fallback: plain bullets with no bold formatting
  if (results.length === 0) {
    const plainBulletRe = /^[-*]\s+(.+)/gm;
    while ((match = plainBulletRe.exec(body)) !== null) {
      const text = match[1].trim();
      results.push({ label: text, description: "" });
    }
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
