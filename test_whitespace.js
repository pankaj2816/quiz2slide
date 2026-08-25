function formatMathText(str) {
  if (!str) return '';
  let s = str;

  // Basic cleanup & punctuation
  s = s.replace(/\|/g, ' ')
       .replace(/\+-/g, '±')
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
       .replace(/x\s*-axis\b/gi, 'x-axis')
       .replace(/y\s*-axis\b/gi, 'y-axis')
       .replace(/z\s*-axis\b/gi, 'z-axis');

  // Scientific Powers of 10
  s = s.replace(/10\s*[−\-]\s*12\b/g, '10⁻¹²')
       .replace(/10\s*[−\-]\s*10\b/g, '10⁻¹⁰')
       .replace(/10\s*[−\-]\s*6\b/g, '10⁻⁶')
       .replace(/10\s*[−\-]\s*4\b/g, '10⁻⁴')
       .replace(/10\s*[−\-]\s*3\b/g, '10⁻³')
       .replace(/10\s*[−\-]\s*2\b/g, '10⁻²')
       .replace(/10\s*[−\-]\s*1\b/g, '10⁻¹')
       .replace(/10\s+11\b/g, '10¹¹')
       .replace(/10\s+5\b/g, '10⁵')
       .replace(/10\s+3\b/g, '10³')
       .replace(/10\s+2\b/g, '10²');

  // Standard Units with negative / positive exponents
  s = s.replace(/km\s*h\s*[−\-]?\s*1\b/gi, 'km h⁻¹')
       .replace(/ms\s*[−\-]\s*2\b|m\s*s\s*[−\-]\s*2\b/gi, 'ms⁻²')
       .replace(/m\s*\/\s*s\s*2\b/gi, 'm/s²')
       .replace(/Nm\s*[−\-]\s*2\b|N\s*m\s*[−\-]\s*2\b/gi, 'Nm⁻²')
       .replace(/kg\s*\/\s*m\s*3\b/gi, 'kg/m³')
       .replace(/kg\s*m\s*2\b/gi, 'kg m²')
       .replace(/cm\s*2\b/gi, 'cm²')
       .replace(/m\s*2\b/gi, 'm²')
       .replace(/m\s*3\b/gi, 'm³')
       .replace(/nC\s*\/\s*m\s*2\b/gi, 'nC/m²')
       .replace(/m\s+F\s*\/\s*m|m\s+F\b/gi, 'F/m');

  // Physics Variables with Subscripts
  s = s.replace(/\bx\s+1\b/gi, 'x₁')
       .replace(/\bx\s+2\b/gi, 'x₂')
       .replace(/\bv\s+1\b/gi, 'v₁')
       .replace(/\bv\s+2\b/gi, 'v₂')
       .replace(/\bB\s+1\b/gi, 'B₁')
       .replace(/\bB\s+2\b/gi, 'B₂')
       .replace(/\bI\s+L\b/g, 'I_L')
       .replace(/\bR\s+L\b/g, 'R_L')
       .replace(/\bV\s+L\b/g, 'V_L')
       .replace(/\bK\s+H\b/g, 'K_H')
       .replace(/\bγ\s*A\b/g, 'γ_A')
       .replace(/\bγ\s*B\b/g, 'γ_B')
       .replace(/\bHe\s*\+\s*ion|\bHe\s*\+/gi, 'He⁺')
       .replace(/\bLi\s*\+\+\s*ion|\bLi\s*\+\s*2\s*ion|\bLi\s*\+\+/gi, 'Li²⁺')
       .replace(/ab\s*[−\-]\s*2\b/g, 'ab⁻²')
       .replace(/C\s*4\s*H\s*9\s*Br\b/gi, 'C₄H₉Br')
       .replace(/NaNH\s*2\b/gi, 'NaNH₂')
       .replace(/\s*ϵ\s*[0₀]\b/gi, ' ϵ₀')
       .replace(/\s*μ\s*[0₀]\b/gi, ' μ₀')
       .replace(/\s*μ\s*r\b/gi, ' μᵣ')
       .replace(/\s*μ\s*t\b/gi, ' μₜ');

  // Dimensional Formulas (Slide 18)
  s = s.replace(/\[\s*ML\s*[0₀]?\s*T\s*[−\-]?\s*3\s*\]/gi, '[ML⁰ T⁻³]')
       .replace(/\[\s*ML\s*[−\-]?\s*2\s*T\s*[−\-]?\s*2\s*\]/gi, '[ML⁻² T⁻²]')
       .replace(/\[\s*M\s*[−\-]?\s*1\s*LT\s*2\s*\]/gi, '[M⁻¹ L T²]')
       .replace(/\[\s*ML\s*[−\-]?\s*1\s*T\s*[−\-]?\s*1\s*\]/gi, '[ML⁻¹ T⁻¹]');

  // Ordinals (Slide 30)
  s = s.replace(/\b1\s+st\b/gi, '1st')
       .replace(/\b2\s+nd\b/gi, '2nd')
       .replace(/\b3\s+rd\b/gi, '3rd')
       .replace(/\b4\s+th\b/gi, '4th')
       .replace(/\b6\s+th\b/gi, '6th')
       .replace(/\b8\s+th\b/gi, '8th');

  // Specific question ratio & formula cleaners
  s = s.replace(/B\s*B₁\s*2\s*is\s*:|B₂\s*is\s*:\s*B₁\b|B₂\s*:\s*B₁\b|B₂\s*,\s*B₁\s*is\s*:\b|For\s*x\s*:\s*R\s*=\s*3\s*:\s*4,\s*B₁\s*is\s*:/gi, "B₂/B₁ is:")
       .replace(/γ\s*γ\s*A\s*B\s*=\s*\(\s*1\s*\+\s*n\s*1\s*\)/gi, 'γ_A / γ_B = (1 + 1/n)')
       .replace(/γ\s*A\s*\/\s*γ\s*B\s*=\s*\(\s*1\s*\+\s*1\s*\/\s*n\s*\)/gi, 'γ_A / γ_B = (1 + 1/n)')
       .replace(/next\s*2\s*3\s*x\s*distance/gi, 'next (3/2)x distance')
       .replace(/is\s*50\s*7\s*m\/s/gi, 'is 50/7 m/s')
       .replace(/50\s*7\s*m\/s/gi, '50/7 m/s')
       .replace(/\(5\s*t\s*\+\s*π\s*3\s*\)/gi, '(5t + π/3)')
       .replace(/transverse strain for the wire are 0\.2 and\s+10\s*[−\-]\s*3/gi, 'transverse strain for the wire are 0.2 and 5 × 10⁻³')
       .replace(/elastic potential energy density of the wire is ____\s+×10\s*5/gi, 'elastic potential energy density of the wire is ____ × 10⁵')
       .replace(/slanted object\s+AB/gi, 'slanted object AB')
       .replace(/\+9\s+q\b/g, '+9q')
       .replace(/\+10\s*μ\s*C\b/gi, '+10 μC')
       .replace(/'\s*([αxσOMF])\s*'/gi, "'$1'");

  // Precision Whitespace Normalizer
  s = s.replace(/\s+([,.:;?!%°])/g, '$1')
       .replace(/([,;?!])(?=[^\s\d\)])/g, '$1 ')
       .replace(/\(\s+/g, '(')
       .replace(/\s+\)/g, ')')
       .replace(/[ \t]+/g, ' ')
       .trim();

  return s;
}

const samples = [
  "A light wave is propagating with plane wave fronts of the type    x   +   y   +   z   = constant. The",
  "The equation for real gas is given by    (P + a/V²) (V − b) = RT , where     P, V, T and R are",
  "the pressure, volume, temperature and gas constant, respectively. The dimension of   ab⁻² is",
  "A slanted object    AB is placed on one side of convex lens as shown in the diagram. The",
  "uniformly charged with a surface charge density    + σ   and   −2 σ . The force experienced by a",
  "Q6. A river is flowing from west to east direction with speed of   9 km h⁻¹ . If a boat capable of",
  "x₁   = √7 sin 5tcm and  x₂   = 2√7 sin   (5t + π/3) cm ... is    x × 10⁻²   ms⁻² . The value of x is :"
];

samples.forEach((sample, i) => {
  console.log(`\nSample ${i+1}:`);
  console.log("BEFORE:", repr(sample));
  console.log("AFTER :", repr(formatMathText(sample)));
});

function repr(str) {
  return JSON.stringify(str);
}
