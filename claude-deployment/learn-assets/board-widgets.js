/* Markov.ink board tools you can touch: a balance scale, an equation whose terms
   you move across the equals sign, a graph with sliders, and a fraction bar.
   Each tool is a small card on the board. Its state saves with the board, and
   "Write it on the board" copies the current line into the student's work. */
(function () {
  'use strict';

  var MINUS = String.fromCharCode(0x2212), TIMES = String.fromCharCode(0xd7), DIV = String.fromCharCode(0xf7);
  var SVGNS = 'http://www.w3.org/2000/svg';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { var r = Math.round(v * 1000) / 1000; return r < 0 ? MINUS + Math.abs(r) : String(r); }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- reading "ax + b = cx + d" ---------- */
  function side(src) {
    var s = String(src || '').split(MINUS).join('-').replace(/\s+/g, '');
    if (!s || /[^0-9x+\-.]/.test(s)) return null;
    var out = { x: 0, k: 0 }, m = s.match(/[+-]?[^+-]+/g);
    if (!m) return null;
    for (var i = 0; i < m.length; i++) {
      var t = m[i];
      if (/x$/.test(t)) { var c = t.slice(0, -1); out.x += c === '' || c === '+' ? 1 : c === '-' ? -1 : +c; }
      else if (isFinite(+t)) out.k += +t;
      else return null;
      if (!isFinite(out.x) || !isFinite(out.k)) return null;
    }
    return out;
  }
  function parseEq(q) {
    var line = String(q || '').split('\n').filter(function (l) { return l.indexOf('=') > 0; })[0];
    if (!line) return null;
    line = line.replace(/^\s*(solve|find)\s*/i, '');
    var p = line.split('=');
    if (p.length !== 2) return null;
    var L = side(p[0]), R = side(p[1]);
    return L && R && (L.x || R.x) ? { L: L, R: R } : null;
  }
  function expr(s) {
    var x = s.x, k = s.k, out = '';
    if (x) out = (x === 1 ? '' : x === -1 ? MINUS : n(x)) + 'x';
    if (k || !x) out += out ? (k < 0 ? ' ' + MINUS + ' ' + n(-k) : ' + ' + n(k)) : n(k);
    return out;
  }
  function solved(e) {
    return (e.L.x === 1 && e.L.k === 0 && e.R.x === 0) || (e.R.x === 1 && e.R.k === 0 && e.L.x === 0);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- the card ---------- */
  var KINDS = {
    balance: { title: 'Balance', w: 300 },
    terms: { title: 'Move the terms', w: 320 },
    graph: { title: 'Graph y = mx + b', w: 280 },
    fraction: { title: 'Fraction bar', w: 300 }
  };

  var api = null, layer = null, list = [];

  function mount(layerEl, widgets, boardApi) {
    api = boardApi; layer = layerEl; list = widgets;
    layer.innerHTML = '';
    list.forEach(function (w) { render(w); });
  }

  function add(kind) {
    var k = KINDS[kind]; if (!k) return;
    var size = api.size(), pos = api.place(k.w, 260);
    var w = { id: 'w' + Date.now().toString(36), kind: kind, x: pos.x, y: pos.y, t: Date.now(), state: initState(kind) };
    list.push(w); render(w, true); api.changed();
    var first = layer.querySelector('[data-w="' + w.id + '"] button, [data-w="' + w.id + '"] input');
    if (first) first.focus();
  }

  function initState(kind) {
    var e = parseEq(api.question()) || { L: { x: 2, k: 3 }, R: { x: 0, k: 11 } };
    if (kind === 'balance') return { eq: e, start: clone(e), tilt: 0, log: [] };
    if (kind === 'terms') {
      var t = [];
      if (e.L.x) t.push({ s: 'L', x: true, v: e.L.x }); if (e.L.k) t.push({ s: 'L', x: false, v: e.L.k });
      if (e.R.x) t.push({ s: 'R', x: true, v: e.R.x }); if (e.R.k) t.push({ s: 'R', x: false, v: e.R.k });
      return { terms: t, start: clone(t) };
    }
    if (kind === 'graph') return { m: 1, b: 2 };
    return { parts: 4, shaded: [true, false, false, false], compare: false, parts2: 8, shaded2: [] };
  }

  function render(w, isNew) {
    var k = KINDS[w.kind]; if (!k) return;
    var el = document.createElement('section');
    el.className = 'bw' + (isNew && !reduced() ? ' bw-in' : '');
    el.setAttribute('data-w', w.id);
    el.setAttribute('aria-label', k.title + ' tool');
    el.style.left = w.x + 'px'; el.style.top = w.y + 'px'; el.style.width = k.w + 'px';
    el.innerHTML = '<header class="bw-head"><span class="bw-grip" aria-hidden="true"></span><h3>' + esc(k.title) + '</h3>' +
      '<button type="button" class="bw-x" aria-label="Close ' + esc(k.title) + '">' + String.fromCharCode(0xd7) + '</button></header><div class="bw-body"></div>';
    layer.appendChild(el);
    drag(el, w);
    el.querySelector('.bw-x').addEventListener('click', function () {
      list.splice(list.indexOf(w), 1); el.remove(); api.changed();
    });
    BODY[w.kind](el.querySelector('.bw-body'), w);
  }

  function drag(el, w) {
    var head = el.querySelector('.bw-head'), sx, sy, ox, oy, on = false;
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      on = true; sx = e.clientX; sy = e.clientY; ox = w.x; oy = w.y; head.setPointerCapture(e.pointerId); e.preventDefault();
    });
    head.addEventListener('pointermove', function (e) {
      if (!on) return;
      var s = api.size();
      w.x = Math.max(0, Math.min(s.w - 60, ox + e.clientX - sx)); w.y = Math.max(0, Math.min(s.h - 40, oy + e.clientY - sy));
      el.style.left = w.x + 'px'; el.style.top = w.y + 'px';
    });
    head.addEventListener('pointerup', function () { if (on) { on = false; api.changed(); } });
    // keyboard: arrows move the card when the title bar has focus
    head.tabIndex = 0; head.setAttribute('role', 'group'); head.setAttribute('aria-label', 'Move with arrow keys');
    head.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
      if (!d) return; e.preventDefault();
      w.x = Math.max(0, w.x + d[0]); w.y = Math.max(0, w.y + d[1]);
      el.style.left = w.x + 'px'; el.style.top = w.y + 'px'; api.changed();
    });
  }

  function writeBtn(text) { return '<button type="button" class="bw-btn" data-write="' + esc(text) + '">Write it on the board</button>'; }
  function bindWrite(body) {
    body.querySelectorAll('[data-write]').forEach(function (b) { b.addEventListener('click', function () { api.addText(b.getAttribute('data-write')); }); });
  }

  var BODY = {};

  /* ---------- balance: do the same thing to both sides ---------- */
  BODY.balance = function (body, w) {
    var st = w.state, e = st.eq, done = solved(e);
    var tilt = st.tilt;
    body.innerHTML =
      '<svg viewBox="0 0 280 110" class="bw-scale" role="img" aria-label="Balance: ' + esc(expr(e.L)) + ' on the left, ' + esc(expr(e.R)) + ' on the right' + (tilt ? ', tipped' : ', level') + '">' +
      '<g class="beam" style="transform:rotate(' + tilt + 'deg)"><line x1="20" y1="50" x2="260" y2="50"/><rect x="20" y="20" width="104" height="30" rx="7"/><rect x="156" y="20" width="104" height="30" rx="7"/>' +
      '<text x="72" y="41">' + esc(expr(e.L)) + '</text><text x="208" y="41">' + esc(expr(e.R)) + '</text></g><polygon points="130,100 150,100 140,52"/></svg>' +
      '<p class="bw-eq' + (done ? ' ok' : '') + '">' + esc(expr(e.L)) + ' = ' + esc(expr(e.R)) + '</p>' +
      (done ? '<p class="bw-msg ok">Solved, and balanced the whole way.</p>'
        : '<form class="bw-ops"><label class="sr-only" for="op-' + w.id + '">Operation</label><select id="op-' + w.id + '"><option value="-">' + MINUS + '</option><option value="+">+</option><option value="/">' + DIV + '</option><option value="*">' + TIMES + '</option></select>' +
          '<label class="sr-only" for="v-' + w.id + '">Amount, like 4 or 2x</label><input id="v-' + w.id + '" placeholder="4 or 2x" autocomplete="off" inputmode="text">' +
          '<button type="submit" class="bw-btn dark">Both sides</button><button type="button" class="bw-btn" data-one>Left only</button></form>' +
          '<p class="bw-msg" aria-live="polite">' + esc(st.msg || 'Pick a move. It happens to both sides.') + '</p>') +
      (st.log.length ? '<ol class="bw-log">' + st.log.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>' : '') +
      '<div class="bw-row">' + writeBtn(expr(e.L) + ' = ' + expr(e.R)) + '<button type="button" class="bw-btn" data-reset>Start over</button></div>';
    bindWrite(body);
    body.querySelector('[data-reset]').addEventListener('click', function () { w.state = { eq: clone(st.start), start: st.start, tilt: 0, log: [] }; BODY.balance(body, w); api.changed(); });
    var f = body.querySelector('.bw-ops'); if (!f) return;
    function amount() {
      var raw = body.querySelector('input').value.trim(), v = side(raw);
      if (!raw || !v) { st.msg = 'Type an amount like 4 or 2x.'; BODY.balance(body, w); body.querySelector('input').focus(); return null; }
      return v;
    }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (st.tilt) { st.msg = 'The scale is tipped. Start over and keep both sides equal.'; BODY.balance(body, w); return; }
      var op = body.querySelector('select').value, v = amount(); if (!v) return;
      if ((op === '*' || op === '/') && (v.x || !v.k)) { st.msg = 'Multiply or divide by a plain number, not by x or 0.'; BODY.balance(body, w); return; }
      [e.L, e.R].forEach(function (s) {
        if (op === '+') { s.x += v.x; s.k += v.k; } else if (op === '-') { s.x -= v.x; s.k -= v.k; }
        else if (op === '*') { s.x *= v.k; s.k *= v.k; } else { s.x /= v.k; s.k /= v.k; }
        s.x = Math.round(s.x * 1000) / 1000; s.k = Math.round(s.k * 1000) / 1000;
      });
      st.log.push({ '+': '+ ', '-': MINUS + ' ', '*': TIMES + ' ', '/': DIV + ' ' }[op] + expr(v) + ' on both sides');
      st.msg = solved(e) ? '' : (e.L.x && e.R.x ? 'Still balanced. There is x on both sides; can you clear one?' : 'Still balanced. Is x by itself yet?');
      BODY.balance(body, w); api.changed();
      if (solved(e)) api.win(body.closest('.bw'));
      var inp = body.querySelector('input'); if (inp) inp.focus();
    });
    body.querySelector('[data-one]').addEventListener('click', function () {
      var v = amount(); if (!v) return;
      st.tilt = 8; st.msg = 'Only one side changed, so the two sides are no longer equal. That is why every move goes on both sides.';
      BODY.balance(body, w); api.changed();
    });
  };

  /* ---------- terms: move a term across the equals sign ---------- */
  BODY.terms = function (body, w) {
    var st = w.state, T = st.terms;
    function sum(s, isX) { return T.filter(function (t) { return t.s === s && t.x === isX; }).reduce(function (a, t) { return a + t.v; }, 0); }
    function chip(t, i) {
      var label = (t.x ? (t.v === 1 ? '+x' : t.v === -1 ? MINUS + 'x' : (t.v > 0 ? '+' : MINUS) + n(Math.abs(t.v)) + 'x') : (t.v > 0 ? '+' : MINUS) + n(Math.abs(t.v)));
      return '<button type="button" class="bw-term" data-i="' + i + '" aria-label="Move ' + esc(label) + ' to the ' + (t.s === 'L' ? 'right' : 'left') + ' side">' + esc(label) + '</button>';
    }
    var left = T.map(function (t, i) { return t.s === 'L' ? chip(t, i) : ''; }).join('') || '<span class="bw-zero">0</span>';
    var right = T.map(function (t, i) { return t.s === 'R' ? chip(t, i) : ''; }).join('') || '<span class="bw-zero">0</span>';
    var e = { L: { x: sum('L', true), k: sum('L', false) }, R: { x: sum('R', true), k: sum('R', false) } };
    var oneEach = T.filter(function (t) { return t.s === 'L'; }).length <= 2 && T.filter(function (t) { return t.s === 'R'; }).length <= 2;
    var xAlone = (e.L.x && !e.L.k && !e.R.x) || (e.R.x && !e.R.k && !e.L.x);
    body.innerHTML = '<p class="bw-hint">Tap a term, or drag it across the = sign. It changes sign as it crosses.</p>' +
      '<div class="bw-terms"><div class="bw-side" data-side="L">' + left + '</div><span class="bw-eqs" aria-hidden="true">=</span><div class="bw-side" data-side="R">' + right + '</div></div>' +
      '<p class="bw-eq">' + esc(expr(e.L)) + ' = ' + esc(expr(e.R)) + '</p>' +
      '<p class="bw-msg" aria-live="polite">' + esc(st.msg || (xAlone ? 'x terms on one side, numbers on the other. Now combine and divide.' : 'Get the x terms on one side and the numbers on the other.')) + '</p>' +
      '<div class="bw-row"><button type="button" class="bw-btn" data-combine>Combine like terms</button>' + writeBtn(expr(e.L) + ' = ' + expr(e.R)) + '<button type="button" class="bw-btn" data-reset>Start over</button></div>';
    bindWrite(body);
    function move(i) {
      var t = T[i]; t.s = t.s === 'L' ? 'R' : 'L'; t.v = -t.v;
      st.msg = 'Moved across, so its sign flipped. That is the same as doing the opposite to both sides.';
      BODY.terms(body, w); api.changed();
      var again = body.querySelector('.bw-term[data-i="' + i + '"]'); if (again) again.focus();
    }
    body.querySelectorAll('.bw-term').forEach(function (b) {
      var i = +b.getAttribute('data-i'), sx = 0, moved = false;
      b.addEventListener('pointerdown', function (ev) { sx = ev.clientX; moved = false; b.setPointerCapture(ev.pointerId); });
      b.addEventListener('pointermove', function (ev) { if (b.hasPointerCapture(ev.pointerId)) { var dx = ev.clientX - sx; if (Math.abs(dx) > 6) { moved = true; b.style.transform = 'translateX(' + dx + 'px)'; } } });
      b.addEventListener('pointerup', function (ev) {
        b.style.transform = '';
        if (!moved) return;
        var eqs = body.querySelector('.bw-eqs').getBoundingClientRect(), cx = ev.clientX;
        if ((T[i].s === 'L' && cx > eqs.left) || (T[i].s === 'R' && cx < eqs.right)) move(i);
      });
      b.addEventListener('click', function () { if (!moved) move(i); });
    });
    body.querySelector('[data-combine]').addEventListener('click', function () {
      var out = [];
      ['L', 'R'].forEach(function (s) { [true, false].forEach(function (isX) { var v = sum(s, isX); if (v) out.push({ s: s, x: isX, v: Math.round(v * 1000) / 1000 }); }); });
      st.terms = out; st.msg = 'Combined.'; BODY.terms(body, w); api.changed();
      var c = { L: { x: 0, k: 0 }, R: { x: 0, k: 0 } };
      out.forEach(function (t) { c[t.s][t.x ? 'x' : 'k'] += t.v; });
      if ((c.L.x && !c.L.k && !c.R.x && c.R.k % c.L.x === 0) || (c.R.x && !c.R.k && !c.L.x && c.L.k % c.R.x === 0)) {
        st.msg = 'One step left: divide both sides by the number in front of x.'; BODY.terms(body, w);
      }
    });
    body.querySelector('[data-reset]').addEventListener('click', function () { w.state = { terms: clone(st.start), start: st.start }; BODY.terms(body, w); api.changed(); });
    void oneEach;
  };

  /* ---------- graph: y = mx + b with sliders ---------- */
  BODY.graph = function (body, w) {
    var st = w.state, S = 220, U = S / 20; // -10..10
    function X(v) { return S / 2 + v * U; } function Y(v) { return S / 2 - v * U; }
    var grid = '';
    for (var i = -10; i <= 10; i += 2) grid += '<line x1="' + X(i) + '" y1="0" x2="' + X(i) + '" y2="' + S + '" class="g"/><line x1="0" y1="' + Y(i) + '" x2="' + S + '" y2="' + Y(i) + '" class="g"/>';
    var x1 = -10, x2 = 10;
    var tri = st.m ? '<path class="tri" d="M' + X(0) + ' ' + Y(st.b) + 'H' + X(1) + 'V' + Y(st.b + st.m) + '"/><text class="tl" x="' + (X(0.5)) + '" y="' + (Y(st.b) + (st.m > 0 ? 14 : -6)) + '">1</text><text class="tl" x="' + (X(1) + 4) + '" y="' + (Y(st.b + st.m / 2) + 4) + '">' + esc(n(st.m)) + '</text>' : '';
    body.innerHTML = '<p class="bw-eq">y = ' + esc(st.m === 0 ? n(st.b) : (st.m === 1 ? '' : st.m === -1 ? MINUS : n(st.m)) + 'x' + (st.b ? (st.b < 0 ? ' ' + MINUS + ' ' + n(-st.b) : ' + ' + n(st.b)) : '')) + '</p>' +
      '<svg viewBox="0 0 ' + S + ' ' + S + '" class="bw-graph" role="img" aria-label="Line with slope ' + esc(n(st.m)) + ' crossing the y axis at ' + esc(n(st.b)) + '">' + grid +
      '<line x1="0" y1="' + Y(0) + '" x2="' + S + '" y2="' + Y(0) + '" class="ax"/><line x1="' + X(0) + '" y1="0" x2="' + X(0) + '" y2="' + S + '" class="ax"/>' +
      '<line x1="' + X(x1) + '" y1="' + Y(st.m * x1 + st.b) + '" x2="' + X(x2) + '" y2="' + Y(st.m * x2 + st.b) + '" class="ln"/>' + tri +
      '<circle cx="' + X(0) + '" cy="' + Y(st.b) + '" r="7" class="pt" data-drag/></svg>' +
      '<label class="bw-sl">Slope m <input type="range" min="-5" max="5" step="0.5" value="' + st.m + '" data-k="m"><output>' + esc(n(st.m)) + '</output></label>' +
      '<label class="bw-sl">Intercept b <input type="range" min="-10" max="10" step="1" value="' + st.b + '" data-k="b"><output>' + esc(n(st.b)) + '</output></label>' +
      '<p class="bw-hint">Drag the dot up or down to move where the line crosses the y axis.</p>';
    body.querySelectorAll('input[type=range]').forEach(function (r) {
      r.addEventListener('input', function () { st[r.getAttribute('data-k')] = +r.value; BODY.graph(body, w); body.querySelector('input[data-k="' + r.getAttribute('data-k') + '"]').focus(); api.changed(); });
    });
    var svg = body.querySelector('svg'), dot = body.querySelector('[data-drag]');
    dot.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      var rect = svg.getBoundingClientRect();
      function mv(e2) { var y = (e2.clientY - rect.top) / rect.height * S; st.b = Math.max(-10, Math.min(10, Math.round((S / 2 - y) / U))); BODY.graph(body, w); }
      function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); api.changed(); }
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
  };

  /* ---------- fraction bar: split it and shade parts ---------- */
  BODY.fraction = function (body, w) {
    var st = w.state;
    function fix(arr, len) { var out = []; for (var i = 0; i < len; i++) out.push(!!arr[i]); return out; }
    st.shaded = fix(st.shaded, st.parts); st.shaded2 = fix(st.shaded2, st.parts2);
    function bar(parts, shaded, key) {
      var k = shaded.filter(Boolean).length;
      return '<div class="bw-bar" role="group" aria-label="Bar split into ' + parts + ' parts, ' + k + ' shaded">' + shaded.map(function (s, i) {
        return '<button type="button" class="bw-part' + (s ? ' on' : '') + '" data-bar="' + key + '" data-i="' + i + '" aria-pressed="' + s + '" aria-label="Part ' + (i + 1) + ' of ' + parts + '"></button>';
      }).join('') + '</div><div class="bw-frac"><b>' + k + '/' + parts + '</b>' +
        '<label>Parts <input type="number" min="1" max="12" value="' + parts + '" data-parts="' + key + '"></label></div>';
    }
    var a = st.shaded.filter(Boolean).length / st.parts, b = st.shaded2.filter(Boolean).length / st.parts2;
    body.innerHTML = '<p class="bw-hint">Tap parts to shade them. Change how many parts the bar has.</p>' + bar(st.parts, st.shaded, '1') +
      (st.compare ? bar(st.parts2, st.shaded2, '2') + '<p class="bw-msg' + (Math.abs(a - b) < 1e-9 && a > 0 ? ' ok' : '') + '">' + (Math.abs(a - b) < 1e-9 ? (a > 0 ? 'Same amount shaded: these fractions are equal.' : 'Shade some parts to compare.') : (a > b ? 'The top bar has more shaded.' : 'The bottom bar has more shaded.')) + '</p>' : '') +
      '<div class="bw-row"><button type="button" class="bw-btn" data-compare>' + (st.compare ? 'One bar' : 'Compare with a second bar') + '</button>' + writeBtn(st.shaded.filter(Boolean).length + '/' + st.parts) + '</div>';
    bindWrite(body);
    body.querySelectorAll('.bw-part').forEach(function (p) {
      p.addEventListener('click', function () {
        var key = p.getAttribute('data-bar'), i = +p.getAttribute('data-i'), arr = key === '1' ? st.shaded : st.shaded2;
        arr[i] = !arr[i]; BODY.fraction(body, w); api.changed();
        var again = body.querySelector('.bw-part[data-bar="' + key + '"][data-i="' + i + '"]'); if (again) again.focus();
        if (st.compare && Math.abs(st.shaded.filter(Boolean).length / st.parts - st.shaded2.filter(Boolean).length / st.parts2) < 1e-9 && st.shaded.some(Boolean)) api.win(body.closest('.bw'));
      });
    });
    body.querySelectorAll('[data-parts]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var v = Math.max(1, Math.min(12, Math.round(+inp.value) || 1));
        if (inp.getAttribute('data-parts') === '1') st.parts = v; else st.parts2 = v;
        BODY.fraction(body, w); api.changed();
      });
    });
    body.querySelector('[data-compare]').addEventListener('click', function () { st.compare = !st.compare; BODY.fraction(body, w); api.changed(); });
  };

  window.MarkovWidgets = { mount: mount, add: add, kinds: KINDS, _test: { parseEq: parseEq, expr: expr, side: side, solved: solved } };
})();
