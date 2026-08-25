function cleanOptionText(s) {
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  s = s.replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*(\d+)\s*\)\s*(?:\/|\s+)\s*([^\s\)]+)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*√\s*(\d+)\s*\)\s*(?:\/|\s+)\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*√\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*√\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos\s*[-−]\s*1/gi, 'cos⁻¹')
       .replace(/sin\s*[-−]\s*1/gi, 'sin⁻¹')
       .replace(/tan\s*[-−]\s*1/gi, 'tan⁻¹');
  return s.trim();
}

console.log("Opt 1:", cleanOptionText("cos−1 ( 1\n√3 )"));
console.log("Opt 2:", cleanOptionText("cos−1 ( 2\n3 )"));
console.log("Opt 3:", cleanOptionText("cos−1 ( 1\n3 )"));
console.log("Opt 4:", cleanOptionText("cos−1 (√2\n3 )"));
