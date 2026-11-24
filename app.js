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
  template: null, // analyzed real PPTX template (Rev 15.0)
  colorsCustomized: false,
  parsedQuestions: [],
  questionDiagrams: [], // [ { pno, qNum, section, snippet, dataUrl } ]
  lastGeneratedBlob: null,
  areaMode: 'unified', // 'unified' | 'dual'
  activeDualFocus: 'question', // 'question' | 'options'
  bbox: {
    left_ratio: 0.36,
    top_ratio: 0.10,
    width_ratio: 0.55,
    height_ratio: 0.77
  },
  qBbox: {
    left_ratio: 0.36,
    top_ratio: 0.10,
    width_ratio: 0.55,
    height_ratio: 0.35
  },
  optBbox: {
    left_ratio: 0.36,
    top_ratio: 0.48,
    width_ratio: 0.55,
    height_ratio: 0.40
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
const selectionBoxUnified = document.getElementById('selectionBoxUnified');
const selectionBoxQuestion = document.getElementById('selectionBoxQuestion');
const selectionBoxOptions = document.getElementById('selectionBoxOptions');
const ctx = slideCanvas.getContext('2d');

const btnModeUnified = document.getElementById('btnModeUnified');
const btnModeDual = document.getElementById('btnModeDual');
const dualTargetSelector = document.getElementById('dualTargetSelector');
const btnFocusQ = document.getElementById('btnFocusQ');
const btnFocusOpt = document.getElementById('btnFocusOpt');
const presetGridUnified = document.getElementById('presetGridUnified');
const presetGridDual = document.getElementById('presetGridDual');
const panelCoordsUnified = document.getElementById('panelCoordsUnified');
const panelCoordsDual = document.getElementById('panelCoordsDual');

const inputLeft = document.getElementById('inputLeft');
const inputTop = document.getElementById('inputTop');
const inputWidth = document.getElementById('inputWidth');
const inputHeight = document.getElementById('inputHeight');

const inputQLeft = document.getElementById('inputQLeft');
const inputQTop = document.getElementById('inputQTop');
const inputQWidth = document.getElementById('inputQWidth');
const inputQHeight = document.getElementById('inputQHeight');

const inputOptLeft = document.getElementById('inputOptLeft');
const inputOptTop = document.getElementById('inputOptTop');
const inputOptWidth = document.getElementById('inputOptWidth');
const inputOptHeight = document.getElementById('inputOptHeight');

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
const colOptText = document.getElementById('colOptText');
const colStmt = document.getElementById('colStmt');
const colAnswer = document.getElementById('colAnswer');
const chkBoldOptions = document.getElementById('chkBoldOptions');
const chkUseBadges = document.getElementById('chkUseBadges');
const tplInfo = document.getElementById('tplInfo');
const tplInfoTitle = document.getElementById('tplInfoTitle');
const tplInfoBody = document.getElementById('tplInfoBody');
const lblUseBadges = document.getElementById('lblUseBadges');

// Text color themes (hex without #)
const COLOR_THEMES = {
  chalkboard: { colStem: '#FFFFFF', colOptText: '#F5F5F5', colQnum: '#FFD54F', colOptLabel: '#FFD700', colSection: '#90CAF9', colStmt: '#FFF5B4', colAnswer: '#81C784', preview: '#1E4D2B' },
  dark:       { colStem: '#FFFFFF', colOptText: '#7FE7FF', colQnum: '#FFC000', colOptLabel: '#FFC000', colSection: '#9EC5FF', colStmt: '#FFE08A', colAnswer: '#7CFC9A', preview: '#000000' },
  light:      { colStem: '#1F2937', colOptText: '#1D4ED8', colQnum: '#B45309', colOptLabel: '#B91C1C', colSection: '#475569', colStmt: '#7C2D12', colAnswer: '#15803D', preview: '#FFFFFF' },
  exam:       { colStem: '#0B2545', colOptText: '#7A1F2B', colQnum: '#C2410C', colOptLabel: '#7A1F2B', colSection: '#334155', colStmt: '#134E4A', colAnswer: '#166534', preview: '#FFF8E1' }
};
const COLOR_IDS = ['colStem', 'colOptText', 'colQnum', 'colOptLabel', 'colSection', 'colStmt', 'colAnswer'];

const btnGeneratePpt = document.getElementById('btnGeneratePpt');
const genStatusText = document.getElementById('genStatusText');
const downloadBanner = document.getElementById('downloadBanner');
const downloadDetails = document.getElementById('downloadDetails');
const btnDownloadAgain = document.getElementById('btnDownloadAgain');

// Presets
const UNIFIED_PRESETS = {
  'chalkboard-left': { left_ratio: 0.36, top_ratio: 0.10, width_ratio: 0.55, height_ratio: 0.77 },
  'chalkboard-right': { left_ratio: 0.08, top_ratio: 0.10, width_ratio: 0.55, height_ratio: 0.77 },
  'full-center': { left_ratio: 0.08, top_ratio: 0.10, width_ratio: 0.84, height_ratio: 0.80 },
  'right-half': { left_ratio: 0.50, top_ratio: 0.10, width_ratio: 0.45, height_ratio: 0.80 }
};

const DUAL_PRESETS = {
  'chalkboard-stack': {
    q: { left_ratio: 0.36, top_ratio: 0.10, width_ratio: 0.55, height_ratio: 0.35 },
    opt: { left_ratio: 0.36, top_ratio: 0.48, width_ratio: 0.55, height_ratio: 0.40 }
  },
  'side-by-side': {
    q: { left_ratio: 0.08, top_ratio: 0.12, width_ratio: 0.42, height_ratio: 0.75 },
    opt: { left_ratio: 0.52, top_ratio: 0.12, width_ratio: 0.42, height_ratio: 0.75 }
  },
  'full-top-bottom': {
    q: { left_ratio: 0.06, top_ratio: 0.08, width_ratio: 0.88, height_ratio: 0.35 },
    opt: { left_ratio: 0.06, top_ratio: 0.46, width_ratio: 0.88, height_ratio: 0.46 }
  },
  'left-stack': {
    q: { left_ratio: 0.08, top_ratio: 0.10, width_ratio: 0.52, height_ratio: 0.35 },
    opt: { left_ratio: 0.08, top_ratio: 0.48, width_ratio: 0.52, height_ratio: 0.40 }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setupAppNavigation();
  setupFileUploads();
  setupAreaModeSwitch();
  setupCanvasSelection();
  setupPresets();
  setupCoordInputs();
  setupFontScalingControls();
  setupGenerator();
  setupResultMerger();
  setupColorControls();
  loadDefaultTemplatePreview();
});

// ---------- Text color controls: themes, live preview, remembered on this device ----------
function setupColorControls() {
  const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const preview = document.getElementById('colorPreview');
  let previewBg = '#1E4D2B';

  const updatePreview = () => {
    const set = (id, el) => { const n = document.getElementById(el); if (n) n.style.color = document.getElementById(id).value; };
    set('colQnum', 'cpQnum'); set('colStem', 'cpStem'); set('colOptLabel', 'cpLbl'); set('colOptText', 'cpOpt');
    const cpOpt = document.getElementById('cpOpt');
    if (cpOpt) cpOpt.style.fontWeight = chkBoldOptions && chkBoldOptions.checked ? '700' : '400';
    if (preview) preview.style.background = previewBg;
  };
  const save = () => {
    if (!store) return;
    try {
      const data = { bold: !!(chkBoldOptions && chkBoldOptions.checked), previewBg };
      COLOR_IDS.forEach(id => data[id] = document.getElementById(id).value);
      store.setItem('q2s_colors_v1', JSON.stringify(data));
    } catch (e) { /* storage unavailable */ }
  };
  window.applyColorTheme = (name, persist = true) => {
    const t = COLOR_THEMES[name];
    if (!t) return;
    COLOR_IDS.forEach(id => { const el = document.getElementById(id); if (el && t[id]) el.value = t[id]; });
    previewBg = t.preview;
    document.querySelectorAll('.btn-color-theme').forEach(b => b.classList.toggle('active', b.dataset.theme === name));
    updatePreview();
    if (persist) save();
  };
  window.setColorPreviewBg = (hex) => { previewBg = hex; updatePreview(); };

  // restore saved colors
  try {
    const saved = store && JSON.parse(store.getItem('q2s_colors_v1') || 'null');
    if (saved) {
      COLOR_IDS.forEach(id => { if (saved[id] && document.getElementById(id)) document.getElementById(id).value = saved[id]; });
      if (chkBoldOptions) chkBoldOptions.checked = !!saved.bold;
      if (saved.previewBg) previewBg = saved.previewBg;
      state.colorsCustomized = true;
    }
  } catch (e) { /* ignore */ }

  COLOR_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      state.colorsCustomized = true;
      document.querySelectorAll('.btn-color-theme').forEach(b => b.classList.remove('active'));
      updatePreview(); save();
    });
  });
  if (chkBoldOptions) chkBoldOptions.addEventListener('change', () => { updatePreview(); save(); });
  document.querySelectorAll('.btn-color-theme').forEach(btn => btn.addEventListener('click', () => {
    state.colorsCustomized = true;
    window.applyColorTheme(btn.dataset.theme);
  }));
  const btnReset = document.getElementById('btnResetColors');
  if (btnReset) btnReset.addEventListener('click', () => {
    state.colorsCustomized = false;
    if (chkBoldOptions) chkBoldOptions.checked = false;
    window.applyColorTheme('chalkboard');
  });
  updatePreview();
}

function isDarkHex(hex) {
  if (!hex) return true;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}

function clearTemplateState() {
  state.template = null;
  if (tplInfo) tplInfo.classList.add('hidden');
}

// Load a real .pptx template: keep its slide design, preview it, auto-detect Question/A-D badges
async function loadPptxTemplate(file) {
  const tpl = await Q2STemplate.analyzePptxTemplate(file);
  const previewUrl = await Q2STemplate.renderTemplatePreview(tpl, 1600);
  state.template = tpl;
  state.bgImageBase64 = null;
  renderCanvasImage(previewUrl);

  const A = tpl.anchors;
  const sizeTxt = `${tpl.widthIn.toFixed(2)}" × ${tpl.heightIn.toFixed(2)}"`;
  tplInfo.classList.remove('hidden', 'warn');
  if (A && A.hasBadges) {
    const badgeKeys = Object.keys(A.badges).sort().join(' / ');
    tplInfoTitle.innerText = '✅ Smart template detected';
    tplInfoBody.innerHTML = `Slide size <b>${sizeTxt}</b>. Found ${A.questionBadge ? 'a <b>Question</b> badge and ' : ''}option badges <b>${badgeKeys}</b>. ` +
      `Each option will be written beside its badge automatically; the <b>blue Question Area</b> below can still be moved or resized.`;
    lblUseBadges.style.display = '';
    chkUseBadges.checked = true;
    // show the detected zones in dual mode
    state.qBbox = { ...A.questionRatio };
    if (A.optionsRatio) state.optBbox = { ...A.optionsRatio };
    btnModeDual.click();
  } else {
    tplInfoTitle.innerText = '📐 PowerPoint template loaded';
    tplInfoBody.innerHTML = `Slide size <b>${sizeTxt}</b>. Every slide in the template's design is kept. ` +
      `No A/B/C/D badges were found, so drag the box on the preview to choose where the question and options go.`;
    lblUseBadges.style.display = 'none';
    chkUseBadges.checked = false;
    const cb = tpl.contentShapes && tpl.contentShapes.box;
    state.bbox = cb && cb.width_ratio > 0.2 && cb.height_ratio > 0.15
      ? { ...cb }
      : { left_ratio: 0.07, top_ratio: 0.12, width_ratio: 0.86, height_ratio: 0.78 };
    btnModeUnified.click();
  }
  if (tpl.stripContent) {
    tplInfoBody.innerHTML += ` <br>The first slide already contained sample text — it is removed from the copies and its position is used as the text area.`;
  }
  if (tpl.slideCount > 1) {
    tplInfoBody.innerHTML += ` <br>Note: the template has ${tpl.slideCount} slides — the <b>first slide</b> is used as the design.`;
  }
  // readable text colors for the template background (unless the user picked their own)
  const dark = isDarkHex(tpl.bgHex);
  if (!state.colorsCustomized) window.applyColorTheme(dark ? (tpl.bgHex && tpl.bgHex.toUpperCase() === '000000' ? 'dark' : 'chalkboard') : 'light', false);
  if (window.setColorPreviewBg && tpl.bgHex) window.setColorPreviewBg('#' + tpl.bgHex);
}

// Setup Mode Switcher (Unified vs Dual Area)
function setupAreaModeSwitch() {
  if (!btnModeUnified || !btnModeDual) return;

  btnModeUnified.addEventListener('click', () => {
    state.areaMode = 'unified';
    btnModeUnified.classList.add('active');
    btnModeDual.classList.remove('active');

    selectionBoxUnified.style.display = 'block';
    selectionBoxQuestion.style.display = 'none';
    selectionBoxOptions.style.display = 'none';

    dualTargetSelector.style.display = 'none';
    presetGridUnified.style.display = 'grid';
    presetGridDual.style.display = 'none';
    panelCoordsUnified.style.display = 'block';
    panelCoordsDual.style.display = 'none';

    updateSelectionBoxUI();
    syncInputsFromState();
  });

  btnModeDual.addEventListener('click', () => {
    state.areaMode = 'dual';
    btnModeDual.classList.add('active');
    btnModeUnified.classList.remove('active');

    selectionBoxUnified.style.display = 'none';
    selectionBoxQuestion.style.display = 'block';
    selectionBoxOptions.style.display = 'block';

    dualTargetSelector.style.display = 'block';
    presetGridUnified.style.display = 'none';
    presetGridDual.style.display = 'grid';
    panelCoordsUnified.style.display = 'none';
    panelCoordsDual.style.display = 'block';

    setDualFocus(state.activeDualFocus || 'question');
    updateSelectionBoxUI();
    syncInputsFromState();
  });

  if (btnFocusQ && btnFocusOpt) {
    btnFocusQ.addEventListener('click', () => setDualFocus('question'));
    btnFocusOpt.addEventListener('click', () => setDualFocus('options'));
  }
}

function setDualFocus(target) {
  state.activeDualFocus = target;
  if (target === 'question') {
    btnFocusQ?.classList.add('active');
    btnFocusOpt?.classList.remove('active');
    selectionBoxQuestion?.classList.add('active');
    selectionBoxOptions?.classList.remove('active');
  } else {
    btnFocusOpt?.classList.add('active');
    btnFocusQ?.classList.remove('active');
    selectionBoxOptions?.classList.add('active');
    selectionBoxQuestion?.classList.remove('active');
  }
}

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

// Progress / status panel under Step 1 (upload + parse) and Step 3 (generate)
function setProgress(kind, pct, text, target = 'parse') {
  const box = document.getElementById(target === 'gen' ? 'genProgress' : 'parseProgress');
  if (!box) return;
  box.classList.remove('hidden', 'is-work', 'is-done', 'is-error', 'is-upload');
  box.classList.add(kind === 'error' ? 'is-error' : kind === 'done' ? 'is-done' : kind === 'upload' ? 'is-upload' : 'is-work');
  box.querySelector('.progress-fill').style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
  box.querySelector('.progress-text').innerText = text;
}

// Setup File Uploads
function setupFileUploads() {
  pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      state.pdfFileName = file.name;
      state.pdfArrayBuffer = null;
      btnParsePdf.disabled = true;
      const sizeTxt = file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;
      setProgress('upload', 0, `Loading ${file.name} (${sizeTxt})...`);
      const reader = new FileReader();
      reader.onprogress = (evt) => {
        if (evt.lengthComputable) setProgress('upload', evt.loaded / evt.total * 100, `Loading ${file.name}... ${Math.round(evt.loaded / evt.total * 100)}%`);
      };
      reader.onerror = () => setProgress('error', 100, `Could not read ${file.name}. Please try again.`);
      reader.onload = function(evt) {
        state.pdfArrayBuffer = evt.target.result; // kept intact: every parse works on a copy
        pdfDropzone.classList.add('has-file');
        pdfFileLabel.innerText = `✅ Uploaded: ${file.name} (${sizeTxt})`;
        btnParsePdf.disabled = false;
        setProgress('done', 100, `✅ PDF uploaded (${sizeTxt}). Now click "Parse PDF Questions".`);
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
          pptFileLabel.innerText = `Reading template: ${file.name}...`;
          await loadPptxTemplate(file);
          pptDropzone.classList.add('has-file');
          pptFileLabel.innerText = `PPTX Template: ${file.name}`;
        } catch (err) {
          console.error(err);
          clearTemplateState();
          pptFileLabel.innerText = 'Default: 7th SST Classroom Chalkboard';
          alert('Could not read this PowerPoint template: ' + err.message);
        }
      } else {
        clearTemplateState();
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
    clearTemplateState();
    pptFileInput.value = '';
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

// Canvas Bounding Box Selection (Unified and Dual-Zone)
function setupCanvasSelection() {
  let activeBoxType = 'unified'; // 'unified' | 'question' | 'options'
  let isDragging = false;
  let isResizing = false;
  let currentHandle = null;
  let startX, startY, startLeft, startTop, startWidth, startHeight;

  updateSelectionBoxUI();

  function attachBoxEvents(boxElem, type) {
    if (!boxElem) return;
    boxElem.addEventListener('mousedown', (e) => {
      activeBoxType = type;
      if (type !== 'unified') {
        setDualFocus(type);
      }

      if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        currentHandle = e.target;
      } else {
        isDragging = true;
      }
      startX = e.clientX;
      startY = e.clientY;

      const targetBbox = type === 'unified' ? state.bbox : (type === 'question' ? state.qBbox : state.optBbox);
      startLeft = targetBbox.left_ratio;
      startTop = targetBbox.top_ratio;
      startWidth = targetBbox.width_ratio;
      startHeight = targetBbox.height_ratio;
      e.preventDefault();
      e.stopPropagation();
    });
  }

  attachBoxEvents(selectionBoxUnified, 'unified');
  attachBoxEvents(selectionBoxQuestion, 'question');
  attachBoxEvents(selectionBoxOptions, 'options');

  window.addEventListener('mousemove', (e) => {
    if (!isDragging && !isResizing) return;
    const rect = canvasWrapper.getBoundingClientRect();
    const dx = (e.clientX - startX) / rect.width;
    const dy = (e.clientY - startY) / rect.height;

    const targetBbox = activeBoxType === 'unified' ? state.bbox : (activeBoxType === 'question' ? state.qBbox : state.optBbox);

    if (isDragging) {
      targetBbox.left_ratio = Math.max(0, Math.min(1 - startWidth, startLeft + dx));
      targetBbox.top_ratio = Math.max(0, Math.min(1 - startHeight, startTop + dy));
    } else if (isResizing) {
      if (currentHandle.classList.contains('handle-br')) {
        targetBbox.width_ratio = Math.max(0.08, Math.min(1 - startLeft, startWidth + dx));
        targetBbox.height_ratio = Math.max(0.06, Math.min(1 - startTop, startHeight + dy));
      } else if (currentHandle.classList.contains('handle-bl')) {
        const newLeft = Math.max(0, Math.min(startLeft + startWidth - 0.08, startLeft + dx));
        targetBbox.width_ratio = startWidth + (startLeft - newLeft);
        targetBbox.left_ratio = newLeft;
        targetBbox.height_ratio = Math.max(0.06, Math.min(1 - startTop, startHeight + dy));
      } else if (currentHandle.classList.contains('handle-tr')) {
        const newTop = Math.max(0, Math.min(startTop + startHeight - 0.06, startTop + dy));
        targetBbox.height_ratio = startHeight + (startTop - newTop);
        targetBbox.top_ratio = newTop;
        targetBbox.width_ratio = Math.max(0.08, Math.min(1 - startLeft, startWidth + dx));
      } else if (currentHandle.classList.contains('handle-tl')) {
        const newLeft = Math.max(0, Math.min(startLeft + startWidth - 0.08, startLeft + dx));
        const newTop = Math.max(0, Math.min(startTop + startHeight - 0.06, startTop + dy));
        targetBbox.width_ratio = startWidth + (startLeft - newLeft);
        targetBbox.height_ratio = startHeight + (startTop - newTop);
        targetBbox.left_ratio = newLeft;
        targetBbox.top_ratio = newTop;
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
  if (selectionBoxUnified) {
    selectionBoxUnified.style.left = `${(state.bbox.left_ratio * 100).toFixed(1)}%`;
    selectionBoxUnified.style.top = `${(state.bbox.top_ratio * 100).toFixed(1)}%`;
    selectionBoxUnified.style.width = `${(state.bbox.width_ratio * 100).toFixed(1)}%`;
    selectionBoxUnified.style.height = `${(state.bbox.height_ratio * 100).toFixed(1)}%`;
  }
  if (selectionBoxQuestion) {
    selectionBoxQuestion.style.left = `${(state.qBbox.left_ratio * 100).toFixed(1)}%`;
    selectionBoxQuestion.style.top = `${(state.qBbox.top_ratio * 100).toFixed(1)}%`;
    selectionBoxQuestion.style.width = `${(state.qBbox.width_ratio * 100).toFixed(1)}%`;
    selectionBoxQuestion.style.height = `${(state.qBbox.height_ratio * 100).toFixed(1)}%`;
  }
  if (selectionBoxOptions) {
    selectionBoxOptions.style.left = `${(state.optBbox.left_ratio * 100).toFixed(1)}%`;
    selectionBoxOptions.style.top = `${(state.optBbox.top_ratio * 100).toFixed(1)}%`;
    selectionBoxOptions.style.width = `${(state.optBbox.width_ratio * 100).toFixed(1)}%`;
    selectionBoxOptions.style.height = `${(state.optBbox.height_ratio * 100).toFixed(1)}%`;
  }
}

function syncInputsFromState() {
  if (inputLeft) inputLeft.value = Math.round(state.bbox.left_ratio * 100);
  if (inputTop) inputTop.value = Math.round(state.bbox.top_ratio * 100);
  if (inputWidth) inputWidth.value = Math.round(state.bbox.width_ratio * 100);
  if (inputHeight) inputHeight.value = Math.round(state.bbox.height_ratio * 100);

  if (inputQLeft) inputQLeft.value = Math.round(state.qBbox.left_ratio * 100);
  if (inputQTop) inputQTop.value = Math.round(state.qBbox.top_ratio * 100);
  if (inputQWidth) inputQWidth.value = Math.round(state.qBbox.width_ratio * 100);
  if (inputQHeight) inputQHeight.value = Math.round(state.qBbox.height_ratio * 100);

  if (inputOptLeft) inputOptLeft.value = Math.round(state.optBbox.left_ratio * 100);
  if (inputOptTop) inputOptTop.value = Math.round(state.optBbox.top_ratio * 100);
  if (inputOptWidth) inputOptWidth.value = Math.round(state.optBbox.width_ratio * 100);
  if (inputOptHeight) inputOptHeight.value = Math.round(state.optBbox.height_ratio * 100);
}

function setupCoordInputs() {
  const handleUnifiedChange = () => {
    state.bbox.left_ratio = parseFloat(inputLeft.value) / 100;
    state.bbox.top_ratio = parseFloat(inputTop.value) / 100;
    state.bbox.width_ratio = parseFloat(inputWidth.value) / 100;
    state.bbox.height_ratio = parseFloat(inputHeight.value) / 100;
    updateSelectionBoxUI();
  };

  if (inputLeft) inputLeft.addEventListener('input', handleUnifiedChange);
  if (inputTop) inputTop.addEventListener('input', handleUnifiedChange);
  if (inputWidth) inputWidth.addEventListener('input', handleUnifiedChange);
  if (inputHeight) inputHeight.addEventListener('input', handleUnifiedChange);

  const handleDualChange = () => {
    state.qBbox.left_ratio = parseFloat(inputQLeft.value) / 100;
    state.qBbox.top_ratio = parseFloat(inputQTop.value) / 100;
    state.qBbox.width_ratio = parseFloat(inputQWidth.value) / 100;
    state.qBbox.height_ratio = parseFloat(inputQHeight.value) / 100;

    state.optBbox.left_ratio = parseFloat(inputOptLeft.value) / 100;
    state.optBbox.top_ratio = parseFloat(inputOptTop.value) / 100;
    state.optBbox.width_ratio = parseFloat(inputOptWidth.value) / 100;
    state.optBbox.height_ratio = parseFloat(inputOptHeight.value) / 100;
    updateSelectionBoxUI();
  };

  [inputQLeft, inputQTop, inputQWidth, inputQHeight, inputOptLeft, inputOptTop, inputOptWidth, inputOptHeight].forEach(inp => {
    if (inp) inp.addEventListener('input', handleDualChange);
  });
}

function setupPresets() {
  // Unified Presets
  document.querySelectorAll('#presetGridUnified .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#presetGridUnified .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presetKey = btn.getAttribute('data-preset');
      if (UNIFIED_PRESETS[presetKey]) {
        state.bbox = { ...UNIFIED_PRESETS[presetKey] };
        syncInputsFromState();
        updateSelectionBoxUI();
      }
    });
  });

  // Dual Presets
  document.querySelectorAll('#presetGridDual .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#presetGridDual .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dualKey = btn.getAttribute('data-dual-preset');
      if (DUAL_PRESETS[dualKey]) {
        state.qBbox = { ...DUAL_PRESETS[dualKey].q };
        state.optBbox = { ...DUAL_PRESETS[dualKey].opt };
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

  s = s.replace(/\b([NO]),\s+(?=[NO](?:,|-|′))/g, '$1,').replace(/\b(\d),\s+(?=\d(?:,\s*\d)*-[A-Za-z])/g, '$1,'); // N,N- and 2,4-dinitro locants
  return s;
}

// High-Precision Option Cleaner with Exact Mathematical Fraction & Function Reconstruction
function cleanOptionText(optRaw) {
  if (!optRaw) return '';
  let s = optRaw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, '')
    .replace(/([A-Za-z])-\s*\n\s*([a-z])/g, '$1-$2'); // re-join words hyphenated at a line break

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
  btnGeneratePpt.disabled = true;
  btnParsePdf.innerHTML = '<span>⏳</span> Parsing PDF in browser...';
  genStatusText.innerText = 'Extracting questions client-side...';
  setProgress('work', 2, 'Opening PDF...');
  let textlessPages = 0;

  try {
    const loadingTask = pdfjsLib.getDocument({
      // PDF.js takes ownership of the buffer it is given, so always pass a fresh copy
      // (otherwise "Re-parse" fails with "Cannot perform Construct on a detached ArrayBuffer")
      data: new Uint8Array(state.pdfArrayBuffer.slice(0)),
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
      setProgress('work', 2 + (pno - 1) / numPages * 95, `Reading page ${pno} of ${numPages}...`);
      const page = await pdfDoc.getPage(pno);
      const textContent = await page.getTextContent();
      if (textContent.items.reduce((a, it) => a + (it.str || '').trim().length, 0) < 15) textlessPages++;
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
      const cands = state.questionDiagrams.filter(d => d.qNum === q.q_num);
      const match = cands.length === 1 ? cands[0]
        : cands.find(d => (d.section || '').toLowerCase() === (q.section || '').toLowerCase() || (q.section || '').toLowerCase().includes((d.section || '').toLowerCase()));
      if (match) {
        q.imageData = match.dataUrl;
      }
    }

    renderQuestionsList(state.parsedQuestions);
    const nQ = state.parsedQuestions.length;
    btnGeneratePpt.disabled = nQ === 0;
    if (nQ > 0) {
      genStatusText.innerText = `Successfully extracted ${nQ} questions!`;
      setProgress('done', 100, `✅ Found ${nQ} questions in ${numPages} pages. Review them below, then click "Generate PowerPoint".`);
      document.getElementById('sectionReview').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (textlessPages >= Math.max(1, numPages * 0.6)) {
      genStatusText.innerText = 'No text found — this PDF is made of images (scanned / screenshots).';
      setProgress('error', 100, `⚠️ This PDF has no typed text (${textlessPages} of ${numPages} pages are only pictures — scans or screenshots). ` +
        `The tool needs a PDF with real text. Please upload a typed version of the questions (e.g. exported from Word / Google Docs).`);
      questionsList.innerHTML = '<div class="empty-state"><p>⚠️ This PDF contains only images (scanned pages or screenshots), so there is no text to read.<br>Upload a typed PDF of the questions instead.</p></div>';
    } else {
      genStatusText.innerText = 'No questions found in this PDF.';
      setProgress('error', 100, '⚠️ Text was found but no numbered questions with options (A)–(D). Questions should start with "1." / "Q1." / "प्रश्न 1" and options with (A) (B) (C) (D).');
    }

  } catch (err) {
    console.error(err);
    genStatusText.innerText = 'Could not read this PDF.';
    setProgress('error', 100, '❌ Could not read this PDF: ' + err.message + '. Try re-uploading the file.');
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
    const isSpecialItem = /^(?:(?:i{1,3}|iv|vi{0,3}|v|ix|x)\)\s|Column\s*[-–]\s*[IV\d]+|List\s*[-–]\s*[IV\d]+|\([A-Da-d1-4क-घअ-द१-४I-Vixv]+\)|[1-4१-४]\.|\•|Statement\s+[I|V|X\d]+|कथन\s*[1-4१-४I-V]|Assertion|Reason|अभिकथन|कारण|List-[I|V\d]+|सूची\s*[-–—]?[I|V\d१-४]+|Column\s+[I|V\d]+|स्तंभ\s*[-–—]?[I|V\d१-४]+|Choose\s+the\s+correct|Which\s+of\s+(?:these|those)\b|Which\s+of\s+the\s+(?:following|above|given|statements|pairs)|सही\s+उत्तर\s+चुनें|सुमेलित\s+कीजिए|x₁\s*=|where\s+x\s+is|where\s+P|\(P\s*\+\s*a\/V²\))/i.test(line);
    const prevEndsColon = /[:।]\s*$/.test(currentPara);
    const prevIsFormula = !/^\(\s*(?:[A-Da-d1-4]|i{1,3}|iv)\s*\)\s/.test(currentPara) && /^(?:x₁\s*=|(?:\([A-Za-z0-9_\s\+\/²]+\)))/i.test(currentPara);

    if (isSpecialItem || prevEndsColon || prevIsFormula) {
      result.push(currentPara);
      currentPara = line;
    } else if (/[A-Za-z]-$/.test(currentPara) && /^[a-z]/.test(line)) {
      currentPara += line; // word hyphenated across a line break ("face-" + "to-face")
    } else {
      currentPara += " " + line;
    }
  }
  result.push(currentPara);
  return result.join('\n');
}

// Option marker helpers (Rev 15.1)
const OPT_LABEL_INDEX = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3,
  'क': 0, 'ख': 1, 'ग': 2, 'घ': 3, 'अ': 0, 'ब': 1, 'स': 2, 'द': 3, '१': 0, '२': 1, '३': 2, '४': 3 };
function optMarkerLabel(m) { return (m[1] || m[2] || m[3] || m[4] || '').trim(); }
function optMarkerFamily(lbl, raw) {
  const style = /\(/.test(raw || '') ? 'p' : 'b'; // "(A)" vs bare "A." are different styles
  return optMarkerFamilyBase(lbl) + style;
}
function optMarkerFamilyBase(lbl) {
  if (/^[A-D]$/.test(lbl)) return 'upper';
  if (/^[a-d]$/.test(lbl)) return 'lower';
  if (/^[1-4]$/.test(lbl)) return 'digit';
  if (/^[१-४]$/.test(lbl)) return 'devdigit';
  if (/^[क-घ]$/.test(lbl)) return 'ka';
  if (/^[अबसद]$/.test(lbl)) return 'a-ba';
  return 'roman';
}
function pickOrderedOptionMarkers(ms) {
  // last ordered A→B→C→D run for each marker style; uppercase "(A)" styles win over lowercase "(a)" statements
  const PRIORITY = ['upperp', 'digitp', 'kap', 'a-bap', 'devdigitp', 'upperb', 'digitb', 'kab', 'a-bab', 'devdigitb', 'lowerp', 'lowerb'];
  const runs = {};
  for (let i = ms.length - 1; i >= 3; i--) {
    const lblD = optMarkerLabel(ms[i]);
    if (OPT_LABEL_INDEX[lblD] !== 3 || optMarkerFamilyBase(lblD) === 'roman') continue;
    const fam = optMarkerFamily(lblD, ms[i][0]);
    if (runs[fam]) continue;
    const picked = [ms[i]];
    let need = 2;
    for (let j = i - 1; j >= 0 && need >= 0; j--) {
      const l = optMarkerLabel(ms[j]);
      if (optMarkerFamily(l, ms[j][0]) === fam && OPT_LABEL_INDEX[l] === need) { picked.unshift(ms[j]); need--; }
    }
    if (picked.length === 4) runs[fam] = picked;
  }
  for (const f of PRIORITY) if (runs[f]) return runs[f];
  return null;
}

// Universal Question Parser: Handles Standard Exams, Hindi & Devanagari, Careers360, JEE, NEET, CBSE
function parseUniversalQuestions(fullStream) {
  // Matches Q. 1, Question 1, प्रश्न 1., प्र. 1., प्र० 1., प्रश्न संख्या 1, प्रश्न १., and standalone 1. in Hindi/Devanagari
  const qPat = /(?:^|\n)\s*(?:(?:Section\s+[A-Za-z0-9]+:?|Physics|Chemistry|Mathematics|Biology|Social\s+Science|General\s+Knowledge|General\s+Studies|Hindi|English|भौतिक\s*विज्ञान|भौतिकी|रसायन\s*विज्ञान|रसायन\s*शास्त्र|गणित|जीव\s*विज्ञान|सामाजिक\s*विज्ञान|सामान्य\s*ज्ञान|सामान्य\s*अध्ययन|हिंदी|हिन्दी|अंग्रेजी|पर्यावरण\s*अध्ययन|बाल\s*विकास|तर्कशक्ति|रीजनिंग|(?:खंड|भाग)\s*[-–—:]\s*[क-घअ-दA-Da-d1-4०-९]+)\s*\n+)?\s*(?:(?:Q\.?|Question|Que\.?|question|que\.?|प्रश्न|प्र(?:श्न)?[\.०\s]*(?:संख्या|सं[\.०])?)\s*[:\.\-]?\s*([0-9०-९]+)|([0-9०-९]{1,3})[\.\:\-\)]\s+(?=[ऀ-ॿA-Za-z]|['"‘“(]\s*[ऀ-ॿA-Za-z]))\s*[:\.\-–—]?\s*/g;

  let rawMatches = [];
  let m;
  while ((m = qPat.exec(fullStream)) !== null) {
    rawMatches.push(m);
  }

  // Sequence guard for bare "1." numbering (English & Hindi papers): a bare number starts a new question
  // only when it continues the sequence (N = last + 1) AND the previous question already showed options,
  // or when numbering restarts at 1 right after a Section heading. This stops instruction lists and
  // numbered statements ("1. ... 2. ...") inside a question from being split into fake questions.
  const OPT_MARK_RE = /\(\s*[A-Da-dक-घअ-द1-4१-४]\s*\)|(?:^|\s)[A-Da-d][\.\)]\s/g;
  const SECTION_RE = /(?:Section\s+[A-Za-z0-9]+|खंड|भाग|Part\s+[A-Z0-9]+)[^\n]*\n\s*$/i;
  let matches = [];
  let lastNum = 0;
  for (const mm of rawMatches) {
    const isPrefixed = !!mm[1];
    const n = parseInt(devanagariToWesternDigits(mm[1] || mm[2]), 10);
    if (isPrefixed) { matches.push(mm); lastNum = n; continue; }
    const prev = matches[matches.length - 1];
    const between = prev ? fullStream.slice(prev.index + prev[0].length, mm.index) : '';
    const optCount = (between.match(OPT_MARK_RE) || []).length;
    const before = fullStream.slice(Math.max(0, mm.index - 200), mm.index + 1);
    const sectionRestart = n === 1 && SECTION_RE.test(before);
    if (!prev || sectionRestart || (n === lastNum + 1 && optCount >= 2)) {
      matches.push(mm);
      lastNum = n;
    }
  }

  let questions = [];
  let currentSection = '';

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const rawQNum = match[1] || match[2] || (i + 1);
    const qNumStr = devanagariToWesternDigits(rawQNum);
    const qNum = parseInt(qNumStr, 10);

    // Section detection: only whole heading lines count (so a word like "English" inside a question is ignored)
    const preLines = (fullStream.slice(Math.max(0, match.index - 300), match.index) + '\n' + match[0]).split('\n').map(l => l.trim()).filter(Boolean);
    for (let li = preLines.length - 1; li >= 0; li--) {
      const ln = preLines[li];
      const secLine = ln.match(/^((?:Section|Part)\s+[A-Za-z0-9]+\b.*|(?:खंड|भाग)\s*[-–—:]?\s*[क-घअ-दA-Da-d1-4०-९]+.*)$/i) ||
        ln.match(/^(Physics|Chemistry|Mathematics|Biology|Social\s+Science|General\s+Knowledge|General\s+Studies|Hindi|English|Science|EVS|भौतिक\s*विज्ञान|भौतिकी|रसायन\s*विज्ञान|रसायन\s*शास्त्र|गणित|जीव\s*विज्ञान|सामाजिक\s*विज्ञान|सामान्य\s*ज्ञान|सामान्य\s*अध्ययन|हिंदी|हिन्दी|अंग्रेजी|पर्यावरण\s*अध्ययन|बाल\s*विकास|तर्कशक्ति|रीजनिंग)\s*:?\s*$/i);
      if (secLine) { currentSection = secLine[1].trim(); break; }
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
    const optPat = /(?<=^|\s)(?:(?:Option|विकल्प)\s*(?:\(\s*([1-4A-Da-dक-घअ-द१-४])\s*\)|([1-4A-Da-dक-घअ-द१-४]))\s*:|\(\s*([A-Da-d1-4क-घअ-द१-४]|i{1,3}|iv|v|vi{0,3}|ix|x)\s*\)|([A-Da-d1-4])[\.\)](?=[ \t]*\S))[ \t]*/gi;
    let optMatches = [];
    let om;
    while ((om = optPat.exec(qaChunk)) !== null) {
      optMatches.push(om);
    }

    let stem = qaChunk;
    let optA = '', optB = '', optC = '', optD = '';
    let optLabels = { A: '(A)', B: '(B)', C: '(C)', D: '(D)' };

    // Pick the LAST correctly ordered A→B→C→D marker run of one style, so markers inside option text
    // ("Both (A) & (B)", "(a), (b) and (c) are correct") or numbered statements don't scramble the options.
    const ordered = pickOrderedOptionMarkers(optMatches);
    if (ordered || optMatches.length >= 4) {
      const mA = ordered ? ordered[0] : optMatches[optMatches.length - 4];
      const mB = ordered ? ordered[1] : optMatches[optMatches.length - 3];
      const mC = ordered ? ordered[2] : optMatches[optMatches.length - 2];
      const mD = ordered ? ordered[3] : optMatches[optMatches.length - 1];

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

  // Drop preamble entries (e.g. numbered "Instructions") that appear before the first real MCQ
  const firstMcq = questions.findIndex(q => q.options.A && q.options.B && q.options.C);
  if (firstMcq > 0) questions.splice(0, firstMcq);

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
        ${q.options.A ? `<div class="q-opt"><span>${(q.optLabels && q.optLabels.A) || '(A)'}</span> <span class="q-opt-text" contenteditable="true" data-idx="${idx}" data-k="A">${escapeHtml(q.options.A)}</span></div>` : ''}
        ${q.options.B ? `<div class="q-opt"><span>${(q.optLabels && q.optLabels.B) || '(B)'}</span> <span class="q-opt-text" contenteditable="true" data-idx="${idx}" data-k="B">${escapeHtml(q.options.B)}</span></div>` : ''}
        ${q.options.C ? `<div class="q-opt"><span>${(q.optLabels && q.optLabels.C) || '(C)'}</span> <span class="q-opt-text" contenteditable="true" data-idx="${idx}" data-k="C">${escapeHtml(q.options.C)}</span></div>` : ''}
        ${q.options.D ? `<div class="q-opt"><span>${(q.optLabels && q.optLabels.D) || '(D)'}</span> <span class="q-opt-text" contenteditable="true" data-idx="${idx}" data-k="D">${escapeHtml(q.options.D)}</span></div>` : ''}
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
  document.querySelectorAll('.q-opt-text').forEach(el => {
    el.addEventListener('blur', () => {
      const q = state.parsedQuestions[+el.dataset.idx];
      if (q) q.options[el.dataset.k] = el.innerText.replace(/\s+/g, ' ').trim();
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
      const tpl = state.template; // real PPTX template (cloned per slide) or null
      let slideW = 13.333, slideH = 7.5;
      if (tpl) {
        slideW = +tpl.widthIn.toFixed(3);
        slideH = +tpl.heightIn.toFixed(3);
        pptx.defineLayout({ name: 'Q2S_TEMPLATE', width: slideW, height: slideH });
        pptx.layout = 'Q2S_TEMPLATE';
      } else {
        pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inches (PowerPoint Standard Widescreen)
      }
      const badgeMode = !!(tpl && tpl.anchors && tpl.anchors.hasBadges && chkUseBadges && chkUseBadges.checked);
      const slideKinds = [];

      const isDual = state.areaMode === 'dual';

      // Question area bounds in inches
      const qLeft = slideW * (isDual ? state.qBbox.left_ratio : state.bbox.left_ratio);
      const qTop = slideH * (isDual ? state.qBbox.top_ratio : state.bbox.top_ratio);
      const qWidth = slideW * (isDual ? state.qBbox.width_ratio : state.bbox.width_ratio);
      const qHeight = isDual ? (slideH * state.qBbox.height_ratio) : (slideH * state.bbox.height_ratio * 0.45);

      // Option area bounds in inches
      const optLeft = slideW * (isDual ? state.optBbox.left_ratio : state.bbox.left_ratio);
      const optTop = isDual ? (slideH * state.optBbox.top_ratio) : (qTop + qHeight + 0.2);
      const optWidth = slideW * (isDual ? state.optBbox.width_ratio : state.bbox.width_ratio);
      const optHeight = isDual ? (slideH * state.optBbox.height_ratio) : ((slideH * (state.bbox.top_ratio + state.bbox.height_ratio)) - optTop);

      // Unified bounding box for fallback / solution slides
      const bLeft = slideW * state.bbox.left_ratio;
      const bTop = slideH * state.bbox.top_ratio;
      const bWidth = slideW * state.bbox.width_ratio;
      const bHeight = slideH * state.bbox.height_ratio;

      const colSecHex = colSection.value.replace('#', '');
      const colQnumHex = colQnum.value.replace('#', '');
      const colStemHex = colStem.value.replace('#', '');
      const colOptLblHex = colOptLabel.value.replace('#', '');
      const colOptTextHex = colOptText.value.replace('#', '');
      const colStmtHex = colStmt.value.replace('#', '');
      const colAnsHex = colAnswer.value.replace('#', '');
      const optBold = !!(chkBoldOptions && chkBoldOptions.checked);

      const solutionMode = document.querySelector('input[name="solutionMode"]:checked')?.value || 'ignore';
      const fontScaleFactor = (parseFloat(inputFontScale ? inputFontScale.value : 100) || 100) / 100;

      // Define Slide Master ONCE with background image object
      const useBgMaster = !tpl && !!state.bgImageBase64;
      if (useBgMaster) {
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
          setProgress('work', idx / totalQs * 85, `Building slide ${idx + 1} of ${totalQs}...`, 'gen');
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const slide = useBgMaster
          ? pptx.addSlide({ masterName: "CHALKBOARD_MASTER" })
          : pptx.addSlide();
        const hasAnyOption = ['A', 'B', 'C', 'D'].some(k => q.options[k]);
        slideKinds.push(badgeMode && !hasAnyOption ? 'qnoopt' : 'q');

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

        // 0. Template Badge Layout: question under the "Question" badge, each option beside its A/B/C/D badge
        if (badgeMode) {
          await addBadgeLayoutSlide(slide, q, {
            tpl, slideW, slideH, fontScaleFactor, slideFontFace, isHindi, solutionMode,
            colSecHex, colQnumHex, colStemHex, colStmtHex, colAnsHex, colOptTextHex, optBold
          });
        }
        // 1. Question with Genuine Diagram (e.g. Q4 lens, Q5 plates, Q13 lamina, Q17 surface, Q19 bob)
        else if (q.imageData) {
          const topH = Math.min(1.4, 1.1 * fontScaleFactor);
          const topStPt = Math.max(11, Math.round(14 * fontScaleFactor));
          const topQPt = Math.max(13, Math.round(17 * fontScaleFactor));
          const textRunsTop = [];
          if (q.section) {
            textRunsTop.push({ text: q.section.toUpperCase(), options: { fontSize: Math.max(10, Math.round(11.5 * fontScaleFactor)), bold: true, color: colSecHex, fontFace: slideFontFace, breakLine: true } });
          }
          textRunsTop.push({ text: `Q${q.q_num}. `, options: { fontSize: topQPt, bold: true, color: colQnumHex, fontFace: slideFontFace } });
          textRunsTop.push({ text: stemLines[0], options: { fontSize: topStPt, bold: true, color: colStemHex, fontFace: slideFontFace, breakLine: true } });

          slide.addText(textRunsTop, { x: qLeft, y: qTop, w: qWidth, h: topH, wrap: true, valign: 'top', fontFace: slideFontFace });

          const diagW = 3.8;
          const diagH = 1.95;
          const diagL = qLeft + (qWidth - diagW) / 2;
          const diagT = qTop + topH + 0.05;
          slide.addImage({ data: q.imageData, x: diagL, y: diagT, w: diagW, h: diagH });

          const botT = isDual ? optTop : (diagT + diagH + 0.05);
          const botH = isDual ? optHeight : ((bTop + bHeight) - botT);
          const botL = isDual ? optLeft : bLeft;
          const botW = isDual ? optWidth : bWidth;

          const botStPt = Math.max(10.5, Math.round(12.5 * fontScaleFactor));
          const botOptPt = Math.max(10, Math.round(12 * fontScaleFactor));

          const hasDiagMath = ['A', 'B', 'C', 'D'].some(k => q.options[k] && isMathExpression(q.options[k]));
          if (hasDiagMath) {
            let curDiagOptY = botT;
            if (stemLines.length > 1) {
              const subStemH = 0.4;
              slide.addText([{ text: stemLines.slice(1).join('\n'), options: { fontSize: botStPt, bold: true, color: colStemHex, fontFace: slideFontFace } }], {
                x: botL, y: curDiagOptY, w: botW, h: subStemH, wrap: true, valign: 'top', fontFace: slideFontFace
              });
              curDiagOptY += subStemH + 0.05;
            }
            const diagOptSpacing = Math.max(0.42, (botH - 0.2) / 4.2);
            for (const k of ['A', 'B', 'C', 'D']) {
              if (q.options[k]) {
                if (isMathExpression(q.options[k])) {
                  const svgOpt = renderMathOptionToSvg(k, q.options[k], botOptPt);
                  const imgOpt = await svgToPngDataUrl(svgOpt);
                  slide.addImage({ data: imgOpt.dataUrl, x: botL, y: curDiagOptY, w: imgOpt.widthInches, h: imgOpt.heightInches });
                } else {
                  slide.addText([
                    { text: getOptLbl(k), options: { fontSize: botOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
                    { text: q.options[k], options: { fontSize: botOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
                  ], { x: botL, y: curDiagOptY, w: botW, h: diagOptSpacing, wrap: true, valign: 'top', fontFace: slideFontFace });
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
                textRunsBot.push({ text: q.options[k] || '', options: { fontSize: botOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace, breakLine: true } });
              }
            }

            if (solutionMode === 'inline' && q.solution) {
              const ansLine = q.solution.split('\n')[0] || '';
              textRunsBot.push({ text: '\n' + ansLine, options: { fontSize: Math.max(10.5, Math.round(11.5 * fontScaleFactor)), bold: true, color: colAnsHex, fontFace: slideFontFace } });
            }

            slide.addText(textRunsBot, { x: botL, y: botT, w: botW, h: botH, wrap: true, valign: 'top', fontFace: slideFontFace });
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

          const stemBoxH = isDual ? qHeight : Math.min(2.8, 2.3 * (fontScaleFactor > 1.2 ? 1.2 : 1.0));
          slide.addText(qTextRuns, {
            x: qLeft,
            y: qTop,
            w: qWidth,
            h: stemBoxH,
            wrap: true,
            valign: 'top',
            fontFace: slideFontFace
          });

          const colW = (optWidth - 0.4) / 2;
          const col1X = optLeft;
          const col2X = optLeft + colW + 0.4;
          const row1Y = isDual ? optTop : (qTop + stemBoxH + 0.25);
          const row2Y = isDual ? (optTop + optHeight / 2) : (row1Y + 1.25);
          const rowBoxH = isDual ? (optHeight / 2 - 0.1) : 1.8;

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
                  { text: q.options.A, options: { fontSize: gOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
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
                  { text: q.options.C, options: { fontSize: gOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
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
                  { text: q.options.B, options: { fontSize: gOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
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
                  { text: q.options.D, options: { fontSize: gOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
                ], { x: col2X, y: row2Y, w: colW, h: 0.8, wrap: true, valign: 'top', fontFace: slideFontFace });
              }
            }
          } else {
            // Col 1 (A & C)
            slide.addText([
              { text: getOptLbl('A'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
              { text: q.options.A, options: { fontSize: gOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace, breakLine: true } },
              { text: '\n', options: { fontSize: Math.max(6, Math.round(10 * fontScaleFactor)), breakLine: true } },
              { text: getOptLbl('C'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
              { text: q.options.C, options: { fontSize: gOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
            ], { x: col1X, y: row1Y, w: colW, h: rowBoxH, wrap: true, valign: 'top', fontFace: slideFontFace });

            // Col 2 (B & D)
            slide.addText([
              { text: getOptLbl('B'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
              { text: q.options.B, options: { fontSize: gOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace, breakLine: true } },
              { text: '\n', options: { fontSize: Math.max(6, Math.round(10 * fontScaleFactor)), breakLine: true } },
              { text: getOptLbl('D'), options: { fontSize: gOptPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
              { text: q.options.D, options: { fontSize: gOptPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
            ], { x: col2X, y: row1Y, w: colW, h: rowBoxH, wrap: true, valign: 'top', fontFace: slideFontFace });
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

          const activeContW = isDual ? Math.min(qWidth, optWidth) : bWidth;
          const activeContH = isDual ? (qHeight + optHeight) : bHeight;

          // Smart Auto-Fit Safety Guard: Dynamically scale font to guarantee zero boundary overflow
          const charsPerLine = Math.max(35, Math.floor(activeContW * (72 / (stPt * 0.55))));
          const estStemLines = stemLines.reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
          const optCharsPerLine = Math.max(35, Math.floor(activeContW * (72 / (optPt * 0.55))));
          const optLinesCount = ['A', 'B', 'C', 'D'].filter(k => q.options[k]).reduce((acc, k) => acc + Math.max(1, Math.ceil((q.options[k] || '').length / optCharsPerLine)), 0);
          const estTotalHeight = (estStemLines * stPt * 1.35 + optLinesCount * optPt * 1.35 + spPt + 30) / 72;

          if (estTotalHeight > activeContH * 0.95) {
            const damp = (activeContH * 0.95) / estTotalHeight;
            stPt = Math.max(11, Math.floor(stPt * damp));
            optPt = Math.max(10, Math.floor(optPt * damp));
            spPt = Math.max(2, Math.floor(spPt * damp));
          }

          const hasStemMath = stemLines.some(l => isMathExpression(l));
          const hasOptMath = ['A', 'B', 'C', 'D'].some(k => q.options[k] && isMathExpression(q.options[k]));
          const hasMath = hasStemMath || hasOptMath;

          if (isDual) {
            // Distinct Question Stem Box
            const qRuns = [];
            if (q.section) {
              qRuns.push({ text: q.section.toUpperCase(), options: { fontSize: Math.max(10.5, stPt - 7), bold: true, color: colSecHex, fontFace: slideFontFace, breakLine: true } });
            }
            qRuns.push({ text: `Q${q.q_num}. `, options: { fontSize: stPt + 3, bold: true, color: colQnumHex, fontFace: slideFontFace } });
            qRuns.push({ text: stemLines[0], options: { fontSize: stPt, bold: true, color: colStemHex, fontFace: slideFontFace, breakLine: true } });
            for (let i = 1; i < stemLines.length; i++) {
              const sub = stemLines[i];
              const isStmt = sub.startsWith('1.') || sub.startsWith('2.') || sub.startsWith('3.') || sub.startsWith('•') || sub.startsWith('Statement') || sub.startsWith('Column');
              qRuns.push({ text: sub, options: { fontSize: stPt * 0.95, bold: true, color: isStmt ? colStmtHex : colStemHex, fontFace: slideFontFace, breakLine: true } });
            }

            slide.addText(qRuns, {
              x: qLeft,
              y: qTop,
              w: qWidth,
              h: qHeight,
              wrap: true,
              valign: 'top',
              fontFace: slideFontFace
            });

            // Distinct Options Box
            if (hasOptMath) {
              let curOptY = optTop;
              const optSpacing = Math.max(0.5, optHeight / 4.2);
              for (const k of ['A', 'B', 'C', 'D']) {
                if (q.options[k]) {
                  if (isMathExpression(q.options[k])) {
                    const svgOpt = renderMathOptionToSvg(k, q.options[k], optPt);
                    const imgOpt = await svgToPngDataUrl(svgOpt);
                    slide.addImage({ data: imgOpt.dataUrl, x: optLeft, y: curOptY, w: imgOpt.widthInches, h: imgOpt.heightInches });
                  } else {
                    slide.addText([
                      { text: getOptLbl(k), options: { fontSize: optPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } },
                      { text: q.options[k], options: { fontSize: optPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
                    ], { x: optLeft, y: curOptY, w: optWidth, h: optSpacing, wrap: true, valign: 'top', fontFace: slideFontFace });
                  }
                  curOptY += optSpacing;
                }
              }
            } else {
              const optRuns = [];
              for (const k of ['A', 'B', 'C', 'D']) {
                if (q.options[k]) {
                  optRuns.push({ text: getOptLbl(k), options: { fontSize: optPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } });
                  optRuns.push({ text: q.options[k] || '', options: { fontSize: optPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace, breakLine: true } });
                }
              }
              if (solutionMode === 'inline' && q.solution) {
                const ansLine = q.solution.split('\n')[0] || '';
                optRuns.push({ text: '\n\n' + ansLine, options: { fontSize: Math.max(11, Math.round(13 * fontScaleFactor)), bold: true, color: colAnsHex, fontFace: slideFontFace } });
              }
              slide.addText(optRuns, {
                x: optLeft,
                y: optTop,
                w: optWidth,
                h: optHeight,
                wrap: true,
                valign: 'top',
                fontFace: slideFontFace
              });
            }
          } else if (hasMath) {
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
                const svgMath = renderMathOptionToSvg(null, sub, Math.round(stPt * 0.95), '#' + colStmtHex);
                const imgMath = await svgToPngDataUrl(svgMath);
                slide.addImage({ data: imgMath.dataUrl, x: bLeft, y: curContentY, w: imgMath.widthInches, h: imgMath.heightInches });
                curContentY += imgMath.heightInches + 0.08;
              } else {
                const isStmt = sub.startsWith('1.') || sub.startsWith('2.') || sub.startsWith('3.') || sub.startsWith('•') || sub.startsWith('Statement') || sub.startsWith('Column');
                const subLines = Math.max(1, Math.ceil(sub.length / charsPerLine));
                const lineH = (subLines * stPt * 1.35 * 0.95) / 72 + 0.1;
                slide.addText([{ text: sub, options: { fontSize: stPt * 0.95, bold: true, color: isStmt ? colStmtHex : colStemHex, fontFace: slideFontFace } }], {
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
                    { text: q.options[k], options: { fontSize: optPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace } }
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
              textRuns.push({ text: sub, options: { fontSize: stPt * 0.95, bold: true, color: isStmt ? colStmtHex : colStemHex, fontFace: slideFontFace, breakLine: true } });
            }

            textRuns.push({ text: '', options: { fontSize: spPt, breakLine: true } });

            for (const k of ['A', 'B', 'C', 'D']) {
              if (q.options[k]) {
                textRuns.push({ text: getOptLbl(k), options: { fontSize: optPt, bold: true, color: colOptLblHex, fontFace: slideFontFace } });
                textRuns.push({ text: q.options[k] || '', options: { fontSize: optPt, color: colOptTextHex, bold: optBold, fontFace: slideFontFace, breakLine: true } });
              }
            }

            // If Inline Answer Mode is selected
            if (solutionMode === 'inline' && q.solution) {
              const ansLine = q.solution.split('\n')[0] || '';
              textRuns.push({ text: '\n\n' + ansLine, options: { fontSize: Math.max(11, Math.round(13 * fontScaleFactor)), bold: true, color: colAnsHex, fontFace: slideFontFace } });
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
          const solSlide = useBgMaster
            ? pptx.addSlide({ masterName: "CHALKBOARD_MASTER" })
            : pptx.addSlide();
          slideKinds.push('sol');

          const solRuns = [
            { text: `💡 SOLUTION & EXPLANATION — Q${q.q_num}`, options: { fontSize: 15, bold: true, color: colQnumHex, fontFace: slideFontFace, breakLine: true } },
            { text: `${stemLines[0].slice(0, 100)}${stemLines[0].length > 100 ? '...' : ''}\n\n`, options: { fontSize: 12, italic: true, color: colSecHex, fontFace: slideFontFace, breakLine: true } },
            { text: q.solution, options: { fontSize: 14, color: colStemHex, fontFace: slideFontFace, breakLine: true } }
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
      setProgress('work', 88, 'Packaging the PowerPoint file...', 'gen');
      const outName = `Quiz_Presentation_${state.parsedQuestions.length}_Slides.pptx`;
      let pptBlob = await pptx.write({ outputType: 'blob' });
      if (tpl) {
        genStatusText.innerText = 'Applying your PowerPoint template design to every slide...';
        setProgress('work', 93, 'Applying your template design to every slide...', 'gen');
        pptBlob = await Q2STemplate.mergeIntoTemplate(tpl, pptBlob, slideKinds);
      }
      state.lastGeneratedBlob = pptBlob;
      setProgress('done', 100, `✅ PowerPoint ready: ${totalQs} questions, ${(pptBlob.size / 1048576).toFixed(1)} MB. Saving / downloading...`, 'gen');

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
      console.error(err);
      genStatusText.innerText = 'Generation failed.';
      setProgress('error', 100, '❌ Could not generate the PowerPoint: ' + err.message, 'gen');
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

// ---------- Template Badge Layout (Rev 15.0) ----------
// Estimates the largest font (pt) that lets `text` fit inside a w x h inch box.
function fitFontPt(text, wIn, hIn, startPt, minPt, charW = 0.52) {
  const paras = String(text || '').split('\n');
  let pt = startPt;
  while (pt > minPt) {
    const cpl = Math.max(6, Math.floor((wIn * 72) / (pt * charW)));
    const lines = paras.reduce((a, l) => a + Math.max(1, Math.ceil(l.length / cpl)), 0);
    if ((lines * pt * 1.17) / 72 <= hIn * 0.94) break;
    pt -= 1;
  }
  return Math.max(minPt, pt);
}

async function addBadgeLayoutSlide(slide, q, o) {
  const A = o.tpl.anchors;
  const charW = o.isHindi ? 0.62 : 0.54;
  const box = (r) => ({ x: r.left_ratio * o.slideW, y: r.top_ratio * o.slideH, w: r.width_ratio * o.slideW, h: r.height_ratio * o.slideH });

  // ---- Question zone (user-adjustable blue box); questions without options use the area down to the bottom
  const qz = box(state.qBbox);
  const noOptions = !['A', 'B', 'C', 'D'].some(k => q.options[k]);
  if (noOptions) qz.h = Math.max(qz.h, o.slideH * 0.9 - qz.y);
  const stemLines = q.question.split('\n');
  let textW = qz.w;
  if (q.imageData) textW = qz.w * 0.6;
  const qText = `Q${q.q_num}. ${q.question}` + (o.solutionMode === 'inline' && q.solution ? '\n' + (q.solution.split('\n')[0] || '') : '');
  const qPt = fitFontPt(qText, textW, qz.h, Math.round(26 * o.fontScaleFactor), 11, charW);

  const runs = [];
  runs.push({ text: `Q${q.q_num}. `, options: { fontSize: qPt + 2, bold: true, color: o.colQnumHex, fontFace: o.slideFontFace } });
  stemLines.forEach((line, i) => {
    const isStmt = i > 0 && /^(?:\d\.|\([A-Da-d1-4ivx]+\)|(?:i{1,3}|iv|vi{0,3}|v)\)\s|•|Statement|Column|List|कथन|स्तंभ|Assertion|Reason)/.test(line);
    runs.push({ text: line, options: { fontSize: qPt, bold: true, color: isStmt ? o.colStmtHex : o.colStemHex, fontFace: o.slideFontFace, breakLine: true } });
  });
  if (o.solutionMode === 'inline' && q.solution) {
    runs.push({ text: q.solution.split('\n')[0] || '', options: { fontSize: Math.max(10, Math.round(qPt * 0.75)), bold: true, color: o.colAnsHex, fontFace: o.slideFontFace } });
  }
  slide.addText(runs, { x: qz.x, y: qz.y, w: textW, h: qz.h, wrap: true, valign: noOptions ? 'top' : 'middle', fontFace: o.slideFontFace, lineSpacingMultiple: 0.95 });

  if (q.imageData) {
    const dW = qz.w * 0.38, dH = qz.h;
    slide.addImage({ data: q.imageData, x: qz.x + qz.w * 0.62, y: qz.y, w: dW, h: dH, sizing: { type: 'contain', w: dW, h: dH } });
  }

  // ---- Options: one text box beside each badge, shared font size so they look uniform
  const keys = ['A', 'B', 'C', 'D'].filter(k => A.optionRatios[k] && q.options[k]);
  let optPt = Math.round(28 * o.fontScaleFactor);
  for (const k of keys) {
    const z = box(A.optionRatios[k]);
    optPt = Math.min(optPt, fitFontPt(q.options[k], z.w, z.h, Math.round(28 * o.fontScaleFactor), 10, charW));
  }
  // keep a sensible hierarchy: options never dwarf a long question (but stay at least 18pt when they fit)
  optPt = Math.min(optPt, Math.max(qPt + 2, Math.round(18 * o.fontScaleFactor)));
  for (const k of keys) {
    const z = box(A.optionRatios[k]);
    if (isMathExpression(q.options[k])) {
      const svg = renderMathOptionToSvg(null, q.options[k], optPt, '#' + o.colOptTextHex);
      const img = await svgToPngDataUrl(svg);
      let w = img.widthInches, h = img.heightInches;
      if (w > z.w) { h = h * (z.w / w); w = z.w; }
      slide.addImage({ data: img.dataUrl, x: z.x, y: z.y + (z.h - h) / 2, w, h });
    } else {
      slide.addText([{ text: q.options[k], options: { fontSize: optPt, bold: o.optBold, color: o.colOptTextHex, fontFace: o.slideFontFace } }],
        { x: z.x, y: z.y, w: z.w, h: z.h, wrap: true, valign: 'middle', fontFace: o.slideFontFace, lineSpacingMultiple: 0.95 });
    }
  }
  // Template has fewer badges than the question has options (e.g. only A/B badges): list the rest under the last badge zone
  const extra = ['A', 'B', 'C', 'D'].filter(k => q.options[k] && !A.optionRatios[k]);
  if (extra.length && keys.length) {
    const last = box(A.optionRatios[keys[keys.length - 1]]);
    const t = extra.map(k => ({ text: `(${k}) ${q.options[k]}`, options: { fontSize: optPt, color: o.colOptTextHex, bold: o.optBold, fontFace: o.slideFontFace, breakLine: true } }));
    slide.addText(t, { x: last.x, y: last.y + last.h, w: last.w, h: Math.max(0.6, o.slideH - (last.y + last.h) - 0.2), wrap: true, valign: 'top', fontFace: o.slideFontFace });
  }
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
  if (/^\s*[−\-]?\s*[α-ωΑ-Ωa-zA-Z0-9_]+\s*\/\s*[α-ωΑ-Ωa-zA-Z0-9_ϵ₀μᵣ]+\s*$/i.test(text)) {
    // chemistry reagents such as "Sn/HCl", "Fe/HCl", "CuCN/KCN", "H2/Pt" are not fractions
    const sides = text.split('/').map(t => t.trim().replace(/^[−\-]/, ''));
    const chemLike = t => t.length >= 2 && (/[A-Z][a-z]/.test(t) || /[A-Z]{2}/.test(t) || /^[A-Z][0-9₀-₉]+$/.test(t));
    if (!sides.some(chemLike)) return true;
  }
  if (/^\(\s*[^\/]+\/[^,]+,\s*[^,]+,\s*[^)]+\)$/.test(text)) return true;
  if (/^[χx]\s*=\s*(?:\([^/]+\/[^)]+\)|1|\d+)\s*[−\-\+]\s*(?:\([^/]+\/[^)]+\)|1|\d+)$/i.test(text)) return true;
  if (/^\(\s*[^/]+?\s*[+\-−]\s*[^/]+?\s*\/\s*[^)]+?\s*\)/.test(text)) return true;
  if (/\/\s*eB\b/.test(text)) return true;
  return false;
}

function renderMathOptionToSvg(optLetter, optText, fontSize = 24, defaultColor = null) {
  if (!optText) return null;
  defaultColor = defaultColor || (typeof colOptText !== 'undefined' && colOptText ? colOptText.value : '#F5F5F5');
  const labelColor = (typeof colOptLabel !== 'undefined' && colOptLabel) ? colOptLabel.value : '#FFD700';

  const height = Math.round(fontSize * 3.0); // generous height for stacked fraction
  const scale = fontSize / 24;
  const baselineY = Math.round(fontSize * 1.60);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" font-family="Plus Jakarta Sans, Noto Sans Devanagari, Nirmala UI, sans-serif" font-size="${fontSize}px">`;
  let curX = 4;

  if (optLetter) {
    const lbl = `(${optLetter}) `;
    svg += `<text x="${curX}" y="${baselineY}" fill="${labelColor}" font-weight="bold">${lbl}</text>`;
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

// ==========================================================================
// Top Application View Navigation (Quiz Studio vs Result Merger)
// ==========================================================================
function setupAppNavigation() {
  const tabQuiz = document.getElementById('tabQuizToPpt');
  const tabMerger = document.getElementById('tabResultMerger');
  const viewQuiz = document.getElementById('viewQuizStudio');
  const viewMerger = document.getElementById('viewResultMerger');

  if (!tabQuiz || !tabMerger || !viewQuiz || !viewMerger) return;

  tabQuiz.addEventListener('click', () => {
    tabQuiz.classList.add('active');
    tabMerger.classList.remove('active');
    viewQuiz.style.display = 'block';
    viewMerger.style.display = 'none';
  });

  tabMerger.addEventListener('click', () => {
    tabMerger.classList.add('active');
    tabQuiz.classList.remove('active');
    viewQuiz.style.display = 'none';
    viewMerger.style.display = 'block';
  });
}

// ==========================================================================
// Result Sheet & Crystal Report Mobile Number Merger
// ==========================================================================
function setupResultMerger() {
  const resultDropzone = document.getElementById('resultDropzone');
  const inputResultFile = document.getElementById('inputResultFile');
  const resultFileLabel = document.getElementById('resultFileLabel');

  const crystalDropzone = document.getElementById('crystalDropzone');
  const inputCrystalFile = document.getElementById('inputCrystalFile');
  const crystalFileLabel = document.getElementById('crystalFileLabel');

  const chkStripZeros = document.getElementById('chkStripZeros');
  const chkSmartNameFallback = document.getElementById('chkSmartNameFallback');

  const btnRunMerge = document.getElementById('btnRunMerge');
  const mergeStatusBox = document.getElementById('mergeStatusBox');
  const mergeStatusIcon = document.getElementById('mergeStatusIcon');
  const mergeStatusText = document.getElementById('mergeStatusText');

  const sectionMergeResults = document.getElementById('sectionMergeResults');
  const statTotalRows = document.getElementById('statTotalRows');
  const statMatchedRows = document.getElementById('statMatchedRows');
  const statMatchRate = document.getElementById('statMatchRate');
  const statUnmatchedRows = document.getElementById('statUnmatchedRows');

  const btnFilterAll = document.getElementById('btnFilterAll');
  const btnFilterMatched = document.getElementById('btnFilterMatched');
  const btnFilterUnmatched = document.getElementById('btnFilterUnmatched');
  const cntFilterAll = document.getElementById('cntFilterAll');
  const cntFilterMatched = document.getElementById('cntFilterMatched');
  const cntFilterUnmatched = document.getElementById('cntFilterUnmatched');
  const inputSearchTable = document.getElementById('inputSearchTable');

  const previewTableHead = document.getElementById('previewTableHead');
  const previewTableBody = document.getElementById('previewTableBody');

  const btnDownloadExcel = document.getElementById('btnDownloadExcel');
  const btnDownloadCsv = document.getElementById('btnDownloadCsv');

  let resultFileData = null;
  let crystalFileData = null;
  let mergedData = null; // { headers, rows, matchedCount, unmatchedCount }
  let currentFilter = 'all'; // 'all' | 'matched' | 'unmatched'

  if (!inputResultFile || !inputCrystalFile || !btnRunMerge) return;

  // File Upload Handlers for Result Sheet
  inputResultFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleResultFile(file);
  });

  resultDropzone.addEventListener('dragover', (e) => { e.preventDefault(); resultDropzone.classList.add('drag-over'); });
  resultDropzone.addEventListener('dragleave', () => { resultDropzone.classList.remove('drag-over'); });
  resultDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    resultDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleResultFile(e.dataTransfer.files[0]);
  });

  // File Upload Handlers for Crystal Report
  inputCrystalFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCrystalFile(file);
  });

  crystalDropzone.addEventListener('dragover', (e) => { e.preventDefault(); crystalDropzone.classList.add('drag-over'); });
  crystalDropzone.addEventListener('dragleave', () => { crystalDropzone.classList.remove('drag-over'); });
  crystalDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    crystalDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleCrystalFile(e.dataTransfer.files[0]);
  });

  function handleResultFile(file) {
    resultFileData = { file, name: file.name };
    resultFileLabel.innerText = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    checkReadyToMerge();
  }

  function handleCrystalFile(file) {
    crystalFileData = { file, name: file.name };
    crystalFileLabel.innerText = `📑 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    checkReadyToMerge();
  }

  function checkReadyToMerge() {
    if (resultFileData && crystalFileData) {
      btnRunMerge.disabled = false;
      mergeStatusIcon.innerText = '✨';
      mergeStatusText.innerText = `Both sheets loaded. Ready to match and merge.`;
    } else if (resultFileData) {
      mergeStatusText.innerText = `Result sheet loaded. Please upload Crystal Report / Student List.`;
    } else if (crystalFileData) {
      mergeStatusText.innerText = `Crystal Report loaded. Please upload Result Sheet.`;
    }
  }

  // Normalization Helpers
  function cleanKey(val, stripZeros = true) {
    if (val === null || val === undefined) return '';
    let s = String(val).trim();
    if (s.endsWith('.0')) s = s.slice(0, -2);
    if (!stripZeros) return s;
    const digits = s.replace(/\D/g, '');
    if (digits) {
      return digits.replace(/^0+/, '') || '0';
    }
    return s.replace(/^0+/, '');
  }

  function cleanContact(val) {
    if (val === null || val === undefined) return '';
    let s = String(val);
    s = s.replace(/_x000d_/gi, ', ').replace(/_x000D_/gi, ', ').replace(/\r/g, ' ').replace(/\n/g, ', ');
    const parts = s.split(/[,/\s]+/).map(p => p.trim()).filter(p => p.length > 0);
    // Deduplicate identical numbers if repeated
    const unique = [];
    parts.forEach(p => { if (!unique.includes(p)) unique.push(p); });
    return unique.join(', ');
  }

  function cleanName(n) {
    if (!n) return '';
    return String(n).toUpperCase().replace(/[^A-Z]/g, '');
  }

  // File Parsing (Supports XML Spreadsheet 2003, XLSX, XLS, CSV)
  async function parseSpreadsheet(file) {
    const buffer = await file.arrayBuffer();
    const textSample = new TextDecoder('utf-8').decode(buffer.slice(0, 1000));

    // Check if it's Excel 2003 XML Spreadsheet (SpreadsheetML)
    if (textSample.includes('<?xml') && textSample.includes('urn:schemas-microsoft-com:office:spreadsheet')) {
      const fullText = new TextDecoder('utf-8').decode(buffer);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(fullText, 'text/xml');
      const rows = [];
      const rowNodes = xmlDoc.getElementsByTagName('Row');

      for (let r = 0; r < rowNodes.length; r++) {
        const rowNode = rowNodes[r];
        const rowVals = [];
        const cellNodes = rowNode.getElementsByTagName('Cell');

        for (let c = 0; c < cellNodes.length; c++) {
          const cell = cellNodes[c];
          const idxAttr = cell.getAttribute('ss:Index');
          if (idxAttr) {
            const targetCol = parseInt(idxAttr, 10) - 1;
            while (rowVals.length < targetCol) rowVals.push('');
          }
          const dataElem = cell.getElementsByTagName('Data')[0];
          const val = dataElem ? (dataElem.textContent || '') : '';
          rowVals.push(val);
        }
        rows.push(rowVals);
      }
      return rows;
    }

    // Standard XLSX / XLS / CSV via SheetJS
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    return rows;
  }

  // Merge Action
  btnRunMerge.addEventListener('click', async () => {
    if (!resultFileData || !crystalFileData) return;

    btnRunMerge.disabled = true;
    btnRunMerge.innerHTML = '<span>⏳</span> Merging Sheets...';
    mergeStatusIcon.innerText = '⚙️';
    mergeStatusText.innerText = 'Parsing and indexing student admission numbers...';

    try {
      // 1. Parse Crystal Report
      const crystalRows = await parseSpreadsheet(crystalFileData.file);
      if (!crystalRows || crystalRows.length === 0) {
        throw new Error('Crystal Report sheet is empty.');
      }

      // Find header row in Crystal Report
      let crysHdrIdx = 0;
      for (let i = 0; i < crystalRows.length; i++) {
        const rStr = crystalRows[i].join(' ').toLowerCase();
        if (rStr.includes('adm') || rStr.includes('sno') || rStr.includes('contact')) {
          crysHdrIdx = i;
          break;
        }
      }

      const crystalHeaders = crystalRows[crysHdrIdx].map(h => String(h || '').trim());
      const crystalDataRows = crystalRows.slice(crysHdrIdx + 1);

      let crysAdmIdx = -1;
      let crysContactIdx = -1;
      let crysNameIdx = -1;

      crystalHeaders.forEach((h, idx) => {
        const hl = h.toLowerCase().replace(/[\s_\.]/g, '');
        if (hl.includes('adm') && crysAdmIdx === -1) crysAdmIdx = idx;
        if ((hl.includes('contact') || hl.includes('mobile') || hl.includes('phone')) && crysContactIdx === -1) crysContactIdx = idx;
        if (hl.includes('name') && !hl.includes('father') && !hl.includes('mother') && crysNameIdx === -1) crysNameIdx = idx;
      });

      if (crysAdmIdx === -1) crysAdmIdx = 1; // Default fallback column 1
      if (crysContactIdx === -1) crysContactIdx = 11; // Default fallback column 11

      const stripZeros = chkStripZeros.checked;
      const enableNameFallback = chkSmartNameFallback.checked;

      // Build Crystal Lookup Map
      const admMap = {};
      const nameMap = {};
      const nameCounts = {};

      crystalDataRows.forEach(r => {
        const rawAdm = r[crysAdmIdx];
        const rawContact = r[crysContactIdx];
        const rawName = crysNameIdx >= 0 ? r[crysNameIdx] : '';

        const cleanAdm = cleanKey(rawAdm, stripZeros);
        const contact = cleanContact(rawContact);
        const normName = cleanName(rawName);

        if (cleanAdm) {
          admMap[cleanAdm] = {
            contact: contact,
            name: String(rawName || '').trim(),
            admOrig: String(rawAdm || '').trim()
          };
        }

        if (normName) {
          nameCounts[normName] = (nameCounts[normName] || 0) + 1;
          if (!nameMap[normName]) {
            nameMap[normName] = {
              contact: contact,
              name: String(rawName || '').trim(),
              cleanAdm: cleanAdm
            };
          }
        }
      });

      // 2. Parse Result Sheet
      const resultRows = await parseSpreadsheet(resultFileData.file);
      if (!resultRows || resultRows.length === 0) {
        throw new Error('Result sheet is empty.');
      }

      // Find header row in Result Sheet
      let resHdrIdx = 0;
      for (let i = 0; i < resultRows.length; i++) {
        const rStr = resultRows[i].join(' ').toLowerCase();
        if (rStr.includes('roll') || rStr.includes('student') || rStr.includes('name')) {
          resHdrIdx = i;
          break;
        }
      }

      const resHeaders = resultRows[resHdrIdx].map(h => String(h || '').trim());
      const resDataRows = resultRows.slice(resHdrIdx + 1).filter(r => r.some(c => String(c || '').trim().length > 0));

      let resRollIdx = -1;
      let resNameIdx = -1;

      resHeaders.forEach((h, idx) => {
        const hl = h.toLowerCase().replace(/[\s_\.]/g, '');
        if (hl.includes('roll') && resRollIdx === -1) resRollIdx = idx;
        if (hl.includes('name') && resNameIdx === -1) resNameIdx = idx;
      });

      if (resRollIdx === -1) resRollIdx = 2; // Default fallback column 2

      // Insert 'Mobile Number' BEFORE Student Name column
      const insertIdx = resNameIdx >= 0 ? resNameIdx : 1;
      const outHeaders = [...resHeaders];
      outHeaders.splice(insertIdx, 0, 'Mobile Number');

      const outRows = [];
      let matchedCount = 0;
      let unmatchedCount = 0;

      resDataRows.forEach((r, rIdx) => {
        const rowVals = [...r];
        while (rowVals.length < resHeaders.length) rowVals.push('');

        const rawRoll = rowVals[resRollIdx] || '';
        const rawName = resNameIdx >= 0 ? (rowVals[resNameIdx] || '') : '';

        const cleanRoll = cleanKey(rawRoll, stripZeros);
        let mobile = '';
        let status = 'unmatched';

        // 1. Primary Match: by Adm Number / Roll Number
        if (cleanRoll && admMap[cleanRoll]) {
          mobile = admMap[cleanRoll].contact;
          matchedCount++;
          status = 'matched';
        }
        // 2. Optional Fallback: by Name
        else if (enableNameFallback && rawName) {
          const normName = cleanName(rawName);
          if (normName && nameMap[normName] && nameCounts[normName] === 1) {
            mobile = nameMap[normName].contact;
            matchedCount++;
            status = 'matched';
          } else {
            unmatchedCount++;
          }
        } else {
          unmatchedCount++;
        }

        // Insert mobile number BEFORE student name
        rowVals.splice(insertIdx, 0, mobile);
        outRows.push({
          data: rowVals,
          status: status,
          roll: rawRoll,
          cleanRoll: cleanRoll,
          name: rawName,
          mobile: mobile
        });
      });

      mergedData = {
        headers: outHeaders,
        rows: outRows,
        insertIdx: insertIdx,
        matchedCount,
        unmatchedCount,
        totalCount: outRows.length
      };

      // 3. Update UI & Display Preview
      statTotalRows.innerText = outRows.length;
      statMatchedRows.innerText = matchedCount;
      const rate = outRows.length > 0 ? ((matchedCount / outRows.length) * 100).toFixed(1) : 0;
      statMatchRate.innerText = `${rate}%`;
      statUnmatchedRows.innerText = unmatchedCount;

      cntFilterAll.innerText = outRows.length;
      cntFilterMatched.innerText = matchedCount;
      cntFilterUnmatched.innerText = unmatchedCount;

      renderPreviewTable();

      sectionMergeResults.classList.remove('hidden');
      sectionMergeResults.scrollIntoView({ behavior: 'smooth' });

      mergeStatusIcon.innerText = '✅';
      mergeStatusText.innerText = `Merge complete! ${matchedCount} of ${outRows.length} mobile numbers matched successfully.`;
    } catch (err) {
      console.error(err);
      alert('Error during merge: ' + err.message);
      mergeStatusIcon.innerText = '⚠️';
      mergeStatusText.innerText = 'Error: ' + err.message;
    } finally {
      btnRunMerge.disabled = false;
      btnRunMerge.innerHTML = '<span>⚡</span> Match &amp; Merge Mobile Numbers';
    }
  });

  // Table Rendering with Filters and Search
  function renderPreviewTable() {
    if (!mergedData) return;

    const searchTerm = (inputSearchTable.value || '').trim().toLowerCase();
    const insertIdx = mergedData.insertIdx;

    // Render Table Header
    previewTableHead.innerHTML = `<tr>${mergedData.headers.map((h, idx) => {
      const isMobile = idx === insertIdx;
      return `<th class="${isMobile ? 'col-mobile-hdr' : ''}">${escapeHtml(h)}</th>`;
    }).join('')}<th>Status</th></tr>`;

    // Filter Rows
    const filteredRows = mergedData.rows.filter(item => {
      // 1. Status Filter
      if (currentFilter === 'matched' && item.status !== 'matched') return false;
      if (currentFilter === 'unmatched' && item.status !== 'unmatched') return false;

      // 2. Search Filter
      if (searchTerm) {
        const rowStr = item.data.join(' ').toLowerCase();
        if (!rowStr.includes(searchTerm)) return false;
      }
      return true;
    });

    // Render Table Body
    if (filteredRows.length === 0) {
      previewTableBody.innerHTML = `<tr><td colspan="${mergedData.headers.length + 1}" style="text-align: center; padding: 30px; color: var(--text-muted);">No records found matching current filter or search.</td></tr>`;
      return;
    }

    previewTableBody.innerHTML = filteredRows.map(item => {
      const cells = item.data.map((val, idx) => {
        const isMobile = idx === insertIdx;
        if (isMobile) {
          return `<td class="col-mobile-val">${escapeHtml(val || '—')}</td>`;
        }
        return `<td>${escapeHtml(val || '')}</td>`;
      }).join('');

      const statusBadge = item.status === 'matched'
        ? `<span class="badge-matched">✅ Matched</span>`
        : `<span class="badge-unmatched">⚠️ Unmatched</span>`;

      return `<tr>${cells}<td>${statusBadge}</td></tr>`;
    }).join('');
  }

  // Filter Buttons
  btnFilterAll.addEventListener('click', () => { setFilter('all', btnFilterAll); });
  btnFilterMatched.addEventListener('click', () => { setFilter('matched', btnFilterMatched); });
  btnFilterUnmatched.addEventListener('click', () => { setFilter('unmatched', btnFilterUnmatched); });

  function setFilter(filter, activeBtn) {
    currentFilter = filter;
    [btnFilterAll, btnFilterMatched, btnFilterUnmatched].forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
    renderPreviewTable();
  }

  inputSearchTable.addEventListener('input', () => {
    renderPreviewTable();
  });

  // Download Excel (.xlsx)
  btnDownloadExcel.addEventListener('click', () => {
    if (!mergedData) return;

    const aoa = [mergedData.headers];
    mergedData.rows.forEach(item => aoa.push(item.data));

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set Column Widths
    ws['!cols'] = mergedData.headers.map((h, i) => {
      if (i === mergedData.insertIdx) return { wch: 28 }; // Mobile Number
      if (h.toLowerCase().includes('name')) return { wch: 24 };
      if (h.toLowerCase().includes('roll')) return { wch: 14 };
      return { wch: 12 };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Result_With_Mobile");

    const filename = (resultFileData ? resultFileData.name.replace(/\.[^/.]+$/, "") : "RESULT") + "_WITH_MOBILE.xlsx";
    XLSX.writeFile(wb, filename);
  });

  // Download CSV
  btnDownloadCsv.addEventListener('click', () => {
    if (!mergedData) return;

    const aoa = [mergedData.headers];
    mergedData.rows.forEach(item => aoa.push(item.data));

    const csvContent = aoa.map(row => 
      row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (resultFileData ? resultFileData.name.replace(/\.[^/.]+$/, "") : "RESULT") + "_WITH_MOBILE.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

