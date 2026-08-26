const testText = [
  "cos⁻¹(1/√3)",
  "cos⁻¹(√2/3)",
  "112.5 × √3 m",
  "x₁ = √7 sin(5t) cm and x₂ = 2√7 sin(5t + π/3) cm",
  "10√2 N"
];

function applyTopBar(s) {
  // Replace √ followed by digit with √ + overline ‾ + digit
  return s.replace(/√\s*(\d+)/g, '√‾$1');
}

console.log("=== HIGH TOP BAR OVERLINE RADICAL TESTS ===");
testText.forEach(t => {
  console.log(`${t}  ===>  ${applyTopBar(t)}`);
});
