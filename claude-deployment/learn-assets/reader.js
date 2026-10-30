/* Markov.ink worksheet reader.
   Turns a photo or PDF into separate questions, entirely in the browser:
   - PDFs with a text layer: text is read exactly with pdf.js.
   - Photos and scanned PDFs: text recognition (OCR) with Tesseract.js.
   The libraries load only when a file is chosen, and the file stays on the device.
   Works best with printed worksheets; handwriting is not reliable here.
   Optional: when /api/read-questions is set up, Claude vision reads the page instead
   and leaves out anything that is not a question (see the Claude section below). */
(function () {
  'use strict';

  var LIBS = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    ocr: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
  };
  var MAX_PAGES = 5;

  var loading = {};
  function loadScript(src) {
    if (!loading[src]) {
      loading[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src; s.async = true; s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = function () { delete loading[src]; reject(new Error('load')); };
        document.head.appendChild(s);
      });
    }
    return loading[src];
  }

  /* ---------- Text cleanup ---------- */

  // Character sets built from code points so this file stays plain ASCII.
  function chars() { return String.fromCharCode.apply(null, arguments); }
  var LE_GE = chars(0x2264, 0x2265);
  var DASHES = new RegExp('[' + chars(0x2212, 0x2012, 0x2013, 0x2014, 0x2015) + ']', 'g');
  var SINGLE_QUOTES = new RegExp('[' + chars(0x2018, 0x2019, 0x201a) + ']', 'g');
  var DOUBLE_QUOTES = new RegExp('[' + chars(0x201c, 0x201d, 0x201e) + ']', 'g');
  var NBSP = new RegExp(chars(0xa0), 'g');
  var COMPARE = new RegExp('\\s*(<=|>=|!=|[=<>' + LE_GE + '])\\s*', 'g');
  var MATH_HINT = new RegExp('[=<>' + LE_GE + '^]|\\d\\s*[a-z]\\b|\\b[a-z]\\s*[+\\-*/]', 'i');

  // Space binary + and - in math only ("3x-7" reads "3x - 7"), never in words like "two-step",
  // and never after a part label like "(a)", so "(a) -2x" keeps its minus sign.
  var MATH_OP;
  try { MATH_OP = new RegExp('((?<![a-z])[a-z]|\\d|\\))\\s*([+\\-])\\s*(?=\\d|[a-z](?![a-z])|\\()', 'gi'); }
  catch (e) { MATH_OP = /(\d|\))\s*([+\-])\s*(?=\d|\()/g; } // older Safari: digits and brackets only

  // Text recognition often drops an opening bracket: "4x - 1) = 20" is almost always "4(x - 1) = 20".
  function repairBrackets(t) {
    var open = (t.match(/\(/g) || []).length, close = (t.match(/\)/g) || []).length;
    if (close !== open + 1 || !/=/.test(t)) return t;
    return t.replace(/(\d)([a-z])(\s*[+\-]\s*\d+\s*\))/i, '$1($2$3');
  }

  function clean(s) {
    var t = String(s || '')
      .replace(DASHES, '-')
      .replace(SINGLE_QUOTES, "'").replace(DOUBLE_QUOTES, '"')
      .replace(NBSP, ' ')
      .replace(/-{2,}/g, '-')
      .replace(COMPARE, ' $1 ');
    var label = (t.match(/^\s*\(?(?:[a-h]|i{1,3}|iv|v)\)\s*/i) || [''])[0];
    t = label + repairBrackets(t.slice(label.length).replace(MATH_OP, '$1 $2 '));
    return t.replace(/[ \t]+/g, ' ').trim();
  }

  function isHeader(line) {
    return /^(name|date|period|class|block|score|teacher|hour)\b[^a-z]{0,3}/i.test(line) && /[:_]/.test(line) ||
      /^[_\-.\s]{4,}$/.test(line);
  }

  /* ---------- Splitting lines into questions ---------- */

  var Q_START = /^(?:q(?:uestion)?\.?\s*)?(\d{1,2})\s*[.):\]]\s*(.*)$/i;
  // "(b) x/3" or "(b)x/3" (text recognition drops the space) or "b. x/3"
  var PART = /^(?:\(([a-h]|i{1,3}|iv|v)\)\s*|([a-h])[.)]\s+)(.+)$/i;

  // A number can only start a new question when the text before it is complete: its brackets
  // are closed and it does not end in an operator. So "3(x + 4) - 2x" stays one expression,
  // and "B = (2, 5)." is not read as question 5.
  function canSplitBefore(before) {
    var b = String(before || '').trim();
    if (!b) return false;
    if ((b.match(/\(/g) || []).length !== (b.match(/\)/g) || []).length) return false;
    return !/[+\-*\/=<>(,^]$/.test(b);
  }

  // Splits a line that holds two questions side by side, like "1. 3x = 9   2. x + 4 = 7".
  function splitInline(line, expected) {
    var out = [line];
    for (var n = expected; n < expected + 5; n++) {
      var last = out[out.length - 1];
      var re = new RegExp('\\s(?=' + n + '\\s*[.)]\\s+\\S)');
      var m = last.slice(1).search(re);
      if (m === -1) {
        // text recognition can drop the space: "= 11 2.5x + 4" when the left side is already a full equation
        var tight = last.slice(1).search(new RegExp('\\s(?=' + n + '[.)][a-z(\\-]|' + n + '[.)]\\d+[a-z(])', 'i'));
        if (tight === -1 || !/[=?]/.test(last.slice(0, tight + 1))) continue;
        m = tight;
      }
      if (!canSplitBefore(last.slice(0, m + 1))) continue;
      out[out.length - 1] = last.slice(0, m + 1).trim();
      out.push(last.slice(m + 1).trim());
    }
    return out;
  }

  // A wide gap before a number usually means a second column, but only when the left side is complete.
  function columnSplit(s) {
    var out = [], rest = String(s || ''), re = /\s{3,}(?=(?:q\.?\s*)?\d{1,2}\s*[.)])/i, m;
    while ((m = rest.search(re)) > 0 && canSplitBefore(rest.slice(0, m))) {
      out.push(rest.slice(0, m));
      rest = rest.slice(m).replace(/^\s+/, '');
    }
    out.push(rest);
    return out;
  }

  // Puts each part of a question on its own line: "Find x. (b) Find the area" keeps (b) with
  // its question but on a new line.
  function splitParts(t) {
    return String(t).replace(/([.?!:])\s+(\((?:[a-h]|i{1,3}|iv|v)\)\s)/gi, '$1\n$2').split('\n');
  }

  function looksLikeMath(s) { return MATH_HINT.test(s); }

  // rawLines are strings, or for PDFs with text, objects { s, page, x, right, top, bottom, h, furniture }.
  // Returns questions (text), plus for positioned lines the region of each question on its page.
  function segment(rawLines) {
    var lines = [];
    rawLines.forEach(function (l) {
      var meta = l && typeof l === 'object' ? l : null;
      columnSplit(meta ? meta.s : l).forEach(function (part) {
        var c = clean(part); if (c) lines.push({ s: c, meta: meta });
      });
    });
    var intro = [], introMeta = [], questions = [], cur = null, last = 0, warnings = [];
    function add(q, text) { splitParts(text).forEach(function (t) { t = t.trim(); if (t) q.lines.push(t); }); }

    // first pass: is this a numbered sheet?
    var numbered = lines.filter(function (l) { return Q_START.test(l.s); }).length >= 2;

    lines.forEach(function (ln) {
      var line = ln.s, meta = ln.meta;
      // headers and footers repeated on several pages never become question text
      if (meta && meta.furniture) { if (!cur) { intro.push(line); introMeta.push(meta); } return; }
      if (isHeader(line)) return;
      var pieces = numbered ? splitInline(line, last + 1) : [line];
      pieces.forEach(function (piece) {
        var m = numbered ? piece.match(Q_START) : null;
        var n = m ? +m[1] : 0;
        // the first question may have any number (a sheet can start at question 5); after
        // that, numbers must move forward by at most three
        if (m && n > last && (last === 0 || n <= last + 3) && m[2] !== undefined) {
          if (last && n !== last + 1) warnings.push('Question ' + n + ' comes right after question ' + last + '. Check that no question is missing.');
          cur = { n: n, lines: [], meta: meta, labels: [], boxes: meta ? [meta] : [] };
          if (m[2]) add(cur, m[2]);
          questions.push(cur);
          last = n;
          return;
        }
        // Short text placed away from the question's left edge is a label inside a picture
        // (axis ticks, point names, dimensions). It stays in the picture, not in the text.
        if (cur && meta && cur.meta && meta.page === cur.meta.page && piece.length <= 24 &&
            (meta.x < cur.meta.x - 6 || meta.x > cur.meta.x + 30)) {
          cur.labels.push(meta);
          return;
        }
        var p = cur ? piece.match(PART) : null;
        if (p) { add(cur, '(' + (p[1] || p[2]).toLowerCase() + ') ' + p[3]); if (meta) cur.boxes.push(meta); return; }
        if (!numbered) {
          // no numbers: each line with math or a question mark starts a question
          if (!cur || looksLikeMath(piece) || /\?$/.test(piece) || /^(solve|find|simplify|expand|evaluate|graph|write|explain)\b/i.test(piece)) {
            cur = { n: questions.length + 1, lines: [piece], meta: meta, labels: [], boxes: meta ? [meta] : [] };
            questions.push(cur);
          } else {
            cur.lines.push(piece);
            if (meta) cur.boxes.push(meta);
          }
          return;
        }
        if (!cur) { intro.push(piece); if (meta) introMeta.push(meta); return; }
        if (meta) cur.boxes.push(meta);
        // continuation of the current question
        var prev = cur.lines[cur.lines.length - 1];
        if (prev && !looksLikeMath(piece) && !looksLikeMath(prev) && !/^\(/.test(piece) && !/[.?:]$/.test(prev)) {
          cur.lines[cur.lines.length - 1] = prev + ' ' + piece;
        } else {
          add(cur, piece);
        }
      });
    });

    var kept = questions
      .map(function (q) { return { q: q, text: q.lines.join('\n').trim().slice(0, 600) }; })
      .filter(function (x) { return x.text.length > 0; })
      .slice(0, 40);
    if (numbered && kept.length && kept[0].q.n !== 1) warnings.unshift('The first question found is number ' + kept[0].q.n + '. Check that the start of the sheet was read.');
    kept.forEach(function (x) { if (x.text.length < 6) warnings.push('Question ' + x.q.n + ' is very short. Check it was read correctly.'); });

    // Title: the largest line before the first question, if it clearly stands out; otherwise
    // the first short line before it.
    var title = '';
    if (introMeta.length) {
      var sizes = lines.filter(function (l) { return l.meta; }).map(function (l) { return l.meta.h; }).sort(function (a, b) { return a - b; });
      var typical = sizes[Math.floor(sizes.length / 2)] || 0;
      var big = introMeta.filter(function (m) { return m.h >= typical * 1.4; }).sort(function (a, b) { return b.h - a.h; })[0];
      if (big) title = clean(big.s);
    }
    if (!title) {
      title = (intro.filter(function (l) { return l.length > 3 && l.length <= 60 && !/[=]/.test(l); })[0] || '')
        .replace(/^[^\w(]+/, '').replace(/[^\w)?.!]+$/, '');
    }
    return {
      questions: kept.map(function (x) { return x.text; }),
      numbers: kept.map(function (x) { return x.q.n; }),
      regions: kept.map(function (x) { return x.q.meta ? { page: x.q.meta.page, top: x.q.meta.top, x: x.q.meta.x, boxes: x.q.boxes, labels: x.q.labels } : null; }),
      intro: intro, title: title.slice(0, 80), warnings: warnings
    };
  }

  /* ---------- PDF ---------- */

  // Text rows of one page, with where each row sits (PDF points, measured from the page top).
  function pdfPageLines(page) {
    var vp = page.getViewport({ scale: 1 }), H = vp.height;
    return page.getTextContent().then(function (tc) {
      var rows = {};
      tc.items.forEach(function (it) {
        if (!it.str || !it.str.trim()) return;
        var y = Math.round(it.transform[5] / 3) * 3, x = it.transform[4];
        var h = Math.hypot(it.transform[2], it.transform[3]) || 10;
        (rows[y] = rows[y] || []).push({ x: x, w: it.width || 0, s: it.str, h: h, by: it.transform[5] });
      });
      var lines = Object.keys(rows).map(Number).sort(function (a, b) { return b - a; }).map(function (y) {
        var parts = rows[y].sort(function (a, b) { return a.x - b.x; });
        var out = '', end = null, h = 0, by = parts[0].by;
        parts.forEach(function (p) {
          if (end !== null) out += (p.x - end > 24 ? '   ' : (p.x - end > 1.5 ? ' ' : ''));
          out += p.s; end = p.x + p.w; h = Math.max(h, p.h);
        });
        return { s: out, x: parts[0].x, right: end, top: H - by - h * 0.85, bottom: H - by + h * 0.3, h: h };
      });
      return { lines: lines, width: vp.width, height: H };
    });
  }

  // Lines near the top or bottom of a page that repeat on another page (same text, or the same
  // start, like "Homework practice | ...") are page headers and footers.
  function markFurniture(pages) {
    if (pages.length < 2) return;
    function key(s) { return String(s).toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim(); }
    var band = pages.map(function (p) { return p.lines.filter(function (l) { return l.top < p.height * 0.2 || l.top > p.height * 0.9; }); });
    pages.forEach(function (p, i) {
      band[i].forEach(function (l) {
        if (Q_START.test(clean(l.s))) return;   // a question is never page furniture
        var k = key(l.s);
        var again = band.some(function (other, j) {
          return j !== i && other.some(function (o) {
            var ok = key(o.s);
            return ok === k || (k.length >= 16 && ok.length >= 16 && ok.slice(0, 16) === k.slice(0, 16));
          });
        });
        if (again) l.furniture = true;
      });
    });
  }

  function renderPage(page) {
    var vp = page.getViewport({ scale: 2 });
    var canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    return page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise.then(function () { return canvas; });
  }

  // Reads the text layer. A scanned PDF has none; then runOcr() reads the page images.
  function readPdf(file, progress) {
    progress({ phase: 'load', text: 'Opening the PDF' });
    return loadScript(LIBS.pdf).then(function () {
      var lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
      return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf }).promise; });
    }).then(function (doc) {
      var n = Math.min(doc.numPages, MAX_PAGES);
      var nums = [];
      for (var i = 1; i <= n; i++) nums.push(i);
      return nums.reduce(function (p, i) {
        return p.then(function (acc) {
          progress({ phase: 'read', text: 'Reading page ' + i + ' of ' + n, frac: (i - 1) / n });
          return doc.getPage(i).then(function (page) {
            return pdfPageLines(page).then(function (t) { acc.push({ page: page, lines: t.lines, width: t.width, height: t.height }); return acc; });
          });
        });
      }, Promise.resolve([])).then(function (pages) {
        var chars = pages.reduce(function (s, a) { return s + a.lines.map(function (l) { return l.s; }).join('').length; }, 0);
        if (chars >= 20) {
          markFurniture(pages);
          var lines = [];
          pages.forEach(function (pg, idx) { pg.lines.forEach(function (l) { l.page = idx; lines.push(l); }); });
          return { lines: lines, method: 'pdf-text', pages: n, truncated: doc.numPages > n, pageData: pages };
        }
        // scanned PDF: no text layer, so recognize each page image when asked
        return {
          method: 'scanned', pages: n, truncated: doc.numPages > n,
          runOcr: function () {
            return pages.reduce(function (p, a, idx) {
              return p.then(function (all) {
                return renderPage(a.page).then(function (canvas) {
                  return ocr(canvas, function (f) { progress({ phase: 'ocr', text: 'Recognizing page ' + (idx + 1) + ' of ' + n, frac: (idx + f) / n }); });
                }).then(function (r) { all.lines = all.lines.concat(r.lines); all.conf.push(r.confidence); return all; });
              });
            }, Promise.resolve({ lines: [], conf: [] })).then(function (all) {
              var c = all.conf.length ? all.conf.reduce(function (s, v) { return s + v; }, 0) / all.conf.length : 0;
              return { lines: all.lines, method: 'ocr', pages: n, confidence: c, truncated: doc.numPages > n };
            });
          }
        };
      });
    });
  }

  /* ---------- Pictures from the PDF ---------- */

  // For each question region, keeps a picture when the region has drawing in it (graphs,
  // shapes, tables) or labels that were left out of the text. The crop runs from the question's
  // first line to the bottom of its drawing, so axes, labels, and dimensions are not cut off.
  function cropFigures(pages, seg, progress) {
    var regs = seg.regions || [], visuals = regs.map(function () { return null; }), byPage = {};
    regs.forEach(function (r, i) { if (r) (byPage[r.page] = byPage[r.page] || []).push(i); });
    var keys = Object.keys(byPage);
    return keys.reduce(function (p, pg, k) {
      return p.then(function () {
        var page = pages[+pg];
        progress({ phase: 'read', text: 'Keeping pictures, page ' + (+pg + 1), frac: k / keys.length });
        return renderPage(page.page).then(function (canvas) {
          var S = canvas.width / page.width;
          var idxs = byPage[pg].sort(function (a, b) { return regs[a].top - regs[b].top; });
          idxs.forEach(function (qi, j) {
            var nextTop = j + 1 < idxs.length ? regs[idxs[j + 1]].top : page.height - 20;
            try { visuals[qi] = figureCrop(canvas, S, page, regs[qi], nextTop); } catch (e) { visuals[qi] = null; }
          });
        });
      });
    }, Promise.resolve()).then(function () { return visuals; });
  }

  function figureCrop(canvas, S, page, r, nextTop) {
    var x0 = Math.round(18 * S), x1 = Math.round((page.width - 18) * S);
    var y0 = Math.max(0, Math.round((r.top - 6) * S)), y1 = Math.min(canvas.height, Math.round((nextTop - 4) * S));
    var w = x1 - x0, h = y1 - y0;
    if (h < 24 || w < 24) return null;
    var data = canvas.getContext('2d').getImageData(x0, y0, w, h).data;
    // the question's own text rows are skipped, so letters do not count as a picture
    var mask = r.boxes.map(function (b) { return [Math.round((b.top - 2) * S) - y0, Math.round((b.bottom + 2) * S) - y0]; });
    function masked(y) { for (var i = 0; i < mask.length; i++) if (y >= mask[i][0] && y <= mask[i][1]) return true; return false; }
    function dark(i) { return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < 215; }
    // "Drawing" means dark pixels with dark pixels 4 rows below: lines, axes, and shapes.
    // Thin ruled answer lines do not count.
    var count = 0, lastRow = -1, minX = w, maxX = -1, down = w * 4 * 4;
    for (var y = 0; y < h - 5; y += 2) {
      if (masked(y)) continue;
      for (var x = 0; x < w; x += 2) {
        var i = (y * w + x) * 4;
        if (dark(i) && dark(i + down)) {
          count++;
          if (y > lastRow) lastRow = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    var labels = r.labels || [];
    if (count < 60 && !labels.length) return null;
    labels.concat(r.boxes).forEach(function (b) {
      lastRow = Math.max(lastRow, Math.round((b.bottom + 2) * S) - y0);
      minX = Math.min(minX, Math.round(b.x * S) - x0);
      maxX = Math.max(maxX, Math.round((b.right || b.x + 20) * S) - x0);
    });
    var pad = Math.round(10 * S);
    var cx0 = Math.max(0, minX - pad), cx1 = Math.min(w, maxX + pad), ch = Math.min(h, lastRow + pad + 4);
    var scale = Math.min(1, 900 / (cx1 - cx0));
    var out = document.createElement('canvas');
    out.width = Math.round((cx1 - cx0) * scale); out.height = Math.round(ch * scale);
    var oc = out.getContext('2d');
    oc.fillStyle = '#fff'; oc.fillRect(0, 0, out.width, out.height);
    oc.drawImage(canvas, x0 + cx0, y0, cx1 - cx0, ch, 0, 0, out.width, out.height);
    var url = out.toDataURL('image/jpeg', 0.85);
    if (url.length > 350000) url = out.toDataURL('image/jpeg', 0.6);
    return url.length > 600000 ? null : url;   // too big to keep safely in this browser
  }

  /* ---------- Photos ---------- */

  // Grayscale and enlarge small photos so recognition has more to work with.
  function prepareImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(2.5, Math.max(1, 1800 / img.naturalWidth));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        // gentle grayscale and contrast; a hard threshold erases thin marks like + ( /
        var d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
        for (var i = 0; i < px.length; i += 4) {
          var g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          g = Math.max(0, Math.min(255, (g - 128) * 1.35 + 140));
          px[i] = px[i + 1] = px[i + 2] = g;
        }
        ctx.putImageData(d, 0, 0);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  // One recognition worker, reused, that keeps the wide gaps between columns.
  var worker = null, onFracNow = null;
  function getWorker() {
    if (!worker) {
      worker = loadScript(LIBS.ocr).then(function () {
        return window.Tesseract.createWorker('eng', 1, {
          logger: function (m) { if (m.status === 'recognizing text' && onFracNow) onFracNow(m.progress || 0); }
        });
      }).then(function (w) {
        return w.setParameters({ preserve_interword_spaces: '1' }).then(function () { return w; });
      }).catch(function (e) { worker = null; throw e; });
    }
    return worker;
  }

  function ocr(source, onFrac) {
    return getWorker().then(function (w) {
      onFracNow = onFrac;
      return w.recognize(source);
    }).then(function (res) {
      onFracNow = null;
      return { lines: String(res.data.text || '').split(/\r?\n/), confidence: res.data.confidence || 0 };
    });
  }

  function readImage(file, progress) {
    progress({ phase: 'load', text: 'Preparing the photo' });
    return prepareImage(file).then(function (canvas) {
      progress({ phase: 'ocr', text: 'Loading the text reader', frac: 0 });
      return ocr(canvas, function (f) { progress({ phase: 'ocr', text: 'Reading the photo', frac: f }); });
    }).then(function (r) { return { lines: r.lines, method: 'ocr', pages: 1, confidence: r.confidence }; });
  }

  /* ---------- Claude vision (optional, server side) ---------- */

  // When the site's /api/read-questions function has a key, page images go there and Claude
  // picks out only the questions, leaving out names, student work, answers, and notes.
  // If it is missing or fails, the on-device reader above is used instead.
  var API = '/api/read-questions';
  var MAX_SIDE = 1568;          // larger images are scaled down by the API anyway
  var claudeCheck = null;

  function claudeAvailable() {
    if (!claudeCheck) {
      claudeCheck = fetch(API, { method: 'GET', cache: 'no-store' }).then(function (r) {
        if (!r.ok) return false;
        return r.json().then(function (j) { return !!(j && j.ok && j.configured); });
      }).catch(function () { return false; });
    }
    return claudeCheck;
  }

  function canvasToJpeg(source, w, h) {
    var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(source, 0, 0, c.width, c.height);
    var data = c.toDataURL('image/jpeg', 0.85).split(',')[1] || '';
    return { media_type: 'image/jpeg', data: data };
  }

  function photoImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve([canvasToJpeg(img, img.naturalWidth, img.naturalHeight)]); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  function pdfImages(file, progress) {
    return loadScript(LIBS.pdf).then(function () {
      var lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
      return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf }).promise; });
    }).then(function (doc) {
      var n = Math.min(doc.numPages, MAX_PAGES), out = [], chain = Promise.resolve();
      for (var i = 1; i <= n; i++) {
        (function (i) {
          chain = chain.then(function () {
            progress({ phase: 'load', text: 'Preparing page ' + i + ' of ' + n, frac: (i - 1) / n * 0.3 });
            return doc.getPage(i).then(renderPage).then(function (canvas) { out.push(canvasToJpeg(canvas, canvas.width, canvas.height)); });
          });
        })(i);
      }
      return chain.then(function () { return { images: out, truncated: doc.numPages > n }; });
    });
  }

  function partLabel(l) {
    l = String(l || '').trim();
    if (!l) return '';
    return /^\(.*\)$/.test(l) ? l : '(' + l.replace(/[.)]+$/, '') + ')';
  }

  // One question becomes one block of text, with its parts on their own lines.
  function questionText(q) {
    var lines = [];
    if (q.text) lines.push(clean(q.text));
    (q.parts || []).forEach(function (p) {
      var t = clean(p.text || '');
      if (t) lines.push((partLabel(p.label) + ' ' + t).trim());
    });
    return lines.join('\n');
  }

  function readWithClaude(file, isPdf, progress) {
    progress({ phase: 'load', text: 'Preparing the page' });
    return (isPdf ? pdfImages(file, progress) : photoImage(file).then(function (images) { return { images: images, truncated: false }; }))
      .then(function (pages) {
        progress({ phase: 'claude', text: 'Claude is finding the questions' });
        return fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: pages.images })
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok || !j.ok || !j.result) { var e = new Error('claude'); e.code = j.error || ('http_' + r.status); throw e; }
            var res = j.result;
            var qs = res.questions.map(questionText).filter(function (t) { return t; }).slice(0, 40);
            return {
              method: 'claude',
              status: res.status,
              message: res.message,
              title: res.sheet_title,
              directions: res.directions,
              ignored: res.ignored || [],
              unclear: res.questions.filter(function (q) { return q.legibility === 'partly_unclear'; }).length,
              figures: res.questions.filter(function (q) { return q.has_figure; }).length,
              questions: qs,
              intro: [],
              pages: pages.images.length,
              truncated: pages.truncated,
              confidence: 100
            };
          });
        });
      });
  }

  /* ---------- Public ---------- */

  function finish(r, progress) {
    var seg = segment(r.lines);
    r.questions = seg.questions; r.intro = seg.intro; r.title = seg.title;
    r.numbers = seg.numbers; r.warnings = seg.warnings;
    if (r.method !== 'pdf-text' || !r.pageData) { delete r.pageData; return Promise.resolve(r); }
    return cropFigures(r.pageData, seg, progress).then(function (v) {
      r.visuals = v; r.figures = v.filter(Boolean).length;
      delete r.pageData;
      return r;
    }, function () { delete r.pageData; return r; });
  }

  function readOnDevice(file, isPdf, progress) {
    if (!isPdf) return readImage(file, progress).then(function (r) { return finish(r, progress); });
    return readPdf(file, progress).then(function (r) {
      return r.method === 'scanned' ? r.runOcr().then(function (o) { return finish(o, progress); }) : finish(r, progress);
    });
  }

  // opts.claude: try Claude first when it is set up; fall back to this device if it fails.
  // A PDF with real text is always read from its text: exact, free, and it keeps pictures.
  function read(file, onProgress, opts) {
    var progress = onProgress || function () {};
    var isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    var isImage = /^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.type);
    if (!isPdf && !isImage) return Promise.reject(new Error('type'));
    var claude = !!(opts && opts.claude);
    function viaClaude(onFail) {
      return readWithClaude(file, isPdf, progress).catch(function (err) {
        return onFail().then(function (r) { r.fallback = (err && err.code) || 'error'; return r; });
      });
    }
    if (isPdf) {
      return readPdf(file, progress).then(function (r) {
        if (r.method === 'pdf-text') return finish(r, progress);
        var ocrIt = function () { return r.runOcr().then(function (o) { return finish(o, progress); }); };
        return claude ? viaClaude(ocrIt) : ocrIt();
      });
    }
    if (!claude) return readOnDevice(file, false, progress);
    return viaClaude(function () { return readOnDevice(file, false, progress); });
  }

  window.MarkovReader = {
    read: read,
    claudeAvailable: claudeAvailable,
    questionText: questionText,
    segment: segment,
    _test: { canSplitBefore: canSplitBefore, splitInline: splitInline, markFurniture: markFurniture, splitParts: splitParts },
    fromText: function (text) { return segment(String(text || '').split(/\r?\n/)); },
    clean: clean
  };
})();
