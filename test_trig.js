function fixTrigFractions(s) {
  return s.replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*(\d+)\s*\)\s*\/\s*([^\s\)]+)/gi, 'cos⁻¹($1/$2)')
          .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*√\s*(\d+)\s*\)\s*\/\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)')
          .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
          .replace(/cos(?:⁻¹|\s*[-−]?\s*1)\s*\(\s*√\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)');
}

console.log(fixTrigFractions("cos⁻¹ (1) / √3"));
console.log(fixTrigFractions("cos⁻¹ (2) / 3"));
console.log(fixTrigFractions("cos⁻¹ (√ 2) / 3"));
console.log(fixTrigFractions("cos−1 ( 1 / √3 )"));
