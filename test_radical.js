const fs = require('fs');

const testCases = [
  "cos⁻¹(1/√3̅)",
  "cos⁻¹(2/3)",
  "cos⁻¹(1/3)",
  "cos⁻¹(√2̅/3)"
];

console.log("=== COMBINING OVERLINE RADICAL TEST ===");
testCases.forEach((tc, idx) => {
  console.log(`Option ${idx + 1}: ${tc}`);
});
