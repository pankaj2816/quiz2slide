function reflowStemParagraphs(stemText) {
  if (!stemText) return '';
  const lines = stemText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return stemText;

  let result = [];
  let currentPara = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const isSpecialItem = /^(?:\([A-Da-d1-4I-Vixv]+\)|[1-4]\.|\•|Statement\s+[I|V|X\d]+|Assertion|Reason|List-[I|V\d]+|Column\s+[I|V\d]+|Choose\s+the\s+correct)/i.test(line);
    const prevEndsColon = /:\s*$/.test(currentPara);

    if (isSpecialItem || prevEndsColon) {
      result.push(currentPara);
      currentPara = line;
    } else {
      currentPara += " " + line;
    }
  }
  result.push(currentPara);
  return result.join('\n');
}

const stemQ2 = `The equation for real gas is given by (P + a/V²) (V − b) = RT, where P, V, T and R are
the pressure, volume, temperature and gas constant, respectively. The dimension of ab⁻² is
equivalent to that of:`;

const stemQ15 = `Considering Bohr's atomic model for hydrogen atom:
(A) the energy of H atom in ground state is same as energy of He⁺ in its first excited
state.
(B) the energy of H atom in ground state is same as that for Li²⁺ in its second excited
state.
(C) the energy of H atom in its ground state is same as that of He⁺ for its ground state.
(D) the energy of He⁺ in its first excited state is same as that for Li²⁺ in its ground
state
Choose the correct answer from the options given below:`;

const stemQ18 = `Match List-I with List-II.
List-I List-II
(A) Coefficient of viscosity (I) [ML⁰ T⁻³]
(B) Intensity of wave (II) [ML⁻² T⁻²]
(C) Pressure gradient (III) [M⁻¹ L T²]
(D) Compressibility (IV) [ML⁻¹ T⁻¹]
Choose the correct answer from the options given below:`;

console.log("=== REFLOWED Q2 ===");
console.log(reflowStemParagraphs(stemQ2));

console.log("\n=== REFLOWED Q15 ===");
console.log(reflowStemParagraphs(stemQ15));

console.log("\n=== REFLOWED Q18 ===");
console.log(reflowStemParagraphs(stemQ18));
