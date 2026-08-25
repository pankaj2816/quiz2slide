function isMathToken(s) {
  if (!s || s.length > 7) return false;
  if (/^(?:state|gravity|density|length|mass|Given|bob|window|vessel|wire|Option|Hence|Solution|Correct)/i.test(s)) return false;
  if (/^\([A-D1-4]\)$/i.test(s)) return false;
  if (/^[A-Za-z]{4,}$/.test(s)) return false; // Full regular words
  return true;
}

console.log("a and V2:", isMathToken("a") && isMathToken("V2"));
console.log("1 and √3:", isMathToken("1") && isMathToken("√3"));
console.log("state. and (B):", isMathToken("state.") && isMathToken("(B)"));
console.log("gravity, and 0.885:", isMathToken("gravity,") && isMathToken("0.885"));
console.log("50 and 7:", isMathToken("50") && isMathToken("7"));
console.log("3 and 2:", isMathToken("3") && isMathToken("2"));
