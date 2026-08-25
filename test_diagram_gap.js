// Test diagram gap calculation
function testDiagramDetection(items) {
  // Find questions on page
  let qStemEnd = null;
  let optStart = null;
  
  for (let it of items) {
    if (it.str.includes("principal axis is")) {
      qStemEnd = it.y;
    }
    if (it.str.includes("Option 1") || it.str.includes("(A)")) {
      optStart = it.y;
      break;
    }
  }
  
  if (qStemEnd && optStart && (optStart - qStemEnd > 35)) {
    console.log(`Detected diagram gap between y=${qStemEnd.toFixed(1)} and y=${optStart.toFixed(1)} (gap=${(optStart - qStemEnd).toFixed(1)}px)`);
    return { top: qStemEnd, height: optStart - qStemEnd };
  }
  return null;
}

const mockPage3Items = [
  { str: "Q. 4 A slanted object AB is placed...", y: 100 },
  { str: "image with principal axis is :", y: 120 },
  // Diagram is in gap between y=120 and y=280
  { str: "Option 1:", y: 290 },
  { str: "− α / 2", y: 310 }
];

console.log("Result:", testDiagramDetection(mockPage3Items));
