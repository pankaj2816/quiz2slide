function cleanOptionText(optRaw) {
  if (!optRaw) return '';
  let s = optRaw;

  // Clean extra spaces inside parentheses first
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

  // 1. Reconstruct trigonometric inverse fractions:
  // "cos⁻¹(1) / √3" -> "cos⁻¹(1/√3)"
  // "cos⁻¹(2) / 3" -> "cos⁻¹(2/3)"
  // "cos⁻¹(√2) / 3" -> "cos⁻¹(√2/3)"
  // "cos−1 ( 1 / √3 )" -> "cos⁻¹(1/√3)"
  s = s.replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*(\d+)\s*\)\s*(?:\/|\s+)\s*([^\s\)]+)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*√\s*(\d+)\s*\)\s*(?:\/|\s+)\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*√\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*√\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos\s*[-−]\s*1/gi, 'cos⁻¹')
       .replace(/sin\s*[-−]\s*1/gi, 'sin⁻¹')
       .replace(/tan\s*[-−]\s*1/gi, 'tan⁻¹');

  // 2. Susceptibility relations:
  s = s.replace(/μ\s*χ\s*=\s*μ\s*0\s*([−\-+]\s*1)/gi, 'χ = (μ/μ₀) $1')
       .replace(/μ\s*χ\s*=\s*r\s*\+\s*1\s*μ\s*0/gi, 'χ = (μᵣ/μ₀) + 1')
       .replace(/μ\s*χ\s*=\s*1\s*[-−]\s*μ\s*0/gi, 'χ = 1 − (μ/μ₀)')
       .replace(/χ\s*=\s*μ\s*t\s*\+\s*1/gi, 'χ = μₜ + 1')
       .replace(/(?:χ\s*=\s*)?μ\s*\n+\s*μ0\s*([−\-+]\s*1)/gi, 'χ = (μ/μ₀) $1')
       .replace(/(?:χ\s*=\s*)?μr\s*\n+\s*μ0\s*([−\-+]\s*1)/gi, 'χ = (μᵣ/μ₀) + 1')
       .replace(/(?:χ\s*=\s*)?1\s*([−\-+])\s*μ\s*\n+\s*μ0/gi, 'χ = 1 $1 (μ/μ₀)');

  // 3. Vertical fraction blocks (e.g. "3σq / 2ϵ0")
  let optLines = s.split('\n').map(l => l.trim()).filter(Boolean);
  if (optLines.length === 2 && optLines[0].length <= 15 && optLines[1].length <= 15 && !optLines[0].includes('=')) {
    s = `${optLines[0]} / ${optLines[1]}`;
  } else if (optLines.length > 1) {
    s = optLines.join(' ');
  }

  // 4. Quantum & Photoelectric formulas:
  s = s.replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '√[ $1m(hc/λ − ϕ) ] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '√[ m(hc/λ − ϕ) ] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '2√[ m(hc/λ − ϕ) ] / eB');

  // 5. Clean up symbols, coordinates, units
  s = s.replace(/\s*ϵ\s*0\b/gi, ' ϵ₀')
       .replace(/\s*μ\s*0\b/gi, ' μ₀')
       .replace(/\s*μ\s*r\b/gi, ' μᵣ')
       .replace(/\s*μ\s*t\b/gi, ' μₜ')
       .replace(/\(\s*(\d+)\s*d\s*\/\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, '($1d/$2, $3, $4)')
       .replace(/\(\s*d\s*\/\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, '(d/$1, $2, $3)')
       .replace(/rad\s*\/\s*s/g, 'rad/s')
       .replace(/nC\s*\/\s*m\s*2/g, 'nC/m²')
       .replace(/\s+/g, ' ')
       .trim();

  return s;
}

console.log("Q1 Opt1:", cleanOptionText("cos⁻¹ ( 1 ) / √3"));
console.log("Q1 Opt2:", cleanOptionText("cos⁻¹ ( 2 ) / 3"));
console.log("Q1 Opt3:", cleanOptionText("cos⁻¹ ( 1 ) / 3"));
console.log("Q1 Opt4:", cleanOptionText("cos⁻¹ ( √ 2 ) / 3"));
