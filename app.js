// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Unicode Math & Superscript / Subscript Maps
const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ'
};

const SUBSCRIPT_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'r': 'ᵣ', 't': 'ₜ', 'L': 'ₗ', '0': '₀', 'A': 'ᴀ', 'B': 'ʙ'
};

const DIAGRAM_STEM_PAT = /\b(?:shown\s+(?:in|as|below|in\s+the\s+diagram|in\s+figure|in\s+the\s+figure)|as\s+shown\s+(?:in\s+the\s+diagram|in\s+figure|in\s+the\s+figure|below)|given\s+(?:in\s+)?(?:diagram|figure)|diagram\s+below|figure\s+below)\b/i;

// Application State
let state = {
  pdfArrayBuffer: null,
  pdfFileName: '',
  bgImageBase64: typeof DEFAULT_CHALKBOARD_BASE64 !== 'undefined' ? DEFAULT_CHALKBOARD_BASE64 : null,
  parsedQuestions: [],
  questionDiagrams: [], // [ { pno, qNum, section, snippet, dataUrl } ]
  lastGeneratedBlob: null,
  bbox: {
    left_ratio: 0.36,
    top_ratio: 0.10,
    width_ratio: 0.55,
    height_ratio: 0.77
  }
};

// DOM Elements
const pdfDropzone = document.getElementById('pdfDropzone');
const pdfFileInput = document.getElementById('pdfFileInput');
const pdfFileLabel = document.getElementById('pdfFileLabel');

const pptDropzone = document.getElementById('pptDropzone');
const pptFileInput = document.getElementById('pptFileInput');
const pptFileLabel = document.getElementById('pptFileLabel');
const btnUseDefaultPpt = document.getElementById('btnUseDefaultPpt');

const btnParsePdf = document.getElementById('btnParsePdf');
const questionsList = document.getElementById('questionsList');
const questionCountLabel = document.getElementById('questionCountLabel');
const filterInput = document.getElementById('filterInput');

const slideCanvas = document.getElementById('slideCanvas');
const canvasWrapper = document.getElementById('canvasWrapper');
const selectionBox = document.getElementById('selectionBox');
const ctx = slideCanvas.getContext('2d');

const inputLeft = document.getElementById('inputLeft');
const inputTop = document.getElementById('inputTop');
const inputWidth = document.getElementById('inputWidth');
const inputHeight = document.getElementById('inputHeight');

const chkFontMaximizer = document.getElementById('chkFontMaximizer');
const chk2x2Grid = document.getElementById('chk2x2Grid');
const chkAutoDiagrams = document.getElementById('chkAutoDiagrams');
const colSection = document.getElementById('colSection');
const colQnum = document.getElementById('colQnum');
const colStem = document.getElementById('colStem');
const colOptLabel = document.getElementById('colOptLabel');

const btnGeneratePpt = document.getElementById('btnGeneratePpt');
const genStatusText = document.getElementById('genStatusText');
const downloadBanner = document.getElementById('downloadBanner');
const downloadDetails = document.getElementById('downloadDetails');
const btnDownloadAgain = document.getElementById('btnDownloadAgain');

// Presets
const PRESETS = {
  'chalkboard-left': { left: 0.36, top: 0.10, width: 0.55, height: 0.77 },
  'chalkboard-right': { left: 0.08, top: 0.10, width: 0.55, height: 0.77 },
  'full-center': { left: 0.08, top: 0.10, width: 0.84, height: 0.80 },
  'right-half': { left: 0.50, top: 0.10, width: 0.45, height: 0.80 }
};

document.addEventListener('DOMContentLoaded', () => {
  setupFileUploads();
  setupCanvasSelection();
  setupPresets();
  setupCoordInputs();
  setupGenerator();
  loadDefaultTemplatePreview();
});

// Setup File Uploads
function setupFileUploads() {
  pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      state.pdfFileName = file.name;
      const reader = new FileReader();
      reader.onload = function(evt) {
        state.pdfArrayBuffer = evt.target.result;
        pdfDropzone.classList.add('has-file');
        pdfFileLabel.innerText = `Selected: ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        btnParsePdf.disabled = false;
      };
      reader.readAsArrayBuffer(file);
    }
  });

  pptFileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (ext === 'pptx') {
        try {
          const zip = await JSZip.loadAsync(file);
          const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/media/') && (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')));
          if (mediaFiles.length > 0) {
            let largestName = mediaFiles[0];
            let largestSize = 0;
            for (const mf of mediaFiles) {
              const fileData = zip.files[mf];
              if (fileData._data && fileData._data.uncompressedSize > largestSize) {
                largestSize = fileData._data.uncompressedSize;
                largestName = mf;
              }
            }
            const imgBlob = await zip.files[largestName].async('blob');
            const reader = new FileReader();
            reader.onload = function(evt) {
              state.bgImageBase64 = evt.target.result;
              pptDropzone.classList.add('has-file');
              pptFileLabel.innerText = `PPTX Template: ${file.name}`;
              renderCanvasImage(state.bgImageBase64);
            };
            reader.readAsDataURL(imgBlob);
          } else {
            alert('No background images found in uploaded PPTX.');
          }
        } catch (err) {
          alert('Could not read PPTX: ' + err.message);
        }
      } else {
        const reader = new FileReader();
        reader.onload = function(evt) {
          state.bgImageBase64 = evt.target.result;
          pptDropzone.classList.add('has-file');
          pptFileLabel.innerText = `Custom Image: ${file.name}`;
          renderCanvasImage(state.bgImageBase64);
        };
        reader.readAsDataURL(file);
      }
    }
  });

  btnUseDefaultPpt.addEventListener('click', (e) => {
    e.stopPropagation();
    state.bgImageBase64 = typeof DEFAULT_CHALKBOARD_BASE64 !== 'undefined' ? DEFAULT_CHALKBOARD_BASE64 : null;
    pptDropzone.classList.remove('has-file');
    pptFileLabel.innerText = 'Default: 7th SST Classroom Chalkboard';
    loadDefaultTemplatePreview();
  });
}

function loadDefaultTemplatePreview() {
  if (state.bgImageBase64) {
    renderCanvasImage(state.bgImageBase64);
  } else {
    renderCanvasImage('chalkboard_bg.png');
  }
}

let templateImg = new Image();
function renderCanvasImage(url) {
  templateImg.src = url;
  templateImg.onload = () => {
    slideCanvas.width = templateImg.naturalWidth || 1920;
    slideCanvas.height = templateImg.naturalHeight || 1080;
    ctx.drawImage(templateImg, 0, 0, slideCanvas.width, slideCanvas.height);
    updateSelectionBoxUI();
  };
}

// Canvas Bounding Box Selection
function setupCanvasSelection() {
  let isDragging = false;
  let isResizing = false;
  let currentHandle = null;
  let startX, startY, startLeft, startTop, startWidth, startHeight;

  updateSelectionBoxUI();

  selectionBox.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('resize-handle')) {
      isResizing = true;
      currentHandle = e.target;
    } else {
      isDragging = true;
    }
    startX = e.clientX;
    startY = e.clientY;
    startLeft = state.bbox.left_ratio;
    startTop = state.bbox.top_ratio;
    startWidth = state.bbox.width_ratio;
    startHeight = state.bbox.height_ratio;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging && !isResizing) return;
    const rect = canvasWrapper.getBoundingClientRect();
    const dx = (e.clientX - startX) / rect.width;
    const dy = (e.clientY - startY) / rect.height;

    if (isDragging) {
      state.bbox.left_ratio = Math.max(0, Math.min(1 - startWidth, startLeft + dx));
      state.bbox.top_ratio = Math.max(0, Math.min(1 - startHeight, startTop + dy));
    } else if (isResizing) {
      if (currentHandle.classList.contains('handle-br')) {
        state.bbox.width_ratio = Math.max(0.1, Math.min(1 - startLeft, startWidth + dx));
        state.bbox.height_ratio = Math.max(0.1, Math.min(1 - startTop, startHeight + dy));
      } else if (currentHandle.classList.contains('handle-bl')) {
        const newLeft = Math.max(0, Math.min(startLeft + startWidth - 0.1, startLeft + dx));
        state.bbox.width_ratio = startWidth + (startLeft - newLeft);
        state.bbox.left_ratio = newLeft;
        state.bbox.height_ratio = Math.max(0.1, Math.min(1 - startTop, startHeight + dy));
      } else if (currentHandle.classList.contains('handle-tr')) {
        const newTop = Math.max(0, Math.min(startTop + startHeight - 0.1, startTop + dy));
        state.bbox.height_ratio = startHeight + (startTop - newTop);
        state.bbox.top_ratio = newTop;
        state.bbox.width_ratio = Math.max(0.1, Math.min(1 - startLeft, startWidth + dx));
      } else if (currentHandle.classList.contains('handle-tl')) {
        const newLeft = Math.max(0, Math.min(startLeft + startWidth - 0.1, startLeft + dx));
        const newTop = Math.max(0, Math.min(startTop + startHeight - 0.1, startTop + dy));
        state.bbox.width_ratio = startWidth + (startLeft - newLeft);
        state.bbox.height_ratio = startHeight + (startTop - newTop);
        state.bbox.left_ratio = newLeft;
        state.bbox.top_ratio = newTop;
      }
    }

    syncInputsFromState();
    updateSelectionBoxUI();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
    currentHandle = null;
  });
}

function updateSelectionBoxUI() {
  selectionBox.style.left = `${(state.bbox.left_ratio * 100).toFixed(1)}%`;
  selectionBox.style.top = `${(state.bbox.top_ratio * 100).toFixed(1)}%`;
  selectionBox.style.width = `${(state.bbox.width_ratio * 100).toFixed(1)}%`;
  selectionBox.style.height = `${(state.bbox.height_ratio * 100).toFixed(1)}%`;
}

function syncInputsFromState() {
  inputLeft.value = Math.round(state.bbox.left_ratio * 100);
  inputTop.value = Math.round(state.bbox.top_ratio * 100);
  inputWidth.value = Math.round(state.bbox.width_ratio * 100);
  inputHeight.value = Math.round(state.bbox.height_ratio * 100);
}

function setupCoordInputs() {
  const handleInputChange = () => {
    state.bbox.left_ratio = parseFloat(inputLeft.value) / 100;
    state.bbox.top_ratio = parseFloat(inputTop.value) / 100;
    state.bbox.width_ratio = parseFloat(inputWidth.value) / 100;
    state.bbox.height_ratio = parseFloat(inputHeight.value) / 100;
    updateSelectionBoxUI();
  };

  inputLeft.addEventListener('input', handleInputChange);
  inputTop.addEventListener('input', handleInputChange);
  inputWidth.addEventListener('input', handleInputChange);
  inputHeight.addEventListener('input', handleInputChange);
}

function setupPresets() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presetKey = btn.getAttribute('data-preset');
      if (PRESETS[presetKey]) {
        state.bbox = { ...PRESETS[presetKey] };
        syncInputsFromState();
        updateSelectionBoxUI();
      }
    });
  });
}

// Math & Chemistry Formula Formatter for Question Stems
function formatMathText(str) {
  if (!str) return '';
  let s = str;
  s = s.replace(/\|/g, ' ')
       .replace(/\+-/g, '±')
       .replace(/<=/g, '≤')
       .replace(/>=/g, '≥')
       .replace(/!=/g, '≠')
       .replace(/-->|->/g, '→')
       .replace(/<--|<-/g, '←')
       .replace(/<->|<-->/g, '↔')
       .replace(/~=/g, '≈')
       .replace(/ ∘C|∘C| ∘ C/g, '°C')
       .replace(/ ∘F|∘F/g, '°F')
       .replace(/ ∘/g, '°')
       .replace(/\bdeg\b/g, '°')
       .replace(/\binfty\b/gi, '∞')
       .replace(/\s+([,.:;?!])/g, '$1')
       .replace(/([A-Z][a-z]?)\s+(\d+)\b/g, (m, elem, num) => elem + num.split('').map(d => SUBSCRIPT_MAP[d] || d).join(''))
       .replace(/([a-zA-Z\d\)])\^([-\d]+)/g, (m, base, exp) => base + exp.split('').map(d => SUPERSCRIPT_MAP[d] || d).join(''))
       .replace(/\s*ϵ\s*0\b/gi, ' ϵ₀')
       .replace(/\s*μ\s*0\b/gi, ' μ₀')
       .replace(/\s*μ\s*r\b/gi, ' μᵣ')
       .replace(/\s*μ\s*t\b/gi, ' μₜ')
       .replace(/ab[−\-]2\b/g, 'ab⁻²')
       .replace(/C4H9Br\b/g, 'C₄H₉Br')
       .replace(/NaNH2\b/g, 'NaNH₂')
       .replace(/kg\/m3\b/g, 'kg/m³')
       .replace(/Nm[−\-]2\b/g, 'Nm⁻²')
       .replace(/ms[−\-]2\b/g, 'ms⁻²')
       .replace(/cm2\b/g, 'cm²')
       .replace(/m\/s2\b/g, 'm/s²')
       .replace(/B₂\s*x\s*'/gi, "'x'")
       .replace(/B₂\s*is\s*:\s*B₁\b|B₂\s*:\s*B₁\b|B₂\s*,\s*B₁\s*is\s*:\b|For\s*x\s*:\s*R\s*=\s*3\s*:\s*4,\s*B₁\s*is\s*:/gi, "For x : R = 3 : 4, B₂/B₁ is:")
       .replace(/γ\s*A\s*\/\s*γ\s*B\s*=\s*\(\s*1\s*\+\s*1\s*\/\s*n\s*\)/gi, 'γ_A / γ_B = (1 + 1/n)');
  return s.trim();
}

// High-Precision Option Cleaner with Exact Mathematical Fraction & Function Reconstruction
function cleanOptionText(optRaw) {
  if (!optRaw) return '';
  let s = optRaw;

  s = s.replace(/\|/g, ' ')
       .replace(/\s+/g, ' ')
       .replace(/cos\s*[-−]?\s*1/gi, 'cos⁻¹')
       .replace(/sin\s*[-−]?\s*1/gi, 'sin⁻¹')
       .replace(/tan\s*[-−]?\s*1/gi, 'tan⁻¹');

  // 1. Inverse trig fractions (e.g. cos⁻¹(1/√3), cos⁻¹(2/3), cos⁻¹(√2/3))
  s = s.replace(/(?:\(√\s*(\d+)\s*\)\s*cos⁻¹\s*(\d+)|cos⁻¹\s*\(?\s*√\s*(\d+)\s*\)?\s*(\d+))/gi, (m, g1, g2, g3, g4) => {
    const num = g1 || g3;
    const den = g2 || g4;
    return `cos⁻¹(√${num}/${den})`;
  });

  s = s.replace(/cos⁻¹\s*\(\s*(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos⁻¹\s*\(\s*√\s*(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos⁻¹\s*\(\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos⁻¹\s*\(\s*√\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos⁻¹\s*\(\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos⁻¹\s*\(\s*√\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)');

  // 2. Susceptibility relations
  s = s.replace(/χ\s*=\s*μ\s*μ0\s*[-−]\s*1/gi, 'χ = (μ/μ₀) − 1')
       .replace(/χ\s*=\s*μr\s*μ0\s*\+\s*1/gi, 'χ = (μᵣ/μ₀) + 1')
       .replace(/χ\s*=\s*1\s*[-−]\s*μ\s*μ0/gi, 'χ = 1 − (μ/μ₀)')
       .replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*μ₀\s*([−\-+]\s*1)/gi, 'χ = (μ/μ₀) $1')
       .replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*r\s*\+\s*1\s*μ₀/gi, 'χ = (μᵣ/μ₀) + 1')
       .replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*1\s*[-−]\s*μ₀/gi, 'χ = 1 − (μ/μ₀)')
       .replace(/χ\s*=\s*μₜ\s*\+\s*1/gi, 'χ = μₜ + 1');

  // 3. Photoelectric / Quantum formulas
  s = s.replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[ $1m(hc/λ − ϕ) ] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[ m(hc/λ − ϕ) ] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '2√[ m(hc/λ − ϕ) ] / eB')
       .replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[ $1m(hc/λ − ϕ) ] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '2√[ m(hc/λ − ϕ) ] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[ m(hc/λ − ϕ) ] / eB');

  // 4. Fractions & charges in options
  s = s.replace(/−α\s*2/g, '−α/2')
       .replace(/−\s*α\s*\/\s*2/g, '−α/2')
       .replace(/−\s*45\s*∘/g, '−45°')
       .replace(/\+\s*45\s*∘/g, '+45°')
       .replace(/−\s*α/g, '−α')
       .replace(/3σq\s*2ϵ0/g, '3σq / 2ϵ₀')
       .replace(/3σq\s*4ϵ0/g, '3σq / 4ϵ₀')
       .replace(/σq\s*4ϵ0/g, 'σq / 4ϵ₀')
       .replace(/σq\s*2ϵ0/g, 'σq / 2ϵ₀')
       .replace(/3\s*σq\s*\n*\s*2\s*ϵ0/g, '3σq / 2ϵ₀')
       .replace(/3\s*σq\s*\n*\s*4\s*ϵ0/g, '3σq / 4ϵ₀')
       .replace(/σq\s*\n*\s*4\s*ϵ0/g, 'σq / 4ϵ₀')
       .replace(/σq\s*\n*\s*2\s*ϵ0/g, 'σq / 2ϵ₀');

  let lines = s.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 2 && lines[0].length <= 15 && lines[1].length <= 15 && !lines[0].includes('=')) {
    s = `${lines[0]} / ${lines[1]}`;
  } else if (lines.length > 1) {
    s = lines.join(' ');
  }

  // 5. Clean up units, coordinates, and spacing
  s = s.replace(/\s*ϵ\s*0\b/gi, ' ϵ₀')
       .replace(/\s*μ\s*0\b/gi, ' μ₀')
       .replace(/\s*μ\s*r\b/gi, ' μᵣ')
       .replace(/\s*μ\s*t\b/gi, ' μₜ')
       .replace(/\(\s*(\d+)\s*d\s*\/\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, '($1d/$2, $3, $4)')
       .replace(/\(\s*d\s*\/\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, '(d/$1, $2, $3)')
       .replace(/rad\s*\/\s*s/g, 'rad/s')
       .replace(/nC\s*\/\s*m\s*2/g, 'nC/m²')
       .replace(/\s+/g, ' ')
       .trim();

  return s;
}

// Universal Client-Side PDF Parser using PDF.js with Tight 3.8px Baseline Line Clustering
btnParsePdf.addEventListener('click', async () => {
  if (!state.pdfArrayBuffer) return;

  btnParsePdf.disabled = true;
  btnParsePdf.innerHTML = '<span>⏳</span> Parsing PDF in browser...';
  genStatusText.innerText = 'Extracting questions client-side...';

  try {
    const loadingTask = pdfjsLib.getDocument({ data: state.pdfArrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    let fullLines = [];
    state.questionDiagrams = [];

    let currentSection = 'Physics';

    for (let pno = 1; pno <= numPages; pno++) {
      genStatusText.innerText = `Parsing page ${pno} of ${numPages}...`;
      const page = await pdfDoc.getPage(pno);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 2.0 });

      let items = textContent.items.map(item => {
        const tx = item.transform;
        return {
          str: item.str,
          x: tx[4],
          y: (viewport.height / 2.0) - (tx[5] / 2.0),
          height: item.height || Math.abs(tx[3]) || 10
        };
      });

      // Filter right-edge marks column and standard headers/footers
      items = items.filter(it => {
        if (it.x > 565 && ['1', '2', '3', '4', '5', '0.5'].includes(it.str.trim())) return false;
        if (it.y < 35 && (it.str.toLowerCase().includes('cbse') || it.str.toLowerCase().includes('quiz') || it.str.toLowerCase().includes('careers360'))) return false;
        if (it.y > ((viewport.height / 2.0) - 45) && (it.str.toLowerCase().includes('page') || /^\d+$/.test(it.str.trim()))) return false;
        return true;
      });

      items.sort((a, b) => a.y - b.y || a.x - b.x);

      // Tight 3.8px Baseline Clustering: Keeps Option lines strictly independent
      let lines = [];
      for (const it of items) {
        let matched = null;
        for (const l of lines) {
          if (Math.abs(it.y - l.base_y) <= 3.8) {
            matched = l;
            break;
          }
        }
        if (matched) {
          matched.items.push(it);
          matched.base_y = matched.items.reduce((sum, item) => sum + item.y, 0) / matched.items.length;
        } else {
          lines.push({ base_y: it.y, items: [it] });
        }
      }
      lines.sort((a, b) => a.base_y - b.base_y);

      let pageLines = [];
      for (const l of lines) {
        l.items.sort((a, b) => a.x - b.x);

        let lineText = "";
        for (const t of l.items) {
          let tokenStr = t.str;
          if (!lineText) {
            lineText = tokenStr;
          } else if ([',', '.', ':', ';', '?', '!', '%', '°', '°C'].includes(tokenStr)) {
            lineText += tokenStr;
          } else if (lineText.endsWith('(') || tokenStr.startsWith(')')) {
            lineText += tokenStr;
          } else {
            lineText += " " + tokenStr;
          }
        }

        lineText = formatMathText(lineText);
        if (lineText) {
          if (lineText.toLowerCase().includes('chemistry')) currentSection = 'Chemistry';
          if (lineText.toLowerCase().includes('physics')) currentSection = 'Physics';
          if (lineText.toLowerCase().includes('mathematics')) currentSection = 'Mathematics';
          if (lineText.toLowerCase().includes('biology')) currentSection = 'Biology';
          
          if (!isHeaderOrFooter(lineText)) {
            pageLines.push(lineText);
          }
        }
      }

      // Guarded Section-Aware Diagram Detection on this Page
      if (chkAutoDiagrams.checked) {
        for (let i = 0; i < lines.length; i++) {
          const lineStr = lines[i].items.map(it => it.str).join(' ');
          const qm = lineStr.match(/(?:^|\s)Q(?:uestion)?\.?\s*(\d+)\b/);
          if (qm) {
            const qNum = parseInt(qm[1], 10);
            let fullStemText = lineStr;
            let stemBottomY = lines[i].base_y + 15;
            let optTopY = null;

            for (let j = i + 1; j < lines.length; j++) {
              const nextLineStr = lines[j].items.map(it => it.str).join(' ');
              if (/^(?:Option\s*[1-4A-D]:|\([A-D1-4]\)|[A-D]\.)/i.test(nextLineStr.trim())) {
                optTopY = lines[j].base_y;
                break;
              }
              if (/^Q(?:uestion)?\.?\s*\d+/i.test(nextLineStr.trim()) || /^(?:Solution|Correct Answer):/i.test(nextLineStr.trim())) {
                break;
              }
              fullStemText += " " + nextLineStr;
              stemBottomY = Math.max(stemBottomY, lines[j].base_y + 12);
            }

            // Extract diagram ONLY when explicit figure keyword exists and sufficient whitespace gap is present
            if (DIAGRAM_STEM_PAT.test(fullStemText) && optTopY && (optTopY - stemBottomY >= 40)) {
              const offCanvas = document.createElement('canvas');
              offCanvas.width = viewport.width;
              offCanvas.height = viewport.height;
              const offCtx = offCanvas.getContext('2d');
              await page.render({ canvasContext: offCtx, viewport: viewport }).promise;

              const cropCanvas = document.createElement('canvas');
              const cX = viewport.width * 0.10;
              const cY = (stemBottomY + 2) * 2.0;
              const cW = viewport.width * 0.80;
              const cH = Math.max(40, (optTopY - stemBottomY - 4) * 2.0);

              cropCanvas.width = Math.floor(cW);
              cropCanvas.height = Math.floor(cH);
              const cropCtx = cropCanvas.getContext('2d');
              cropCtx.drawImage(offCanvas, cX, cY, cW, cH, 0, 0, cropCanvas.width, cropCanvas.height);

              state.questionDiagrams.push({
                pno: pno,
                qNum: qNum,
                section: currentSection,
                snippet: fullStemText.slice(0, 50),
                dataUrl: cropCanvas.toDataURL('image/png')
              });
              offCanvas.width = offCanvas.height = 0;
            }
          }
        }
      }

      fullLines.push(...pageLines);
      page.cleanup();
    }

    const fullStream = fullLines.join('\n');
    window._lastFullStream = fullStream;
    state.parsedQuestions = parseUniversalQuestions(fullStream);

    // Link genuine diagrams
    for (const q of state.parsedQuestions) {
      const match = state.questionDiagrams.find(d => 
        d.qNum === q.q_num && 
        d.section.toLowerCase() === q.section.toLowerCase()
      );
      if (match) {
        q.imageData = match.dataUrl;
      }
    }

    renderQuestionsList(state.parsedQuestions);
    btnGeneratePpt.disabled = false;
    genStatusText.innerText = `Successfully extracted ${state.parsedQuestions.length} questions!`;

  } catch (err) {
    alert('Error reading PDF: ' + err.message);
  } finally {
    btnParsePdf.disabled = false;
    btnParsePdf.innerHTML = '<span>🔍</span> Re-parse PDF Questions';
  }
});

function isHeaderOrFooter(text) {
  const l = text.toLowerCase();
  return l.includes('7th cbse') || l.includes('careers360') || (l.includes('page ') && l.length < 15) || l.includes('maximum marks') || l.includes('general instructions') || l.includes('subject:');
}

// Universal Question Parser: Handles Standard Exams, Careers360, JEE, NEET, CBSE
function parseUniversalQuestions(fullStream) {
  // Strictly match uppercase Q. 1, Q. 2, ...
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

    // Isolate Question & Options from "Correct Answer:" and "Solution:"
    const solMatch = rawChunk.match(/\n\s*(?:Correct\s+Answer:|Solution:|Ans(?:wer)?:)/i);
    let qaChunk = rawChunk;
    let solChunk = "";
    if (solMatch) {
      qaChunk = rawChunk.slice(0, solMatch.index).trim();
      solChunk = rawChunk.slice(solMatch.index).trim();
    }

    // Parse Options: Supports "Option 1:" ... "Option 4:", "(A)" ... "(D)", "(1)" ... "(4)"
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

    // Clean Real Gas Equation 2 formatting if floating tokens occurred
    stem = stem.replace(/\(P\s*\+\s*a\s*\)\s*\(V\s*[−\-]\s*b\s*\)\s*=\s*RT\s*,\s*where\s*P,\s*V,\s*T\s*and\s*R\s*are\s*\n\s*V2\s*\n\s*ab[−\-]2\s*\n\s*the\s*pressure/gi,
      '(P + a/V²)(V − b) = RT, where P, V, T and R are the pressure, volume, temperature and gas constant, respectively. The dimension of ab⁻² is')
      .replace(/\(P\s*\+\s*a\/V2\s*\)/g, '(P + a/V²)')
      .replace(/\(P\s*\+\s*a\/V²\s*\)/g, '(P + a/V²)')
      .replace(/\(V\s*[−\-]\s*b\s*\)/g, '(V − b)')
      .replace(/ab[−\-]2\b/g, 'ab⁻²');

    let stemLines = stem.split('\n').map(l => formatMathText(l)).filter(l => l && !isHeaderOrFooter(l));

    questions.push({
      q_num: qNum,
      section: currentSection,
      question: stemLines.join('\n'),
      options: { A: optA, B: optB, C: optC, D: optD },
      solution: solChunk
    });
  }

  return questions;
}

// Remove Diagram on a Question
window.removeDiagram = function(idx) {
  if (state.parsedQuestions[idx]) {
    state.parsedQuestions[idx].imageData = null;
    renderQuestionsList(state.parsedQuestions);
  }
};

// Render Questions List with Image Badges, Remove Button & Thumbnails
function renderQuestionsList(questions) {
  questionCountLabel.innerText = `${questions.length} questions ready for export`;
  if (questions.length === 0) {
    questionsList.innerHTML = '<div class="empty-state"><p>No questions found in this PDF.</p></div>';
    return;
  }

  questionsList.innerHTML = questions.map((q, idx) => `
    <div class="question-item" data-index="${idx}">
      <div class="q-header">
        <span class="q-badge">Q${q.q_num}</span>
        <span class="q-sec">${q.section || 'General'}</span>
        ${q.imageData ? `<span class="badge-diagram">🖼️ Diagram Attached <button class="btn-remove-diag" onclick="removeDiagram(${idx})">❌ Remove</button></span>` : ''}
      </div>
      <div class="q-stem" contenteditable="true" data-field="question">${escapeHtml(q.question)}</div>
      ${q.imageData ? `<div class="q-diagram-preview"><img src="${q.imageData}" alt="Question ${q.q_num} Diagram" style="max-width: 340px; border-radius: 6px; margin: 8px 0; border: 1px solid rgba(255,255,255,0.2);"></div>` : ''}
      <div class="q-options">
        ${q.options.A ? `<div class="q-opt"><span>(A)</span> ${escapeHtml(q.options.A)}</div>` : ''}
        ${q.options.B ? `<div class="q-opt"><span>(B)</span> ${escapeHtml(q.options.B)}</div>` : ''}
        ${q.options.C ? `<div class="q-opt"><span>(C)</span> ${escapeHtml(q.options.C)}</div>` : ''}
        ${q.options.D ? `<div class="q-opt"><span>(D)</span> ${escapeHtml(q.options.D)}</div>` : ''}
      </div>
      ${q.solution ? `
        <details class="q-sol-accordion">
          <summary>💡 View Full Solution & Answer Key</summary>
          <div class="q-sol-body">${escapeHtml(q.solution)}</div>
        </details>
      ` : ''}
    </div>
  `).join('');

  document.querySelectorAll('.q-stem').forEach((el, idx) => {
    el.addEventListener('blur', () => {
      state.parsedQuestions[idx].question = el.innerText.trim();
    });
  });
}

// Search Filter
filterInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const items = document.querySelectorAll('.question-item');
  items.forEach((item, idx) => {
    const q = state.parsedQuestions[idx];
    const match = q.question.toLowerCase().includes(query) || 
                  (q.section && q.section.toLowerCase().includes(query)) ||
                  (q.solution && q.solution.toLowerCase().includes(query));
    item.style.display = match ? 'block' : 'none';
  });
});

// High-Performance Client-Side PowerPoint Generator with Directory Prompt & Solution Modes
function setupGenerator() {
  btnGeneratePpt.addEventListener('click', async () => {
    if (state.parsedQuestions.length === 0) return;

    btnGeneratePpt.disabled = true;
    btnGeneratePpt.innerHTML = '<span>⏳</span> Generating PowerPoint...';
    genStatusText.innerText = 'Initializing presentation...';

    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9'; // 13.333 x 7.5 inches

      const slideW = 13.333;
      const slideH = 7.5;

      const bLeft = slideW * state.bbox.left_ratio;
      const bTop = slideH * state.bbox.top_ratio;
      const bWidth = slideW * state.bbox.width_ratio;
      const bHeight = slideH * state.bbox.height_ratio;

      const colSecHex = colSection.value.replace('#', '');
      const colQnumHex = colQnum.value.replace('#', '');
      const colStemHex = colStem.value.replace('#', '');
      const colOptLblHex = colOptLabel.value.replace('#', '');

      const solutionMode = document.querySelector('input[name="solutionMode"]:checked')?.value || 'ignore';

      // Define Slide Master ONCE with background image object
      if (state.bgImageBase64) {
        pptx.defineSlideMaster({
          title: "CHALKBOARD_MASTER",
          background: { color: "1E4D2B" },
          objects: [
            { image: { x: 0, y: 0, w: slideW, h: slideH, data: state.bgImageBase64 } }
          ]
        });
      }

      const totalQs = state.parsedQuestions.length;

      for (let idx = 0; idx < totalQs; idx++) {
        const q = state.parsedQuestions[idx];

        // Yield event loop every 4 slides
        if (idx % 4 === 0) {
          genStatusText.innerText = `Formatting slide ${idx + 1} of ${totalQs}...`;
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const slide = state.bgImageBase64 
          ? pptx.addSlide({ masterName: "CHALKBOARD_MASTER" })
          : pptx.addSlide();

        const stemLines = q.question.split('\n');
        const maxOptLen = Math.max(
          (q.options.A || '').length,
          (q.options.B || '').length,
          (q.options.C || '').length,
          (q.options.D || '').length
        );

        // 1. Question with Genuine Diagram (e.g. Q4 lens, Q5 plates, Q13 lamina, Q17 surface, Q19 bob)
        if (q.imageData) {
          const topH = 1.1;
          const textRunsTop = [];
          if (q.section) {
            textRunsTop.push({ text: q.section.toUpperCase(), options: { fontSize: 11.5, bold: true, color: colSecHex, breakLine: true } });
          }
          textRunsTop.push({ text: `Q${q.q_num}. `, options: { fontSize: 17, bold: true, color: colQnumHex } });
          textRunsTop.push({ text: stemLines[0], options: { fontSize: 14, bold: true, color: colStemHex, breakLine: true } });

          slide.addText(textRunsTop, { x: bLeft, y: bTop, w: bWidth, h: topH, wrap: true, valign: 'top' });

          const diagW = 3.8;
          const diagH = 1.95;
          const diagL = bLeft + (bWidth - diagW) / 2;
          const diagT = bTop + topH + 0.05;
          slide.addImage({ data: q.imageData, x: diagL, y: diagT, w: diagW, h: diagH });

          const botT = diagT + diagH + 0.05;
          const botH = (bTop + bHeight) - botT;
          const textRunsBot = [];

          if (stemLines.length > 1) {
            textRunsBot.push({ text: stemLines.slice(1).join('\n'), options: { fontSize: 12.5, bold: true, color: colStemHex, breakLine: true } });
          }

          for (const k of ['A', 'B', 'C', 'D']) {
            if (q.options[k]) {
              textRunsBot.push({ text: `(${k}) `, options: { fontSize: 12, bold: true, color: colOptLblHex } });
              textRunsBot.push({ text: q.options[k] || '', options: { fontSize: 12, color: 'F5F5F5', breakLine: true } });
            }
          }

          // If Inline Answer Mode is selected
          if (solutionMode === 'inline' && q.solution) {
            const ansLine = q.solution.split('\n')[0] || '';
            textRunsBot.push({ text: '\n' + ansLine, options: { fontSize: 11.5, bold: true, color: '81C784' } });
          }

          slide.addText(textRunsBot, { x: bLeft, y: botT, w: bWidth, h: botH, wrap: true, valign: 'top' });
        }
        // 2. 2x2 Grid Layout for Short Options
        else if (chk2x2Grid.checked && q.options.A && q.options.B && q.options.C && q.options.D && maxOptLen <= 35 && q.question.length <= 260 && stemLines.length === 1) {
          const qTextRuns = [];
          if (q.section) {
            qTextRuns.push({ text: q.section.toUpperCase(), options: { fontSize: 13, bold: true, color: colSecHex, breakLine: true } });
          }
          qTextRuns.push({ text: `Q${q.q_num}. `, options: { fontSize: 26, bold: true, color: colQnumHex } });
          qTextRuns.push({ text: q.question, options: { fontSize: 23, bold: true, color: colStemHex } });

          slide.addText(qTextRuns, {
            x: bLeft,
            y: bTop,
            w: bWidth,
            h: 2.4,
            wrap: true,
            valign: 'top'
          });

          const colW = (bWidth - 0.5) / 2;
          const topOpts = bTop + 2.8;

          // Col 1 (A & C)
          slide.addText([
            { text: '(A) ', options: { fontSize: 21, bold: true, color: colOptLblHex } },
            { text: q.options.A, options: { fontSize: 21, color: 'F5F5F5', breakLine: true } },
            { text: '\n', options: { fontSize: 10, breakLine: true } },
            { text: '(C) ', options: { fontSize: 21, bold: true, color: colOptLblHex } },
            { text: q.options.C, options: { fontSize: 21, color: 'F5F5F5' } }
          ], { x: bLeft, y: topOpts, w: colW, h: 2.8, wrap: true, valign: 'top' });

          // Col 2 (B & D)
          slide.addText([
            { text: '(B) ', options: { fontSize: 21, bold: true, color: colOptLblHex } },
            { text: q.options.B, options: { fontSize: 21, color: 'F5F5F5', breakLine: true } },
            { text: '\n', options: { fontSize: 10, breakLine: true } },
            { text: '(D) ', options: { fontSize: 21, bold: true, color: colOptLblHex } },
            { text: q.options.D, options: { fontSize: 21, color: 'F5F5F5' } }
          ], { x: bLeft + colW + 0.5, y: topOpts, w: colW, h: 2.8, wrap: true, valign: 'top' });
        }
        // 3. Standard Vertical Layout with Dynamic Typography
        else {
          let stPt = 20, optPt = 17, spPt = 10;
          const totalChars = q.question.length + (q.options.A || '').length + (q.options.B || '').length + (q.options.C || '').length + (q.options.D || '').length;

          if (chkFontMaximizer.checked) {
            if (totalChars > 700) { stPt = 14; optPt = 12.5; spPt = 4; }
            else if (totalChars > 500) { stPt = 16; optPt = 14.5; spPt = 6; }
            else if (totalChars > 350) { stPt = 18; optPt = 16; spPt = 8; }
            else { stPt = 22; optPt = 19; spPt = 12; }
          }

          const textRuns = [];
          if (q.section) {
            textRuns.push({ text: q.section.toUpperCase(), options: { fontSize: Math.max(11, stPt - 7), bold: true, color: colSecHex, breakLine: true } });
          }
          textRuns.push({ text: `Q${q.q_num}. `, options: { fontSize: stPt + 3, bold: true, color: colQnumHex } });
          textRuns.push({ text: stemLines[0], options: { fontSize: stPt, bold: true, color: colStemHex, breakLine: true } });

          for (let i = 1; i < stemLines.length; i++) {
            const sub = stemLines[i];
            const isStmt = sub.startsWith('1.') || sub.startsWith('2.') || sub.startsWith('3.') || sub.startsWith('•') || sub.startsWith('Statement') || sub.startsWith('Column');
            textRuns.push({ text: sub, options: { fontSize: stPt * 0.95, bold: true, color: isStmt ? 'FFF5B4' : colStemHex, breakLine: true } });
          }

          textRuns.push({ text: '', options: { fontSize: spPt, breakLine: true } });

          for (const k of ['A', 'B', 'C', 'D']) {
            if (q.options[k]) {
              textRuns.push({ text: `(${k}) `, options: { fontSize: optPt, bold: true, color: colOptLblHex } });
              textRuns.push({ text: q.options[k] || '', options: { fontSize: optPt, color: 'F5F5F5', breakLine: true } });
            }
          }

          // If Inline Answer Mode is selected
          if (solutionMode === 'inline' && q.solution) {
            const ansLine = q.solution.split('\n')[0] || '';
            textRuns.push({ text: '\n\n' + ansLine, options: { fontSize: 13, bold: true, color: '81C784' } });
          }

          slide.addText(textRuns, {
            x: bLeft,
            y: bTop,
            w: bWidth,
            h: bHeight,
            wrap: true,
            valign: 'top'
          });
        }

        // 4. If Separate Solution Slide Mode is selected
        if (solutionMode === 'separate' && q.solution) {
          const solSlide = state.bgImageBase64 
            ? pptx.addSlide({ masterName: "CHALKBOARD_MASTER" })
            : pptx.addSlide();

          const solRuns = [
            { text: `💡 SOLUTION & EXPLANATION — Q${q.q_num}`, options: { fontSize: 15, bold: true, color: 'FFD54F', breakLine: true } },
            { text: `${stemLines[0].slice(0, 100)}${stemLines[0].length > 100 ? '...' : ''}\n\n`, options: { fontSize: 12, italic: true, color: '90CAF9', breakLine: true } },
            { text: q.solution, options: { fontSize: 14, color: 'F5F5F5', breakLine: true } }
          ];

          solSlide.addText(solRuns, {
            x: bLeft,
            y: bTop,
            w: bWidth,
            h: bHeight,
            wrap: true,
            valign: 'top'
          });
        }
      }

      genStatusText.innerText = 'Packaging presentation file...';
      const outName = `Quiz_Presentation_${state.parsedQuestions.length}_Slides.pptx`;
      const pptBlob = await pptx.write({ outputType: 'blob' });
      state.lastGeneratedBlob = pptBlob;

      // Ask User for Directory to Save using Native Browser "Save As" Dialog
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: outName,
            types: [{
              description: 'PowerPoint Presentation (*.pptx)',
              accept: { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] }
            }]
          });
          genStatusText.innerText = 'Writing to selected folder...';
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(pptBlob);
          await writableStream.close();

          downloadBanner.classList.remove('hidden');
          downloadDetails.innerText = `Saved successfully to your chosen folder as: ${fileHandle.name}`;
          genStatusText.innerText = '✨ Presentation saved successfully!';
          downloadBanner.scrollIntoView({ behavior: 'smooth' });
        } catch (saveErr) {
          if (saveErr.name === 'AbortError') {
            genStatusText.innerText = 'Save dialog was closed. Click button below to save again.';
            downloadBanner.classList.remove('hidden');
            downloadDetails.innerText = 'Click "Save Presentation As..." to pick a folder.';
            return;
          }
          downloadBlobDirectly(pptBlob, outName);
        }
      } else {
        downloadBlobDirectly(pptBlob, outName);
      }

    } catch (err) {
      alert('Error generating PowerPoint: ' + err.message);
    } finally {
      btnGeneratePpt.disabled = false;
      btnGeneratePpt.innerHTML = '<span>🚀</span> Generate PowerPoint (.pptx)';
    }
  });

  btnDownloadAgain.addEventListener('click', async () => {
    const outName = `Quiz_Presentation_${state.parsedQuestions.length || 30}_Slides.pptx`;
    if (state.lastGeneratedBlob) {
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: outName,
            types: [{
              description: 'PowerPoint Presentation (*.pptx)',
              accept: { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] }
            }]
          });
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(state.lastGeneratedBlob);
          await writableStream.close();
          downloadDetails.innerText = `Saved to: ${fileHandle.name}`;
        } catch (e) {
          if (e.name !== 'AbortError') {
            downloadBlobDirectly(state.lastGeneratedBlob, outName);
          }
        }
      } else {
        downloadBlobDirectly(state.lastGeneratedBlob, outName);
      }
    } else {
      btnGeneratePpt.click();
    }
  });
}

function downloadBlobDirectly(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  downloadBanner.classList.remove('hidden');
  downloadDetails.innerText = `Saved to your Downloads folder as: ${filename}`;
  genStatusText.innerText = '✨ Presentation generated successfully!';
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return (text || '').replace(/[&<>"']/g, m => map[m]);
}
