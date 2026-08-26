function formatRadicalOverline(s) {
  if (!s) return '';
  // Convert √ followed by digits to √ + digits with combining overline \u0305 on each digit
  return s.replace(/√\s*(\d+)/g, (match, digits) => {
    const withOverline = digits.split('').map(d => d + '\u0305').join('');
    return `√${withOverline}`;
  });
}

const tests = [
  "cos⁻¹(1/√3)",
  "cos⁻¹(2/3)",
  "cos⁻¹(1/3)",
  "cos⁻¹(√2/3)",
  "112.5 × √3 m",
  "x₁ = √7 sin 5t cm, x₂ = 2√7 sin(5t + π/3) cm",
  "10√2 N"
];

console.log("=== RADICAL OVERLINE FORMATTING TEST ===");
tests.forEach(t => {
  console.log(`${t}  ===>  ${formatRadicalOverline(t)}`);
});
