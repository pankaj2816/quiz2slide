function cleanOptionText(s) {
  s = s.replace(/−α\s*\n*\s*2/g, '−α/2')
       .replace(/−\s*α\s*\/\s*2/g, '−α/2')
       .replace(/−\s*45\s*∘/g, '−45°')
       .replace(/\+\s*45\s*∘/g, '+45°')
       .replace(/−\s*α/g, '−α');
  return s.trim();
}

console.log("Q4 Opt 1:", cleanOptionText("−α\n2"));
console.log("Q4 Opt 2:", cleanOptionText("−45∘"));
console.log("Q4 Opt 3:", cleanOptionText("+45∘"));
console.log("Q4 Opt 4:", cleanOptionText("−α"));
