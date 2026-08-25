function cleanOptionText(s) {
  s = s.replace(/3\s*σq\s*\n*\s*2\s*ϵ0/g, '3σq / 2ϵ₀')
       .replace(/3\s*σq\s*\n*\s*4\s*ϵ0/g, '3σq / 4ϵ₀')
       .replace(/σq\s*\n*\s*4\s*ϵ0/g, 'σq / 4ϵ₀')
       .replace(/σq\s*\n*\s*2\s*ϵ0/g, 'σq / 2ϵ₀');
  return s.trim();
}

console.log("Q5 Opt 1:", cleanOptionText("σq\n4ϵ0"));
console.log("Q5 Opt 2:", cleanOptionText("3σq\n2ϵ0"));
console.log("Q5 Opt 3:", cleanOptionText("3σq\n4ϵ0"));
console.log("Q5 Opt 4:", cleanOptionText("σq\n2ϵ0"));
