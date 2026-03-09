/**
 * Test: Invention Analyzer on Import Tags Example
 */

import { analyzeInvention } from "./inventionAnalyzer";

const SOURCE = `Import tags online

When connected to PLC you can browse tags and import them directly.
Loading might take time depending on project size.

Need online connection to PLC.

Steps:
Open Tags tab.
Right click icon next to PLC.
Click import.
Choose tags.

After that tags appear.

Then deploy connection and selected tags to IIH Semantics.
See deploy section for more info.`;

const OUTPUT = `# Import Tags Online Procedure

## Overview
Import tags directly from a connected PLC by browsing and selecting the tags you want to use in your project.

## Prerequisites
A valid online connection to the PLC is established.

## Procedure
1. Open the Tags tab in the interface.
2. Locate the icon next to the PLC name and right-click it.
3. Click Import from the context menu.
4. Browse the available tags from the PLC and choose the ones you want to import.
5. Wait for the tags to load. This may take time depending on the size of your project.
6. Once loaded, the selected tags appear in your project.
7. Deploy the connection and selected tags to IIH Semantics (see the deploy section for details).

## Notes
- Loading time depends on the project size.
- An online connection to the PLC is required throughout the import process.

## Result
The selected tags from the PLC are imported into your project and ready to be deployed to IIH Semantics.`;

// Run analysis
const report = analyzeInvention(SOURCE, OUTPUT);

// Display results
console.log("\n📊 INVENTION ANALYSIS REPORT\n");
console.log(`Total Mappings: ${report.stats.total}`);
console.log(`Expansion Ratio: ${report.expansionRatio}%`);
console.log(`Summary: ${report.summary}\n`);

console.log("Statistics:");
console.log(`  ✅ Preserved:    ${report.stats.preserved}`);
console.log(`  🟡 Clarified:    ${report.stats.clarified}`);
console.log(`  🟠 Inferred:     ${report.stats.inferred}`);
console.log(`  ⚠️  Strengthened: ${report.stats.strengthened}`);
console.log(`  🔴 Invented:     ${report.stats.invented}\n`);

console.log("Detailed Mappings:\n");

report.mappings.forEach((mapping, idx) => {
  const icon =
    {
      PRESERVED: "✅",
      CLARIFIED: "🟡",
      INFERRED: "🟠",
      STRENGTHENED: "⚠️ ",
      INVENTED: "🔴",
    }[mapping.classification] || "❓";

  console.log(`${idx + 1}. ${icon} ${mapping.classification} (${mapping.category})`);
  console.log(`   Source:  "${mapping.sourcePhrase}"`);
  console.log(`   Output:  "${mapping.outputPhrase}"`);
  console.log(`   Reason:  ${mapping.reason}`);
  console.log(`   Severity: ${mapping.severity}\n`);
});

console.log("\n🎯 KEY FINDINGS:\n");
console.log(
  "High-Severity Inventions (require stricter governance):\n"
);

const highSeverity = report.mappings.filter((m) => m.severity === "high");
highSeverity.forEach((m) => {
  console.log(`  🔴 [${m.classification}] "${m.sourcePhrase}" → "${m.outputPhrase}"`);
  console.log(`     Reason: ${m.reason}\n`);
});
