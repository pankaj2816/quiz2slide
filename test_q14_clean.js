function cleanQ14(s) {
  s = s.replace(/B₂\s*is\s*:\s*B₁/gi, 'B₂/B₁ is:')
       .replace(/B₂\s*x\s*'/gi, "'x'");
  return s;
}

const input = "Let B₁ be the magnitude of magnetic field at center of a circular coil of radius R carrying current I. Let B₂ be the magnitude of magnetic field at an axial distance 'x' from the center. For x : R = 3 : 4, B₂ is : B₁";
console.log("Q14 clean:", cleanQ14(input));
