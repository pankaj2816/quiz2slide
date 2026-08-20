// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Application State
let state = {
  pdfArrayBuffer: null,
  pdfFileName: '',
  bgImageUrl: 'chalkboard_bg.png',
  bgImageBase64: null,
  parsedQuestions: [],
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
  // PDF
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

  // Custom Background Image
  pptFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = function(evt) {
        state.bgImageUrl = evt.target.result;
        state.bgImageBase64 = evt.target.result;
        pptDropzone.classList.add('has-file');
        pptFileLabel.innerText = `Custom BG: ${file.name}`;
        renderCanvasImage(state.bgImageUrl);
      };
      reader.readAsDataURL(file);
    }
  });

  btnUseDefaultPpt.addEventListener('click', (e) => {
    e.stopPropagation();
    state.bgImageUrl = 'chalkboard_bg.png';
    state.bgImageBase64 = null;
    pptDropzone.classList.remove('has-file');
    pptFileLabel.innerText = 'Default: 7th SST Classroom Chalkboard';
    loadDefaultTemplatePreview();
  });
}

function loadDefaultTemplatePreview() {
  renderCanvasImage(state.bgImageUrl);
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

// Client-Side PDF Parser using PDF.js
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

    for (let pno = 1; pno <= numPages; pno++) {
      const page = await pdfDoc.getPage(pno);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // Group text items by vertical position y
      let items = textContent.items.map(item => {
        const tx = item.transform;
        return {
          str: item.str,
          x: tx[4],
          y: viewport.height - tx[5], // convert to top-down
          height: item.height || 10
        };
      });

      // Filter marks on right edge and headers/footers
      items = items.filter(it => {
        if (it.x > 565 && ['1', '2', '3', '4', '5'].includes(it.str.trim())) return false;
        if (it.y < 35 && (it.str.toLowerCase().includes('cbse') || it.str.toLowerCase().includes('quiz'))) return false;
        if (it.y > (viewport.height - 45) && it.str.toLowerCase().includes('page')) return false;
        return true;
      });

      // Sort top-down, left-to-right
      items.sort((a, b) => a.y - b.y || a.x - b.x);

      // Line clustering
      let lines = [];
      for (const it of items) {
        let matched = lines.find(l => Math.abs(l.y - it.y) < 4.5);
        if (matched) {
          matched.items.push(it);
          matched.y = (matched.y * (matched.items.length - 1) + it.y) / matched.items.length;
        } else {
          lines.push({ y: it.y, items: [it] });
        }
      }

      lines.sort((a, b) => a.y - b.y);

      for (const l of lines) {
        l.items.sort((a, b) => a.x - b.x);
        let lineText = l.items.map(i => i.str).join(' ').trim();
        if (lineText && !isHeaderOrFooter(lineText)) {
          fullLines.push(lineText);
        }
      }
    }

    // Parse structured questions from stream
    const fullStream = fullLines.join('\n');
    state.parsedQuestions = parseQuestionsFromTextStream(fullStream);

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
  return l.includes('7th cbse') || l.includes('page ') || l.includes('maximum marks') || l.includes('general instructions') || l.includes('subject:');
}

function cleanText(str) {
  return str.replace(/\|/g, ' ').replace(/\s+/g, ' ').replace(/\s+([,.:;?!])/g, '$1').trim();
}

function parseQuestionsFromTextStream(fullStream) {
  let questions = [];
  let qNum = 1;
  let currentPos = 0;
  let currentSection = '';

  while (qNum <= 300) {
    const patCurr = new RegExp(`(?:(Section\\s+[A-Z0-9]+:\\s+[^\\n]+)\\s*\\n+)?(?:^|\\n)\\s*(?:Q(?:uestion)?\\.?\\s*${qNum}|\\b${qNum})\\.\\s*`, 'im');
    const matchCurr = patCurr.exec(fullStream.slice(currentPos));
    if (!matchCurr) break;

    if (matchCurr[1]) {
      currentSection = cleanText(matchCurr[1]);
    }

    const qStart = currentPos + matchCurr.index + matchCurr[0].length;
    const patNext = new RegExp(`(?:(Section\\s+[A-Z0-9]+:\\s+[^\\n]+)\\s*\\n+)?(?:^|\\n)\\s*(?:Q(?:uestion)?\\.?\\s*${qNum + 1}|\\b${qNum + 1})\\.\\s*`, 'im');
    const matchNext = patNext.exec(fullStream.slice(qStart));

    let qEnd = fullStream.length;
    if (matchNext) {
      qEnd = qStart + matchNext.index;
      currentPos = qStart;
    } else {
      currentPos = fullStream.length;
    }

    const rawBlock = fullStream.slice(qStart, qEnd).trim();

    // Option Matching (A)-(D)
    const optRegex = /(?:^|\s)(?:\(\s*([A-Da-d])\s*\)|([A-Da-d])[\.\)])\s+/g;
    let optMatches = [];
    let m;
    while ((m = optRegex.exec(rawBlock)) !== null) {
      optMatches.push(m);
    }

    let stem = rawBlock;
    let optA = '', optB = '', optC = '', optD = '';

    if (optMatches.length >= 4) {
      const mA = optMatches[optMatches.length - 4];
      const mB = optMatches[optMatches.length - 3];
      const mC = optMatches[optMatches.length - 2];
      const mD = optMatches[optMatches.length - 1];

      stem = rawBlock.slice(0, mA.index).trim();
      optA = cleanText(rawBlock.slice(mA.index + mA[0].length, mB.index));
      optB = cleanText(rawBlock.slice(mB.index + mB[0].length, mC.index));
      optC = cleanText(rawBlock.slice(mC.index + mC[0].length, mD.index));
      optD = cleanText(rawBlock.slice(mD.index + mD[0].length));
    }

    // Statement normalization
    let stemLines = stem.split('\n').map(l => cleanText(l)).filter(l => l && !isHeaderOrFooter(l));
    const optCombined = `${optA} ${optB} ${optC} ${optD}`.toLowerCase();
    if (optCombined.includes('1 and 2') || optCombined.includes('statement 1') || optCombined.includes('pair')) {
      let counter = 1;
      stemLines = stemLines.map(sl => {
        const sm = sl.match(/^(?:\(\s*([A-D])\s*\)|([A-D])\.)\s*(.*)/i);
        if (sm) {
          return `${counter++}. ${sm[3] || sm[2]}`;
        }
        return sl;
      });
    }

    questions.push({
      q_num: qNum,
      section: currentSection,
      question: stemLines.join('\n'),
      options: { A: optA, B: optB, C: optC, D: optD }
    });

    qNum++;
  }

  return questions;
}

// Render Questions List
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
      </div>
      <div class="q-stem" contenteditable="true" data-field="question">${escapeHtml(q.question)}</div>
      <div class="q-options">
        <div class="q-opt"><span>(A)</span> ${escapeHtml(q.options.A || '')}</div>
        <div class="q-opt"><span>(B)</span> ${escapeHtml(q.options.B || '')}</div>
        <div class="q-opt"><span>(C)</span> ${escapeHtml(q.options.C || '')}</div>
        <div class="q-opt"><span>(D)</span> ${escapeHtml(q.options.D || '')}</div>
      </div>
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
    const match = q.question.toLowerCase().includes(query) || (q.section && q.section.toLowerCase().includes(query));
    item.style.display = match ? 'block' : 'none';
  });
});

// Client-Side PowerPoint Generator using PptxGenJS
function setupGenerator() {
  btnGeneratePpt.addEventListener('click', async () => {
    if (state.parsedQuestions.length === 0) return;

    btnGeneratePpt.disabled = true;
    btnGeneratePpt.innerHTML = '<span>⏳</span> Generating PowerPoint in browser...';
    genStatusText.innerText = 'Creating presentation slides...';

    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9'; // 13.33 x 7.5 inches

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

      for (const q of state.parsedQuestions) {
        const slide = pptx.addSlide();

        // Set Slide Background
        if (state.bgImageUrl) {
          slide.background = { path: state.bgImageUrl };
        }

        const stemLines = q.question.split('\n');
        const maxOptLen = Math.max(
          (q.options.A || '').length,
          (q.options.B || '').length,
          (q.options.C || '').length,
          (q.options.D || '').length
        );

        const isShortMcq = chk2x2Grid.checked && (maxOptLen <= 35 && q.question.length <= 260 && stemLines.length === 1);

        if (isShortMcq) {
          // Top Question Stem
          const qTextRuns = [];
          if (q.section) {
            qTextRuns.push({ text: q.section.toUpperCase() + '\n', options: { fontSize: 13, bold: true, color: colSecHex } });
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

          // 2x2 Columns
          const colW = (bWidth - 0.5) / 2;
          const topOpts = bTop + 2.8;

          // Col 1 (A & C)
          slide.addText([
            { text: '(A) ', options: { fontSize: 21, bold: true, color: colOptLblHex } },
            { text: q.options.A + '\n\n', options: { fontSize: 21, color: 'F5F5F5' } },
            { text: '(C) ', options: { fontSize: 21, bold: true, color: colOptLblHex } },
            { text: q.options.C, options: { fontSize: 21, color: 'F5F5F5' } }
          ], { x: bLeft, y: topOpts, w: colW, h: 2.8, wrap: true, valign: 'top' });

          // Col 2 (B & D)
          slide.addText([
            { text: '(B) ', options: { fontSize: 21, bold: true, color: colOptLblHex } },
            { text: q.options.B + '\n\n', options: { fontSize: 21, color: 'F5F5F5' } },
            { text: '(D) ', options: { fontSize: 21, bold: true, color: colOptLblHex } },
            { text: q.options.D, options: { fontSize: 21, color: 'F5F5F5' } }
          ], { x: bLeft + colW + 0.5, y: topOpts, w: colW, h: 2.8, wrap: true, valign: 'top' });

        } else {
          // Dynamic Font Calculation
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
            textRuns.push({ text: q.section.toUpperCase() + '\n', options: { fontSize: Math.max(11, stPt - 7), bold: true, color: colSecHex } });
          }
          textRuns.push({ text: `Q${q.q_num}. `, options: { fontSize: stPt + 3, bold: true, color: colQnumHex } });
          textRuns.push({ text: stemLines[0] + '\n', options: { fontSize: stPt, bold: true, color: colStemHex } });

          for (let i = 1; i < stemLines.length; i++) {
            const sub = stemLines[i];
            const isStmt = sub.startsWith('1.') || sub.startsWith('2.') || sub.startsWith('3.') || sub.startsWith('•') || sub.startsWith('Statement');
            textRuns.push({ text: sub + '\n', options: { fontSize: stPt * 0.95, bold: true, color: isStmt ? 'FFF5B4' : colStemHex } });
          }

          textRuns.push({ text: '\n', options: { fontSize: spPt } });

          for (const k of ['A', 'B', 'C', 'D']) {
            textRuns.push({ text: `(${k}) `, options: { fontSize: optPt, bold: true, color: colOptLblHex } });
            textRuns.push({ text: (q.options[k] || '') + '\n', options: { fontSize: optPt, color: 'F5F5F5' } });
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
      }

      const outName = `Quiz_Presentation_${state.parsedQuestions.length}_Slides.pptx`;
      await pptx.writeFile({ fileName: outName });

      downloadBanner.classList.remove('hidden');
      downloadDetails.innerText = `${state.parsedQuestions.length} slides exported directly to your Downloads folder!`;
      genStatusText.innerText = '✨ Presentation generated successfully!';
      downloadBanner.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      alert('Error generating PowerPoint: ' + err.message);
    } finally {
      btnGeneratePpt.disabled = false;
      btnGeneratePpt.innerHTML = '<span>🚀</span> Generate PowerPoint (.pptx)';
    }
  });

  btnDownloadAgain.addEventListener('click', () => {
    btnGeneratePpt.click();
  });
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return (text || '').replace(/[&<>"']/g, m => map[m]);
}
