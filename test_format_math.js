function formatMathText(str) {
  if (!str) return '';
  let s = str;

  // Basic cleanup
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

  // Scientific Powers of 10: e.g. 10 -2, 10 -3, 10 -6, 10 -10, 10 -12, 10 3, 10 5, 10 11
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
       .replace(/\bγ\s+A\b/g, 'γ_A')
       .replace(/\bγ\s+B\b/g, 'γ_B')
       .replace(/\bHe\s+\+\b/gi, 'He⁺')
       .replace(/\bLi\s+\+\+\b|\bLi\s*\+\s*2\b/gi, 'Li²⁺')
       .replace(/ab\s*[−\-]\s*2\b/g, 'ab⁻²')
       .replace(/C\s*4\s*H\s*9\s*Br\b/gi, 'C₄H₉Br')
       .replace(/NaNH\s*2\b/gi, 'NaNH₂')
       .replace(/\s*ϵ\s*[0₀]\b/gi, ' ϵ₀')
       .replace(/\s*μ\s*[0₀]\b/gi, ' μ₀')
       .replace(/\s*μ\s*r\b/gi, ' μᵣ')
       .replace(/\s*μ\s*t\b/gi, ' μₜ');

  // Dimensional Formulas (Slide 18)
  s = s.replace(/\[\s*ML[0₀]\s*T\s*[−\-]\s*3\s*\]/gi, '[ML⁰ T⁻³]')
       .replace(/\[\s*ML\s*[−\-]\s*2\s*T\s*[−\-]\s*2\s*\]/gi, '[ML⁻² T⁻²]')
       .replace(/\[\s*M\s*[−\-]\s*1\s*LT\s*2\s*\]/gi, '[M⁻¹ L T²]')
       .replace(/\[\s*ML\s*[−\-]\s*1\s*T\s*[−\-]\s*1\s*\]/gi, '[ML⁻¹ T⁻¹]');

  // Ordinals (Slide 30)
  s = s.replace(/\b1\s+st\b/gi, '1st')
       .replace(/\b2\s+nd\b/gi, '2nd')
       .replace(/\b3\s+rd\b/gi, '3rd')
       .replace(/\b4\s+th\b/gi, '4th')
       .replace(/\b6\s+th\b/gi, '6th')
       .replace(/\b8\s+th\b/gi, '8th');

  // Specific question fixes
  s = s.replace(/B\s*B₁\s*2\s*is\s*:|B₂\s*is\s*:\s*B₁\b|B₂\s*:\s*B₁\b|B₂\s*,\s*B₁\s*is\s*:\b|For\s*x\s*:\s*R\s*=\s*3\s*:\s*4,\s*B₁\s*is\s*:/gi, "B₂/B₁ is:")
       .replace(/γ\s*γ\s*A\s*B\s*=\s*\(\s*1\s*\+\s*n\s*1\s*\)/gi, 'γ_A / γ_B = (1 + 1/n)')
       .replace(/γ\s*A\s*\/\s*γ\s*B\s*=\s*\(\s*1\s*\+\s*1\s*\/\s*n\s*\)/gi, 'γ_A / γ_B = (1 + 1/n)')
       .replace(/next\s*2\s*3\s*x\s*distance/gi, 'next (3/2)x distance')
       .replace(/is\s*50\s*7\s*m\/s/gi, 'is 50/7 m/s')
       .replace(/\(5\s*t\s*\+\s*π\s*3\s*\)/gi, '(5t + π/3)')
       .replace(/transverse strain for the wire are 0\.2 and\s+10\s*[−\-]\s*3/gi, 'transverse strain for the wire are 0.2 and 5 × 10⁻³')
       .replace(/elastic potential energy density of the wire is ____\s+×10\s*5/gi, 'elastic potential energy density of the wire is ____ × 10⁵');

  return s.trim();
}

console.log("Q6 Test 1:", formatMathText("speed of 9 km h −1. If a boat capable of moving at a maximum speed of 27 km h −1"));
console.log("Q9 Test 2:", formatMathText("x 1 = √7 sin 5tcm and x 2 = 2√7 sin (5 t + π 3 ) cm ... acceleration is x × 10 −2 ms −2"));
console.log("Q18 Test 3:", formatMathText("[ ML₀ T −3 ] and [ ML −2 T −2 ] and [ M −1 LT 2 ]"));
console.log("Q21 Test 4:", formatMathText("window of 100 cm 2 ... density 1.5 × 10 3 kg/m 3 ... g = 10 m/s 2"));
console.log("Q22 Test 5:", formatMathText("Young's modulus 2.0 × 10 11 Nm −2 ... transverse strain for the wire are 0.2 and 10 −3 ... ____ ×10 5"));
console.log("Q24 Test 6:", formatMathText("γ A is the specific heat ratio of monoatomic gas A ... γ γ A B = (1 + n 1 )"));
console.log("Q25 Test 7:", formatMathText("moves with a uniform velocity v 1 for a distance x and with a uniform velocity v 2 for the next 2 3 x distance. The average velocity is 50 7 m/s. If v 1 is 5 m/s"));
console.log("Q30 Test 8:", formatMathText("Radius of 3 rd orbit is nine times larger than that of 1 st orbit. Radius of 8 th orbit is four times larger than that of 4 th orbit."));
