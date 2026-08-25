const fs = require('fs');

const text = fs.readFileSync('simulated_lines.txt', 'utf-8');

function cleanOptionText(optRaw) {
  if (!optRaw) return '';
  let s = optRaw;
  s = s.replace(/\|/g, ' ')
       .replace(/\s+/g, ' ')
       .replace(/cos\s*[-−]?\s*1/gi, 'cos⁻¹')
       .replace(/sin\s*[-−]?\s*1/gi, 'sin⁻¹')
       .replace(/tan\s*[-−]?\s*1/gi, 'tan⁻¹');

  // Inverse trig fractions
  s = s.replace(/(?:\(√\s*(\d+)\s*\)\s*cos⁻¹\s*(\d+)|cos⁻¹\s*\(?\s*√\s*(\d+)\s*\)?\s*(\d+))/gi, (m, g1, g2, g3, g4) => {
    const num = g1 || g3;
    const den = g2 || g4;
    return `cos⁻¹(√${num}/${den})`;
  });

  s = s.replace(/cos⁻¹\s*\(\s*(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos⁻¹\s*\(\s*√\s*(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)');

  // Susceptibility relations
  s = s.replace(/χ\s*=\s*μ\s*μ0\s*[-−]\s*1/gi, 'χ = (μ/μ₀) − 1')
       .replace(/χ\s*=\s*μr\s*μ0\s*\+\s*1/gi, 'χ = (μᵣ/μ₀) + 1')
       .replace(/χ\s*=\s*1\s*[-−]\s*μ\s*μ0/gi, 'χ = 1 − (μ/μ₀)');

  // Fractions
  s = s.replace(/−α\s*2/g, '−α/2')
       .replace(/3σq\s*2ϵ0/g, '3σq / 2ϵ₀')
       .replace(/3σq\s*4ϵ0/g, '3σq / 4ϵ₀')
       .replace(/σq\s*4ϵ0/g, 'σq / 4ϵ₀')
       .replace(/σq\s*2ϵ0/g, 'σq / 2ϵ₀');

  let lines = s.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 2 && lines[0].length <= 15 && lines[1].length <= 15 && !lines[0].includes('=')) {
    s = `${lines[0]} / ${lines[1]}`;
  } else if (lines.length > 1) {
    s = lines.join(' ');
  }

  s = s.replace(/nC\s*\/\s*m\s*2/g, 'nC/m²')
       .replace(/rad\s*\/\s*s/g, 'rad/s')
       .replace(/\(\s*(\d+)\s*d\s*\/\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, '($1d/$2, $3, $4)')
       .replace(/\(\s*d\s*\/\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, '(d/$1, $2, $3)')
       .trim();

  return s;
}

function parseUniversalQuestions(fullStream) {
  const qPat = /(?:^|\n)\s*(?:(?:Section\s+[A-Z0-9]+:?|Physics|Chemistry|Mathematics|Biology|Social\s+Science)\s*\n+)?\s*(?:Q\.?\s*|Question\s*)(\d+)\b/g;

  let matches = [];
  let m;
  while ((m = qPat.exec(fullStream)) !== null) {
    matches.push(m);
  }

  let questions = [];
  let currentSection = 'Physics';

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const qNumStr = match[1] || (i + 1);
    const qNum = parseInt(qNumStr, 10);

    const preChunk = fullStream.slice(Math.max(0, match.index - 120), match.index);
    const secMatch = (match[0] + " " + preChunk).match(/\b(Physics|Chemistry|Mathematics|Biology|Social\s+Science|Section\s+[A-Z0-9]+:?[^\n]*)\b/i);
    if (secMatch) {
      currentSection = secMatch[1].trim();
    }

    const startIdx = match.index + match[0].length;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : fullStream.length;
    let rawChunk = fullStream.slice(startIdx, endIdx).trim();

    if (rawChunk.length < 15) continue;

    const solMatch = rawChunk.match(/\n\s*(?:Correct\s+Answer:|Solution:|Ans(?:wer)?:)/i);
    let qaChunk = rawChunk;
    let solChunk = "";
    if (solMatch) {
      qaChunk = rawChunk.slice(0, solMatch.index).trim();
      solChunk = rawChunk.slice(solMatch.index).trim();
    }

    const optPat = /(?:^|\n)\s*(?:Option\s*([1-4A-Da-d])\s*:|\(\s*([A-Da-d1-4])\s*\)|([A-Da-d])[\.\)])\s*/gi;
    let optMatches = [];
    let om;
    while ((om = optPat.exec(qaChunk)) !== null) {
      optMatches.push(om);
    }

    let stem = qaChunk;
    let optA = '', optB = '', optC = '', optD = '';

    if (optMatches.length >= 4) {
      const mA = optMatches[optMatches.length - 4];
      const mB = optMatches[optMatches.length - 3];
      const mC = optMatches[optMatches.length - 2];
      const mD = optMatches[optMatches.length - 1];

      stem = qaChunk.slice(0, mA.index).trim();
      optA = cleanOptionText(qaChunk.slice(mA.index + mA[0].length, mB.index));
      optB = cleanOptionText(qaChunk.slice(mB.index + mB[0].length, mC.index));
      optC = cleanOptionText(qaChunk.slice(mC.index + mC[0].length, mD.index));
      optD = cleanOptionText(qaChunk.slice(mD.index + mD[0].length));
    }

    // Clean Equation 2 formatting if present
    stem = stem.replace(/\(P\s*\+\s*a\s*\)\s*\(V\s*[−\-]\s*b\s*\)\s*=\s*RT\s*,\s*where\s*P,\s*V,\s*T\s*and\s*R\s*are\s*\n\s*V2\s*\n\s*ab[−\-]2\s*\n\s*the\s*pressure/gi,
      '(P + a/V²)(V − b) = RT, where P, V, T and R are the pressure, volume, temperature and gas constant, respectively. The dimension of ab⁻² is');

    questions.push({
      q_num: qNum,
      section: currentSection,
      question: stem,
      options: { A: optA, B: optB, C: optC, D: optD },
      solution: solChunk
    });
  }

  return questions;
}

const qs = parseUniversalQuestions(text);
console.log(`Parsed ${qs.length} questions.`);
qs.forEach((q, i) => {
  console.log(`\nQ${i+1} [${q.section} Q${q.q_num}]: ${q.question.replace(/\n/g, ' ').slice(0, 80)}`);
  console.log(`  (A) ${q.options.A}`);
  console.log(`  (B) ${q.options.B}`);
  console.log(`  (C) ${q.options.C}`);
  console.log(`  (D) ${q.options.D}`);
});
