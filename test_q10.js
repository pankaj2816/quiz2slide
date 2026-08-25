function fixQ10Options(s) {
  return s.replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*μ₀\s*([−\-+]\s*1)/gi, 'χ = (μ/μ₀) $1')
          .replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*r\s*\+\s*1\s*μ₀/gi, 'χ = (μᵣ/μ₀) + 1')
          .replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*1\s*[-−]\s*μ₀/gi, 'χ = 1 − (μ/μ₀)');
}

console.log("Opt A:", fixQ10Options("μ / χ = μ₀ − 1"));
console.log("Opt B:", fixQ10Options("μ χ = r + 1 μ₀"));
console.log("Opt D:", fixQ10Options("μ / χ = 1 − μ₀"));
