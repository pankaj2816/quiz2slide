function cleanTest(s) {
  s = s.replace(/cos⁻¹\s*\(?\s*1\s*[\/\s]\s*√?\s*3[̅\u0305]?\s*\)?/gi, 'cos⁻¹(1/√3\u0305)')
       .replace(/cos⁻¹\s*\(?\s*√\s*2[̅\u0305]?\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(√2\u0305/3)')
       .replace(/cos⁻¹\s*\(?\s*2\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(2/3)')
       .replace(/cos⁻¹\s*\(?\s*1\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(1/3)');
  return s;
}

const rawD1 = "cos⁻¹ (√2̅ 3)";
const rawD2 = "cos⁻¹(√2/3)";
const rawA1 = "cos⁻¹ (1 √3̅)";
const rawA2 = "cos⁻¹(1/√3)";

console.log("D1:", cleanTest(rawD1));
console.log("D2:", cleanTest(rawD2));
console.log("A1:", cleanTest(rawA1));
console.log("A2:", cleanTest(rawA2));
