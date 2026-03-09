export { noNewInventions } from "./noNewInventions";
export { termSubstitution } from "./termSubstitution";
export { structureDrift } from "./structureDrift";
export { unsupportedSections } from "./unsupportedSections";
export { sourceGroundingRule } from "./sourceGrounding";

import { noNewInventions } from "./noNewInventions";
import { termSubstitution } from "./termSubstitution";
import { structureDrift } from "./structureDrift";
import { unsupportedSections } from "./unsupportedSections";
import { sourceGroundingRule } from "./sourceGrounding";
import { ValidationRule } from "../types";

/** The full default rule set — ordered by validation priority. */
export const DEFAULT_RULES: ValidationRule[] = [
  termSubstitution,     // Terminology lock  — highest priority
  noNewInventions,      // Invention detection
  unsupportedSections,  // Section-level grounding check
  structureDrift,       // Structural integrity
  sourceGroundingRule,  // Source traceability — catches invented workflow branches
];
