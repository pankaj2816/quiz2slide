function cleanMathOption(str) {
  if (!str) return '';
  let s = str;

  // Standardize spaces and lines
  s = s.replace(/\|/g, ' ')
       .replace(/[\r\n]+/g, '\n')
       .replace(/[ \t]+/g, ' ');

  // 1. Reconstruct trigonometric inverse fractions: cos-1 ( 1 / √3 ), etc.
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹($1 / $2)');
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*√\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1 / $2)');
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹($1 / $2)');
  s = s.replace(/cos\s*[-−]?\s*1\s*\(\s*√\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1 / $2)');
  s = s.replace(/cos\s*[-−]\s*1/gi, 'cos⁻¹');
  s = s.replace(/sin\s*[-−]\s*1/gi, 'sin⁻¹');
  s = s.replace(/tan\s*[-−]\s*1/gi, 'tan⁻¹');

  // 2. Reconstruct vertical fraction blocks
  // e.g. "σq\n4ϵ0" -> "σq / 4ϵ0", "3σq\n2ϵ0" -> "3σq / 2ϵ0"
  // e.g. "μ\nμ0 − 1" -> "μ/μ0 − 1"
  // e.g. "μr\nμ0 + 1" -> "μr/μ0 + 1"
  s = s.replace(/(?:χ\s*=\s*)?μ\s*\n+\s*μ0\s*([−\-+]\s*1)/gi, 'χ = μ/μ0 $1');
  s = s.replace(/(?:χ\s*=\s*)?μr\s*\n+\s*μ0\s*([−\-+]\s*1)/gi, 'χ = μr/μ0 $1');
  s = s.replace(/(?:χ\s*=\s*)?1\s*([−\-+])\s*μ\s*\n+\s*μ0/gi, 'χ = 1 $1 μ/μ0');

  let lines = s.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 2) {
    if (lines[0].length <= 15 && lines[1].length <= 15 && !lines[0].includes('=') && !lines[1].includes('=')) {
      s = `${lines[0]} / ${lines[1]}`;
    } else {
      s = lines.join(' ');
    }
  } else if (lines.length > 2) {
    s = lines.join(' ');
  }

  // 3. Reconstruct optical / quantum formulas: √ 2 m ( hc / λ − ϕ ) / eB
  s = s.replace(/√\s*(\d+)\s*m\s*\(\s*hc\s+([^\s\)]+)\s*[-−]\s*ϕ\s*\)\s*\/eB/gi, '√$1m (hc/$2 − ϕ) / eB');
  s = s.replace(/√\s*m\s*\(\s*hc\s+([^\s\)]+)\s*[-−]\s*ϕ\s*\)\s*\/eB/gi, '√m (hc/$1 − ϕ) / eB');
  s = s.replace(/2\s*√\s*m\s*\(\s*hc\s+([^\s\)]+)\s*[-−]\s*ϕ\s*\)\s*\/eB/gi, '2√m (hc/$1 − ϕ) / eB');

  // 4. Clean up stray spaces inside brackets and operators
  s = s.replace(/\s+/g, ' ')
       .replace(/\(\s+/g, '(')
       .replace(/\s+\)/g, ')')
       .replace(/\[\s+/g, '[')
       .replace(/\s+\]/g, ']')
       .replace(/([0-9a-zA-Z])\s*\/\s*([0-9a-zA-Z])/g, '$1 / $2')
       .replace(/,\s*/g, ', ')
       .replace(/;\s*/g, '; ')
       .replace(/\+-/g, '±')
       .replace(/<=/g, '≤')
       .replace(/>=/g, '≥')
       .replace(/!=/g, '≠')
       .replace(/-->|->/g, '→')
       .replace(/ ∘C|∘C| ∘ C/g, '°C')
       .replace(/ ∘/g, '°')
       .replace(/\bdeg\b/g, '°')
       .trim();

  // 5. Scientific notations & symbols
  s = s.replace(/ϵ0\b/g, 'ϵ₀')
       .replace(/μ0\b/g, 'μ₀')
       .replace(/μr\b/g, 'μᵣ')
       .replace(/μt\b/g, 'μₜ')
       .replace(/10\s*[-−]\s*(\d+)\b/g, '10⁻$1')
       .replace(/h[-−]1\b/g, 'h⁻¹')
       .replace(/ms[-−]2\b/g, 'ms⁻²')
       .replace(/m\/s2\b/g, 'm/s²')
       .replace(/cm2\b/g, 'cm²')
       .replace(/m2\b/g, 'm²');

  return s;
}

// Test cases
console.log("Q1 Opt1:", cleanMathOption("cos−1 (\n1\n√3\n)"));
console.log("Q1 Opt2:", cleanMathOption("cos−1 (\n2\n3\n)"));
console.log("Q1 Opt3:", cleanMathOption("cos−1 (\n1\n3\n)"));
console.log("Q1 Opt4:", cleanMathOption("cos−1 (√ 2\n3 )"));
console.log("Q4 Opt1:", cleanMathOption("− α\n2"));
console.log("Q5 Opt1:", cleanMathOption("σq\n4ϵ0"));
console.log("Q5 Opt2:", cleanMathOption("3σq\n2ϵ0"));
console.log("Q10 Opt1:", cleanMathOption("χ = \nμ\nμ0 − 1"));
console.log("Q10 Opt2:", cleanMathOption("χ = \nμr\nμ0 + 1"));
console.log("Q20 Opt1:", cleanMathOption("√2 m ( hc\nλ − ϕ)/eB"));
console.log("Q20 Opt3:", cleanMathOption("√8 m ( hc\nλ − ϕ)/eB"));
