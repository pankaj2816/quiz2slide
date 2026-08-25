const text = `Hence, the answer is the option (4)
qE = mg
q [ σ / 2ε0 ] = mg
σ = 2ε0mg / q
σ = 2 × 8.85 × 10−12 × 100 × 10−6 × 10
10 × 10−6
σ = 17.7 × 10−10C/m2
σ = 1.77nC/m2
Q. 20
A monochromatic light is incident on a metallic plate having work function ϕ.`;

const qPat = /(?:^|\n)\s*(?:(?:Section\s+[A-Z0-9]+:?|Physics|Chemistry|Mathematics|Biology|Social\s+Science)\s*\n+)?\s*Q(?:uestion)?\.?\s*(\d+)\b/gi;
const matches = [...text.matchAll(qPat)];
console.log("Matches:", matches.map(m => m[1]));
