// Test token merging guard
function shouldMerge(w1, w2) {
  if (w1.str.startsWith('Option') || w2.str.startsWith('Option')) return false;
  if (w1.str.startsWith('Q.') || w2.str.startsWith('Q.')) return false;
  if (w1.str.startsWith('Correct') || w2.str.startsWith('Correct')) return false;
  if (w1.str.startsWith('Solution') || w2.str.startsWith('Solution')) return false;
  return Math.abs(w1.x - w2.x) <= 8.0 && Math.abs(w1.y - w2.y) >= 3.5;
}

console.log("Option 1 merge with cos-1:", shouldMerge({str: "Option 1:", x: 49.5, y: 187.9}, {str: "cos−1", x: 49.5, y: 201.3}));
console.log("Math fraction merge 'a' with 'V2':", shouldMerge({str: "a", x: 308.7, y: 626.6}, {str: "V2", x: 305.6, y: 636.2}));
