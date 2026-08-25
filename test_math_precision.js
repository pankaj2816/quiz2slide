function cleanMathOption(str) {
  if (!str) return '';
  let s = str;

  // Standardize spaces and lines
  s = s.replace(/\|/g, ' ')
       .replace(/[\r\n]+/g, '\n')
       .replace(/[ \t]+/g, ' ');

  // 1. Reconstruct trigonometric inverse fractions: cos-1 ( 1 / √3 ), etc.
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*(\d+)\s*\)\s*\/\s*([^\s\)]+)/gi, 'cos⁻¹($1/$2)');
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*√\s*(\d+)\s*\)\s*\/\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)');
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)');
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*√\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)');
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)');
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*√\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)');
  s = s.replace(/cos\s*[-−]\s*1/gi, 'cos⁻¹');
  s = s.replace(/sin\s*[-−]\s*1/gi, 'sin⁻¹');
  s = s.replace(/tan\s*[-−]\s*1/gi, 'tan⁻¹');

  // 2. Reconstruct susceptibility relations: χ = μ/μ0 − 1
  s = s.replace(/μ\s*χ\s*=\s*μ\s*0\s*([−\-+]\s*1)/gi, 'χ = (μ/μ₀) $1');
  s = s.replace(/μ\s*χ\s*=\s*r\s*\+\s*1\s*μ\s*0/gi, 'χ = (μᵣ/μ₀) + 1');
  s = s.replace(/μ\s*χ\s*=\s*1\s*[-−]\s*μ\s*0/gi, 'χ = 1 − (μ/μ₀)');
  s = s.replace(/χ\s*=\s*μ\s*t\s*\+\s*1/gi, 'χ = μₜ + 1');
  s = s.replace(/(?:χ\s*=\s*)?μ\s*\n+\s*μ0\s*([−\-+]\s*1)/gi, 'χ = (μ/μ₀) $1');
  s = s.replace(/(?:χ\s*=\s*)?μr\s*\n+\s*μ0\s*([−\-+]\s*1)/gi, 'χ = (μᵣ/μ₀) + 1');
  s = s.replace(/(?:χ\s*=\s*)?1\s*([−\-+])\s*μ\s*\n+\s*μ0/gi, 'χ = 1 $1 (μ/μ₀)');

  // 3. Reconstruct vertical fraction blocks in options
  let optLines = s.split('\n').map(l => l.trim()).filter(Boolean);
  if (optLines.length === 2) {
    if (optLines[0].length <= 15 && optLines[1].length <= 15 && !optLines[0].includes('=') && !optLines[1].includes('=')) {
      s = `${optLines[0]} / ${optLines[1]}`;
    } else {
      s = optLines.join(' ');
    }
  } else if (optLines.length > 2) {
    s = optLines.join(' ');
  }

  // 4. Reconstruct optical / quantum formulas: √2 m ( hc / λ − ϕ ) / eB
  s = s.replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '√[ $1m(hc/λ − ϕ) ] / eB');
  s = s.replace(/√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '√[ m(hc/λ − ϕ) ] / eB');
  s = s.replace(/2\s*√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '2√[ m(hc/λ − ϕ) ] / eB');

  // 5. Clean up stray spaces inside brackets, units, coordinates
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

console.log("Q1 Opt1:", cleanMathOption("cos⁻¹ (1) / √3"));
console.log("Q1 Opt2:", cleanMathOption("cos⁻¹ (2) / 3"));
console.log("Q1 Opt4:", cleanMathOption("cos⁻¹ (√ 2) / 3"));
console.log("Q5 Opt1:", cleanMathOption("σq / 4 ϵ 0"));
console.log("Q5 Opt2:", cleanMathOption("3 σq / 2 ϵ 0"));
console.log("Q7 Opt1:", cleanMathOption("(4 d / 3, 0, 0)"));
console.log("Q10 Opt1:", cleanMathOption("μ χ = μ 0 − 1"));
console.log("Q10 Opt2:", cleanMathOption("μ χ = r + 1 μ 0"));
console.log("Q10 Opt4:", cleanMathOption("μ χ = 1 − μ 0"));
console.log("Q20 Opt1:", cleanMathOption("√ 2 m (hc − ϕ) /eB λ"));
console.log("Q20 Opt3:", cleanMathOption("√ 8 m (hc − ϕ) /eB λ"));
