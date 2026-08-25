function testQPattern() {
  const text = `Physics
Q. 1 A light wave is propagating...
Option 1: cos-1
Q. 2 The equation for real gas...
Option 1: Planck
Solution:
σ = 2 × 8.85 × 10-12
Q. 20 A monochromatic light...
`;
  const qPat = /(?:^|\n)\s*(?:(?:Section\s+[A-Z0-9]+:?|Physics|Chemistry|Mathematics|Biology|Social\s+Science)\s*\n+)?\s*Q(?:uestion)?\.?\s*(\d+)\b/gi;
  const matches = [...text.matchAll(qPat)];
  console.log("Matches:", matches.map(m => m[1]));
}

testQPattern();
