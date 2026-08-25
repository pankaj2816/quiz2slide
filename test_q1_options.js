function cleanOptionText(s) {
  s = s.replace(/\|/g, ' ')
       .replace(/\s+/g, ' ')
       .replace(/cos\s*[-−]?\s*1/gi, 'cos⁻¹')
       .replace(/sin\s*[-−]?\s*1/gi, 'sin⁻¹')
       .replace(/tan\s*[-−]?\s*1/gi, 'tan⁻¹');

  // Fractions in cos-1:
  // e.g. "cos⁻¹ ( 1 ) √3" or "(√2 ) cos⁻¹ 3" or "cos⁻¹ ( 2 ) 3"
  s = s.replace(/(?:\(√\s*(\d+)\s*\)\s*cos⁻¹\s*(\d+)|cos⁻¹\s*\(?\s*√\s*(\d+)\s*\)?\s*(\d+))/gi, (m, g1, g2, g3, g4) => {
    const num = g1 || g3;
    const den = g2 || g4;
    return `cos⁻¹(√${num}/${den})`;
  });

  s = s.replace(/cos⁻¹\s*\(\s*(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos⁻¹\s*\(\s*√\s*(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)');

  return s.trim();
}

console.log("Opt 1:", cleanOptionText("cos−1 ( 1 )\n√3"));
console.log("Opt 2:", cleanOptionText("cos−1 ( 2 )\n3"));
console.log("Opt 3:", cleanOptionText("cos−1 ( 1 )\n3"));
console.log("Opt 4:", cleanOptionText("(√2 )\ncos−1\n3"));
