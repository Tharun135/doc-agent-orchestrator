export { noNewInventions } from "./noNewInventions";
export { termSubstitution } from "./termSubstitution";
export { structureDrift } from "./structureDrift";
export { unsupportedSections } from "./unsupportedSections";

import { noNewInventions } from "./noNewInventions";
import { termSubstitution } from "./termSubstitution";
import { structureDrift } from "./structureDrift";
import { unsupportedSections } from "./unsupportedSections";
import { ValidationRule } from "../types";

/** The full default rule set — ordered by validation priority. */
export const DEFAULT_RULES: ValidationRule[] = [
  termSubstitution,     // Terminology lock  — highest priority
  noNewInventions,      // Invention detection
  unsupportedSections,  // Section-level grounding check
  structureDrift,       // Structural integrity
];
