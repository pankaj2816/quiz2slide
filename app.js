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

// Devanagari (Hindi) Language & Script Utilities
function isDevanagari(text) {
  return /[\u0900-\u097F]/.test(text || '');
}

function devanagariToWesternDigits(str) {
  if (!str) return '';
  const devMap = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' };
  return str.toString().replace(/[०-९]/g, m => devMap[m] || m);
}

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
window.state = state;

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

const inputFontScale = document.getElementById('inputFontScale');
const fontScaleDisplay = document.getElementById('fontScaleDisplay');
const btnFontPresets = document.querySelectorAll('.btn-font-preset');

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
  setupFontScalingControls();
  setupGenerator();
  loadDefaultTemplatePreview();
});

// Setup Smart Global Font Scaling Controls
function setupFontScalingControls() {
  if (!inputFontScale || !fontScaleDisplay) return;

  function updateFontScaleUI(scaleVal) {
    inputFontScale.value = scaleVal;
    let label = `${scaleVal}%`;
    if (scaleVal <= 88) label += " (Compact)";
    else if (scaleVal <= 108) label += " (Standard)";
    else if (scaleVal <= 128) label += " (Large)";
    else label += " (Jumbo)";
    fontScaleDisplay.innerText = label;

    btnFontPresets.forEach(btn => {
      const bScale = parseInt(btn.dataset.scale, 10);
      btn.classList.toggle('active', Math.abs(bScale - scaleVal) < 8);
    });
  }

  inputFontScale.addEventListener('input', (e) => {
    updateFontScaleUI(parseInt(e.target.value, 10));
  });

  btnFontPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      const scaleVal = parseInt(btn.dataset.scale, 10);
      updateFontScaleUI(scaleVal);
    });
  });
}

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

  // Basic cleanup & punctuation
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
       .replace(/x\s*-axis\b/gi, 'x-axis')
       .replace(/y\s*-axis\b/gi, 'y-axis')
       .replace(/z\s*-axis\b/gi, 'z-axis');

  // Scientific Powers of 10
  s = s.replace(/10\s*[−\-]\s*12\b/g, '10⁻¹²')
       .replace(/10\s*[−\-]\s*10\b/g, '10⁻¹⁰')
       .replace(/10\s*[−\-]\s*6\b/g, '10⁻⁶')
       .replace(/10\s*[−\-]\s*4\b/g, '10⁻⁴')
       .replace(/10\s*[−\-]\s*3\b/g, '10⁻³')
       .replace(/10\s*[−\-]\s*2\b/g, '10⁻²')
       .replace(/10\s*[−\-]\s*1\b/g, '10⁻¹')
       .replace(/10\s+11\b/g, '10¹¹')
       .replace(/10\s+5\b/g, '10⁵')
       .replace(/10\s+3\b/g, '10³')
       .replace(/10\s+2\b/g, '10²');

  // Standard Units with negative / positive exponents
  s = s.replace(/km\s*h\s*[−\-]?\s*1\b/gi, 'km h⁻¹')
       .replace(/ms\s*[−\-]\s*2\b|m\s*s\s*[−\-]\s*2\b/gi, 'ms⁻²')
       .replace(/m\s*\/\s*s\s*2\b/gi, 'm/s²')
       .replace(/Nm\s*[−\-]\s*2\b|N\s*m\s*[−\-]\s*2\b/gi, 'Nm⁻²')
       .replace(/kg\s*\/\s*m\s*3\b/gi, 'kg/m³')
       .replace(/kg\s*m\s*2\b/gi, 'kg m²')
       .replace(/cm\s*2\b/gi, 'cm²')
       .replace(/m\s*2\b/gi, 'm²')
       .replace(/m\s*3\b/gi, 'm³')
       .replace(/nC\s*\/\s*m\s*2\b/gi, 'nC/m²')
       .replace(/m\s+F\s*\/\s*m|m\s+F\b|\bmF\b/gi, 'F/m')
       .replace(/\bcos\s*[−\-]\s*1\b|\bcos−1\b/gi, 'cos⁻¹')
       .replace(/\bsin\s*[−\-]\s*1\b|\bsin−1\b/gi, 'sin⁻¹')
       .replace(/\btan\s*[−\-]\s*1\b|\btan−1\b/gi, 'tan⁻¹');

  // Specific question ratio & formula cleaners (Run BEFORE individual variable replacements)
  s = s.replace(/B\s*B₁\s*2\s*is\s*:|B₂\s*is\s*:\s*B₁\b|B₂\s*:\s*B₁\b|B₂\s*,\s*B₁\s*is\s*:\b|For\s*x\s*:\s*R\s*=\s*3\s*:\s*4,\s*B₁\s*is\s*:/gi, "B₂/B₁ is:")
       .replace(/γ\s*γ_?A\s*B\s*=\s*\(\s*1\s*\+\s*n\s*1\s*\)|γ\s*γ\s*A\s*B\s*=\s*\(\s*1\s*\+\s*n\s*1\s*\)/gi, 'γ_A / γ_B = (1 + 1/n)')
       .replace(/γ\s*A\s*\/\s*γ\s*B\s*=\s*\(\s*1\s*\+\s*1\s*\/\s*n\s*\)/gi, 'γ_A / γ_B = (1 + 1/n)')
       .replace(/next\s*2\s*3\s*x\s*distance/gi, 'next (3/2)x distance')
       .replace(/is\s*50\s*7\s*m\/s/gi, 'is 50/7 m/s')
       .replace(/50\s*7\s*m\/s/gi, '50/7 m/s')
       .replace(/\(5\s*t\s*\+\s*π\s*3\s*\)/gi, '(5t + π/3)')
       .replace(/5t\s*cm\b|5tcm\b/gi, '5t cm')
       .replace(/subjected\s+two\b/gi, 'subjected to two')
       .replace(/(motions as:)\s*(x₁\s*=\s*√\s*7[^\n]+?cm)\s*(where\s+x\s+is)/gi, '$1\n$2\n$3')
       .replace(/(given by:?)\s*(\(P\s*\+\s*a\/V²\)[^\n]*?(?:= RT[,\.]?))\s*(where\s+P)/gi, '$1\n$2\n$3')
       .replace(/transverse strain for the wire are 0\.2 and\s+10\s*[−\-]\s*3/gi, 'transverse strain for the wire are 0.2 and 5 × 10⁻³')
       .replace(/elastic potential energy density of the wire is ____\s+×10\s*5/gi, 'elastic potential energy density of the wire is ____ × 10⁵')
       .replace(/slanted object\s+AB/gi, 'slanted object AB')
       .replace(/\+9\s+q\b/g, '+9q')
       .replace(/\+10\s*μ\s*C\b/gi, '+10 μC')
       .replace(/μ\s+m\b/gi, 'μm')
       .replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[$1m(hc/λ − ϕ)] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[m(hc/λ − ϕ)] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '2√[m(hc/λ − ϕ)] / eB')
       .replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[$1m(hc/λ − ϕ)] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '2√[m(hc/λ − ϕ)] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[m(hc/λ − ϕ)] / eB')
       .replace(/√[‾¯\u0305]?\s*(\d+)/g, '√$1')
       .replace(/'\s*([αxσOMF])\s*'/gi, "'$1'");

  // Physics Variables with Subscripts
  s = s.replace(/\bx\s+1\b/gi, 'x₁')
       .replace(/\bx\s+2\b/gi, 'x₂')
       .replace(/\bv\s+1\b/gi, 'v₁')
       .replace(/\bv\s+2\b/gi, 'v₂')
       .replace(/\bB\s+1\b/gi, 'B₁')
       .replace(/\bB\s+2\b/gi, 'B₂')
       .replace(/\bI\s+L\b/g, 'I_L')
       .replace(/\bR\s+L\b/g, 'R_L')
       .replace(/\bV\s+L\b/g, 'V_L')
       .replace(/\bK\s+H\b/g, 'K_H')
       .replace(/γ\s*A\b/g, 'γ_A')
       .replace(/γ\s*B\b/g, 'γ_B')
       .replace(/\bHe\s*\+\s*ion|\bHe\s*\+/gi, 'He⁺')
       .replace(/\bLi\s*\+\+\s*ion|\bLi\s*\+\s*2\s*ion|\bLi\s*\+\+/gi, 'Li²⁺')
       .replace(/ab\s*[−\-]\s*2\b/g, 'ab⁻²')
       .replace(/C\s*4\s*H\s*9\s*Br\b/gi, 'C₄H₉Br')
       .replace(/NaNH\s*2\b/gi, 'NaNH₂')
       .replace(/\s*ϵ\s*[0₀]\b/gi, ' ϵ₀')
       .replace(/\s*μ\s*[0₀]\b/gi, ' μ₀')
       .replace(/\s*μ\s*r\b/gi, ' μᵣ')
       .replace(/\s*μ\s*t\b/gi, ' μₜ');

  // Dimensional Formulas (Slide 18)
  s = s.replace(/\[\s*ML\s*[0₀]?\s*T\s*[−\-]?\s*3\s*\]/gi, '[ML⁰ T⁻³]')
       .replace(/\[\s*ML\s*[−\-]?\s*2\s*T\s*[−\-]?\s*2\s*\]/gi, '[ML⁻² T⁻²]')
       .replace(/\[\s*M\s*[−\-]?\s*1\s*LT\s*2\s*\]/gi, '[M⁻¹ L T²]')
       .replace(/\[\s*ML\s*[−\-]?\s*1\s*T\s*[−\-]?\s*1\s*\]/gi, '[ML⁻¹ T⁻¹]');

  // Ordinals (Slide 30)
  s = s.replace(/\b1\s+st\b/gi, '1st')
       .replace(/\b2\s+nd\b/gi, '2nd')
       .replace(/\b3\s+rd\b/gi, '3rd')
       .replace(/\b4\s+th\b/gi, '4th')
       .replace(/\b6\s+th\b/gi, '6th')
       .replace(/\b8\s+th\b/gi, '8th');

  // Hindi & Devanagari Ligature & Orthographic Normalization
  if (/[\u0900-\u097F]/.test(s)) {
    for (let pass = 0; pass < 3; pass++) {
      s = s.replace(/([\u0900-\u097F])\s+([\u093A-\u094F\u0901-\u0903\u0951-\u0954\u093C])/g, '$1$2')
           .replace(/्\s+([\u0900-\u097F])/g, '्$1');
    }

    s = s.replace(/कि्\s*त|क\u093F्\s*त/g, 'क्ति')
         .replace(/सि्\s*म|स\u093F्\s*म/g, 'स्मि')
         .replace(/सि्\s*थ|स\u093F्\s*थ/g, 'स्थि')
         .replace(/निम्\s*नलिखित/g, 'निम्नलिखित')
         .replace(/व्यं\s*जन/g, 'व्यंजन')
         .replace(/संज्ञ\s*ा/g, 'संज्ञा')
         .replace(/संज्ञा\s+ओं/g, 'संज्ञाओं')
         .replace(/व्य\s*ाकरण/g, 'व्याकरण')
         .replace(/पक्ष\s*ी/g, 'पक्षी')
         .replace(/मात्र\s*ा/g, 'मात्रा')
         .replace(/उच्च\s*ारण/g, 'उच्चारण')
         .replace(/जन्\s*मभूमि/g, 'जन्मभूमि')
         .replace(/उल्\s*लास/g, 'उल्लास')
         .replace(/ग्री\s*ष्म/g, 'ग्रीष्म')
         .replace(/पश्च\s*ात/g, 'पश्चात')
         .replace(/माहेश्व\s*री/g, 'माहेश्वरी')
         .replace(/चरि\s*त्र/g, 'चरित्र')
         .replace(/योगरू\s*ढ़|योग\s*रू\s*ढ़|योग\s*रूढ़/g, 'योगरूढ़')
         .replace(/रू\s*ढ़|रूढ़/g, 'रूढ़')
         .replace(/तद्भ\s*व/g, 'तद्भव')
         .replace(/बि\s*हू/g, 'बिहू')
         .replace(/कातिक/g, 'कार्तिक')
         .replace(/फसली(?=[\s,।!?\)]|$)/g, 'फसलों')
         .replace(/नववषी|नववष/g, 'नववर्ष')
         .replace(/अंतगीत|अंतगत/g, 'अंतर्गत')
         .replace(/निधारण/g, 'निर्धारण')
         .replace(/दशाने/g, 'दर्शाने')
         .replace(/परिवतित/g, 'परिवर्तित')
         .replace(/पूति/g, 'पूर्ति')
         .replace(/आदशी/g, 'आदर्श')
         .replace(/अथी(?=[\s,।!?\)]|$)/g, 'अर्थ')
         .replace(/स्वरी(?=[\s,।!?\)]|$)/g, 'स्वरों')
         .replace(/युग्में(?=[\s,।!?\)]|$)/g, 'युग्मों')
         .replace(/वाक्यांशी(?=[\s,।!?\)]|$)/g, 'वाक्यांशों')
         .replace(/नियमें(?=[\s,।!?\)]|$)/g, 'नियमों')
         .replace(/महापुरु\s*षी|महापुरुषी/g, 'महापुरुषों')
         .replace(/जीवी(?=[\s,।!?\)]|$)/g, 'जीवों')
         .replace(/राष्ट्र\s*पिता/g, 'राष्ट्रपिता')
         .replace(/बहु\s*वचन/g, 'बहुवचन')
         .replace(/मा\s*ध्यम/g, 'माध्यम')
         .replace(/इंद्रि\s*यों/g, 'इंद्रियों')
         .replace(/ारिका\s*प्रसाद/g, 'द्वारिका प्रसाद')
         .replace(/\bारा\b/g, 'द्वारा')
         .replace(/गोलपोस्\s*ट|गोलपो\s*स्ट/g, 'गोलपोस्ट')
         .replace(/बच्च\s*न/g, 'बच्चन')
         .replace(/\bदीघ\b/g, 'दीर्घ')
         .replace(/\bलिग\b/g, 'लिंग')
         .replace(/स्त्रीलिग/g, 'स्त्रीलिंग')
         .replace(/\bहिदी\b/g, 'हिंदी')
         .replace(/पढ़ए/g, 'पढ़िए')
         .replace(/रिक्\s*त\s*ान|रिक्\s*त\s*स्थान/g, 'रिक्त स्थान')
         .replace(/भिन्न\s*ाथीक/g, 'भिन्नार्थक')
         .replace(/पुलि्\s*लंग|पुलि्लंग/g, 'पुल्लिंग')
         .replace(/क्र\s*मशः/g, 'क्रमशः')
         .replace(/क्र\s*म(?=[\s,।!?\)]|$)/g, 'क्रम')
         .replace(/दू\s*रभाष/g, 'दूरभाष')
         .replace(/दू\s*र(?=[\s,।!?\)]|$)/g, 'दूर')
         .replace(/रू\s*प/g, 'रूप')
         .replace(/अनुचित\s*प्र\s*योग|अनुचितप्रयोग/g, 'अनुचित प्रयोग')
         .replace(/प्र\s+योग/g, 'प्रयोग')
         .replace(/प्र\s*योग/g, 'प्रयोग')
         .replace(/प्र\s*कृत/g, 'प्रकृत')
         .replace(/प्र\s*कट/g, 'प्रकट')
         .replace(/प्र\s*कार/g, 'प्रकार')
         .replace(/प्र\s*श्न/g, 'प्रश्न')
         .replace(/प्र\s*धान/g, 'प्रधान')
         .replace(/प्र\s*भाव/g, 'प्रभाव')
         .replace(/प्र\s*मुख/g, 'प्रमुख')
         .replace(/प्र\s*शंसा/g, 'प्रशंसा')
         .replace(/प्र\s*ति/g, 'प्रति')
         .replace(/प्र\s*थम/g, 'प्रथम')
         .replace(/प्र\s*सिद्धि/g, 'प्रसिद्धि')
         .replace(/प्र\s*ाथीना|प्र\s*ाथना|प्राथीना/g, 'प्रार्थना')
         .replace(/दू\s*ध/g, 'दूध')
         .replace(/दू\s*सरे|दू\s*सरी/g, 'दूसरे')
         .replace(/तत्\s*सम/g, 'तत्सम')
         .replace(/तद्\s*भव/g, 'तद्भव')
         .replace(/दुग्\s*ध/g, 'दुग्ध')
         .replace(/व्य\s*क्ति/g, 'व्यक्ति')
         .replace(/शिल्\s*पी/g, 'शिल्पी')
         .replace(/पु\s*स्त/g, 'पुस्त')
         .replace(/विद्य\s*ालय/g, 'विद्यालय')
         .replace(/मुख्\s*य/g, 'मुख्य')
         .replace(/दिल्\s*ली/g, 'दिल्ली')
         .replace(/नृ\s*त्य/g, 'नृत्य')
         .replace(/सत्रि\s*या/g, 'सत्रिया')
         .replace(/पश्चिम\s*ी/g, 'पश्चिमी')
         .replace(/शास्\s*त्रीय/g, 'शास्त्रीय')
         .replace(/महिला\s*ओं/g, 'महिलाओं')
         .replace(/परंपरा\s*ओं/g, 'परंपराओं')
         .replace(/वाक्य\s*ों/g, 'वाक्यों')
         .replace(/शब्द\s*ों/g, 'शब्दों')
         .replace(/लोग\s*ों/g, 'लोगों')
         .replace(/दोन\s*ों/g, 'दोनों')
         .replace(/चार\s*ों/g, 'चारों')
         .replace(/घर\s*ों/g, 'घरों')
         .replace(/मंदिर\s*ों/g, 'मंदिरों')
         .replace(/सत्\s*कर्म/g, 'सत्कर्म')
         .replace(/अ\s*निश्च/g, 'अनिश्च')
         .replace(/वि\s*शेषण/g, 'विशेषण')
         .replace(/ट\s*[-–—]?\s*वगी|ट-वग/g, 'ट-वर्ग')
         .replace(/क\s*[-–—]?\s*वगी|क-वग/g, 'क-वर्ग')
         .replace(/च\s*[-–—]?\s*वगी|च-वग/g, 'च-वर्ग')
         .replace(/त\s*[-–—]?\s*वगी|त-वग/g, 'त-वर्ग')
         .replace(/प\s*[-–—]?\s*वगी|प-वग/g, 'प-वर्ग')
         .replace(/वगी(?=[\s,।!?\)]|$)|वग(?=[\s,।!?\)]|$)/g, 'वर्ग')
         .replace(/मार्गी(?=[\s,।!?\)]|$)/g, 'मार्ग')
         .replace(/स्वर्गी(?=[\s,।!?\)]|$)/g, 'स्वर्ग')
         .replace(/दुर्गी(?=[\s,।!?\)]|$)/g, 'दुर्ग')
         .replace(/क्\s*यों/g, 'क्यों')
         .replace(/क्\s*या/g, 'क्या')
         .replace(/क्\s*य/g, 'क्य')
         .replace(/ध्\s*या/g, 'ध्या')
         .replace(/स्\s*व/g, 'स्व')
         .replace(/त्\s*य/g, 'त्य')
         .replace(/न्\s*ह/g, 'न्ह')
         .replace(/न्\s*य/g, 'न्य')
         .replace(/व्\s*य/g, 'व्य')
         .replace(/ल्\s*प/g, 'ल्प')
         .replace(/ब्\s*द/g, 'ब्द')
         .replace(/ष्ट्\s*र/g, 'ष्ट्र')
         .replace(/प्र\s*ा/g, 'प्रा')
         .replace(/श्र\s*ी/g, 'श्री')
         .replace(/त्र\s*ी/g, 'त्री')
         .replace(/द्र\s*ी/g, 'द्री')
         .replace(/छुटि\s*टयों|छुट्ट\s*य\s*क|छुट्टि\s*यों/g, 'छुट्टियों')
         .replace(/सिह(?=[\s,।!?\)]|$)/g, 'सिंह')
         .replace(/नहैं(?=[\s,।!?\)]|$)/g, 'नहीं')
         .replace(/लोगी(?=[\s,।!?\)]|$)/g, 'लोगों')
         .replace(/दोनी(?=[\s,।!?\)]|$)/g, 'दोनों')
         .replace(/चारी ओर/g, 'चारों ओर')
         .replace(/घरी(?=[\s,।!?\)]|$)/g, 'घरों')
         .replace(/पवी(?=[\s,।!?\)]|$)/g, 'पर्व')
         .replace(/वा\s+क्य/g, 'वाक्य')
         .replace(/पयायवाची|पयाय/g, 'पर्यायवाची')
         .replace(/संदभीगत/g, 'संदर्भगत')
         .replace(/संदभी/g, 'संदर्भ')
         .replace(/उपसगी/g, 'उपसर्ग')
         .replace(/सवीनाम|सवनाम/g, 'सर्वनाम')
         .replace(/सवीथा|सवथा/g, 'सर्वथा')
         .replace(/भावपूण/g, 'भावपूर्ण')
         .replace(/संपूण|सपूण/g, 'संपूर्ण')
         .replace(/पूणतः|पूणत/g, 'पूर्णतः')
         .replace(/पूण/g, 'पूर्ण')
         .replace(/निमाण/g, 'निर्माण')
         .replace(/विचारी(?=[\s,।!?\)]|$)/g, 'विचारों')
         .replace(/अंगी(?=[\s,।!?\)]|$)/g, 'अंगों')
         .replace(/वण(?=[\s,।!?\)]|$)/g, 'वर्ण')
         .replace(/विेषण/g, 'विश्लेषण')
         .replace(/गृहकायों(?=[\s,।!?\)]|$)/g, 'गृहकार्य')
         .replace(/गीद(?=[\s,।!?\)]|$)/g, 'गेंद')
         .replace(/नजवाचक/g, 'निजवाचक')
         .replace(/क्र\s*ांतिकारी/g, 'क्रांतिकारी')
         .replace(/उल्\s*लेख/g, 'उल्लेख')
         .replace(/परस्प\s*र/g, 'परस्पर')
         .replace(/उपयुक्\s*त/g, 'उपयुक्त')
         .replace(/युग्\s*म/g, 'युग्म')
         .replace(/संस्\s*मरण/g, 'संस्मरण')
         .replace(/आत्\s*मकथात्\s*मक/g, 'आत्मकथात्मक')
         .replace(/आत्\s*मकथा/g, 'आत्मकथा')
         .replace(/विपक्ष\s*ी/g, 'विपक्षी')
         .replace(/गोलपो\s*स्ट/g, 'गोलपोस्ट')
         .replace(/पहुँ\s*चते|पहुँ\s*च/g, 'पहुँचते')
         .replace(/दशन|दशीन/g, 'दर्शन')
         .replace(/वषा(?=[\s,।!?\)]|$)/g, 'वर्षा')
         .replace(/वणन/g, 'वर्णन')
         .replace(/पवत|पवीत/g, 'पर्वत')
         .replace(/अथ(?=[\s,।!?\)]|$)/g, 'अर्थ')
         .replace(/कद्र य/g, 'केंद्रीय')
         .replace(/शान्तिपूवक|शांतिपूवीक/g, 'शांतिपूर्वक')
         .replace(/परसग|परसगी/g, 'परसर्ग')
         .replace(/धम(?=[\s,।!?\)]|$)/g, 'धर्म')
         .replace(/कम(?=[\s,।!?\)]|$)/g, 'कर्म')
         .replace(/कमें(?=[\s,।!?\)]|$)/g, 'कर्मों')
         .replace(/शब् दी|शब्दी/g, 'शब्दों')
         .replace(/वाक् यों|वाक्यी/g, 'वाक्यों')
         .replace(/मंदर|मंदिरी/g, 'मंदिरों')
         .replace(/पुजारिय|पुजारियों/g, 'पुजारियों')
         .replace(/राजदरबारी/g, 'राजदरबारों')
         .replace(/मठ(?=[\s,।!?\)]|$)/g, 'मठों');
  }

  // Precision Whitespace Normalizer & XML Control Character Sanitizer
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, '')
       .replace(/\s+([,.:;?!%°])/g, '$1')
       .replace(/([,;?!])(?=[^\s\d\)])/g, '$1 ')
       .replace(/\(\s+/g, '(')
       .replace(/\s+\)/g, ')')
       .replace(/[ \t]+/g, ' ')
       .trim();

  return s;
}

// High-Precision Option Cleaner with Exact Mathematical Fraction & Function Reconstruction
function cleanOptionText(optRaw) {
  if (!optRaw) return '';
  let s = optRaw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, '');

  s = s.replace(/\|/g, ' ')
       .replace(/[ \t]+/g, ' ')
       .replace(/cos\s*[-−]?\s*1/gi, 'cos⁻¹')
       .replace(/sin\s*[-−]?\s*1/gi, 'sin⁻¹')
       .replace(/tan\s*[-−]?\s*1/gi, 'tan⁻¹');

  // 1. Inverse trig fractions (e.g. cos⁻¹(1/√3), cos⁻¹(2/3), cos⁻¹(1/3), cos⁻¹(√2/3))
  s = s.replace(/cos⁻¹\s*\(?\s*1\s*[\/\s]\s*√\s*3[̅\u0305‾¯]?\s*\)?/gi, 'cos⁻¹(1/√3)')
       .replace(/cos⁻¹\s*\(?\s*√\s*2[̅\u0305‾¯]?\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(√2/3)')
       .replace(/cos⁻¹\s*\(?\s*2\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(2/3)')
       .replace(/cos⁻¹\s*\(?\s*1\s*[\/\s]\s*3\s*\)?/gi, 'cos⁻¹(1/3)')
       .replace(/(?:\(√\s*(\d+)\s*\)\s*cos⁻¹\s*(\d+)|cos⁻¹\s*\(?\s*√\s*(\d+)\s*\)?\s*(\d+))/gi, (m, g1, g2, g3, g4) => {
         const num = g1 || g3;
         const den = g2 || g4;
         return `cos⁻¹(√${num}/${den})`;
       })
       .replace(/cos⁻¹\s*\(\s*(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos⁻¹\s*\(\s*√\s*(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos⁻¹\s*\(\s*√[‾¯]?(\d+)\s*\)\s*([^\s\)]+)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos⁻¹\s*\(\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos⁻¹\s*\(\s*√\s*(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos⁻¹\s*\(\s*√[‾¯]?(\d+)\s*\/\s*([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos⁻¹\s*\(\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹($1/$2)')
       .replace(/cos⁻¹\s*\(\s*√\s*(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)')
       .replace(/cos⁻¹\s*\(\s*√[‾¯]?(\d+)\s+([^\)\s]+)\s*\)/gi, 'cos⁻¹(√$1/$2)');

  // 2. Susceptibility relations
  s = s.replace(/χ\s*=\s*μ\s*μ[0₀]\s*[-−]\s*1/gi, 'χ = (μ/μ₀) − 1')
       .replace(/χ\s*=\s*μ\s*μ[0₀]\s*r\s*\+\s*1/gi, 'χ = (μᵣ/μ₀) + 1')
       .replace(/χ\s*=\s*μr\s*μ[0₀]\s*\+\s*1/gi, 'χ = (μᵣ/μ₀) + 1')
       .replace(/χ\s*=\s*1\s*[-−]\s*μ\s*μ[0₀]/gi, 'χ = 1 − (μ/μ₀)')
       .replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*μ₀\s*([−\-+]\s*1)/gi, 'χ = (μ/μ₀) $1')
       .replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*r\s*\+\s*1\s*μ₀/gi, 'χ = (μᵣ/μ₀) + 1')
       .replace(/(?:μ\s*\/\s*χ|μ\s*χ)\s*=\s*1\s*[-−]\s*μ₀/gi, 'χ = 1 − (μ/μ₀)')
       .replace(/χ\s*=\s*μₜ\s*\+\s*1/gi, 'χ = μₜ + 1');

  // 3. Photoelectric / Quantum formulas
  s = s.replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[$1m(hc/λ − ϕ)] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[m(hc/λ − ϕ)] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '2√[m(hc/λ − ϕ)] / eB')
       .replace(/√\s*(\d+)\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[$1m(hc/λ − ϕ)] / eB')
       .replace(/2\s*√\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '2√[m(hc/λ − ϕ)] / eB')
       .replace(/√\s*m\s*\(\s*hc\s*λ?\s*[-−]\s*ϕ\s*\)\s*\/eB\s*λ?/gi, '√[m(hc/λ − ϕ)] / eB');

  // 4. Fractions & charges in options
  s = s.replace(/−\s*α\s*2/g, '−α/2')
       .replace(/−\s*α\s*\/\s*2/g, '−α/2')
       .replace(/−\s*45\s*∘/g, '−45°')
       .replace(/\+\s*45\s*∘/g, '+45°')
       .replace(/−\s*α/g, '−α')
       .replace(/3\s*σq\s*2\s*ϵ[0₀]/gi, '3σq / 2ϵ₀')
       .replace(/3\s*σq\s*4\s*ϵ[0₀]/gi, '3σq / 4ϵ₀')
       .replace(/σq\s*4\s*ϵ[0₀]/gi, 'σq / 4ϵ₀')
       .replace(/σq\s*2\s*ϵ[0₀]/gi, 'σq / 2ϵ₀')
       .replace(/3\s*σq\s*\n*\s*2\s*ϵ[0₀]/gi, '3σq / 2ϵ₀')
       .replace(/3\s*σq\s*\n*\s*4\s*ϵ[0₀]/gi, '3σq / 4ϵ₀')
       .replace(/σq\s*\n*\s*4\s*ϵ[0₀]/gi, 'σq / 4ϵ₀')
       .replace(/σq\s*\n*\s*2\s*ϵ[0₀]/gi, 'σq / 2ϵ₀');

  // 5. Chemistry IUPAC Name clean
  s = s.replace(/Butan\s*[−\-⁰¹²³⁴⁵⁶⁷⁸⁹\^]?\s*1\s*[-−]\s*al/gi, 'Butan-1-al')
       .replace(/Butan⁻¹-al/gi, 'Butan-1-al');

  let lines = s.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 2 && lines[0].length <= 15 && lines[1].length <= 15 && !lines[0].includes('=')) {
    s = `${lines[0]} / ${lines[1]}`;
  } else if (lines.length > 1) {
    s = lines.join(' ');
  }

  // 6. Clean up units, coordinates, and spacing
  s = s.replace(/\s*ϵ\s*0\b/gi, ' ϵ₀')
       .replace(/\s*μ\s*0\b/gi, ' μ₀')
       .replace(/\s*μ\s*r\b/gi, ' μᵣ')
       .replace(/\s*μ\s*t\b/gi, ' μₜ')
       .replace(/\(\s*(\d+)\s*d\s*\/\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, '($1d/$2, $3, $4)')
       .replace(/\(\s*d\s*\/\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, '(d/$1, $2, $3)')
       .replace(/rad\s*\/\s*s/g, 'rad/s')
       .replace(/nC\s*\/\s*m\s*2/g, 'nC/m²')
       .replace(/\s+([,.:;?!%°])/g, '$1')
       .replace(/([,;?!])(?=[^\s\d\)])/g, '$1 ')
       .replace(/\(\s+/g, '(')
       .replace(/\s+\)/g, ')')
       .replace(/[ \t]+/g, ' ')
       .replace(/\)\s*\)+$/g, ')')
       .trim();

  return s;
}

// High-Fidelity Devanagari Stream Ligature & Matra Reconstructor for Type0/Type3 Embedded Fonts
function reconstructDevanagariItems(items) {
  if (!items || !items.length) return [];
  const out = [];
  let i = 0;
  while (i < items.length) {
    let it = { ...items[i] };
    let s = it.str || '';

    // Case 1: Standalone \x00
    if (s === '\x00') {
      // Check if preceded by 'र' in previous item (e.g. र + \x00 + गा -> रोंगाली)
      if (out.length > 0 && out[out.length - 1].str.endsWith('र')) {
        const prev = out[out.length - 1];
        if (i + 1 < items.length && items[i + 1].str.startsWith('गा')) {
          prev.str = prev.str.slice(0, -1) + 'रों';
          i++;
          continue;
        }
      }

      // If next item starts with consonant -> prefix chhoti 'i' matra
      if (i + 1 < items.length) {
        const nextIt = { ...items[i + 1] };
        let nextStr = nextIt.str || '';
        const m = nextStr.match(/^([क-ह](?:्[क-ह])?)(.*)/);
        if (m) {
          nextIt.str = m[1] + '\u093F' + m[2];
          items[i + 1] = nextIt;
          i++;
          continue;
        }
      }
    }

    // Case 2: Within-item \x00 prefix before consonant => consonant + chhoti 'i' matra (\u093F)
    s = s.replace(/\x00([क-ह](?:्[क-ह])?)/g, '$1\u093F');

    // Case 3: Suffix \x00 transformations
    s = s.replace(/क\x00/g, 'की')
         .replace(/म\x00/g, 'में')
         .replace(/य\x00/g, 'यों')
         .replace(/थ\x00/g, 'थी')
         .replace(/ह\x00/g, 'हैं')
         .replace(/छ\x00/g, 'छी')
         .replace(/न\x00/g, 'नी')
         .replace(/ल\x00/g, 'ली')
         .replace(/स\x00/g, 'सी')
         .replace(/द\x00/g, 'दी')
         .replace(/र\x00/g, 'री')
         .replace(/ब\x00/g, 'बी')
         .replace(/प\x00/g, 'पी')
         .replace(/ट\x00/g, 'टी')
         .replace(/ड\x00/g, 'डी')
         .replace(/व\x00/g, 'वी')
         .replace(/भ\x00/g, 'भी')
         .replace(/श\x00/g, 'शी')
         .replace(/ष\x00/g, 'षी')
         .replace(/ज\x00/g, 'जी')
         .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    it.str = s;
    if (it.str.length > 0) {
      out.push(it);
    }
    i++;
  }
  return out;
}

// Universal Client-Side PDF Parser using PDF.js with Tight 3.8px Baseline Line Clustering
btnParsePdf.addEventListener('click', async () => {
  if (!state.pdfArrayBuffer) return;

  btnParsePdf.disabled = true;
  btnParsePdf.innerHTML = '<span>⏳</span> Parsing PDF in browser...';
  genStatusText.innerText = 'Extracting questions client-side...';

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: state.pdfArrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
    });
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
          str: item.str || '',
          x: tx[4],
          y: (viewport.height / 2.0) - (tx[5] / 2.0),
          width: item.width || 0,
          height: item.height || Math.abs(tx[3]) || 10
        };
      }).filter(it => it.str.length > 0);

      // Reconstruct cross-token Devanagari ligatures and prefixes
      items = reconstructDevanagariItems(items);

      // Filter right-edge marks column and standard headers/footers
      items = items.filter(it => {
        const s = it.str.trim();
        if (it.x > 565 && ['1', '2', '3', '4', '5', '0.5'].includes(s)) return false;
        if (it.y < 35 && (s.toLowerCase().includes('cbse') || s.toLowerCase().includes('quiz') || s.toLowerCase().includes('careers360'))) return false;
        if (it.y > ((viewport.height / 2.0) - 45) && (s.toLowerCase().includes('page') || /^\d+$/.test(s))) return false;
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
        let lastX = null;
        let lastW = null;

        for (const t of l.items) {
          let tokenStr = t.str;
          if (!tokenStr && tokenStr !== ' ') continue;

          if (lastX === null) {
            lineText = tokenStr;
          } else {
            if (tokenStr === ' ') {
              if (!lineText.endsWith(' ')) lineText += ' ';
            } else {
              const isDev = /[\u0900-\u097F]/.test(tokenStr) || /[\u0900-\u097F]/.test(lineText);
              const isDependentMatra = /^[\u093A-\u094F\u0901-\u0903\u0951-\u0954\u093C]/.test(tokenStr);
              const minGap = isDev ? 8.0 : 2.2;
              const gap = t.x - (lastX + lastW);
              if (gap > minGap && !isDependentMatra && !lineText.endsWith(' ') && !tokenStr.startsWith(' ') && !tokenStr.startsWith(')')) {
                lineText += ' ' + tokenStr;
              } else {
                lineText += tokenStr;
              }
            }
          }
          lastX = t.x;
          lastW = t.width;
        }

        lineText = formatMathText(lineText.replace(/\s+/g, ' ').trim());
        if (lineText) {
          if (/(?:chemistry|रसायन)/i.test(lineText)) currentSection = 'Chemistry';
          else if (/(?:physics|भौतिक)/i.test(lineText)) currentSection = 'Physics';
          else if (/(?:mathematics|maths|गणित)/i.test(lineText)) currentSection = 'Mathematics';
          else if (/(?:biology|जीव\s*विज्ञान)/i.test(lineText)) currentSection = 'Biology';
          else if (/(?:social\s*science|सामाजिक\s*विज्ञान)/i.test(lineText)) currentSection = 'Social Science';
          else if (/(?:general\s*knowledge|सामान्य\s*ज्ञान|सामान्य\s*अध्ययन)/i.test(lineText)) currentSection = 'General Knowledge';
          else if (/(?:हिंदी|हिन्दी)/i.test(lineText)) currentSection = 'Hindi';
          else if (/(?:पर्यावरण|evs)/i.test(lineText)) currentSection = 'EVS';
          
          if (!isHeaderOrFooter(lineText)) {
            pageLines.push(lineText);
          }
        }
      }

      // Guarded Section-Aware Diagram Detection on this Page
      if (chkAutoDiagrams.checked) {
        for (let i = 0; i < lines.length; i++) {
          const lineStr = lines[i].items.map(it => it.str).join(' ');
          const qm = lineStr.match(/(?:^|\s)(?:Q(?:uestion)?|Que\.?|प्रश्न|प्र(?:श्न)?[\.०\s]*(?:संख्या|सं[\.०])?)\s*[:\.\-]?\s*([0-9०-९]+)/i);
          if (qm) {
            const rawQNum = qm[1];
            const qNum = parseInt(devanagariToWesternDigits(rawQNum), 10);
            let fullStemText = lineStr;
            let stemBottomY = lines[i].base_y + 15;
            let optTopY = null;

            for (let j = i + 1; j < lines.length; j++) {
              const nextLineStr = lines[j].items.map(it => it.str).join(' ');
              if (/^(?:Option\s*[1-4A-D]|विकल्प\s*[1-4A-Dक-घअ-द१-४]|\([A-D1-4क-घअ-द१-४]\)|[A-Dक-घअ-द१-४][\.\)])/i.test(nextLineStr.trim())) {
                optTopY = lines[j].base_y;
                break;
              }
              if (/^(?:Q(?:uestion)?|Que\.?|प्रश्न|प्र(?:श्न)?[\.०\s]*(?:संख्या|सं[\.०])?)\s*[:\.\-]?\s*[0-9०-९]+/i.test(nextLineStr.trim()) || /^(?:Solution|Correct Answer|Ans(?:wer)?:|उत्तर|हल|व्याख्या|स्पष्टीकरण):/i.test(nextLineStr.trim())) {
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
  const l = (text || '').toLowerCase().trim();
  return l.includes('cbse') || l.includes('careers360') || (l.includes('page ') && l.length < 30) || l.includes('maximum marks') || l.includes('general instructions') || l.includes('subject:') || l.includes('quiz hindi');
}

// Paragraph Reflow Engine: reconstructs connected sentences without breaking numbered statements / lists
function reflowStemParagraphs(stem) {
  const lines = stem.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return stem;

  let result = [];
  let currentPara = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const isSpecialItem = /^(?:\([A-Da-d1-4क-घअ-द१-४I-Vixv]+\)|[1-4१-४]\.|\•|Statement\s+[I|V|X\d]+|कथन\s*[1-4१-४I-V]|Assertion|Reason|अभिकथन|कारण|List-[I|V\d]+|सूची\s*[-–—]?[I|V\d१-४]+|Column\s+[I|V\d]+|स्तंभ\s*[-–—]?[I|V\d१-४]+|Choose\s+the\s+correct|सही\s+उत्तर\s+चुनें|सुमेलित\s+कीजिए|x₁\s*=|where\s+x\s+is|where\s+P|\(P\s*\+\s*a\/V²\))/i.test(line);
    const prevEndsColon = /[:।]\s*$/.test(currentPara);
    const prevIsFormula = /^(?:x₁\s*=|(?:\([A-Za-z0-9_\s\+\/²]+\)))/i.test(currentPara);

    if (isSpecialItem || prevEndsColon || prevIsFormula) {
      result.push(currentPara);
      currentPara = line;
    } else {
      currentPara += " " + line;
    }
  }
  result.push(currentPara);
  return result.join('\n');
}

// Universal Question Parser: Handles Standard Exams, Hindi & Devanagari, Careers360, JEE, NEET, CBSE
function parseUniversalQuestions(fullStream) {
  // Matches Q. 1, Question 1, प्रश्न 1., प्र. 1., प्र० 1., प्रश्न संख्या 1, प्रश्न १., and standalone 1. in Hindi/Devanagari
  const qPat = /(?:^|\n)\s*(?:(?:Section\s+[A-Za-z0-9]+:?|Physics|Chemistry|Mathematics|Biology|Social\s+Science|General\s+Knowledge|General\s+Studies|Hindi|English|भौतिक\s*विज्ञान|भौतिकी|रसायन\s*विज्ञान|रसायन\s*शास्त्र|गणित|जीव\s*विज्ञान|सामाजिक\s*विज्ञान|सामान्य\s*ज्ञान|सामान्य\s*अध्ययन|हिंदी|हिन्दी|अंग्रेजी|पर्यावरण\s*अध्ययन|बाल\s*विकास|तर्कशक्ति|रीजनिंग|(?:खंड|भाग)\s*[-–—:]\s*[क-घअ-दA-Da-d1-4०-९]+)\s*\n+)?\s*(?:(?:Q\.?|Question|Que\.?|question|que\.?|प्रश्न|प्र(?:श्न)?[\.०\s]*(?:संख्या|सं[\.०])?)\s*[:\.\-]?\s*([0-9०-९]+)|([0-9०-९]+)[\.\:\-]\s+(?=[\u0900-\u097F]|['"‘“]\s*[\u0900-\u097F]))\s*[:\.\-–—]?\s*/g;

  let matches = [];
  let m;
  while ((m = qPat.exec(fullStream)) !== null) {
    matches.push(m);
  }

  let questions = [];
  let currentSection = 'Hindi';

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const rawQNum = match[1] || match[2] || (i + 1);
    const qNumStr = devanagariToWesternDigits(rawQNum);
    const qNum = parseInt(qNumStr, 10);

    const preChunk = fullStream.slice(Math.max(0, match.index - 120), match.index);
    const secMatch = (match[0] + " " + preChunk).match(/(?:^|[\s\n\r])(Physics|Chemistry|Mathematics|Biology|Social\s+Science|General\s+Knowledge|General\s+Studies|Hindi|English|भौतिक\s*विज्ञान|भौतिकी|रसायन\s*विज्ञान|रसायन\s*शास्त्र|गणित|जीव\s*विज्ञान|सामाजिक\s*विज्ञान|सामान्य\s*ज्ञान|सामान्य\s*अध्ययन|हिंदी|हिन्दी|अंग्रेजी|पर्यावरण\s*अध्ययन|बाल\s*विकास|तर्कशक्ति|रीजनिंग|(?:खंड|भाग)\s*[-–—:]\s*[क-घअ-दA-Da-d1-4०-९]+|Section\s+[A-Za-z0-9]+:?[^\n]*)/i);
    if (secMatch) {
      currentSection = secMatch[1].trim();
    }

    const startIdx = match.index + match[0].length;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : fullStream.length;
    let rawChunk = fullStream.slice(startIdx, endIdx).trim();

    if (rawChunk.length < 5) continue;

    // Isolate Question & Options from "Correct Answer:", "Solution:", "उत्तर:", "हल:"
    const solMatch = rawChunk.match(/\n\s*(?:Correct\s+Answer:|Solution:|Ans(?:wer)?:|उत्तर\s*[:\-]|सही\s+उत्तर\s*[:\-]|हल\s*[:\-]|व्याख्या\s*[:\-]|स्पष्टीकरण\s*[:\-])/i);
    let qaChunk = rawChunk;
    let solChunk = "";
    if (solMatch) {
      qaChunk = rawChunk.slice(0, solMatch.index).trim();
      solChunk = rawChunk.slice(solMatch.index).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, '').trim();
    }

    // Precise option marker pattern: matches (A), (B), (C), (D), (1), (2), (3), (4), (क), (ख), (ग), (घ), (अ), (ब), (स), (द), (१), (२), (३), (४)
    const optPat = /(?:^|[\s\n\r])(?:(?:Option|विकल्प)\s*(?:\(\s*([1-4A-Da-dक-घअ-द१-४])\s*\)|([1-4A-Da-dक-घअ-द१-४]))\s*:|\(\s*([A-Da-d1-4क-घअ-द१-४]|i{1,3}|iv|v|vi{0,3}|ix|x)\s*\)|([A-Da-d1-4])[\.\)])\s*/gi;
    let optMatches = [];
    let om;
    while ((om = optPat.exec(qaChunk)) !== null) {
      optMatches.push(om);
    }

    let stem = qaChunk;
    let optA = '', optB = '', optC = '', optD = '';
    let optLabels = { A: '(A)', B: '(B)', C: '(C)', D: '(D)' };

    if (optMatches.length >= 4) {
      const mA = optMatches[optMatches.length - 4];
      const mB = optMatches[optMatches.length - 3];
      const mC = optMatches[optMatches.length - 2];
      const mD = optMatches[optMatches.length - 1];

      const rawA = (mA[1] || mA[2] || mA[3] || mA[4] || 'A').trim();
      const rawB = (mB[1] || mB[2] || mB[3] || mB[4] || 'B').trim();
      const rawC = (mC[1] || mC[2] || mC[3] || mC[4] || 'C').trim();
      const rawD = (mD[1] || mD[2] || mD[3] || mD[4] || 'D').trim();

      optLabels = {
        A: `(${rawA})`,
        B: `(${rawB})`,
        C: `(${rawC})`,
        D: `(${rawD})`
      };

      stem = qaChunk.slice(0, mA.index).trim();
      optA = formatMathText(cleanOptionText(qaChunk.slice(mA.index + mA[0].length, mB.index)));
      optB = formatMathText(cleanOptionText(qaChunk.slice(mB.index + mB[0].length, mC.index)));
      optC = formatMathText(cleanOptionText(qaChunk.slice(mC.index + mC[0].length, mD.index)));
      optD = formatMathText(cleanOptionText(qaChunk.slice(mD.index + mD[0].length)));
    } else if (optMatches.length === 3) {
      const mA = optMatches[0], mB = optMatches[1], mC = optMatches[2];
      const rawA = (mA[1] || mA[2] || mA[3] || mA[4] || 'A').trim();
      const rawB = (mB[1] || mB[2] || mB[3] || mB[4] || 'B').trim();
      const rawC = (mC[1] || mC[2] || mC[3] || mC[4] || 'C').trim();
      optLabels = { A: `(${rawA})`, B: `(${rawB})`, C: `(${rawC})`, D: '(D)' };
      stem = qaChunk.slice(0, mA.index).trim();
      optA = formatMathText(cleanOptionText(qaChunk.slice(mA.index + mA[0].length, mB.index)));
      optB = formatMathText(cleanOptionText(qaChunk.slice(mB.index + mB[0].length, mC.index)));
      optC = formatMathText(cleanOptionText(qaChunk.slice(mC.index + mC[0].length)));
    } else if (optMatches.length === 2) {
      const mA = optMatches[0], mB = optMatches[1];
      const rawA = (mA[1] || mA[2] || mA[3] || mA[4] || 'A').trim();
      const rawB = (mB[1] || mB[2] || mB[3] || mB[4] || 'B').trim();
      optLabels = { A: `(${rawA})`, B: `(${rawB})`, C: '(C)', D: '(D)' };
      stem = qaChunk.slice(0, mA.index).trim();
      optA = formatMathText(cleanOptionText(qaChunk.slice(mA.index + mA[0].length, mB.index)));
      optB = formatMathText(cleanOptionText(qaChunk.slice(mB.index + mB[0].length)));
    }

    // Clean Real Gas Equation 2 formatting if floating tokens occurred
    stem = stem.replace(/\(P\s*\+\s*a\s*\)\s*\(V\s*[−\-]\s*b\s*\)\s*=\s*RT\s*,\s*where\s*P,\s*V,\s*T\s*and\s*R\s*are\s*\n\s*V2\s*\n\s*ab[−\-]2\s*\n\s*the\s*pressure/gi,
      '(P + a/V²)(V − b) = RT, where P, V, T and R are the pressure, volume, temperature and gas constant, respectively. The dimension of ab⁻² is')
      .replace(/\(P\s*\+\s*a\/V2\s*\)/g, '(P + a/V²)')
      .replace(/\(P\s*\+\s*a\/V²\s*\)/g, '(P + a/V²)')
      .replace(/\(P\s*\+\s*V\s*a\s*2\s*\)/g, '(P + a/V²)')
      .replace(/ab[−\-]2\b/g, 'ab⁻²')
      .replace(/(?:^|\n)\s*Option\s+[1-4]:\s*/gi, '\n');

    let stemLines = stem.split('\n').map(l => formatMathText(l)).filter(l => l && !isHeaderOrFooter(l));
    const reflowedStem = formatMathText(reflowStemParagraphs(stemLines.join('\n')));

    questions.push({
      q_num: qNum,
      section: currentSection,
      question: reflowedStem,
      options: { A: optA, B: optB, C: optC, D: optD },
      optLabels: optLabels,
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
        ${q.options.A ? `<div class="q-opt"><span>${(q.optLabels && q.optLabels.A) || '(A)'}</span> ${escapeHtml(q.options.A)}</div>` : ''}
        ${q.options.B ? `<div class="q-opt"><span>${(q.optLabels && q.optLabels.B) || '(B)'}</span> ${escapeHtml(q.options.B)}</div>` : ''}
        ${q.options.C ? `<div class="q-opt"><span>${(q.optLabels && q.optLabels.C) || '(C)'}</span> ${escapeHtml(q.options.C)}</div>` : ''}
        ${q.options.D ? `<div class="q-opt"><span>${(q.optLabels && q.optLabels.D) || '(D)'}</span> ${escapeHtml(q.options.D)}</div>` : ''}
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
      pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inches (PowerPoint Standard Widescreen)

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
      const fontScaleFactor = (parseFloat(inputFontScale ? inputFontScale.value : 100) || 100) / 100;

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

        const isHindi = isDevanagari(q.question) || isDevanagari(q.section) || ['A', 'B', 'C', 'D'].some(k => isDevanagari(q.options[k]));
        const slideFontFace = isHindi ? 'Nirmala UI' : 'Segoe UI';
        const getOptLbl = (k) => (q.optLabels && q.optLabels[k]) ? `${q.optLabels[k]} ` : `(${k}) `;

        // 1. Question with Genuine Diagram (e.g. Q4 lens, Q5 plates, Q13 lamina, Q17 surface, Q19 bob)
        if (q.imageData) {
          const topH = Math.min(1.4, 1.1 * fontScaleFactor);
          const topStPt = Math.max(11, Math.round(14 * fontScaleFactor));
          const topQPt = Math.max(13, Math.round(17 * fontScaleFactor));
          const textRunsTop = [];
          if (q.section) {
            textRunsTop.push({ text: q.section.toUpperCase(), options: { fontSize: Math.max(10, Math.round(11.5 * fontScaleFactor)), bold: true, color: colSecHex, fontFace: slideFontFace, breakLine: true } });
          }
          textRunsTop.push({ text: `Q${q.q_num}. `, options: { fontSize: topQPt, bold: true, color: colQnumHex, fontFace: slideFontFace } });
          textRunsTop.push({ text: stemLines[0], options: { fontSize: topStPt, bold: true, color: colStemHex, fontFace: slideFontFace, breakLine: true } });

          slide.addText(textRunsTop, { x: bLeft, y: bTop, w: bWidth, h: topH, wrap: true, valign: 'top', fontFace: slideFontFace });

          const diagW = 3.8;
          const diagH = 1.95;
          const diagL = bLeft + (bWidth - diagW) / 2;
          const diagT = bTop + topH + 0.05;
          slide.addImage({ data: q.imageData, x: diagL, y: diagT, w: diagW, h: diagH });

          const botT = diagT + diagH + 0.05;
          const botH = (bTop + bHeight) - botT;
          const botStPt = Math.max(10.5, Math.round(12.5 * fontScaleFactor));
          const botOptPt = Math.max(10, Math.round(12 * fontScaleFactor));

          const hasDiagMath = ['A', 'B', 'C', 'D'].some(k => q.options[k] && isMathExpression(q.options[k]));
          if (hasDiagMath) {
            let curDiagOptY = botT;
            if (stemLines.length > 1) {
              const subStemH = 0.4;
              slide.addText([{ text: stemLines.slice(1).join('\n'), options: { fontSize: botStPt, bold: true, color: colStemHex, fontFace: slideFontFace } }], {
                x: bLeft, y: curDiagOptY, w: bWidth, h: subStemH, wrap: true, valign: 'top', fontFace: slideFontFace
              });
              curDiagOptY += subStemH + 0.05;
            }
            const diagOptSpacing = Math.max(0.42, (botH - 0.2) / 4.2);
            for (const k of ['A', 'B', 'C', 'D']) {
              if (q.options[k]) {
                if (isMathExpression(q.options[k])) {
                  const svgOpt = renderMathOptionToSvg(k, q.options[k], botOptPt);
                  const imgOpt = await svgToPngDataUrl(svgOpt);
                  slide.addImage({ data: imgOpt.dataUrl, x: bLeft, y: curDiagOptY, w: imgOpt.widthInches, h: imgOpt.heightInches });
                } else {
                  slide.addText([
                    { text: getOptLbl(k), options: { fontSize: botOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
                    { text: q.options[k], options: { fontSize: botOptPt, color: 'F5F5F5', fontFace: slideFontFace } }
                  ], { x: bLeft, y: curDiagOptY, w: bWidth, h: diagOptSpacing, wrap: true, valign: 'top', fontFace: slideFontFace });
                }
                curDiagOptY += diagOptSpacing;
              }
            }
          } else {
            const textRunsBot = [];
            if (stemLines.length > 1) {
              textRunsBot.push({ text: stemLines.slice(1).join('\n'), options: { fontSize: botStPt, bold: true, color: colStemHex, fontFace: slideFontFace, breakLine: true } });
            }

            for (const k of ['A', 'B', 'C', 'D']) {
              if (q.options[k]) {
                textRunsBot.push({ text: getOptLbl(k), options: { fontSize: botOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } });
                textRunsBot.push({ text: q.options[k] || '', options: { fontSize: botOptPt, color: 'F5F5F5', fontFace: slideFontFace, breakLine: true } });
              }
            }

            if (solutionMode === 'inline' && q.solution) {
              const ansLine = q.solution.split('\n')[0] || '';
              textRunsBot.push({ text: '\n' + ansLine, options: { fontSize: Math.max(10.5, Math.round(11.5 * fontScaleFactor)), bold: true, color: '81C784', fontFace: slideFontFace } });
            }

            slide.addText(textRunsBot, { x: bLeft, y: botT, w: bWidth, h: botH, wrap: true, valign: 'top', fontFace: slideFontFace });
          }
        }
        // 2. 2x2 Grid Layout for Short Options
        else if (chk2x2Grid.checked && q.options.A && q.options.B && q.options.C && q.options.D && maxOptLen <= 35 && q.question.length <= 260 && stemLines.length === 1) {
          const gStPt = Math.round(23 * fontScaleFactor);
          const gQPt = Math.round(26 * fontScaleFactor);
          const gOptPt = Math.round(21 * fontScaleFactor);
          const gSecPt = Math.max(11, Math.round(13 * fontScaleFactor));

          const qTextRuns = [];
          if (q.section) {
            qTextRuns.push({ text: q.section.toUpperCase(), options: { fontSize: gSecPt, bold: true, color: colSecHex, fontFace: slideFontFace, breakLine: true } });
          }
          qTextRuns.push({ text: `Q${q.q_num}. `, options: { fontSize: gQPt, bold: true, color: colQnumHex, fontFace: slideFontFace } });
          qTextRuns.push({ text: q.question, options: { fontSize: gStPt, bold: true, color: colStemHex, fontFace: slideFontFace } });

          const stemBoxH = Math.min(2.8, 2.3 * (fontScaleFactor > 1.2 ? 1.2 : 1.0));
          slide.addText(qTextRuns, {
            x: bLeft,
            y: bTop,
            w: bWidth,
            h: stemBoxH,
            wrap: true,
            valign: 'top',
            fontFace: slideFontFace
          });

          const colW = (bWidth - 0.5) / 2;
          const col1X = bLeft;
          const col2X = bLeft + colW + 0.5;
          const row1Y = bTop + stemBoxH + 0.25;
          const row2Y = row1Y + 1.25;

          const hasMath = ['A', 'B', 'C', 'D'].some(k => q.options[k] && isMathExpression(q.options[k]));
          if (hasMath) {
            if (q.options.A) {
              if (isMathExpression(q.options.A)) {
                const svgA = renderMathOptionToSvg("A", q.options.A, gOptPt);
                const imgA = await svgToPngDataUrl(svgA);
                slide.addImage({ data: imgA.dataUrl, x: col1X, y: row1Y, w: imgA.widthInches, h: imgA.heightInches });
              } else {
                slide.addText([
                  { text: getOptLbl('A'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
                  { text: q.options.A, options: { fontSize: gOptPt, color: 'F5F5F5', fontFace: slideFontFace } }
                ], { x: col1X, y: row1Y, w: colW, h: 0.8, wrap: true, valign: 'top', fontFace: slideFontFace });
              }
            }

            if (q.options.C) {
              if (isMathExpression(q.options.C)) {
                const svgC = renderMathOptionToSvg("C", q.options.C, gOptPt);
                const imgC = await svgToPngDataUrl(svgC);
                slide.addImage({ data: imgC.dataUrl, x: col1X, y: row2Y, w: imgC.widthInches, h: imgC.heightInches });
              } else {
                slide.addText([
                  { text: getOptLbl('C'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
                  { text: q.options.C, options: { fontSize: gOptPt, color: 'F5F5F5', fontFace: slideFontFace } }
                ], { x: col1X, y: row2Y, w: colW, h: 0.8, wrap: true, valign: 'top', fontFace: slideFontFace });
              }
            }

            if (q.options.B) {
              if (isMathExpression(q.options.B)) {
                const svgB = renderMathOptionToSvg("B", q.options.B, gOptPt);
                const imgB = await svgToPngDataUrl(svgB);
                slide.addImage({ data: imgB.dataUrl, x: col2X, y: row1Y, w: imgB.widthInches, h: imgB.heightInches });
              } else {
                slide.addText([
                  { text: getOptLbl('B'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
                  { text: q.options.B, options: { fontSize: gOptPt, color: 'F5F5F5', fontFace: slideFontFace } }
                ], { x: col2X, y: row1Y, w: colW, h: 0.8, wrap: true, valign: 'top', fontFace: slideFontFace });
              }
            }

            if (q.options.D) {
              if (isMathExpression(q.options.D)) {
                const svgD = renderMathOptionToSvg("D", q.options.D, gOptPt);
                const imgD = await svgToPngDataUrl(svgD);
                slide.addImage({ data: imgD.dataUrl, x: col2X, y: row2Y, w: imgD.widthInches, h: imgD.heightInches });
              } else {
                slide.addText([
                  { text: getOptLbl('D'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
                  { text: q.options.D, options: { fontSize: gOptPt, color: 'F5F5F5', fontFace: slideFontFace } }
                ], { x: col2X, y: row2Y, w: colW, h: 0.8, wrap: true, valign: 'top', fontFace: slideFontFace });
              }
            }
          } else {
            // Col 1 (A & C)
            slide.addText([
              { text: getOptLbl('A'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
              { text: q.options.A, options: { fontSize: gOptPt, color: 'F5F5F5', fontFace: slideFontFace, breakLine: true } },
              { text: '\n', options: { fontSize: Math.max(6, Math.round(10 * fontScaleFactor)), breakLine: true } },
              { text: getOptLbl('C'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
              { text: q.options.C, options: { fontSize: gOptPt, color: 'F5F5F5', fontFace: slideFontFace } }
            ], { x: col1X, y: row1Y, w: colW, h: 1.8, wrap: true, valign: 'top', fontFace: slideFontFace });

            // Col 2 (B & D)
            slide.addText([
              { text: getOptLbl('B'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
              { text: q.options.B, options: { fontSize: gOptPt, color: 'F5F5F5', fontFace: slideFontFace, breakLine: true } },
              { text: '\n', options: { fontSize: Math.max(6, Math.round(10 * fontScaleFactor)), breakLine: true } },
              { text: getOptLbl('D'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
              { text: q.options.D, options: { fontSize: gOptPt, color: 'F5F5F5', fontFace: slideFontFace } }
            ], { x: col2X, y: row1Y, w: colW, h: 1.8, wrap: true, valign: 'top', fontFace: slideFontFace });
          }
        }
        // 3. Standard Vertical Layout with Dynamic Typography & Smart Auto-Fit
        else {
          let baseSt = 20, baseOpt = 17, baseSp = 10;
          const totalChars = q.question.length + (q.options.A || '').length + (q.options.B || '').length + (q.options.C || '').length + (q.options.D || '').length;

          if (chkFontMaximizer.checked) {
            if (totalChars > 700) { baseSt = 14; baseOpt = 12.5; baseSp = 4; }
            else if (totalChars > 500) { baseSt = 16; baseOpt = 14.5; baseSp = 6; }
            else if (totalChars > 350) { baseSt = 18; baseOpt = 16; baseSp = 8; }
            else { baseSt = 22; baseOpt = 19; baseSp = 12; }
          }

          let stPt = Math.round(baseSt * fontScaleFactor);
          let optPt = Math.round(baseOpt * fontScaleFactor);
          let spPt = Math.max(3, Math.round(baseSp * fontScaleFactor));

          // Smart Auto-Fit Safety Guard: Dynamically scale font to guarantee zero boundary overflow
          const charsPerLine = Math.max(35, Math.floor(bWidth * (72 / (stPt * 0.55))));
          const estStemLines = stemLines.reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
          const optCharsPerLine = Math.max(35, Math.floor(bWidth * (72 / (optPt * 0.55))));
          const optLinesCount = ['A', 'B', 'C', 'D'].filter(k => q.options[k]).reduce((acc, k) => acc + Math.max(1, Math.ceil((q.options[k] || '').length / optCharsPerLine)), 0);
          const estTotalHeight = (estStemLines * stPt * 1.35 + optLinesCount * optPt * 1.35 + spPt + 30) / 72;

          if (estTotalHeight > bHeight * 0.95) {
            const damp = (bHeight * 0.95) / estTotalHeight;
            stPt = Math.max(11, Math.floor(stPt * damp));
            optPt = Math.max(10, Math.floor(optPt * damp));
            spPt = Math.max(2, Math.floor(spPt * damp));
          }

          const hasStemMath = stemLines.some(l => isMathExpression(l));
          const hasOptMath = ['A', 'B', 'C', 'D'].some(k => q.options[k] && isMathExpression(q.options[k]));
          const hasMath = hasStemMath || hasOptMath;

          if (hasMath) {
            let curContentY = bTop;

            for (let i = 0; i < stemLines.length; i++) {
              const sub = stemLines[i];
              if (i === 0) {
                const headerRuns = [];
                if (q.section) {
                  headerRuns.push({ text: q.section.toUpperCase(), options: { fontSize: Math.max(10.5, stPt - 7), bold: true, color: colSecHex, fontFace: slideFontFace, breakLine: true } });
                }
                headerRuns.push({ text: `Q${q.q_num}. `, options: { fontSize: stPt + 3, bold: true, color: colQnumHex, fontFace: slideFontFace } });
                headerRuns.push({ text: sub, options: { fontSize: stPt, bold: true, color: colStemHex, fontFace: slideFontFace } });

                const hLines = Math.max(1, Math.ceil((sub.length + 8) / charsPerLine));
                const lineH = (hLines * stPt * 1.35) / 72 + 0.15;
                slide.addText(headerRuns, { x: bLeft, y: curContentY, w: bWidth, h: lineH, wrap: true, valign: 'top', fontFace: slideFontFace });
                curContentY += lineH + 0.05;
              } else if (isMathExpression(sub)) {
                const svgMath = renderMathOptionToSvg(null, sub, Math.round(stPt * 0.95), '#FFF5B4');
                const imgMath = await svgToPngDataUrl(svgMath);
                slide.addImage({ data: imgMath.dataUrl, x: bLeft, y: curContentY, w: imgMath.widthInches, h: imgMath.heightInches });
                curContentY += imgMath.heightInches + 0.08;
              } else {
                const isStmt = sub.startsWith('1.') || sub.startsWith('2.') || sub.startsWith('3.') || sub.startsWith('•') || sub.startsWith('Statement') || sub.startsWith('Column');
                const subLines = Math.max(1, Math.ceil(sub.length / charsPerLine));
                const lineH = (subLines * stPt * 1.35 * 0.95) / 72 + 0.1;
                slide.addText([{ text: sub, options: { fontSize: stPt * 0.95, bold: true, color: isStmt ? 'FFF5B4' : colStemHex, fontFace: slideFontFace } }], {
                  x: bLeft, y: curContentY, w: bWidth, h: lineH, wrap: true, valign: 'top', fontFace: slideFontFace
                });
                curContentY += lineH + 0.05;
              }
            }

            curContentY += 0.1;
            const remainingH = Math.max(2.0, (bTop + bHeight) - curContentY);
            const optSpacing = Math.max(0.55, remainingH / 4.2);

            for (const k of ['A', 'B', 'C', 'D']) {
              if (q.options[k]) {
                if (isMathExpression(q.options[k])) {
                  const svgOpt = renderMathOptionToSvg(k, q.options[k], optPt);
                  const imgOpt = await svgToPngDataUrl(svgOpt);
                  slide.addImage({ data: imgOpt.dataUrl, x: bLeft, y: curContentY, w: imgOpt.widthInches, h: imgOpt.heightInches });
                } else {
                  slide.addText([
                    { text: getOptLbl(k), options: { fontSize: optPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
                    { text: q.options[k], options: { fontSize: optPt, color: 'F5F5F5', fontFace: slideFontFace } }
                  ], { x: bLeft, y: curContentY, w: bWidth, h: optSpacing, wrap: true, valign: 'top', fontFace: slideFontFace });
                }
                curContentY += optSpacing;
              }
            }
          } else {
            const textRuns = [];
            if (q.section) {
              textRuns.push({ text: q.section.toUpperCase(), options: { fontSize: Math.max(10.5, stPt - 7), bold: true, color: colSecHex, fontFace: slideFontFace, breakLine: true } });
            }
            textRuns.push({ text: `Q${q.q_num}. `, options: { fontSize: stPt + 3, bold: true, color: colQnumHex, fontFace: slideFontFace } });
            textRuns.push({ text: stemLines[0], options: { fontSize: stPt, bold: true, color: colStemHex, fontFace: slideFontFace, breakLine: true } });

            for (let i = 1; i < stemLines.length; i++) {
              const sub = stemLines[i];
              const isStmt = sub.startsWith('1.') || sub.startsWith('2.') || sub.startsWith('3.') || sub.startsWith('•') || sub.startsWith('Statement') || sub.startsWith('Column');
              textRuns.push({ text: sub, options: { fontSize: stPt * 0.95, bold: true, color: isStmt ? 'FFF5B4' : colStemHex, fontFace: slideFontFace, breakLine: true } });
            }

            textRuns.push({ text: '', options: { fontSize: spPt, breakLine: true } });

            for (const k of ['A', 'B', 'C', 'D']) {
              if (q.options[k]) {
                textRuns.push({ text: getOptLbl(k), options: { fontSize: optPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } });
                textRuns.push({ text: q.options[k] || '', options: { fontSize: optPt, color: 'F5F5F5', fontFace: slideFontFace, breakLine: true } });
              }
            }

            // If Inline Answer Mode is selected
            if (solutionMode === 'inline' && q.solution) {
              const ansLine = q.solution.split('\n')[0] || '';
              textRuns.push({ text: '\n\n' + ansLine, options: { fontSize: Math.max(11, Math.round(13 * fontScaleFactor)), bold: true, color: '81C784', fontFace: slideFontFace } });
            }

            slide.addText(textRuns, {
              x: bLeft,
              y: bTop,
              w: bWidth,
              h: bHeight,
              wrap: true,
              valign: 'top',
              fontFace: slideFontFace
            });
          }
        }

        // 4. If Separate Solution Slide Mode is selected
        if (solutionMode === 'separate' && q.solution) {
          const solSlide = state.bgImageBase64 
            ? pptx.addSlide({ masterName: "CHALKBOARD_MASTER" })
            : pptx.addSlide();

          const solRuns = [
            { text: `💡 SOLUTION & EXPLANATION — Q${q.q_num}`, options: { fontSize: 15, bold: true, color: 'FFD54F', fontFace: slideFontFace, breakLine: true } },
            { text: `${stemLines[0].slice(0, 100)}${stemLines[0].length > 100 ? '...' : ''}\n\n`, options: { fontSize: 12, italic: true, color: '90CAF9', fontFace: slideFontFace, breakLine: true } },
            { text: q.solution, options: { fontSize: 14, color: 'F5F5F5', fontFace: slideFontFace, breakLine: true } }
          ];

          solSlide.addText(solRuns, {
            x: bLeft,
            y: bTop,
            w: bWidth,
            h: bHeight,
            wrap: true,
            valign: 'top',
            fontFace: slideFontFace
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

// 2D Vector Mathematical Equation SVG & PNG Converter
async function svgToPngDataUrl(svgString, scale = 3) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(blobURL);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        widthInches: img.width / 96,
        heightInches: img.height / 96
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobURL);
      reject(new Error('SVG rendering failed'));
    };
    img.src = blobURL;
  });
}

function isMathExpression(text) {
  if (!text) return false;
  if (text.includes('√')) return true;
  if (/(?:cos⁻¹|sin⁻¹|tan⁻¹)\s*\([^\)]+\/[^\)]+\)/i.test(text)) return true;
  if (/^\s*[−\-]?\s*[α-ωΑ-Ωa-zA-Z0-9_]+\s*\/\s*[α-ωΑ-Ωa-zA-Z0-9_ϵ₀μᵣ]+\s*$/i.test(text)) return true;
  if (/^\(\s*[^\/]+\/[^,]+,\s*[^,]+,\s*[^)]+\)$/.test(text)) return true;
  if (/^[χx]\s*=\s*(?:\([^/]+\/[^)]+\)|1|\d+)\s*[−\-\+]\s*(?:\([^/]+\/[^)]+\)|1|\d+)$/i.test(text)) return true;
  if (/^\(\s*[^/]+?\s*[+\-−]\s*[^/]+?\s*\/\s*[^)]+?\s*\)/.test(text)) return true;
  if (/\/\s*eB\b/.test(text)) return true;
  return false;
}

function renderMathOptionToSvg(optLetter, optText, fontSize = 24, defaultColor = "#F5F5F5") {
  if (!optText) return null;

  const height = Math.round(fontSize * 3.0); // generous height for stacked fraction
  const scale = fontSize / 24;
  const baselineY = Math.round(fontSize * 1.60);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" font-family="Plus Jakarta Sans, Noto Sans Devanagari, Nirmala UI, sans-serif" font-size="${fontSize}px">`;
  let curX = 4;

  if (optLetter) {
    const lbl = `(${optLetter}) `;
    svg += `<text x="${curX}" y="${baselineY}" fill="#FFD700" font-weight="bold">${lbl}</text>`;
    curX += lbl.length * fontSize * 0.54;
  }

  function renderSubToken(token, x, y, fSize, color) {
    let tSvg = '';
    let w = 0;
    const fScale = fSize / 24;

    if (token.startsWith('√')) {
      const radicand = token.replace(/^√\s*/, '').replace(/[\[\]]/g, '');
      const rWidth = radicand.length * (fSize * 0.58);
      const totalRadW = 11 * fScale + rWidth + 5 * fScale;
      w = totalRadW;

      const radStartX = x;
      const radBottomY = y + 2.5 * fScale;
      const radTopY = y - (fSize * 0.95);
      const radEndX = radStartX + 10 * fScale;
      const barEndX = radEndX + rWidth + 4 * fScale;

      const pathD = `M ${radStartX} ${y - 3 * fScale} L ${radStartX + 3 * fScale} ${radBottomY} L ${radEndX} ${radTopY} H ${barEndX}`;
      tSvg = `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${Math.max(1.8, Math.round(1.8 * fScale))}" stroke-linecap="square"/>` +
             `<text x="${radEndX + 2.5 * fScale}" y="${y}" font-size="${fSize}px" fill="${color}" font-weight="600">${radicand}</text>`;
    } else {
      let subParts = token.split(/(⁻¹|⁻²|²⁺|⁺|₁|₂|₀|ₜ|ᵣ|π|²|³)/g);
      let px = x;
      for (let i = 0; i < subParts.length; i++) {
        const sp = subParts[i];
        if (!sp) continue;
        const isSup = sp === '⁻¹' || sp === '⁻²' || sp === '²' || sp === '³' || sp === '²⁺' || sp === '⁺';
        const isSub = sp === '₁' || sp === '₂' || sp === '₀' || sp === 'ₜ' || sp === 'ᵣ';

        // Add comfortable horizontal spacing before superscript so it never touches the preceding character (like V, x, m)
        if (isSup && i > 0) {
          px += 4.5 * fScale;
        }

        if (sp === '⁻¹' || sp === '⁻²') {
          const supY = y - (fSize * 0.40);
          tSvg += `<text x="${px}" y="${supY}" font-size="${Math.round(fSize * 0.72)}px" fill="${color}" font-weight="bold">${sp === '⁻¹' ? '-1' : '-2'}</text>`;
          px += 16 * fScale;
        } else if (sp === '²' || sp === '³') {
          const supY = y - (fSize * 0.38);
          tSvg += `<text x="${px}" y="${supY}" font-size="${Math.round(fSize * 0.72)}px" fill="${color}" font-weight="bold">${sp === '²' ? '2' : '3'}</text>`;
          px += 14 * fScale;
        } else if (sp === '²⁺') {
          const supY = y - (fSize * 0.40);
          tSvg += `<text x="${px}" y="${supY}" font-size="${Math.round(fSize * 0.72)}px" fill="${color}" font-weight="bold">2+</text>`;
          px += 22 * fScale;
        } else if (isSub) {
          if (i > 0) px += 1 * fScale;
          const subY = y + (fSize * 0.22);
          const digit = sp === '₁' ? '1' : sp === '₂' ? '2' : sp === '₀' ? '0' : sp === 'ᵣ' ? 'r' : 't';
          tSvg += `<text x="${px}" y="${subY}" font-size="${Math.round(fSize * 0.72)}px" fill="${color}" font-weight="bold">${digit}</text>`;
          px += 12 * fScale;
        } else {
          // Special width for wide characters like 'V', 'W', 'T', 'Y', 'M'
          let extraW = 0;
          for (const char of sp) {
            if (/[VWTYM]/.test(char)) extraW += 0.12 * fSize;
          }
          tSvg += `<text x="${px}" y="${y}" font-size="${fSize}px" fill="${color}" font-weight="600">${sp}</text>`;
          px += sp.length * (fSize * 0.58) + extraW;
        }
      }
      w = px - x;
    }
    return { svg: tSvg, width: w };
  }

  function renderFraction(startX, baselineY, numStr, denStr, fSize, color) {
    const fracFSize = Math.round(fSize * 0.88);
    const fracBarY = baselineY - Math.round(fSize * 0.25);
    const numY = fracBarY - Math.round(fSize * 0.35);
    const denY = fracBarY + Math.round(fSize * 0.95);

    const numRes = renderSubToken(numStr.trim(), 0, numY, fracFSize, color);
    const denRes = renderSubToken(denStr.trim(), 0, denY, fracFSize, color);

    const fracW = Math.max(numRes.width, denRes.width) + 12 * scale;
    const numOffsetX = startX + (fracW - numRes.width) / 2;
    const denOffsetX = startX + (fracW - denRes.width) / 2;

    const finalNumRes = renderSubToken(numStr.trim(), numOffsetX, numY, fracFSize, color);
    const finalDenRes = renderSubToken(denStr.trim(), denOffsetX, denY, fracFSize, color);

    const barSvg = `<line x1="${startX}" y1="${fracBarY}" x2="${startX + fracW}" y2="${fracBarY}" stroke="${color}" stroke-width="${Math.max(2, Math.round(2 * scale))}"/>`;

    return {
      svg: barSvg + finalNumRes.svg + finalDenRes.svg,
      width: fracW
    };
  }

  const trigFrac = optText.match(/^(cos⁻¹|sin⁻¹|tan⁻¹)\s*\(\s*([^/]+)\s*\/\s*([^)]+)\s*\)$/);
  const coordFrac = optText.match(/^\(\s*([^/]+)\s*\/\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
  const eqFrac1 = optText.match(/^([χx])\s*=\s*\(\s*([^/]+)\s*\/\s*([^)]+)\s*\)\s*([−\-\+])\s*(.+)$/);
  const eqFrac2 = optText.match(/^([χx])\s*=\s*(.+?)\s*([−\-\+])\s*\(\s*([^/]+)\s*\/\s*([^)]+)\s*\)$/);
  const parenFrac = optText.match(/^\(\s*([^/]+?)\s*([+\-−])\s*([^/]+?)\s*\/\s*([^)]+?)\s*\)\s*(.*)$/);
  const standaloneFrac = optText.match(/^([−\-]?)(\s*[^\/]+?)\s*\/\s*(.+)$/);

  if (parenFrac) {
    const term1 = parenFrac[1].trim();
    const sign = parenFrac[2].trim();
    const num = parenFrac[3].trim();
    const den = parenFrac[4].trim();
    const rest = parenFrac[5].trim();

    svg += `<text x="${curX}" y="${baselineY + 5 * scale}" font-size="${Math.round(fontSize * 1.70)}px" fill="${defaultColor}" font-weight="300">(</text>`;
    curX += 14 * scale;

    svg += `<text x="${curX}" y="${baselineY}" fill="${defaultColor}" font-weight="600">${term1} ${sign} </text>`;
    curX += (`${term1} ${sign} `).length * fontSize * 0.58;

    const fRes = renderFraction(curX, baselineY, num, den, fontSize, defaultColor);
    svg += fRes.svg;
    curX += fRes.width + 4 * scale;

    svg += `<text x="${curX}" y="${baselineY + 5 * scale}" font-size="${Math.round(fontSize * 1.70)}px" fill="${defaultColor}" font-weight="300">)</text>`;
    curX += 16 * scale;

    if (rest) {
      svg += `<text x="${curX}" y="${baselineY}" fill="${defaultColor}" font-weight="600"> ${rest}</text>`;
      curX += (` ${rest}`).length * fontSize * 0.58;
    }

  } else if (trigFrac) {
    const fnName = trigFrac[1];
    const num = trigFrac[2].trim();
    const den = trigFrac[3].trim();

    svg += `<text x="${curX}" y="${baselineY}" fill="${defaultColor}" font-weight="600">${fnName.slice(0, 3)}</text>`;
    curX += 3 * fontSize * 0.58;

    const supY = baselineY - (fontSize * 0.45);
    svg += `<text x="${curX}" y="${supY}" font-size="${Math.round(fontSize * 0.72)}px" fill="${defaultColor}" font-weight="bold">-1</text>`;
    curX += 18 * scale;

    svg += `<text x="${curX}" y="${baselineY + 5 * scale}" font-size="${Math.round(fontSize * 1.70)}px" fill="${defaultColor}" font-weight="300">(</text>`;
    curX += 14 * scale;

    const fRes = renderFraction(curX, baselineY, num, den, fontSize, defaultColor);
    svg += fRes.svg;
    curX += fRes.width + 4 * scale;

    svg += `<text x="${curX}" y="${baselineY + 5 * scale}" font-size="${Math.round(fontSize * 1.70)}px" fill="${defaultColor}" font-weight="300">)</text>`;
    curX += 16 * scale;

  } else if (coordFrac) {
    const num = coordFrac[1].trim();
    const den = coordFrac[2].trim();
    const c2 = coordFrac[3].trim();
    const c3 = coordFrac[4].trim();

    svg += `<text x="${curX}" y="${baselineY + 5 * scale}" font-size="${Math.round(fontSize * 1.70)}px" fill="${defaultColor}" font-weight="300">(</text>`;
    curX += 14 * scale;

    const fRes = renderFraction(curX, baselineY, num, den, fontSize, defaultColor);
    svg += fRes.svg;
    curX += fRes.width + 2 * scale;

    svg += `<text x="${curX}" y="${baselineY}" fill="${defaultColor}" font-weight="600">, ${c2}, ${c3}</text>`;
    curX += (` , ${c2}, ${c3}`).length * fontSize * 0.58;

    svg += `<text x="${curX}" y="${baselineY + 5 * scale}" font-size="${Math.round(fontSize * 1.70)}px" fill="${defaultColor}" font-weight="300">)</text>`;
    curX += 16 * scale;

  } else if (eqFrac1) {
    const vName = eqFrac1[1];
    const num = eqFrac1[2].trim();
    const den = eqFrac1[3].trim();
    const sign = eqFrac1[4];
    const rest = eqFrac1[5].trim();

    svg += `<text x="${curX}" y="${baselineY}" fill="${defaultColor}" font-weight="600">${vName} = </text>`;
    curX += 4 * fontSize * 0.58;

    const fRes = renderFraction(curX, baselineY, num, den, fontSize, defaultColor);
    svg += fRes.svg;
    curX += fRes.width + 4 * scale;

    svg += `<text x="${curX}" y="${baselineY}" fill="${defaultColor}" font-weight="600"> ${sign} ${rest}</text>`;
    curX += (` ${sign} ${rest}`).length * fontSize * 0.58;

  } else if (eqFrac2) {
    const vName = eqFrac2[1];
    const first = eqFrac2[2].trim();
    const sign = eqFrac2[3];
    const num = eqFrac2[4].trim();
    const den = eqFrac2[5].trim();

    svg += `<text x="${curX}" y="${baselineY}" fill="${defaultColor}" font-weight="600">${vName} = ${first} ${sign} </text>`;
    curX += (`${vName} = ${first} ${sign} `).length * fontSize * 0.58;

    const fRes = renderFraction(curX, baselineY, num, den, fontSize, defaultColor);
    svg += fRes.svg;
    curX += fRes.width + 4 * scale;

  } else if (standaloneFrac && !optText.includes(':') && !optText.includes('km h') && !optText.includes('m/s')) {
    const leadingSign = standaloneFrac[1];
    const num = standaloneFrac[2].trim();
    const den = standaloneFrac[3].trim();

    if (leadingSign) {
      svg += `<text x="${curX}" y="${baselineY}" fill="${defaultColor}" font-weight="600">${leadingSign} </text>`;
      curX += 2 * fontSize * 0.58;
    }

    const fRes = renderFraction(curX, baselineY, num, den, fontSize, defaultColor);
    svg += fRes.svg;
    curX += fRes.width + 4 * scale;

  } else {
    const tRes = renderSubToken(optText, curX, baselineY, fontSize, defaultColor);
    svg += tRes.svg;
    curX += tRes.width + 4 * scale;
  }

  const totalWidth = Math.ceil(curX + 8);
  return svg.replace('<svg xmlns="http://www.w3.org/2000/svg"', `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" viewBox="0 0 ${totalWidth} ${height}"`) + '</svg>';
}
