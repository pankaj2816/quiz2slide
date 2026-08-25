function cleanOptionText(s) {
  s = s.replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '√[ $1m(hc/λ − ϕ) ] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '√[ m(hc/λ − ϕ) ] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ/gi, '2√[ m(hc/λ − ϕ) ] / eB')
       .replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[ $1m(hc/λ − ϕ) ] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '2√[ m(hc/λ − ϕ) ] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[ m(hc/λ − ϕ) ] / eB');
  return s;
}

console.log("Opt 1:", cleanOptionText("√2 m ( hc λ −ϕ)/eB"));
console.log("Opt 2:", cleanOptionText("√m ( hc λ −ϕ)/eB"));
console.log("Opt 3:", cleanOptionText("√8 m ( hc λ −ϕ)/eB"));
console.log("Opt 4:", cleanOptionText("2√ m ( hc λ −ϕ)/eB"));
