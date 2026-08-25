const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ', 'k': 'ᵏ', 'm': 'ᵐ', 't': 'ᵗ'
};

const SUBSCRIPT_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ', 'y': 'ᵧ'
};

function formatMathText(str) {
  if (!str) return '';
  let s = str;
  // Replace legacy/ASCII math notations with clean Unicode symbols
  s = s.replace(/\+-/g, '±')
       .replace(/<=/g, '≤')
       .replace(/>=/g, '≥')
       .replace(/!=/g, '≠')
       .replace(/-->|->/g, '→')
       .replace(/<--|<-/g, '←')
       .replace(/<->|<-->/g, '↔')
       .replace(/~=/g, '≈')
       .replace(/ ∘C|∘C| ∘ C/g, '°C')
       .replace(/ ∘F|∘F/g, '°F')
       .replace(/ ∘/g, '°')
       .replace(/\bdeg\b/g, '°')
       .replace(/\binfty\b/gi, '∞')
       .replace(/\bsqrt\b/gi, '√')
       .replace(/(\d+)\s*\*\s*10\^([-\d]+)/g, (m, c, exp) => `${c} × 10${exp.split('').map(ch => SUPERSCRIPT_MAP[ch] || ch).join('')}`)
       .replace(/\^([0-9nixy\+-]+)/g, (m, exp) => exp.split('').map(ch => SUPERSCRIPT_MAP[ch] || ch).join(''));
  return s;
}

console.log("Math text test:");
console.log("x^2 + y^2 = r^2 ->", formatMathText("x^2 + y^2 = r^2"));
console.log("3 * 10^8 m/s ->", formatMathText("3 * 10^8 m/s"));
console.log("a +- b <= c ->", formatMathText("a +- b <= c"));
console.log("CaCO3 -> CaO + CO2 ->", formatMathText("CaCO3 -> CaO + CO2"));
