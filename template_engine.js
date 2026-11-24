/* Quiz2Slide Studio - PPTX Template Engine (Rev 15.0)
 * ------------------------------------------------------------------
 * Makes any uploaded PowerPoint template work "for real":
 *   1. analyzePptxTemplate(file)   -> reads slide size, theme, the first slide, its layout & master
 *   2. renderTemplatePreview(tpl)  -> draws a faithful preview of the slide on a canvas (for the area selector)
 *   3. detectAnchors               -> finds "Question" and A/B/C/D badge shapes so text can be auto-placed
 *   4. mergeIntoTemplate(tpl, blob, kinds) -> takes the PptxGenJS output and injects every generated
 *      slide's text/images INTO a clone of the template slide, so all shapes, badges, pictures, fonts,
 *      background and layout decorations of the original design are preserved (100% editable in PowerPoint).
 * Everything runs client-side with JSZip + DOMParser.
 */
(function () {
  'use strict';

  const EMU_PER_IN = 914400;
  const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  // ---------- small XML helpers (namespace-prefix agnostic) ----------
  const parseXml = (str) => new DOMParser().parseFromString(str, 'application/xml');
  const kids = (el, name) => el ? Array.from(el.children).filter(c => c.localName === name) : [];
  const kid = (el, name) => el ? Array.from(el.children).find(c => c.localName === name) || null : null;
  const path = (el, ...names) => { let cur = el; for (const n of names) { cur = kid(cur, n); if (!cur) return null; } return cur; };
  const num = (v, d = 0) => (v === null || v === undefined || v === '' || isNaN(+v)) ? d : +v;
  const rAttr = (el, name) => el ? (el.getAttributeNS(NS_REL, name) || el.getAttribute('r:' + name)) : null;

  function resolveTarget(basePart, target) {
    if (target.startsWith('/')) return target.slice(1);
    const parts = basePart.split('/'); parts.pop();
    for (const seg of target.split('/')) {
      if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg);
    }
    return parts.join('/');
  }
  const relsPathOf = (part) => { const p = part.split('/'); const f = p.pop(); return p.join('/') + '/_rels/' + f + '.rels'; };

  async function readRels(zip, part) {
    const f = zip.file(relsPathOf(part));
    const map = {};
    if (!f) return map;
    const doc = parseXml(await f.async('string'));
    for (const r of Array.from(doc.getElementsByTagName('Relationship'))) {
      map[r.getAttribute('Id')] = {
        type: r.getAttribute('Type') || '',
        target: r.getAttribute('TargetMode') === 'External' ? r.getAttribute('Target') : resolveTarget(part, r.getAttribute('Target')),
        external: r.getAttribute('TargetMode') === 'External'
      };
    }
    return map;
  }

  // ---------- colors ----------
  const PRESET_COLORS = { white: 'FFFFFF', black: '000000', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', grey: '808080', orange: 'FFA500' };
  function hexToRgb(h) { h = (h || '000000').replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgbToHex(r, g, b) { return [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  function rgbToHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h, s; const l = (mx + mn) / 2; if (mx === mn) { h = s = 0; } else { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
  function hslToRgb(h, s, l) { if (s === 0) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }

  function makeColorResolver(themeColors, clrMap) {
    return function resolveColor(parent) {
      if (!parent) return null;
      const c = Array.from(parent.children).find(e => ['srgbClr', 'schemeClr', 'sysClr', 'prstClr', 'scrgbClr', 'hslClr'].includes(e.localName));
      if (!c) return null;
      let hex = '000000';
      if (c.localName === 'srgbClr') hex = c.getAttribute('val');
      else if (c.localName === 'sysClr') hex = c.getAttribute('lastClr') || (c.getAttribute('val') === 'window' ? 'FFFFFF' : '000000');
      else if (c.localName === 'prstClr') hex = PRESET_COLORS[c.getAttribute('val')] || '000000';
      else if (c.localName === 'scrgbClr') hex = rgbToHex(num(c.getAttribute('r')) / 100000 * 255, num(c.getAttribute('g')) / 100000 * 255, num(c.getAttribute('b')) / 100000 * 255);
      else if (c.localName === 'schemeClr') {
        let v = c.getAttribute('val');
        if (clrMap[v]) v = clrMap[v];
        hex = themeColors[v] || themeColors[{ bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' }[v]] || '000000';
      }
      let [r, g, b] = hexToRgb(hex);
      let alpha = 1;
      for (const m of Array.from(c.children)) {
        const val = num(m.getAttribute('val'), 100000) / 100000;
        if (m.localName === 'lumMod' || m.localName === 'lumOff') {
          let [h, s, l] = rgbToHsl(r, g, b);
          l = m.localName === 'lumMod' ? l * val : l + val;
          [r, g, b] = hslToRgb(h, s, Math.max(0, Math.min(1, l)));
        } else if (m.localName === 'tint') { r = r + (255 - r) * (1 - val); g = g + (255 - g) * (1 - val); b = b + (255 - b) * (1 - val); }
        else if (m.localName === 'shade') { r *= val; g *= val; b *= val; }
        else if (m.localName === 'alpha') alpha = val;
      }
      return { hex: rgbToHex(r, g, b), alpha };
    };
  }
  const css = (c) => c ? `rgba(${hexToRgb(c.hex).join(',')},${c.alpha})` : null;

  // ---------- analysis ----------
  async function analyzePptxTemplate(fileOrBuffer) {
    const zip = await JSZip.loadAsync(fileOrBuffer);
    const presPart = 'ppt/presentation.xml';
    if (!zip.file(presPart)) throw new Error('Not a valid PowerPoint (.pptx) file');
    const presXml = await zip.file(presPart).async('string');
    const presDoc = parseXml(presXml);
    const presRels = await readRels(zip, presPart);

    const sldSz = presDoc.getElementsByTagName('p:sldSz')[0] || Array.from(presDoc.getElementsByTagName('*')).find(e => e.localName === 'sldSz');
    const cx = num(sldSz && sldSz.getAttribute('cx'), 12192000);
    const cy = num(sldSz && sldSz.getAttribute('cy'), 6858000);

    // first slide in presentation order
    const sldIdEls = Array.from(presDoc.getElementsByTagName('*')).filter(e => e.localName === 'sldId');
    let slidePart = null;
    for (const s of sldIdEls) { const rid = rAttr(s, 'id'); if (rid && presRels[rid]) { slidePart = presRels[rid].target; break; } }

    const masterRel = Object.values(presRels).find(r => r.type.endsWith('/slideMaster'));
    let layoutPart = null, masterPart = masterRel ? masterRel.target : null;
    let slideXml = null, slideRels = {};

    if (slidePart && zip.file(slidePart)) {
      slideXml = await zip.file(slidePart).async('string');
      slideRels = await readRels(zip, slidePart);
      const lr = Object.values(slideRels).find(r => r.type.endsWith('/slideLayout'));
      if (lr) layoutPart = lr.target;
    }
    if (!layoutPart && masterPart) {
      const mr = await readRels(zip, masterPart);
      // prefer a "blank" layout, else the first
      const layouts = Object.values(mr).filter(r => r.type.endsWith('/slideLayout')).map(r => r.target);
      for (const lp of layouts) { const x = await zip.file(lp).async('string'); if (/type="blank"/.test(x)) { layoutPart = lp; break; } }
      if (!layoutPart) layoutPart = layouts[0];
    }
    if (layoutPart && !masterPart) {
      const lr = await readRels(zip, layoutPart);
      const m = Object.values(lr).find(r => r.type.endsWith('/slideMaster'));
      if (m) masterPart = m.target;
    }
    if (!slideXml) {
      // template without any slide: synthesize a blank slide based on the layout
      slideXml = blankSlideXml();
      slideRels = {};
    }

    const masterXml = masterPart ? await zip.file(masterPart).async('string') : null;
    const layoutXml = layoutPart ? await zip.file(layoutPart).async('string') : null;
    const masterRels = masterPart ? await readRels(zip, masterPart) : {};
    const layoutRels = layoutPart ? await readRels(zip, layoutPart) : {};

    // theme
    const themeRel = Object.values(masterRels).find(r => r.type.endsWith('/theme'));
    const themeColors = {};
    let fontMajor = 'Calibri', fontMinor = 'Calibri';
    if (themeRel && zip.file(themeRel.target)) {
      const tdoc = parseXml(await zip.file(themeRel.target).async('string'));
      const scheme = Array.from(tdoc.getElementsByTagName('*')).find(e => e.localName === 'clrScheme');
      if (scheme) for (const c of Array.from(scheme.children)) {
        const v = Array.from(c.children)[0];
        if (v) themeColors[c.localName] = v.localName === 'sysClr' ? (v.getAttribute('lastClr') || 'FFFFFF') : (v.getAttribute('val') || '000000');
      }
      const maj = Array.from(tdoc.getElementsByTagName('*')).find(e => e.localName === 'majorFont');
      const min = Array.from(tdoc.getElementsByTagName('*')).find(e => e.localName === 'minorFont');
      if (maj && kid(maj, 'latin')) fontMajor = kid(maj, 'latin').getAttribute('typeface') || fontMajor;
      if (min && kid(min, 'latin')) fontMinor = kid(min, 'latin').getAttribute('typeface') || fontMinor;
    }
    const clrMap = {};
    if (masterXml) {
      const cm = Array.from(parseXml(masterXml).getElementsByTagName('*')).find(e => e.localName === 'clrMap');
      if (cm) for (const a of Array.from(cm.attributes)) clrMap[a.name] = a.value;
    }

    const tpl = {
      zip, presXml, presRels, cx, cy,
      widthIn: cx / EMU_PER_IN, heightIn: cy / EMU_PER_IN,
      slidePart, slideXml, slideRels, layoutPart, layoutXml, layoutRels, masterPart, masterXml, masterRels,
      themeColors, clrMap, fontMajor, fontMinor,
      resolveColor: makeColorResolver(themeColors, clrMap),
      slideCount: sldIdEls.length,
      anchors: null
    };
    tpl.contentShapes = detectContentText(tpl);
    tpl.stripContent = tpl.contentShapes.ids.length > 0;
    tpl.anchors = detectAnchors(tpl);
    tpl.bgHex = await detectBackgroundHex(tpl);
    return tpl;
  }

  function blankSlideXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>' +
      '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
  }

  // ---------- shape tree walking (absolute EMU boxes, handles nested groups) ----------
  function walkTree(spTree, cb, mapFn = (x, y, w, h) => ({ x, y, w, h }), groupFill = null, groupStack = []) {
    for (const el of Array.from(spTree.children)) {
      const ln = el.localName;
      if (ln === 'grpSp') {
        const gx = path(el, 'grpSpPr', 'xfrm');
        let childMap = mapFn;
        let gBox = null;
        if (gx) {
          const off = kid(gx, 'off'), ext = kid(gx, 'ext'), chOff = kid(gx, 'chOff'), chExt = kid(gx, 'chExt');
          const ox = num(off && off.getAttribute('x')), oy = num(off && off.getAttribute('y'));
          const ew = num(ext && ext.getAttribute('cx')), eh = num(ext && ext.getAttribute('cy'));
          const cxo = num(chOff && chOff.getAttribute('x')), cyo = num(chOff && chOff.getAttribute('y'));
          const cw = num(chExt && chExt.getAttribute('cx'), ew) || 1, ch = num(chExt && chExt.getAttribute('cy'), eh) || 1;
          const sx = ew / cw, sy = eh / ch;
          childMap = (x, y, w, h) => mapFn(ox + (x - cxo) * sx, oy + (y - cyo) * sy, w * sx, h * sy);
          gBox = mapFn(ox, oy, ew, eh);
        }
        const gp = kid(el, 'grpSpPr');
        const gFill = gp ? (kid(gp, 'solidFill') || (kid(gp, 'noFill') ? 'none' : null)) : null;
        cb({ type: 'groupStart', el, box: gBox });
        walkTree(el, cb, childMap, gFill || groupFill, gBox ? groupStack.concat([gBox]) : groupStack);
      } else if (ln === 'sp' || ln === 'pic' || ln === 'cxnSp') {
        const spPr = kid(el, 'spPr');
        const xf = spPr && kid(spPr, 'xfrm');
        if (!xf) { cb({ type: ln, el, box: null, groupFill, groupStack }); continue; }
        const off = kid(xf, 'off'), ext = kid(xf, 'ext');
        const box = mapFn(num(off && off.getAttribute('x')), num(off && off.getAttribute('y')), num(ext && ext.getAttribute('cx')), num(ext && ext.getAttribute('cy')));
        box.rot = num(xf.getAttribute('rot')) / 60000;
        box.flipH = xf.getAttribute('flipH') === '1';
        box.flipV = xf.getAttribute('flipV') === '1';
        cb({ type: ln, el, box, groupFill, groupStack });
      } else if (ln === 'AlternateContent') {
        const fb = kid(el, 'Fallback') || kid(el, 'Choice');
        if (fb) walkTree(fb, cb, mapFn, groupFill, groupStack);
      }
    }
  }

  const shapeText = (sp) => {
    const tx = kid(sp, 'txBody');
    if (!tx) return '';
    return kids(tx, 'p').map(p => Array.from(p.getElementsByTagName('*')).filter(e => e.localName === 't').map(t => t.textContent).join('')).join('\n').trim();
  };
  const isPlaceholder = (sp) => {
    const nv = kid(sp, 'nvSpPr') || kid(sp, 'nvPicPr') || kid(sp, 'nvCxnSpPr');
    return !!(nv && path(nv, 'nvPr', 'ph'));
  };

  // ---------- sample/content text already on the template slide (e.g. a filled deck used as template) ----------
  function detectContentText(tpl) {
    const doc = parseXml(tpl.slideXml);
    const spTree = Array.from(doc.getElementsByTagName('*')).find(e => e.localName === 'spTree');
    const ids = []; let box = null;
    if (!spTree) return { ids, box };
    walkTree(spTree, (n) => {
      if (n.type !== 'sp') return;
      const t = shapeText(n.el);
      if (t.replace(/\s+/g, ' ').length < 40) return; // short labels ("Question", "A") are design
      const id = (path(n.el, 'nvSpPr', 'cNvPr') || { getAttribute: () => null }).getAttribute('id');
      if (!id) return;
      ids.push(id);
      if (n.box) {
        const b = n.box;
        box = box ? { x: Math.min(box.x, b.x), y: Math.min(box.y, b.y), r: Math.max(box.r, b.x + b.w), btm: Math.max(box.btm, b.y + b.h) } : { x: b.x, y: b.y, r: b.x + b.w, btm: b.y + b.h };
      }
    });
    const ratio = box ? { left_ratio: box.x / tpl.cx, top_ratio: box.y / tpl.cy, width_ratio: (box.r - box.x) / tpl.cx, height_ratio: (box.btm - box.y) / tpl.cy } : null;
    return { ids, box: ratio };
  }

  // Returns slide XML with the given top-level/nested <p:sp> shapes (by cNvPr id) removed
  function removeShapesById(xml, ids) {
    if (!ids || !ids.length) return xml;
    const doc = parseXml(xml);
    const all = Array.from(doc.getElementsByTagName('*')).filter(e => e.localName === 'sp');
    for (const sp of all) {
      const c = path(sp, 'nvSpPr', 'cNvPr');
      if (c && ids.includes(c.getAttribute('id')) && sp.parentNode) sp.parentNode.removeChild(sp);
    }
    let out = new XMLSerializer().serializeToString(doc);
    if (!/^<\?xml/.test(out)) out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + out;
    return out;
  }

  // ---------- anchor detection: "Question" badge and A/B/C/D badges ----------
  const BADGE_MAP = { a: 'A', b: 'B', c: 'C', d: 'D', '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'क': 'A', 'ख': 'B', 'ग': 'C', 'घ': 'D', 'अ': 'A', 'ब': 'B', 'स': 'C', 'द': 'D' };
  function detectAnchors(tpl) {
    const doc = parseXml(tpl.slideXml);
    const spTree = Array.from(doc.getElementsByTagName('*')).find(e => e.localName === 'spTree');
    if (!spTree) return null;
    const slideArea = tpl.cx * tpl.cy;
    const found = { options: {} };
    walkTree(spTree, (n) => {
      if (n.type !== 'sp' || !n.box) return;
      const t = shapeText(n.el);
      if (!t || t.length > 24) return;
      // badge box = innermost small group around the text (e.g. bubble + text), else the shape itself
      let box = n.box;
      for (let i = n.groupStack.length - 1; i >= 0; i--) {
        const g = n.groupStack[i];
        if (g.w * g.h < slideArea * 0.12) { box = g; break; }
      }
      const ob = t.match(/^[\(\[]?\s*([A-Da-d1-4क-घअबसद])\s*[\)\]]?\s*[\.:\)]?$/);
      if (ob) {
        const key = BADGE_MAP[ob[1].toLowerCase()] || BADGE_MAP[ob[1]];
        if (key && !found.options[key]) found.options[key] = { x: box.x, y: box.y, w: box.w, h: box.h };
        return;
      }
      if (/^(?:q(?:uestion|ues|ue)?s?\.?|प्रश्न|प्र\.)\s*(?:no\.?|number|संख्या)?\s*[:\.\-]?\s*\d{0,3}\s*$/i.test(t)) {
        if (!found.question) found.question = { x: box.x, y: box.y, w: box.w, h: box.h };
      }
    });
    const keys = Object.keys(found.options);
    if (keys.length < 2 && !found.question) return null;
    return computeTextZones(tpl, found);
  }

  // Turn detected badge shapes into ready-to-use text zones (ratios of slide size)
  function computeTextZones(tpl, found) {
    const W = tpl.cx, H = tpl.cy;
    const marginR = W * 0.045, gap = W * 0.008;
    const res = { questionBadge: found.question || null, badges: found.options, optionZones: {}, questionZone: null };
    const opts = found.options;
    const keys = ['A', 'B', 'C', 'D'].filter(k => opts[k]);

    for (const k of keys) {
      const b = opts[k];
      const cyMid = b.y + b.h / 2;
      // nearest badge to the right on the same row bounds the width
      let rightLimit = W - marginR;
      for (const k2 of keys) {
        const o = opts[k2];
        if (k2 !== k && Math.abs((o.y + o.h / 2) - cyMid) < b.h * 0.75 && o.x > b.x + b.w) rightLimit = Math.min(rightLimit, o.x - gap * 3);
      }
      // vertical room: distance to the nearest badge row below/above
      let below = H - (b.y + b.h), above = b.y;
      for (const k2 of keys) {
        const o = opts[k2];
        if (k2 === k) continue;
        if (o.y > b.y + b.h * 0.75) below = Math.min(below, o.y - (b.y + b.h));
        if (o.y + o.h < b.y + b.h * 0.25) above = Math.min(above, b.y - (o.y + o.h));
      }
      const room = Math.max(b.h, Math.min(b.h + 2 * Math.min(below, above) * 0.8, b.h * 3.2));
      const x = b.x + b.w + gap * 2;
      res.optionZones[k] = { x, y: cyMid - room / 2, w: Math.max(W * 0.08, rightLimit - x), h: room };
    }

    // question zone: below the "Question" badge (or top of slide) down to the first badge row
    const firstBadgeTop = keys.length ? Math.min(...keys.map(k => opts[k].y)) : H * 0.55;
    const firstOptTop = firstBadgeTop - H * 0.03;
    const leftMost = keys.length ? Math.min(...keys.map(k => opts[k].x)) : W * 0.07;
    let qx, qy;
    if (found.question) { qx = Math.min(found.question.x, leftMost); qy = found.question.y + found.question.h + H * 0.025; }
    else { qx = leftMost; qy = H * 0.08; }
    const qh = Math.max(H * 0.12, firstOptTop - qy - H * 0.015);
    res.questionZone = { x: qx, y: qy, w: W - marginR - qx, h: qh };
    // option zones must not climb into the question zone
    const qBottom = qy + qh + H * 0.01;
    for (const k of keys) {
      const z = res.optionZones[k];
      if (z.y < qBottom) { const bottom = z.y + z.h; z.y = Math.min(qBottom, opts[k].y); z.h = Math.max(opts[k].h, bottom - z.y); }
    }

    const toRatio = z => z && ({ left_ratio: z.x / W, top_ratio: z.y / H, width_ratio: z.w / W, height_ratio: z.h / H });
    res.questionRatio = toRatio(res.questionZone);
    if (keys.length) {
      const xs = keys.map(k => res.optionZones[k]);
      const minX = Math.min(...xs.map(z => z.x)), minY = Math.min(...xs.map(z => z.y));
      const maxX = Math.max(...xs.map(z => z.x + z.w)), maxY = Math.max(...xs.map(z => z.y + z.h));
      res.optionsRatio = toRatio({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
    }
    res.optionRatios = {};
    for (const k of keys) res.optionRatios[k] = toRatio(res.optionZones[k]);
    res.hasBadges = keys.length >= 2;
    return res;
  }

  async function detectBackgroundHex(tpl) {
    for (const xml of [tpl.slideXml, tpl.layoutXml, tpl.masterXml]) {
      if (!xml) continue;
      const doc = parseXml(xml);
      const bg = Array.from(doc.getElementsByTagName('*')).find(e => e.localName === 'bg');
      if (!bg) continue;
      const bgPr = kid(bg, 'bgPr'), bgRef = kid(bg, 'bgRef');
      if (bgPr) {
        const sf = kid(bgPr, 'solidFill'); if (sf) return tpl.resolveColor(sf).hex;
        const gf = kid(bgPr, 'gradFill'); if (gf) { const gs = Array.from(gf.getElementsByTagName('*')).find(e => e.localName === 'gs'); if (gs) return tpl.resolveColor(gs).hex; }
        if (kid(bgPr, 'blipFill')) return null;
      }
      if (bgRef) { const c = tpl.resolveColor(bgRef); if (c) return c.hex; }
    }
    return 'FFFFFF';
  }

  // ---------- preview renderer ----------
  const imgCache = new Map();
  async function loadZipImage(zip, part) {
    const key = part;
    if (imgCache.has(key)) return imgCache.get(key);
    const f = zip.file(part);
    if (!f || !/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(part)) return null;
    const blob = await f.async('blob');
    const typed = /\.svg$/i.test(part) ? new Blob([blob], { type: 'image/svg+xml' }) : blob;
    const url = URL.createObjectURL(typed);
    const img = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
    imgCache.set(key, img);
    return img;
  }

  function roundRectPath(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  async function drawPart(c, tpl, xml, rels, scale, opts) {
    const doc = parseXml(xml);
    const spTree = Array.from(doc.getElementsByTagName('*')).find(e => e.localName === 'spTree');
    if (!spTree) return;
    const items = [];
    walkTree(spTree, (n) => { if (n.type !== 'groupStart') items.push(n); });
    for (const n of items) {
      if (!n.box) continue;
      if (opts.skipPlaceholders && isPlaceholder(n.el)) continue;
      const { x, y, w, h, rot, flipH, flipV } = n.box;
      const X = x * scale, Y = y * scale, Wd = w * scale, Ht = h * scale;
      c.save();
      c.translate(X + Wd / 2, Y + Ht / 2);
      if (rot) c.rotate(rot * Math.PI / 180);
      c.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      c.translate(-Wd / 2, -Ht / 2);
      try {
        if (n.type === 'pic') {
          const blip = Array.from(n.el.getElementsByTagName('*')).find(e => e.localName === 'blip');
          const rid = rAttr(blip, 'embed');
          const rel = rid && rels[rid];
          const img = rel ? await loadZipImage(tpl.zip, rel.target) : null;
          if (img) {
            const src = Array.from(n.el.getElementsByTagName('*')).find(e => e.localName === 'srcRect');
            const l = num(src && src.getAttribute('l')) / 100000, t = num(src && src.getAttribute('t')) / 100000;
            const r = num(src && src.getAttribute('r')) / 100000, b = num(src && src.getAttribute('b')) / 100000;
            const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
            const amf = Array.from(blip.children).find(e => e.localName === 'alphaModFix');
            if (amf) c.globalAlpha = num(amf.getAttribute('amt'), 100000) / 100000;
            if (Array.from(blip.children).some(e => e.localName === 'grayscl')) c.filter = 'grayscale(1)';
            const sx = Math.max(0, l) * iw, sy = Math.max(0, t) * ih;
            const sw = Math.max(1, (1 - Math.max(0, l) - Math.max(0, r)) * iw), sh = Math.max(1, (1 - Math.max(0, t) - Math.max(0, b)) * ih);
            c.drawImage(img, sx, sy, Math.min(sw, iw - sx), Math.min(sh, ih - sy), 0, 0, Wd, Ht);
          }
        } else {
          const spPr = kid(n.el, 'spPr');
          const style = kid(n.el, 'style');
          // fill
          let fill = null;
          if (spPr) {
            if (kid(spPr, 'noFill')) fill = null;
            else if (kid(spPr, 'solidFill')) fill = css(tpl.resolveColor(kid(spPr, 'solidFill')));
            else if (kid(spPr, 'gradFill')) { const gs = Array.from(kid(spPr, 'gradFill').getElementsByTagName('*')).find(e => e.localName === 'gs'); fill = gs ? css(tpl.resolveColor(gs)) : null; }
            else if (kid(spPr, 'grpFill')) fill = (n.groupFill && n.groupFill !== 'none') ? css(tpl.resolveColor(n.groupFill)) : null;
            else if (kid(spPr, 'blipFill')) fill = null;
            else if (style && kid(style, 'fillRef') && num(kid(style, 'fillRef').getAttribute('idx')) > 0 && n.type === 'sp') fill = css(tpl.resolveColor(kid(style, 'fillRef')));
          }
          // line
          let stroke = null, lw = 1;
          const lnEl = spPr && kid(spPr, 'ln');
          if (lnEl && kid(lnEl, 'noFill')) stroke = null;
          else if (lnEl && kid(lnEl, 'solidFill')) stroke = css(tpl.resolveColor(kid(lnEl, 'solidFill')));
          else if (style && kid(style, 'lnRef') && num(kid(style, 'lnRef').getAttribute('idx')) > 0) stroke = css(tpl.resolveColor(kid(style, 'lnRef')));
          if (lnEl && lnEl.getAttribute('w')) lw = Math.max(1, num(lnEl.getAttribute('w')) * scale);
          else lw = Math.max(1, 12700 * scale);

          const geom = spPr && kid(spPr, 'prstGeom');
          const prst = geom ? geom.getAttribute('prst') : (spPr && kid(spPr, 'custGeom') ? 'cust' : 'rect');
          if (n.type === 'cxnSp' || prst === 'line' || prst === 'straightConnector1') {
            if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.beginPath(); c.moveTo(0, 0); c.lineTo(Wd, Ht); c.stroke(); }
          } else if (fill || stroke) {
            const gd = geom ? Array.from(geom.getElementsByTagName('*')).find(e => e.localName === 'gd' && (e.getAttribute('name') === 'adj' || e.getAttribute('name') === 'adj3')) : null;
            const adj = gd ? num((gd.getAttribute('fmla') || '').replace('val ', ''), 16667) : 16667;
            if (prst === 'ellipse') { c.beginPath(); c.ellipse(Wd / 2, Ht / 2, Wd / 2, Ht / 2, 0, 0, Math.PI * 2); }
            else if (/roundRect|Callout|round/i.test(prst)) roundRectPath(c, 0, 0, Wd, Ht, Math.min(Wd, Ht) * adj / 100000);
            else if (prst === 'triangle') { c.beginPath(); c.moveTo(Wd / 2, 0); c.lineTo(Wd, Ht); c.lineTo(0, Ht); c.closePath(); }
            else { c.beginPath(); c.rect(0, 0, Wd, Ht); }
            if (fill) { c.fillStyle = fill; c.fill(); }
            if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
          }
          // text
          const txBody = kid(n.el, 'txBody');
          if (txBody && shapeText(n.el)) {
            const bodyPr = kid(txBody, 'bodyPr');
            const anchor = (bodyPr && bodyPr.getAttribute('anchor')) || 't';
            const paras = kids(txBody, 'p');
            const lines = [];
            for (const p of paras) {
              const runs = kids(p, 'r');
              const txt = runs.map(r => (kid(r, 't') || {}).textContent || '').join('');
              const rPr = runs[0] ? kid(runs[0], 'rPr') : kid(p, 'endParaRPr');
              const sz = num(rPr && rPr.getAttribute('sz'), 1800) / 100;
              let col = rPr && kid(rPr, 'solidFill') ? tpl.resolveColor(kid(rPr, 'solidFill')) : null;
              if (!col && style && kid(style, 'fontRef')) col = tpl.resolveColor(kid(style, 'fontRef'));
              if (!col) col = { hex: tpl.themeColors[tpl.clrMap.tx1 || 'dk1'] || '000000', alpha: 1 };
              const latin = rPr && kid(rPr, 'latin');
              const face = latin ? latin.getAttribute('typeface') : tpl.fontMinor;
              const algn = (kid(p, 'pPr') && kid(p, 'pPr').getAttribute('algn')) || 'l';
              lines.push({ txt, sz, col, bold: rPr && rPr.getAttribute('b') === '1', face, algn });
            }
            const pxPerPt = scale * 12700;
            const totalH = lines.reduce((a, l) => a + l.sz * pxPerPt * 1.2, 0);
            let ty = anchor === 'ctr' ? (Ht - totalH) / 2 : anchor === 'b' ? Ht - totalH : 0.05 * EMU_PER_IN * scale;
            for (const l of lines) {
              const fs = l.sz * pxPerPt;
              c.font = `${l.bold ? 'bold ' : ''}${fs}px "${l.face}", "Plus Jakarta Sans", sans-serif`;
              c.fillStyle = css(l.col);
              c.textBaseline = 'top';
              c.textAlign = l.algn === 'ctr' ? 'center' : l.algn === 'r' ? 'right' : 'left';
              const tx = l.algn === 'ctr' ? Wd / 2 : l.algn === 'r' ? Wd - 0.1 * EMU_PER_IN * scale : 0.1 * EMU_PER_IN * scale;
              c.fillText(l.txt, tx, ty + fs * 0.1, Wd);
              ty += fs * 1.2;
            }
          }
        }
      } catch (e) { console.warn('preview shape skipped', e); }
      c.restore();
    }
  }

  async function paintBackground(c, tpl, Wpx, Hpx) {
    for (const [xml, rels] of [[tpl.slideXml, tpl.slideRels], [tpl.layoutXml, tpl.layoutRels], [tpl.masterXml, tpl.masterRels]]) {
      if (!xml) continue;
      const bg = Array.from(parseXml(xml).getElementsByTagName('*')).find(e => e.localName === 'bg');
      if (!bg) continue;
      const bgPr = kid(bg, 'bgPr'), bgRef = kid(bg, 'bgRef');
      if (bgPr) {
        const blipFill = kid(bgPr, 'blipFill');
        if (blipFill) {
          const blip = kid(blipFill, 'blip'); const rid = rAttr(blip, 'embed');
          const img = rid && rels[rid] ? await loadZipImage(tpl.zip, rels[rid].target) : null;
          if (img) { c.drawImage(img, 0, 0, Wpx, Hpx); return; }
        }
        const sf = kid(bgPr, 'solidFill');
        if (sf) { c.fillStyle = css(tpl.resolveColor(sf)); c.fillRect(0, 0, Wpx, Hpx); return; }
        const gf = kid(bgPr, 'gradFill');
        if (gf) {
          const stops = Array.from(gf.getElementsByTagName('*')).filter(e => e.localName === 'gs');
          const g = c.createLinearGradient(0, 0, 0, Hpx);
          stops.forEach(s => g.addColorStop(num(s.getAttribute('pos')) / 100000, css(tpl.resolveColor(s))));
          c.fillStyle = g; c.fillRect(0, 0, Wpx, Hpx); return;
        }
      }
      if (bgRef) { const col = tpl.resolveColor(bgRef); if (col) { c.fillStyle = css(col); c.fillRect(0, 0, Wpx, Hpx); return; } }
    }
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, Wpx, Hpx);
  }

  async function renderTemplatePreview(tpl, widthPx = 1600) {
    const scale = widthPx / tpl.cx;
    const Wpx = Math.round(widthPx), Hpx = Math.round(tpl.cy * scale);
    const cv = document.createElement('canvas');
    cv.width = Wpx; cv.height = Hpx;
    const c = cv.getContext('2d');
    await paintBackground(c, tpl, Wpx, Hpx);
    const slideRoot = (tpl.slideXml.match(/<p:sld\b[^>]*>/) || [''])[0];
    const slideShowsMaster = !/showMasterSp="0"/.test(slideRoot);
    const layoutRoot = tpl.layoutXml ? (tpl.layoutXml.match(/<p:sldLayout\b[^>]*>/) || [''])[0] : '';
    const layoutShowsMaster = !/showMasterSp="0"/.test(layoutRoot);
    if (slideShowsMaster) {
      if (layoutShowsMaster && tpl.masterXml) await drawPart(c, tpl, tpl.masterXml, tpl.masterRels, scale, { skipPlaceholders: true });
      if (tpl.layoutXml) await drawPart(c, tpl, tpl.layoutXml, tpl.layoutRels, scale, { skipPlaceholders: true });
    }
    const slideXml = tpl.stripContent ? removeShapesById(tpl.slideXml, tpl.contentShapes.ids) : tpl.slideXml;
    await drawPart(c, tpl, slideXml, tpl.slideRels, scale, { skipPlaceholders: false });
    return cv.toDataURL('image/png');
  }

  // ---------- merge generated slides into clones of the template slide ----------
  function extractSpTreeShapes(slideXml) {
    const start = slideXml.indexOf('<p:spTree>');
    const end = slideXml.lastIndexOf('</p:spTree>');
    if (start < 0 || end < 0) return '';
    const inner = slideXml.slice(start + '<p:spTree>'.length, end);
    // drop the group's own nvGrpSpPr / grpSpPr header
    const m = inner.match(/^\s*<p:nvGrpSpPr>[\s\S]*?<\/p:nvGrpSpPr>\s*(?:<p:grpSpPr\/>|<p:grpSpPr>[\s\S]*?<\/p:grpSpPr>)/);
    return m ? inner.slice(m[0].length) : inner;
  }

  function xmlEscapeAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  async function mergeIntoTemplate(tpl, genBlob, kinds) {
    const gen = await JSZip.loadAsync(genBlob);
    const out = await JSZip.loadAsync(await tpl.zip.generateAsync({ type: 'arraybuffer' }));

    // generated slides in order
    const genPres = await gen.file('ppt/presentation.xml').async('string');
    const genPresRels = await readRels(gen, 'ppt/presentation.xml');
    const genSlideParts = [];
    const reSld = /<p:sldId\b[^>]*r:id="([^"]+)"/g; let mm;
    while ((mm = reSld.exec(genPres)) !== null) { if (genPresRels[mm[1]]) genSlideParts.push(genPresRels[mm[1]].target); }

    // ---- remove existing slides / notes / comments from the template copy
    let ct = await out.file('[Content_Types].xml').async('string');
    Object.keys(out.files).forEach(p => {
      if (/^ppt\/(slides|notesSlides|comments)\//.test(p)) out.remove(p);
    });
    ct = ct.replace(/<Override PartName="\/ppt\/(?:slides|notesSlides|comments)\/[^"]*"[^>]*\/>/g, '');
    for (const [ext, type] of [['png', 'image/png'], ['jpeg', 'image/jpeg'], ['jpg', 'image/jpeg'], ['gif', 'image/gif'], ['svg', 'image/svg+xml']]) {
      if (!new RegExp(`<Default Extension="${ext}"`, 'i').test(ct)) ct = ct.replace('<Default ', `<Default Extension="${ext}" ContentType="${type}"/><Default `);
    }

    // template slide relationships (keep images/layout, drop notes/comments/tags)
    const tplRelEntries = Object.entries(tpl.slideRels).filter(([, r]) => !/(notesSlide|comments|commentAuthors|tags)$/.test(r.type));
    const layoutRel = tpl.layoutPart;
    const relLine = (id, type, target, external) => `<Relationship Id="${id}" Type="${type}" Target="${xmlEscapeAttr(target)}"${external ? ' TargetMode="External"' : ''}/>`;
    const relTargetFromSlide = (absPart) => '../' + absPart.replace(/^ppt\//, '');

    let presXml = tpl.presXml;
    let presRelsXml = await out.file('ppt/_rels/presentation.xml.rels').async('string');
    presRelsXml = presRelsXml.replace(/<Relationship [^>]*Type="[^"]*\/relationships\/slide"[^>]*\/>/g, '');
    // remove section lists & custom shows that reference the old slide ids
    presXml = presXml.replace(/<p:ext uri="\{521415D9-36F7-43E2-AB2F-B90AF26B5E84\}">[\s\S]*?<\/p:ext>/g, '').replace(/<p:extLst>\s*<\/p:extLst>/g, '');
    presXml = presXml.replace(/<p:custShowLst>[\s\S]*?<\/p:custShowLst>/g, '');

    // base template slide xml: strip shapes we will not keep? (keep everything – it IS the design)
    const tplSlide = (tpl.stripContent ? removeShapesById(tpl.slideXml, tpl.contentShapes.ids) : tpl.slideXml).replace(/<p:timing>[\s\S]*?<\/p:timing>/, '');
    const blankSlide = blankSlideXml();

    let sldIdLst = '<p:sldIdLst>';
    let nextSldId = 256;
    for (let i = 0; i < genSlideParts.length; i++) {
      const gPart = genSlideParts[i];
      const gXml = await gen.file(gPart).async('string');
      const gRels = await readRels(gen, gPart);
      let shapes = extractSpTreeShapes(gXml);

      const n = i + 1;
      const newPart = `ppt/slides/slide${n}.xml`;
      const relLines = [];
      const isSolution = kinds && kinds[i] === 'sol';

      if (isSolution) {
        if (layoutRel) relLines.push(relLine('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout', relTargetFromSlide(layoutRel)));
      } else {
        for (const [id, r] of tplRelEntries) {
          relLines.push(relLine(id, r.type, r.external ? r.target : relTargetFromSlide(r.target), r.external));
        }
        if (!tplRelEntries.some(([, r]) => r.type.endsWith('/slideLayout')) && layoutRel) {
          relLines.push(relLine('rIdQ2SLayout', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout', relTargetFromSlide(layoutRel)));
        }
      }

      // copy generated media & remap their rIds
      let imgIdx = 0;
      for (const [rid, r] of Object.entries(gRels)) {
        if (!r.type.endsWith('/image')) continue;
        const f = gen.file(r.target);
        if (!f) continue;
        imgIdx++;
        const ext = (r.target.split('.').pop() || 'png').toLowerCase();
        const mediaName = `ppt/media/q2s_s${n}_${imgIdx}.${ext}`;
        out.file(mediaName, await f.async('uint8array'));
        const newRid = `rIdQ2S${imgIdx}`;
        shapes = shapes.split(`r:embed="${rid}"`).join(`r:embed="${newRid}"`).split(`r:link="${rid}"`).join(`r:link="${newRid}"`);
        relLines.push(relLine(newRid, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', '../media/' + mediaName.split('/').pop()));
      }
      // unique shape ids
      let sid = 5000;
      shapes = shapes.replace(/<p:cNvPr id="\d+"/g, () => `<p:cNvPr id="${sid++}"`);

      const base = isSolution ? blankSlide : tplSlide;
      const at = base.lastIndexOf('</p:spTree>');
      const slideXml = base.slice(0, at) + shapes + base.slice(at);
      out.file(newPart, slideXml);
      out.file(`ppt/slides/_rels/slide${n}.xml.rels`, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + relLines.join('') + '</Relationships>');
      ct = ct.replace('</Types>', `<Override PartName="/${newPart}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`);
      const presRid = `rIdQ2SSlide${n}`;
      presRelsXml = presRelsXml.replace('</Relationships>', relLine(presRid, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide', `slides/slide${n}.xml`) + '</Relationships>');
      sldIdLst += `<p:sldId id="${nextSldId++}" r:id="${presRid}"/>`;
    }
    sldIdLst += '</p:sldIdLst>';

    if (/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/.test(presXml)) presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, sldIdLst);
    else if (/<p:sldIdLst\/>/.test(presXml)) presXml = presXml.replace(/<p:sldIdLst\/>/, sldIdLst);
    else presXml = presXml.replace(/(<\/p:sldMasterIdLst>(?:\s*<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>)?(?:\s*<p:handoutMasterIdLst>[\s\S]*?<\/p:handoutMasterIdLst>)?)/, `$1${sldIdLst}`);

    out.file('ppt/presentation.xml', presXml);
    out.file('ppt/_rels/presentation.xml.rels', presRelsXml);
    out.file('[Content_Types].xml', ct);
    // thumbnail no longer represents the deck
    return out.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', compression: 'DEFLATE' });
  }

  window.Q2STemplate = { analyzePptxTemplate, renderTemplatePreview, mergeIntoTemplate, EMU_PER_IN };
})();
