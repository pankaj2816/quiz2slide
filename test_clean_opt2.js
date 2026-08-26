function cleanTest2(s) {
  s = s.replace(/cos⁻¹\s*\(?\s*1\s*[\/\s]\s*√\s*3[̅\u0305]?\s*\)?/gi, 'cos⁻¹(1/√3\u0305)')
       .replace(/cos⁻¹\s*\(?\s*√\s*2[̅\u0305]?\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(√2\u0305/3)')
       .replace(/cos⁻¹\s*\(?\s*2\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(2/3)')
       .replace(/cos⁻¹\s*\(?\s*1\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(1/3)');
  return s;
}

console.log("Opt A:", cleanTest2("cos⁻¹(1/√3)"));
console.log("Opt B:", cleanTest2("cos⁻¹(2/3)"));
console.log("Opt C:", cleanTest2("cos⁻¹(1/3)"));
console.log("Opt D:", cleanTest2("cos⁻¹(√2/3)"));
