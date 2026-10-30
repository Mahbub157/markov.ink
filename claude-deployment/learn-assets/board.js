/* Markov.ink whiteboard (v2).
   - The student draws on a canvas with a floating, collapsible tool panel.
   - The tutor has its own blue layer: rings, ticks, notes, and small diagrams,
     plus a labeled cursor, so it is clear who wrote what. The tutor never edits
     the student's ink.
   - The tutor talks in one line of subtitles (read aloud when voice is on).
   - Focus mode dims the board and lights one step when the student needs help.
   Boards are saved in this browser under markov.board.v1. */
(function () {
  'use strict';

  var T = window.BoardTutor, L = window.MarkovLearning, U = window.MarkovUI;
  var $ = function (id) { return document.getElementById(id); };
  var esc = U ? U.esc : function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var reduced = U && U.reducedMotion ? U.reducedMotion() : false;
  var MINUS = String.fromCharCode(0x2212);
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- icons ---------- */
  var IC = {
    left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M15 6l-6 6 6 6M9 12h11"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="M13.5 6.5l4 4"/>',
    hl: '<path d="M9 15l-5 5h6l2-2"/><path d="M8 14l7-9 4 4-9 7Z"/><path d="M14 20h6"/>',
    eraser: '<path d="M8 20h12"/><path d="M5.5 15.5l9-9a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L11 18H8Z"/><path d="M9.5 11.5l4 4"/>',
    shape: '<rect x="3.5" y="3.5" width="9" height="9" rx="1.5"/><circle cx="15.5" cy="15.5" r="5"/>',
    text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
    collapse: '<path d="M11 7l-5 5 5 5M18 7l-5 5 5 5"/>', expand: '<path d="M13 7l5 5-5 5M6 7l5 5-5 5"/>',
    line: '<path d="M5 19L19 5"/>', arrow: '<path d="M5 19L19 5M10 5h9v9"/>', rect: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>', ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    chat: '<path d="M4 5h16v11H9l-5 4Z"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>', send: '<path d="M4 12l16-8-6 16-3-7Z"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    play: '<path d="M7 5l12 7-12 7Z"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="M17 9a4 4 0 0 1 0 6"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', keys: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    lasso: '<path d="M12 4c4.6 0 8 2.4 8 5.4S16.6 15 12 15 4 12.4 4 9.4 7.4 4 12 4Z" stroke-dasharray="3 2.5"/><path d="M7.5 13.5c-1 2.2.2 4.2 2.4 4.2 1.6 0 2.1 1.4 1.4 2.8"/>',
    flag: '<path d="M5 21V4M5 4h11l-2.5 4L16 12H5"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>',
    insert: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
    balance: '<path d="M12 4v15M7 19h10M4 8h16"/><path d="M7 8l-3 6h6ZM17 8l-3 6h6Z"/>',
    terms: '<path d="M3 12h5M5.5 9.5v5M11 10.5h2M11 13.5h2M16 12h5"/>',
    graph: '<path d="M4 4v16h16"/><path d="M7 16l10-9"/>',
    frac: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M9 8v8M15 8v8"/>',
    face: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>', minus: '<path d="M6 12h12"/>', board: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20l4-4 4 4"/>'
  };
  function ic(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IC[n] || '') + '</svg>'; }

  /* ---------- where the questions come from ---------- */
  // ?c=<course>&act=<activity id>: any course activity (topic modes, homework, assignments, test steps).
  // ?c=<course>&hw=<id>: older homework links. ?text=<problem>: one question. Nothing: free practice.
  var PB = window.MarkovProblems, Pr = window.MarkovProfile, C = window.MarkovCourse;
  var params = new URLSearchParams(location.search);
  var courseId = params.get('c') || '', demoQS = params.get('demo') === '1' ? '&demo=1' : '';
  var actId = params.get('act') || (params.get('hw') ? 'hw:' + params.get('hw') : '');
  var questions = [], items = [], title = '', qi = 0, extra = 0;
  var act = null, sess = null, attempt = null, hw = null, outline = null, topicId = null;
  function topicTitle(id) { var x = outline && C ? C.findTopic(outline, id) : null; return x ? x.topic.title : ''; }
  try {
    var prof = Pr ? Pr.load().profile : null;
    var crs = prof && prof.courses ? prof.courses.filter(function (c) { return c.id === courseId; })[0] : null;
    outline = crs && C ? C.outlineFor(crs.catalogId) : null;
    if (L && courseId && actId) {
      act = L.activity(courseId, actId);
      if (!act && actId.indexOf('hw:') === 0) {
        var h0 = L.course(courseId).homework[actId.slice(3)];
        if (h0) act = L.prepareActivity(courseId, { id: actId, type: 'homework', kind: 'guided', homeworkId: h0.id, title: h0.title });
      }
    }
    if (act && PB) {
      attempt = loadAttempt();
      var ctx = { courseId: courseId, activity: act, attemptId: attempt.id, topicTitle: topicTitle,
        topicExample: function (id) { var x = outline && C.findTopic(outline, id); return x ? x.topic.example : ''; } };
      if (act.type === 'homework') { hw = L.course(courseId).homework[act.homeworkId] || null; ctx.homework = hw; }
      if (act.type === 'assignment') ctx.assignment = (prof && prof.school ? C.assignmentsFor(prof.school.code) : []).filter(function (a) { return a.id === act.assignmentId; })[0] || null;
      if (act.type === 'test-step') ctx.plan = L.course(courseId).plans[act.planId] || null;
      sess = PB.sessionFor(ctx);
      items = sess.items; questions = items.map(function (i) { return i.text; });
      title = act.title; topicId = sess.topicId;
      if (!questions.length) { act = null; sess = null; }
    }
  } catch (e) { act = null; sess = null; }
  if (act) qi = Math.max(0, Math.min(questions.length - 1, +(params.get('q') || 0) || 0));
  else if (params.get('text')) { questions = [params.get('text').slice(0, 400)]; items = [{ text: questions[0] }]; }
  var noHints = !!(sess && sess.noHints);

  function backRoute() {
    if (!act) return '';
    if (act.type === 'homework') return '/homework/h/' + act.homeworkId;
    if (act.type === 'assignment') return '/homework/a/' + act.assignmentId;
    if (act.type === 'test-step') return '/test/' + act.planId;
    if (act.type === 'topic') return '/topic/' + act.topicId + '/' + act.mode;
    return '/';
  }
  var backHref = act ? 'course?c=' + encodeURIComponent(courseId) + demoQS + '#' + backRoute()
    : courseId ? 'course?c=' + encodeURIComponent(courseId) + demoQS : 'learn';

  function currentQ() { return questions[qi] || ''; }
  function currentItem() { return items[qi] || { text: currentQ() }; }

  // One attempt per run through an activity: its own problems, answers, and hint count.
  function attemptKey() { return (L && L.DEMO ? 'demo|' : '') + courseId + '|' + actId; }
  function readAttempts() { try { return JSON.parse(localStorage.getItem('markov.attempts.v1') || '{}') || {}; } catch (e) { return {}; } }
  function loadAttempt() {
    var all = readAttempts(), a = all[attemptKey()];
    if (!a || !a.id) { a = { id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), answers: {}, hints: 0, started: new Date().toISOString() }; all[attemptKey()] = a; writeAttempts(all); }
    return a;
  }
  function writeAttempts(all) { try { localStorage.setItem('markov.attempts.v1', JSON.stringify(all)); } catch (e) {} }
  function saveAttempt() { if (!attempt || demo.on) return; var all = readAttempts(); all[attemptKey()] = attempt; writeAttempts(all); }
  function endAttempt() { var all = readAttempts(); delete all[attemptKey()]; writeAttempts(all); }

  function markActivity() {
    if (!act || !L) return;
    try {
      L.setStatus(courseId, act.id, 'started', { index: qi });
      L.setResume(courseId, backRoute(), act.title, 'started');
    } catch (e) {}
  }

  /* ---------- saved boards ---------- */
  var STORE = 'markov.board.v1';
  // Each question has its own saved board. Homework questions use their stable id, so two
  // questions with the same text never share work, and editing a question's text keeps its work.
  function boardKey() {
    var it = currentItem(), q = act && act.type === 'homework' && it.id ? 'id:' + it.id : currentQ().slice(0, 120);
    return (courseId || 'free') + '|' + (act ? act.id + (act.type === 'homework' ? '' : '|' + attempt.id) : '') + '|' + q;
  }
  // how homework boards were named before question ids were used
  function legacyKey() { return (courseId || 'free') + '|' + (act ? act.id : '') + '|' + currentQ().slice(0, 120); }
  function readStore() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
  var saveTimer = null;
  // Save right away when the page closes, so a quick reload never loses the last change.
  window.addEventListener('pagehide', function () { if (saveTimer) { clearTimeout(saveTimer); saveNow(); } });
  function saveSoon() {
    if (demo.on) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }
  function saveNow() {
    saveTimer = null;
    if (demo.on) return;
    (function () {
      var all = readStore();
      if (!objs.length && !marks.length && !widgets.length && !all[boardKey()]) return;
      all[boardKey()] = { objs: objs, marks: marks, widgets: widgets, t: Date.now() };
      var keys = Object.keys(all).sort(function (a, b) { return all[b].t - all[a].t; });
      keys.slice(30).forEach(function (k) { delete all[k]; });
      try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) {
        try { delete all[keys[keys.length - 1]]; localStorage.setItem(STORE, JSON.stringify(all)); } catch (x) {}
      }
    })();
  }
  function loadBoard() {
    var all = readStore(), b = all[boardKey()];
    if (!b && act && act.type === 'homework' && currentItem().id) {
      // a board saved before question ids: use it only if no other question has the same text
      var same = items.filter(function (x) { return x.text === currentQ(); }).length;
      if (same === 1 && all[legacyKey()]) b = all[legacyKey()];
    }
    objs = b && Array.isArray(b.objs) ? b.objs : [];
    marks = b && Array.isArray(b.marks) ? b.marks : [];
    widgets = b && Array.isArray(b.widgets) ? b.widgets : [];
    undoStack = []; redoStack = []; clearSel();
    redraw(); renderMarks(false); updateUndo(); mountWidgets(); stepsSoon();
  }

  /* ---------- state ---------- */
  var stage = $('stage'), canvas = $('ink'), ctx = canvas.getContext('2d'), layer = $('tutor-layer');
  var W = 0, H = 0, DPR = 1;
  var objs = [], marks = [], undoStack = [], redoStack = [];
  var tool = 'pen', shapeKind = 'line';
  var COLORS = [['#0A1929', 'Ink'], ['#C8313A', 'Red'], ['#0E7C6B', 'Green'], ['#7C3AED', 'Purple']];
  var SIZES = [[2, 'Fine'], [3.5, 'Medium'], [6, 'Bold']];
  var color = COLORS[0][0], size = 3.5;
  var settings = (function () { try { return JSON.parse(localStorage.getItem('markov.board.settings.v1') || '{}') || {}; } catch (e) { return {}; } })();
  function saveSettings() { try { localStorage.setItem('markov.board.settings.v1', JSON.stringify(settings)); } catch (e) {} }
  if (settings.watch == null) settings.watch = true;

  /* ---------- canvas ---------- */
  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height); DPR = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    layer.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    redraw();
  }

  function drawObj(o, c) {
    c = c || ctx;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (o.type === 'stroke') {
      var hl = o.tool === 'hl';
      c.strokeStyle = hl ? 'rgba(250, 204, 21, .45)' : o.color;
      if (hl) c.globalCompositeOperation = 'multiply';
      var p = o.pts;
      if (p.length === 1) {
        c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(p[0][0], p[0][1], o.size / 2, 0, Math.PI * 2); c.fill();
      } else if (hl || !o.pressure) {
        c.lineWidth = o.size; c.beginPath(); c.moveTo(p[0][0], p[0][1]);
        for (var i = 1; i < p.length - 1; i++) { var mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; c.quadraticCurveTo(p[i][0], p[i][1], mx, my); }
        c.lineTo(p[p.length - 1][0], p[p.length - 1][1]); c.stroke();
      } else {
        for (var j = 1; j < p.length; j++) {
          c.lineWidth = o.size * (0.5 + (p[j][2] || 0.5));
          c.beginPath(); c.moveTo(p[j - 1][0], p[j - 1][1]); c.lineTo(p[j][0], p[j][1]); c.stroke();
        }
      }
    } else if (o.type === 'shape') {
      c.strokeStyle = o.color; c.lineWidth = o.size;
      c.beginPath();
      if (o.kind === 'rect') c.rect(Math.min(o.x1, o.x2), Math.min(o.y1, o.y2), Math.abs(o.x2 - o.x1), Math.abs(o.y2 - o.y1));
      else if (o.kind === 'ellipse') c.ellipse((o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2, Math.abs(o.x2 - o.x1) / 2, Math.abs(o.y2 - o.y1) / 2, 0, 0, Math.PI * 2);
      else {
        c.moveTo(o.x1, o.y1); c.lineTo(o.x2, o.y2);
        if (o.kind === 'arrow') {
          var a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), hs = 10 + o.size * 2;
          c.moveTo(o.x2, o.y2); c.lineTo(o.x2 - hs * Math.cos(a - 0.45), o.y2 - hs * Math.sin(a - 0.45));
          c.moveTo(o.x2, o.y2); c.lineTo(o.x2 - hs * Math.cos(a + 0.45), o.y2 - hs * Math.sin(a + 0.45));
        }
      }
      c.stroke();
    } else if (o.type === 'stamp') {
      c.fillStyle = '#FFF3E0'; c.strokeStyle = '#D97706'; c.lineWidth = 2;
      c.beginPath(); c.arc(o.x + 13, o.y + 13, 12, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#B45309'; c.font = '700 16px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('?', o.x + 13, o.y + 14);
    } else if (o.type === 'text') {
      c.fillStyle = o.color; c.textBaseline = 'top';
      c.font = textFont(o);
      c.fillText(o.text, o.x, o.y);
    }
    c.restore();
  }
  function textFont(o) { return o.hand ? '600 ' + Math.round(o.size * 1.25) + 'px Caveat, "Segoe Print", cursive' : '500 ' + o.size + 'px "JetBrains Mono", ui-monospace, monospace'; }

  function redraw(extraObj) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    objs.forEach(function (o) { drawObj(o); });
    if (extraObj) drawObj(extraObj);
  }

  function bbox(o) {
    if (o.type === 'stamp') return { x: o.x, y: o.y, w: 26, h: 26 };
    if (o.type === 'stroke') {
      var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
      o.pts.forEach(function (p) { x1 = Math.min(x1, p[0]); y1 = Math.min(y1, p[1]); x2 = Math.max(x2, p[0]); y2 = Math.max(y2, p[1]); });
      var s = o.size; return { x: x1 - s, y: y1 - s, w: x2 - x1 + 2 * s, h: y2 - y1 + 2 * s };
    }
    if (o.type === 'shape') return { x: Math.min(o.x1, o.x2) - 4, y: Math.min(o.y1, o.y2) - 4, w: Math.abs(o.x2 - o.x1) + 8, h: Math.abs(o.y2 - o.y1) + 8 };
    ctx.save(); ctx.font = textFont(o); var w = ctx.measureText(o.text).width; ctx.restore();
    return { x: o.x - 2, y: o.y - 2, w: w + 4, h: (o.hand ? o.size * 1.25 : o.size) * 1.25 + 4 };
  }
  function union(rs) {
    if (!rs.length) return null;
    var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    rs.forEach(function (r) { x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h); });
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  // The student's most recent line of work: the last object plus anything on the same line.
  function lastInkRect() {
    if (!objs.length) return null;
    var last = bbox(objs[objs.length - 1]), cy = last.y + last.h / 2;
    return union(objs.map(bbox).filter(function (b) { return Math.abs(b.y + b.h / 2 - cy) < Math.max(28, last.h * 0.7); }));
  }
  function distSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    var x = ax + t * dx, y = ay + t * dy; return Math.hypot(px - x, py - y);
  }
  function hit(o, x, y, r) {
    if (o.type === 'stroke') {
      for (var i = 0; i < o.pts.length; i++) {
        var a = o.pts[Math.max(0, i - 1)], b = o.pts[i];
        if (distSeg(x, y, a[0], a[1], b[0], b[1]) < r + o.size / 2) return true;
      }
      return false;
    }
    if (o.type === 'shape' && (o.kind === 'line' || o.kind === 'arrow')) return distSeg(x, y, o.x1, o.y1, o.x2, o.y2) < r + o.size;
    var bb = bbox(o);
    if (o.type === 'shape') {
      var inX = x > bb.x - r && x < bb.x + bb.w + r, inY = y > bb.y - r && y < bb.y + bb.h + r;
      var nearEdge = Math.min(Math.abs(x - bb.x), Math.abs(x - bb.x - bb.w), Math.abs(y - bb.y), Math.abs(y - bb.y - bb.h)) < r + 6;
      return inX && inY && nearEdge;
    }
    return x > bb.x - r && x < bb.x + bb.w + r && y > bb.y - r && y < bb.y + bb.h + r;
  }

  /* ---------- history ---------- */
  function snapshot() { return JSON.stringify(objs); }
  function pushUndo(prev) { undoStack.push(prev); if (undoStack.length > 80) undoStack.shift(); redoStack = []; updateUndo(); }
  function undo() { if (!undoStack.length) return; clearSel(); redoStack.push(snapshot()); objs = JSON.parse(undoStack.pop()); redraw(); updateUndo(); saveSoon(); stepsSoon(); }
  function redo() { if (!redoStack.length) return; clearSel(); undoStack.push(snapshot()); objs = JSON.parse(redoStack.pop()); redraw(); updateUndo(); saveSoon(); stepsSoon(); }
  function updateUndo() {
    var u = $('t-undo'), r = $('t-redo');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  /* ---------- drawing input ---------- */
  var cur = null, startX = 0, startY = 0, erasing = null, penSeen = 0, lastChange = 0;
  function pos(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5]; }

  canvas.addEventListener('pointerdown', function (e) {
    if (demo.on) return;
    if (e.pointerType === 'pen') penSeen = Date.now();
    if (e.pointerType === 'touch' && Date.now() - penSeen < 4000) return;   // resting palm while using a pen
    if (e.button && e.button !== 0) return;
    closePops();
    var p = pos(e);
    var hh = handleAt(p[0], p[1]);
    tapHandle = hh ? { h: hh, t: Date.now() } : null;
    if (hh && tool === 'text') { tapHandle = null; openStepMenu(hh.l, hh.i); e.preventDefault(); return; }
    if (tool === 'text') { openTextbox(p[0], p[1]); e.preventDefault(); return; }
    canvas.setPointerCapture(e.pointerId);
    $('steps-layer').hidden = true; $('ask-chip').hidden = true;
    if (tool === 'lasso') {
      var sr0 = selRect();
      if (sr0 && p[0] > sr0.x - 8 && p[0] < sr0.x + sr0.w + 8 && p[1] > sr0.y - 8 && p[1] < sr0.y + sr0.h + 8) moving = { x: p[0], y: p[1], prev: snapshot(), moved: false };
      else { clearSel(); lassoPts = [p]; }
      e.preventDefault(); return;
    }
    startX = p[0]; startY = p[1];
    if (tool === 'pen' || tool === 'hl') {
      cur = { type: 'stroke', tool: tool, color: color, size: tool === 'hl' ? size * 5 + 8 : size, pressure: e.pointerType === 'pen', pts: [p], t: Date.now() };
    } else if (tool === 'shape') {
      cur = { type: 'shape', kind: shapeKind, color: color, size: size, x1: p[0], y1: p[1], x2: p[0], y2: p[1], t: Date.now() };
    } else if (tool === 'eraser') {
      erasing = { prev: snapshot(), changed: false };
      eraseAt(p[0], p[1]);
    }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (moving) {
      var mq = pos(e), mdx = mq[0] - moving.x, mdy = mq[1] - moving.y;
      if (mdx || mdy) { sel.forEach(function (o) { moveObj(o, mdx, mdy); }); moving.x = mq[0]; moving.y = mq[1]; moving.moved = true; redraw(); showSel(); }
      return;
    }
    if (lassoPts) {
      lassoPts.push(pos(e)); redraw();
      ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 1.5;
      ctx.beginPath(); lassoPts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.restore();
      return;
    }
    if (!cur && !erasing) return;
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (!evs.length) evs = [e];
    if (erasing) { evs.forEach(function (ev) { var p = pos(ev); eraseAt(p[0], p[1]); }); return; }
    if (cur.type === 'stroke') {
      evs.forEach(function (ev) { cur.pts.push(pos(ev)); });
      var n = cur.pts.length;
      ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawObj({ type: 'stroke', tool: cur.tool, color: cur.color, size: cur.size, pressure: cur.pressure, pts: cur.pts.slice(Math.max(0, n - evs.length - 2)) });
      ctx.restore();
      if (cur.tool === 'hl') redraw(cur);
    } else {
      var p = pos(e);
      cur.x2 = p[0]; cur.y2 = p[1];
      if (e.shiftKey && (cur.kind === 'line' || cur.kind === 'arrow')) {
        if (Math.abs(cur.x2 - cur.x1) > Math.abs(cur.y2 - cur.y1)) cur.y2 = cur.y1; else cur.x2 = cur.x1;
      }
      redraw(cur);
    }
  });
  function endStroke() {
    if (moving) {
      if (moving.moved) { pushUndo(moving.prev); saveSoon(); changed(); }
      moving = null; stepsSoon(); return;
    }
    if (lassoPts) {
      var poly = lassoPts; lassoPts = null;
      sel = poly.length > 4 ? objs.filter(function (o) { var c = bbox(o); return pointIn(poly, c.x + c.w / 2, c.y + c.h / 2); }) : [];
      redraw();
      if (sel.length) { showSel(); subtitle('Drag the selection to move it, or press Delete.', 'tutor'); } else clearSel();
      stepsSoon(); return;
    }
    if (erasing) {
      if (erasing.changed) { pushUndo(erasing.prev); saveSoon(); changed(); }
      erasing = null; stepsSoon(); return;
    }
    if (!cur) { stepsSoon(); return; }
    if (tapHandle) {
      var th = tapHandle; tapHandle = null;
      var size = cur.type === 'stroke' ? pathLen(cur.pts) : Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1);
      if (size < 6 && Date.now() - th.t < 600) { cur = null; redraw(); $('steps-layer').hidden = false; openStepMenu(th.h.l, th.h.i); return; }
    }
    var scrib = cur.type === 'stroke' ? scribbleHits(cur) : null;
    if (scrib) {
      var prevS = snapshot();
      objs = objs.filter(function (o) { return scrib.indexOf(o) < 0; });
      pushUndo(prevS); saveSoon(); changed(); cur = null; redraw(); stepsSoon();
      subtitle('Scribbled out. Undo brings it back.', 'tutor');
      return;
    }
    var keep = cur.type === 'stroke' || Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) > 6;
    if (keep) {
      if (cur.type === 'stroke' && cur.pts.length > 2) cur.pts = cur.pts.map(function (p) { return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round((p[2] || 0.5) * 100) / 100]; });
      var prev = snapshot(); objs.push(cur); pushUndo(prev); saveSoon(); changed();
      var loop = !noHints && !demo.on && cur.type === 'stroke' ? loopAround(cur) : null;
      if (loop) offerCircleAsk(loop);
    }
    cur = null; redraw(); stepsSoon();
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', endStroke);

  function eraseAt(x, y) {
    var before = objs.length;
    objs = objs.filter(function (o) { return !hit(o, x, y, 10); });
    if (objs.length !== before) { erasing.changed = true; redraw(); }
  }

  /* ---------- text tool ---------- */
  var textAt = null;
  var SYMS = ['x', String.fromCharCode(0xb2), String.fromCharCode(0x221a), String.fromCharCode(0xf7), String.fromCharCode(0xd7), MINUS, String.fromCharCode(0x3c0), String.fromCharCode(0x2264), String.fromCharCode(0x2265), String.fromCharCode(0x2260), String.fromCharCode(0xb0)];
  function openTextbox(x, y) {
    var box = $('textbox'), inp = $('text-in');
    textAt = { x: x, y: y };
    box.hidden = false;
    box.style.left = Math.min(Math.max(8, x), W - 290) + 'px';
    box.style.top = Math.min(Math.max(8, y - 10), H - 110) + 'px';
    inp.value = '';
    inp.focus();
  }
  function commitText() {
    var box = $('textbox'), inp = $('text-in');
    if (box.hidden) return;
    var v = inp.value.trim();
    box.hidden = true;
    if (v && textAt) {
      var prev = snapshot();
      objs.push({ type: 'text', text: v.slice(0, 120), x: textAt.x, y: textAt.y - 10, color: color, size: 22, t: Date.now() });
      pushUndo(prev); redraw(); saveSoon(); changed();
    }
    textAt = null;
  }
  $('text-in').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); commitText(); }
    if (e.key === 'Escape') { e.preventDefault(); $('textbox').hidden = true; textAt = null; }
  });
  $('text-in').addEventListener('blur', function () { setTimeout(function () { if (!$('textbox').contains(document.activeElement)) commitText(); }, 120); });
  $('syms').innerHTML = SYMS.map(function (s) { return '<button type="button" data-sym="' + s + '" aria-label="Insert ' + s + '">' + s + '</button>'; }).join('');
  $('syms').addEventListener('mousedown', function (e) { e.preventDefault(); });
  $('syms').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sym]'); if (!b) return;
    var inp = $('text-in'), s = inp.selectionStart || inp.value.length;
    inp.value = inp.value.slice(0, s) + b.getAttribute('data-sym') + inp.value.slice(inp.selectionEnd || s);
    inp.focus(); inp.setSelectionRange(s + 1, s + 1);
  });

  /* ---------- tool panel ---------- */
  var TOOLS = [['pen', 'Pen', 'P'], ['hl', 'Highlighter', 'H'], ['eraser', 'Eraser', 'E'], ['lasso', 'Select and move', 'V'], ['shape', 'Shapes', 'S'], ['text', 'Type text', 'T']];
  function renderTools() {
    var closed = settings.toolsClosed;
    $('tools').className = 'bb-tools' + (closed ? ' closed' : '') + (focus.on ? ' dimmed' : '');
    $('tools').innerHTML =
      '<button type="button" class="tool" id="t-collapse" aria-label="' + (closed ? 'Show tools' : 'Hide tools') + '" aria-expanded="' + !closed + '" title="' + (closed ? 'Show tools' : 'Hide tools') + '">' + ic(closed ? 'expand' : 'collapse') + '</button>' +
      TOOLS.map(function (t) {
        var icon = t[0] === 'shape' ? shapeKind : t[0];
        return '<button type="button" class="tool t" data-tool="' + t[0] + '" aria-pressed="' + (tool === t[0]) + '" aria-label="' + t[1] + ' (' + t[2] + ')" title="' + t[1] + ' (' + t[2] + ')">' + ic(icon === 'shape' ? 'shape' : icon) + '</button>';
      }).join('') +
      '<div class="sep t" aria-hidden="true"></div>' +
      '<button type="button" class="tool t" id="t-style" aria-label="Color and size" aria-haspopup="true" title="Color and size"><span class="swatch" style="background:' + color + '"></span></button>' +
      '<button type="button" class="tool t" id="t-insert" aria-label="Add a tool: balance, terms, graph, or fraction bar" aria-haspopup="true" title="Add an interactive tool">' + ic('insert') + '</button>' +
      '<div class="sep t" aria-hidden="true"></div>' +
      '<button type="button" class="tool t" id="t-undo" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)">' + ic('undo') + '</button>' +
      '<button type="button" class="tool t" id="t-redo" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)">' + ic('redo') + '</button>';
    canvas.setAttribute('data-tool', tool);
    updateUndo();
  }
  $('tools').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 't-collapse') { settings.toolsClosed = !settings.toolsClosed; saveSettings(); closePops(); renderTools(); $('t-collapse').focus(); return; }
    if (b.id === 't-undo') return undo();
    if (b.id === 't-redo') return redo();
    if (b.id === 't-style') return togglePop('style', b);
    if (b.id === 't-insert') return togglePop('insert', b);
    var t = b.getAttribute('data-tool');
    if (t === 'shape' && tool === 'shape') return togglePop('shape', b);
    if (t) { setTool(t); if (t === 'shape') togglePop('shape', b); }
  });
  function setTool(t) {
    tool = t; closePops(); commitText(); if (t !== 'lasso') clearSel(); renderTools(); stepsSoon();
    var b = document.querySelector('[data-tool="' + t + '"]'); if (b) b.focus({ preventScroll: true });
  }
  var popFor = null;
  function togglePop(kind, anchor) {
    var pop = $('tool-pop');
    if (!pop.hidden && popFor === kind) { closePops(); return; }
    popFor = kind;
    if (kind === 'shape') {
      pop.innerHTML = '<h3>Shape</h3><div class="row">' + [['line', 'Line', 'L'], ['arrow', 'Arrow', 'A'], ['rect', 'Rectangle', 'R'], ['ellipse', 'Circle', 'O']].map(function (s) {
        return '<button type="button" class="opt" data-shape="' + s[0] + '" aria-pressed="' + (shapeKind === s[0]) + '" aria-label="' + s[1] + ' (' + s[2] + ')" title="' + s[1] + ' (' + s[2] + ')">' + ic(s[0]) + '</button>';
      }).join('') + '</div>';
    } else if (kind === 'insert') {
      pop.innerHTML = '<h3>Add to the board</h3><div class="col">' + [['balance', 'Balance', 'Same move on both sides'], ['terms', 'Move the terms', 'Drag across the = sign'], ['graph', 'Graph', 'y = mx + b with sliders'], ['fraction', 'Fraction bar', 'Split and shade']].map(function (w) {
        return '<button type="button" class="opt wide" data-widget="' + w[0] + '">' + ic(w[0] === 'fraction' ? 'frac' : w[0]) + '<span><b>' + w[1] + '</b><small>' + w[2] + '</small></span></button>';
      }).join('') + '</div>';
    } else {
      pop.innerHTML = '<h3>Color</h3><div class="row">' + COLORS.map(function (c) {
        return '<button type="button" class="opt" data-color="' + c[0] + '" aria-pressed="' + (color === c[0]) + '" aria-label="' + c[1] + '"><span class="dotc" style="background:' + c[0] + '"></span></button>';
      }).join('') + '</div><h3>Size</h3><div class="row">' + SIZES.map(function (s) {
        var d = 4 + s[0] * 2;
        return '<button type="button" class="opt" data-size="' + s[0] + '" aria-pressed="' + (size === s[0]) + '" aria-label="' + s[1] + '"><span class="dots" style="width:' + d + 'px;height:' + d + 'px"></span></button>';
      }).join('') + '</div>';
    }
    pop.hidden = false;
    var r = anchor.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    pop.style.top = Math.max(8, Math.min(r.top - sr.top - 10, H - pop.offsetHeight - 8)) + 'px';
    var first = pop.querySelector('[aria-pressed="true"]') || pop.querySelector('button'); if (first) first.focus();
  }
  $('tool-pop').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-widget')) { closePops(); if (window.MarkovWidgets) window.MarkovWidgets.add(b.getAttribute('data-widget')); return; }
    if (b.hasAttribute('data-shape')) { shapeKind = b.getAttribute('data-shape'); tool = 'shape'; }
    if (b.hasAttribute('data-color')) { color = b.getAttribute('data-color'); if (tool === 'eraser') tool = 'pen'; }
    if (b.hasAttribute('data-size')) { size = +b.getAttribute('data-size'); }
    closePops(); renderTools();
    var back = document.querySelector(popFor === 'shape' ? '[data-tool="shape"]' : '#t-style'); if (back) back.focus();
  });
  function closePops() {
    $('tool-pop').hidden = true; $('step-pop').hidden = true;
    var m = $('menu'); if (!m.hidden) { m.hidden = true; $('menu-btn').setAttribute('aria-expanded', 'false'); }
  }

  /* ---------- tutor layer ---------- */
  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function animate(g, animated) {
    if (!animated || reduced) return;
    g.querySelectorAll('path, line, ellipse, polyline, rect.t-stroke').forEach(function (p, i) {
      if (!p.getTotalLength || !p.classList.contains('t-stroke')) return;
      var len = Math.ceil(p.getTotalLength()) + 2;
      p.style.setProperty('--len', len);
      p.style.animationDelay = (i * 0.12) + 's';
      p.classList.add('t-draw');
    });
    g.querySelectorAll('text, circle.t-fill, rect.t-soft').forEach(function (t, i) { t.classList.add('t-pop'); t.style.animationDelay = (0.25 + i * 0.02) + 's'; });
  }

  function diagramSize(a) {
    if (a.kind === 'dots') { var rows = Math.ceil(a.total / a.groups); return { w: Math.max(170, a.groups * 34 + 16), h: rows * 17 + 12 }; }
    if (a.kind === 'numberline') return { w: 280, h: 78 };
    if (a.kind === 'balance') return { w: 260, h: 116 };
    if (a.kind === 'triangle') return { w: 220, h: 154 };
    if (a.kind === 'plot') return { w: 230, h: 190 };
    if (a.kind === 'fraction') return { w: 250, h: 72 };
    return { w: 200, h: 120 };
  }

  function drawDiagram(a, g) {
    var x = a.x, y = a.y, s = diagramSize(a);
    if (a.kind === 'dots') {
      var rows = Math.ceil(a.total / a.groups);
      for (var gi = 0; gi < a.groups; gi++) {
        el('rect', { x: x + gi * 34 + 4, y: y + 4, width: 26, height: rows * 17 + 6, rx: 8, class: 't-stroke t-thin t-dash' }, g);
        for (var r = 0; r < rows; r++) { if (gi * rows + r < a.total) el('circle', { cx: x + gi * 34 + 17, cy: y + 15 + r * 17, r: 5, class: 't-fill' }, g); }
      }
    } else if (a.kind === 'numberline') {
      var lo = a.min, hi = a.max > a.min ? a.max : a.min + 10, span = hi - lo, X = function (v) { return x + 14 + (v - lo) / span * (s.w - 28); }, ly = y + 52;
      el('path', { d: 'M' + (x + 4) + ' ' + ly + 'H' + (x + s.w - 4), class: 't-stroke' }, g);
      var step = span <= 12 ? 1 : span <= 30 ? 5 : 10;
      for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) {
        el('path', { d: 'M' + X(v) + ' ' + (ly - 5) + 'V' + (ly + 5), class: 't-stroke t-thin' }, g);
        if (span <= 12 || v % (step * 2) === 0 || step >= 5) { var t = el('text', { x: X(v), y: ly + 22, 'text-anchor': 'middle', 'font-size': 18 }, g); t.textContent = String(v).replace('-', MINUS); }
      }
      a.marks.forEach(function (m) { el('circle', { cx: X(m), cy: ly, r: 6, class: 't-fill' }, g); });
      a.jumps.forEach(function (j) { el('path', { d: 'M' + X(j[0]) + ' ' + (ly - 4) + 'Q' + (X(j[0]) + X(j[1])) / 2 + ' ' + (ly - 40) + ' ' + X(j[1]) + ' ' + (ly - 4), class: 't-stroke t-thin' }, g); });
    } else if (a.kind === 'balance') {
      var cx = x + s.w / 2, by = y + 56;
      el('path', { d: 'M' + (x + 16) + ' ' + by + 'H' + (x + s.w - 16) + 'M' + cx + ' ' + by + 'V' + (y + 112) + 'M' + (cx - 26) + ' ' + (y + 112) + 'H' + (cx + 26), class: 't-stroke' }, g);
      el('path', { d: 'M' + (cx - 10) + ' ' + (by + 14) + 'L' + cx + ' ' + by + 'L' + (cx + 10) + ' ' + (by + 14), class: 't-stroke t-thin' }, g);
      [[x + 16, a.left], [x + s.w / 2 + 12, a.right]].forEach(function (p) {
        el('path', { d: 'M' + p[0] + ' ' + (by - 2) + 'q' + ((s.w / 2 - 28) / 2) + ' 18 ' + (s.w / 2 - 28) + ' 0', class: 't-stroke t-thin' }, g);
        var t = el('text', { x: p[0] + (s.w / 2 - 28) / 2, y: by - 12, 'text-anchor': 'middle', 'font-size': 24 }, g); t.textContent = p[1] || '?';
      });
    } else if (a.kind === 'triangle') {
      var bx = x + 14, bY = y + 128, tx = x + 76, tY = y + 20, ex = x + s.w - 14;
      el('path', { d: 'M' + bx + ' ' + bY + 'L' + ex + ' ' + bY + 'L' + tx + ' ' + tY + 'Z', class: 't-stroke' }, g);
      el('path', { d: 'M' + tx + ' ' + tY + 'V' + bY, class: 't-stroke t-thin t-dash' }, g);
      el('path', { d: 'M' + tx + ' ' + (bY - 10) + 'h10v10', class: 't-stroke t-thin' }, g);
      if (a.base) { var tb = el('text', { x: (bx + ex) / 2 + 20, y: bY + 22, 'text-anchor': 'middle', 'font-size': 20 }, g); tb.textContent = 'b = ' + a.base; }
      if (a.height) { var th = el('text', { x: tx + 8, y: (tY + bY) / 2, 'font-size': 20 }, g); th.textContent = 'h = ' + a.height; }
    } else if (a.kind === 'plot') {
      var px0 = x + 14, py0 = y + 8, pw = s.w - 28, ph = s.h - 30, lo2 = a.min < a.max ? a.min : -5, hi2 = a.min < a.max ? a.max : 5;
      var f = compile(a.fn), pts = [], ymin = 1e9, ymax = -1e9;
      for (var i = 0; i <= 80; i++) { var xv = lo2 + (hi2 - lo2) * i / 80, yv = f ? f(xv) : NaN; if (isFinite(yv)) { pts.push([xv, yv]); ymin = Math.min(ymin, yv); ymax = Math.max(ymax, yv); } }
      if (ymin > 0) ymin = 0; if (ymax < 0) ymax = 0; if (ymax - ymin < 1e-6) { ymax += 1; ymin -= 1; }
      var SX = function (v) { return px0 + (v - lo2) / (hi2 - lo2) * pw; }, SY = function (v) { return py0 + (1 - (v - ymin) / (ymax - ymin)) * ph; };
      el('path', { d: 'M' + px0 + ' ' + SY(0) + 'H' + (px0 + pw) + (lo2 <= 0 && hi2 >= 0 ? 'M' + SX(0) + ' ' + py0 + 'V' + (py0 + ph) : ''), class: 't-stroke t-thin' }, g);
      if (pts.length > 1) el('path', { d: pts.map(function (p, k) { return (k ? 'L' : 'M') + SX(p[0]).toFixed(1) + ' ' + SY(p[1]).toFixed(1); }).join(''), class: 't-stroke' }, g);
      var tl = el('text', { x: px0 + pw, y: py0 + 16, 'text-anchor': 'end', 'font-size': 20 }, g); tl.textContent = 'y = ' + (a.fn || '?');
    } else if (a.kind === 'fraction') {
      var bw = s.w - 20, cw = bw / a.den;
      for (var k = 0; k < a.den; k++) {
        if (k < a.num) el('rect', { x: x + 10 + k * cw, y: y + 10, width: cw, height: 34, class: 't-soft' }, g);
        el('rect', { x: x + 10 + k * cw, y: y + 10, width: cw, height: 34, class: 't-stroke t-thin' }, g);
      }
      var tf = el('text', { x: x + 10, y: y + 66, 'font-size': 20 }, g); tf.textContent = a.num + '/' + a.den;
    }
    if (a.caption) { var c = el('text', { x: x + 4, y: y + s.h + 16, class: 't-label' }, g); c.textContent = a.caption; }
  }

  // Tiny safe math for the plot diagram: + - * / ^, parentheses, x, numbers, and a few functions.
  function compile(src) {
    var s = String(src || '').replace(/\s+/g, '').split(MINUS).join('-').toLowerCase(), i = 0;
    if (!s || s.length > 40) return null;
    function peek() { return s[i]; }
    function num() { var m = s.slice(i).match(/^\d+(\.\d+)?/); if (!m) return null; i += m[0].length; var v = +m[0]; return function () { return v; }; }
    function prim() {
      if (peek() === '(') { i++; var e = expr(); if (peek() !== ')') throw 0; i++; return e; }
      if (peek() === '-') { i++; var p = pow(); return function (x) { return -p(x); }; }
      var fm = s.slice(i).match(/^(sqrt|sin|cos|tan|abs)\(/);
      if (fm) { i += fm[0].length; var arg = expr(); if (peek() !== ')') throw 0; i++; var fn = Math[fm[1]]; return function (x) { return fn(arg(x)); }; }
      if (s.slice(i, i + 2) === 'pi') { i += 2; return function () { return Math.PI; }; }
      if (peek() === 'x') { i++; return function (x) { return x; }; }
      var n = num(); if (n) return n;
      throw 0;
    }
    function implicit() { var a = prim(); while (peek() === 'x' || peek() === '(') { var b = prim(), l = a; a = (function (l, b) { return function (x) { return l(x) * b(x); }; })(l, b); } return a; }
    function pow() { var a = implicit(); if (peek() === '^') { i++; var b = pow(); var l = a; return function (x) { return Math.pow(l(x), b(x)); }; } return a; }
    function term() { var a = pow(); while (peek() === '*' || peek() === '/') { var op = s[i++], b = pow(), l = a; a = (function (l, b, op) { return function (x) { return op === '*' ? l(x) * b(x) : l(x) / b(x); }; })(l, b, op); } return a; }
    function expr() { var a = term(); while (peek() === '+' || peek() === '-') { var op = s[i++], b = term(), l = a; a = (function (l, b, op) { return function (x) { return op === '+' ? l(x) + b(x) : l(x) - b(x); }; })(l, b, op); } return a; }
    try { var f = expr(); return i === s.length ? f : null; } catch (e) { return null; }
  }

  // Areas the tutor should not draw over: the student's ink, its own marks, and the floating UI.
  function blocked() {
    var rs = objs.map(bbox).concat(marks.map(markRect));
    var sr = stage.getBoundingClientRect();
    ['question', 'tools', 'dock'].forEach(function (id) {
      var n = $(id); if (!n || n.hidden) return;
      var r = n.getBoundingClientRect(); if (!r.width) return;
      rs.push({ x: r.left - sr.left - 8, y: r.top - sr.top - 8, w: r.width + 16, h: r.height + 16 });
    });
    if (!$('chat').hidden) rs.push({ x: W - 390, y: 0, w: 390, h: H });
    Array.prototype.forEach.call(document.querySelectorAll('.bw'), function (n) {
      var r = n.getBoundingClientRect(); rs.push({ x: r.left - sr.left - 8, y: r.top - sr.top - 8, w: r.width + 16, h: r.height + 16 });
    });
    return rs;
  }
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function placeFree(w, h, near) {
    var rs = blocked(), best = null, bestD = 1e12;
    for (var y = 70; y + h < H - 10; y += 18) {
      for (var x = 70; x + w < W - 10; x += 18) {
        var r = { x: x, y: y, w: w, h: h };
        if (rs.some(function (b) { return overlaps(r, b); })) continue;
        var d = near ? Math.hypot(x - near.x, y - near.y) : (W - x) * 0.2 + y;
        if (d < bestD) { bestD = d; best = r; }
      }
    }
    return best || { x: Math.max(10, W - w - 20), y: 80, w: w, h: h };
  }
  function markRect(m) {
    if (m.type === 'diagram') { var s = diagramSize(m); return { x: m.x, y: m.y, w: s.w, h: s.h + 22 }; }
    if (m.type === 'note') return { x: m.x, y: m.y - 24, w: m.text.length * 11 + 10, h: 34 };
    if (m.type === 'arrow') return { x: Math.min(m.x, m.x2), y: Math.min(m.y, m.y2), w: Math.abs(m.x2 - m.x) + 1, h: Math.abs(m.y2 - m.y) + 1 };
    return { x: m.x, y: m.y, w: m.w || 24, h: m.h || 24 };
  }

  // Fills in any position the tutor left out, near the step being discussed.
  function resolve(a, anchor) {
    var at = anchor || lastInkRect() || { x: W / 2 - 60, y: H / 3, w: 120, h: 30 };
    if (a.type === 'ring' && (a.x == null || a.w == null)) { a.x = at.x; a.y = at.y; a.w = at.w; a.h = at.h; }
    if (a.type === 'underline' && a.x == null) { a.x = at.x; a.y = at.y + at.h; a.w = at.w; }
    if (a.type === 'tick' && a.x == null) { a.x = at.x + at.w + 14; a.y = at.y + at.h / 2 - 12; }
    if (a.type === 'note' && a.x == null) {
      var nw = a.text.length * 11 + 10, spot = placeFree(nw, 34, { x: at.x + at.w + 24, y: at.y });
      a.x = spot.x; a.y = spot.y + 26;
    }
    if (a.type === 'arrow' && a.x == null) { a.x = at.x + at.w + 70; a.y = at.y - 30; a.x2 = at.x + at.w + 8; a.y2 = at.y + at.h / 2; }
    if (a.type === 'diagram') {
      var s = diagramSize(a);
      if (a.x == null || a.y == null || blocked().some(function (b) { return overlaps({ x: a.x, y: a.y, w: s.w, h: s.h + 22 }, b); })) {
        var p = placeFree(s.w, s.h + 22, { x: at.x + at.w + 40, y: at.y - 20 }); a.x = p.x; a.y = p.y;
      }
    }
    if (a.type === 'ring') { a.w = a.w || 80; a.h = a.h || 30; }
    if (a.type === 'underline') a.w = a.w || 80;
    return a;
  }

  function drawMark(m, animated) {
    var g = el('g', { 'data-mark': '' }, layer);
    if (m.type === 'ring') {
      var cx = m.x + m.w / 2, cy = m.y + m.h / 2, rx = m.w / 2 + 12, ry = m.h / 2 + 9;
      el('path', { d: 'M' + (cx - rx * 0.2) + ' ' + (cy - ry) + 'C' + (cx + rx * 1.1) + ' ' + (cy - ry * 1.05) + ' ' + (cx + rx * 1.05) + ' ' + (cy + ry * 1.05) + ' ' + cx + ' ' + (cy + ry) +
        'C' + (cx - rx * 1.15) + ' ' + (cy + ry) + ' ' + (cx - rx * 1.1) + ' ' + (cy - ry * 0.9) + ' ' + (cx + rx * 0.15) + ' ' + (cy - ry * 1.1), class: 't-stroke' }, g);
    } else if (m.type === 'underline') {
      var d = 'M' + m.x + ' ' + (m.y + 4);
      for (var i = 1; i <= 8; i++) d += 'L' + (m.x + m.w * i / 8) + ' ' + (m.y + 4 + (i % 2 ? 3 : 0));
      el('path', { d: d, class: 't-stroke' }, g);
    } else if (m.type === 'arrow') {
      var a = Math.atan2(m.y2 - m.y, m.x2 - m.x), hs = 12;
      el('path', { d: 'M' + m.x + ' ' + m.y + 'Q' + ((m.x + m.x2) / 2 + 10) + ' ' + ((m.y + m.y2) / 2 - 16) + ' ' + m.x2 + ' ' + m.y2 +
        'M' + m.x2 + ' ' + m.y2 + 'l' + (-hs * Math.cos(a - 0.5)) + ' ' + (-hs * Math.sin(a - 0.5)) +
        'M' + m.x2 + ' ' + m.y2 + 'l' + (-hs * Math.cos(a + 0.5)) + ' ' + (-hs * Math.sin(a + 0.5)), class: 't-stroke' }, g);
    } else if (m.type === 'tick') {
      el('path', { d: 'M' + m.x + ' ' + (m.y + 12) + 'l7 8 14-18', class: 't-stroke', style: 'stroke-width:3' }, g);
    } else if (m.type === 'note') {
      var t = el('text', { x: m.x, y: m.y, 'font-size': 26 }, g); t.textContent = m.text;
    } else if (m.type === 'diagram') {
      drawDiagram(m, g);
    }
    animate(g, animated);
    return g;
  }
  function renderMarks() {
    layer.innerHTML = '';
    marks.forEach(function (m) { drawMark(m, false); });
    layer.classList.toggle('hidden', !!settings.hideMarks);
  }
  function markCenter(m) { var r = markRect(m); return { x: r.x + Math.min(r.w, 160) * 0.6, y: r.y + r.h * 0.5 }; }

  /* ---------- tutor cursor ---------- */
  var cursorEl = $('cursor');
  function cursorTo(x, y) {
    cursorEl.classList.remove('away');
    cursorEl.style.left = Math.max(4, Math.min(W - 70, x)) + 'px';
    cursorEl.style.top = Math.max(4, Math.min(H - 30, y)) + 'px';
  }
  function cursorPark() {
    var q = $('question').getBoundingClientRect(), sr = stage.getBoundingClientRect();
    cursorTo(Math.min(W - 90, q.right - sr.left + 16), q.top - sr.top + 10);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduced ? Math.min(ms, 120) : ms); }); }

  // Draws the tutor's marks one by one, moving the cursor to each.
  // True when the board already has this mark: a tick or ring on the same spot, the same
  // note, or the same kind of diagram. The tutor often repeats itself across replies.
  function alreadyDrawn(m) {
    var r = markRect(m), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    return marks.some(function (o) {
      if (o.type !== m.type) return false;
      if (m.type === 'note') {
        // "undo +5 with..?" and "undo +5 with...?" are the same note
        var a1 = String(o.text).toLowerCase().replace(/[^a-z0-9]/g, ''), b1 = String(m.text).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (a1 === b1 || (a1.length >= 6 && b1.length >= 6 && (a1.indexOf(b1) === 0 || b1.indexOf(a1) === 0))) return true;
        var q0 = markRect(o);
        return Math.abs(q0.x - r.x) < 40 && Math.abs(q0.y - r.y) < 24;
      }
      if (m.type === 'diagram') return o.kind === m.kind && o.left === m.left && o.right === m.right && o.total === m.total && o.groups === m.groups && o.fn === m.fn && o.num === m.num && o.den === m.den;
      var q = markRect(o);
      return Math.abs(q.x + q.w / 2 - cx) < 30 && Math.abs(q.y + q.h / 2 - cy) < 24;
    });
  }
  function playActions(list, anchor) {
    var chain = Promise.resolve(), key = boardKey();
    list.forEach(function (a) {
      chain = chain.then(function () {
        if (boardKey() !== key) return;   // never draw on a different question
        var m = resolve(a, anchor), c = markCenter(m);
        if (alreadyDrawn(m)) { cursorTo(c.x, c.y); return wait(350); }   // point at it again instead of redrawing
        cursorTo(c.x, c.y);
        return wait(650).then(function () { if (boardKey() !== key) return; m.t = Date.now(); marks.push(m); drawMark(m, true); saveSoon(); return wait(500); });
      });
    });
    return chain;
  }

  /* ---------- status, subtitles, conversation ---------- */
  var history = [], unread = 0, histories = {};   // histories: conversation per question
  function setStatus(state, text) {
    var s = $('status'); s.setAttribute('data-state', state);
    s.querySelector('span').textContent = text;
    s.setAttribute('aria-label', text);
  }
  function idleStatus() {
    if (demo.on) return setStatus('demo', 'Demo');
    if (focus.on) return setStatus('focus', 'Focus: one step at a time');
    if (!T.isLive()) return setStatus('demo', 'Demo replies');
    setStatus('watching', settings.watch ? 'Tutor is watching' : 'Tutor is ready');
  }
  var lastSub = { text: '', who: 'tutor' };
  function subtitle(text, who) {
    var s = $('sub');
    lastSub = { text: text || '', who: who || 'tutor' };
    s.className = 'bb-sub' + (who === 'you' ? ' you' : '') + (focus.on ? ' focus' : '');
    if (focus.on) {
      s.innerHTML = '<span class="clip"><span class="who">One step at a time</span><span id="focus-line">' + esc(who === 'you' ? '' : text || '') + '</span></span>';
    } else {
      s.innerHTML = text ? '<span class="clip"><span class="who">' + (who === 'you' ? 'You' : 'Tutor') + '</span>' + esc(text) + '</span>' : '';
    }
    s.title = text || '';
  }
  function logMsg(role, text) {
    if (!text) return;
    history.push({ role: role, text: text });
    if (history.length > 40) history.shift();
    renderChat();
    if (role === 'tutor' && $('chat').hidden) { unread++; renderActions(); }
  }
  function renderChat() {
    var log = $('chat-log');
    log.innerHTML = history.length ? history.map(function (m) {
      return '<li class="' + m.role + '"><small>' + (m.role === 'tutor' ? 'Tutor' : 'You') + '</small>' + esc(m.text) + '</li>';
    }).join('') : '<li class="empty">Your conversation with the tutor shows here. Type below, or use the mic.</li>';
    log.scrollTop = log.scrollHeight;
  }
  function tutorSays(text) {
    if (!text) return;
    subtitle(text, 'tutor');
    logMsg('tutor', text);
    if (settings.readAloud && T.voice.canSpeak) {
      setStatus('speaking', 'Tutor is speaking');
      T.voice.speak(text, idleStatus);
    }
  }

  /* ---------- bottom dock ---------- */
  function renderActions() {
    var a = $('actions');
    if (demo.on) {
      a.innerHTML = demo.done
        ? '<div class="bb-grp left"><button type="button" class="bb-chip" data-act="replay">' + ic('play') + 'Watch again</button></div><div class="bb-grp right"><button type="button" class="bb-chip dark" data-act="end-demo">Back to my board</button></div>'
        : '<div class="bb-grp left"></div><div class="bb-grp right"><button type="button" class="bb-chip" data-act="end-demo">' + ic('close') + 'Stop the demo</button></div>';
      return;
    }
    if (focus.on) {
      a.innerHTML = '<div class="bb-grp left"><button type="button" class="bb-chip" data-act="showme">' + ic('eye') + 'Show me</button>' +
        '<button type="button" class="bb-chip" data-act="stuck">Still stuck</button></div>' +
        '<div class="bb-grp right"><button type="button" class="bb-mic" data-act="mic" aria-pressed="' + listening + '" aria-label="Answer out loud" title="Answer out loud (M)">' + ic('mic') + '</button>' +
        '<button type="button" class="bb-chip icon-only" data-act="leave-focus" aria-label="Back to the full board (Esc)" title="Back to the full board (Esc)">' + ic('close') + '</button>' +
        '<button type="button" class="bb-chip dark" data-act="fixed">' + ic('check') + 'I fixed it</button></div>';
      return;
    }
    if (noHints) {
      a.innerHTML = '<div class="bb-grp left"><span class="bb-note">' + ic('eye') + 'A check: no hints until you finish</span></div>' +
        '<div class="bb-grp right"><button type="button" class="bb-chip icon-only has-badge" data-act="chat" aria-label="Conversation" title="Conversation">' + ic('chat') + '</button>' +
        '<button type="button" class="bb-chip dark" data-act="finish">' + ic('check') + 'Finish</button></div>';
      return;
    }
    // Help and check sit left of the tutor's reply; talking, practice, and the conversation sit right.
    a.innerHTML = '<div class="bb-grp left">' +
      '<button type="button" class="bb-chip" data-act="help" aria-label="I need help, ' + Math.min(3, qHints()) + ' of 3 hints used on this question">' + ic('help') + '<span class="lbl-long">I need help</span><span class="lbl-short" aria-hidden="true">Help</span>' + hintMeter() + '</button>' +
      '<button type="button" class="bb-chip" data-act="check">' + ic('check') + '<span>Check<span class="lbl-long"> my work</span></span></button></div><div class="bb-grp right">' +
      '<button type="button" class="bb-mic" id="mic" data-act="mic" aria-pressed="' + listening + '" aria-label="' + (listening ? 'Stop listening' : 'Talk to your tutor') + '" title="Talk to your tutor (M)">' + ic('mic') + '</button>' +
      '<button type="button" class="bb-chip practice" data-act="practice" aria-label="Practice question">' + ic('spark') + '<span class="lbl-mid">Practice</span></button>' +
      '<button type="button" class="bb-chip icon-only has-badge" data-act="chat" aria-label="Conversation' + (unread ? ', ' + unread + ' new' : '') + '" title="Conversation">' + ic('chat') + (unread ? '<span class="bb-badge" aria-hidden="true">' + unread + '</span>' : '') + '</button></div>';
  }
  $('dock').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'help') return askTutor('help');
    if (act === 'check') return askTutor('check');
    if (act === 'practice') return askTutor('practice');
    if (act === 'mic') return toggleMic();
    if (act === 'chat') return openChat();
    if (act === 'showme') return askTutor('showme');
    if (act === 'stuck') return askTutor('stuck');
    if (act === 'fixed') return askTutor('fixed');
    if (act === 'leave-focus') return exitFocus(true);
    if (act === 'end-demo') return endDemo();
    if (act === 'replay') return startDemo();
    if (act === 'finish') return openFinish();
  });

  /* ---------- focus mode ---------- */
  var focus = { on: false, rect: null };
  function enterFocus(rect, line) {
    var r = rect || lastInkRect();
    if (!r) { var q = $('question').getBoundingClientRect(), sr = stage.getBoundingClientRect(); r = { x: q.left - sr.left, y: q.top - sr.top, w: q.width, h: q.height }; }
    focus.on = true; focus.rect = r;
    var spot = $('spot'), pad = 14;
    spot.hidden = false;
    spot.style.left = (r.x - pad) + 'px'; spot.style.top = (r.y - pad) + 'px';
    spot.style.width = (r.w + pad * 2) + 'px'; spot.style.height = (r.h + pad * 2) + 'px';
    // same bottom row as always: what to do on the left, the tutor's words in the middle,
    // talking and "I fixed it" on the right
    $('dock').classList.add('focusing');
    renderActions();
    subtitle(line || lastSub.text, 'tutor');
    renderTools(); idleStatus();
    cursorTo(r.x + r.w + 18, r.y + r.h / 2);
    var f = $('actions').querySelector('[data-act="fixed"]'); if (f && !demo.on) f.focus({ preventScroll: true });
  }
  function exitFocus(byUser) {
    if (!focus.on) return;
    focus.on = false;
    $('spot').hidden = true; $('dock').classList.remove('focusing');
    renderTools(); renderActions(); idleStatus();
    subtitle(lastSub.text, lastSub.who);
    if (byUser) { var h = $('actions').querySelector('[data-act="help"]'); if (h) h.focus({ preventScroll: true }); }
  }

  /* ---------- asking the tutor ---------- */
  var busy = false, lastWatch = 0, watchTimer = null, inkVersion = 0, watchedVersion = 0;

  function boardImage() {
    if (!objs.length) return null;
    var s = Math.min(1, 1200 / Math.max(W, H)), c = document.createElement('canvas');
    c.width = Math.round(W * s); c.height = Math.round(H * s);
    var x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(canvas, 0, 0, c.width, c.height);
    return { data: c.toDataURL('image/jpeg', 0.82).split(',')[1], w: c.width, h: c.height, scale: 1 / s };
  }

  function askTutor(kind, text, opts) {
    if (demo.on) return;
    if (busy && kind !== 'watch') { subtitle('One moment, still thinking about your last question.', 'tutor'); return; }
    if (busy) return;
    if (kind === 'help' && focus.on) kind = 'stuck';
    if (noHints && kind !== 'chat') { if (kind !== 'watch') subtitle('This is a check, so there are no hints yet. Finish to see how it went.', 'tutor'); return; }
    if (kind !== 'watch') { clearTimeout(watchTimer); T.voice.stopSpeaking(); }
    if (HINT_KINDS[kind]) { addQHint(); renderActions(); }
    busy = true; lastWatch = Date.now();
    if (kind !== 'watch') { setStatus('thinking', 'Tutor is thinking'); cursorTo((lastInkRect() || { x: W / 2, y: H / 3, w: 0 }).x + 40, (lastInkRect() || { y: H / 3 }).y - 26); }
    var tid = currentItem().topicId || topicId;
    var req = { kind: kind, text: text || '', question: currentQ(), topic: tid ? topicTitle(tid) : '', hints: tid && PB ? PB.hintsFor(tid) : null, noHints: noHints,
      history: history.slice(-8), image: T.isLive() ? boardImage() : null, boardW: W, boardH: H, box: opts && opts.rect ? opts.rect : null };
    if (kind !== 'watch') watchedVersion = inkVersion;
    var askKey = boardKey();
    return T.ask(req).then(function (reply) {
      busy = false;
      if (!reply) { idleStatus(); return; }
      if (boardKey() !== askKey) {
        // the student moved to another question: keep the reply with the question it was about
        if (reply.say) (histories[askKey] = histories[askKey] || []).push({ role: 'tutor', text: reply.say });
        idleStatus(); return;
      }
      if (kind === 'watch' && !reply.say && !(reply.actions || []).length) { idleStatus(); return; }
      if (reply.practice) { addPractice(reply.practice); }
      var anchor = reply.focus || (opts && opts.rect) || (focus.on ? focus.rect : null);
      var wantFocus = kind === 'help' || kind === 'stuck' || kind === 'showme' || kind === 'step-hint' || kind === 'step-why' || kind === 'unsure' || kind === 'circle' ||
        (kind === 'step-check' && reply.verdict === 'mistake') ||
        ((kind === 'check' || kind === 'watch' || kind === 'fixed') && reply.verdict === 'mistake');
      if (kind === 'fixed' && reply.verdict !== 'mistake') { exitFocus(false); }
      if (wantFocus && !focus.on) enterFocus(anchor, '');
      else if (wantFocus && reply.focus) enterFocus(reply.focus, '');
      tutorSays(reply.say + (reply.offline ? ' (The live tutor did not answer, so this is a general hint.)' : ''));
      idleStatus();
      return playActions(reply.actions || [], anchor).then(function () { if (!focus.on) setTimeout(cursorPark, 1200); });
    }).catch(function () {
      busy = false; idleStatus();
      tutorSays('I could not reach the tutor just now. Check your connection and try again.');
    });
  }

  function changed() {
    inkVersion++; lastChange = Date.now();
    if (!T.isLive() || !settings.watch || demo.on || noHints) return;
    clearTimeout(watchTimer);
    watchTimer = setTimeout(function () {
      if (busy || inkVersion === watchedVersion || Date.now() - lastWatch < 20000 || cur) return;
      lastWatch = Date.now(); watchedVersion = inkVersion;
      askTutor('watch');
    }, 5000);
  }

  /* ---------- voice ---------- */
  var listening = false;
  function toggleMic() {
    if (listening) { T.voice.stopListening(); return; }
    if (!T.voice.canListen) {
      openChat();
      tutorSays('Voice is not available in this browser. Type to me here instead.');
      return;
    }
    listening = true; settings.readAloud = settings.readAloud !== false ? true : settings.readAloud; saveSettings();
    setStatus('listening', 'Listening'); syncMic();
    subtitle('Listening...', 'you');
    T.voice.listen(function (t) { subtitle(t || 'Listening...', 'you'); }).then(function (t) {
      listening = false; syncMic(); idleStatus();
      if (!t) { subtitle('I did not hear anything. Tap the mic and try again, or type.', 'tutor'); return; }
      logMsg('you', t);
      route(t);
    }).catch(function (err) {
      listening = false; syncMic(); idleStatus();
      var c = err && err.code;
      subtitle(c === 'not-allowed' || c === 'service-not-allowed' ? 'The microphone is blocked. Allow it in your browser, or type instead.'
        : c === 'no-speech' ? 'I did not hear anything. Tap the mic and try again.'
        : 'Voice stopped working. You can type to me instead.', 'tutor');
    });
  }
  function syncMic() {
    document.querySelectorAll('[data-act="mic"]').forEach(function (b) { b.setAttribute('aria-pressed', String(listening)); b.setAttribute('aria-label', listening ? 'Stop listening' : 'Talk to your tutor'); });
  }
  function route(t) {
    var s = t.toLowerCase();
    if (/^(i need )?help|i.?m stuck|i don.?t get/.test(s)) return askTutor(focus.on ? 'stuck' : 'help', t);
    if (/^(check|is (this|it) right)/.test(s)) return askTutor('check', t);
    if (/^show me/.test(s)) return askTutor('showme', t);
    if (focus.on && /^(i fixed it|done|fixed)/.test(s)) return askTutor('fixed', t);
    if (/^(practice|another one|give me (a|another) (question|one))/.test(s)) return askTutor('practice', t);
    return askTutor('chat', t);
  }

  /* ---------- conversation drawer ---------- */
  function openChat() {
    $('chat').hidden = false; unread = 0; renderActions(); renderChat();
    $('chat-in').focus();
  }
  function closeChat() { $('chat').hidden = true; var b = $('actions').querySelector('[data-act="chat"]'); if (b) b.focus(); }
  $('chat-close').innerHTML = ic('close');
  $('chat-close').addEventListener('click', closeChat);
  document.querySelector('.bb-send').innerHTML = ic('send');
  $('chat-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('chat-in').value.trim(); if (!v) return;
    $('chat-in').value = '';
    logMsg('you', v); subtitle(v, 'you');
    route(v);
  });

  /* ---------- questions ---------- */
  function addPractice(q) {
    questions.push(q); items.push({ text: q }); extra++;
    goTo(questions.length - 1);
  }
  function mathText(q) { return q.split('-').join(MINUS).replace(new RegExp('(\w)' + MINUS + '(\w)', 'g'), '$1-$2'); }
  function renderQuestion() {
    var q = currentQ(), it = currentItem(), card = $('question');
    var isExtra = qi >= questions.length - extra && extra > 0;
    var label = it.example ? 'Worked example' : isExtra ? 'Practice' : act ? 'Q' + (qi + 1 - (items[0] && items[0].example ? 1 : 0)) : questions.length ? 'Question' : 'Start';
    var body = '<div class="qtext">' + esc(q ? mathText(q) : 'Write any problem on the board, or tap Practice for one.') + '</div>';
    var pic = act && act.type === 'homework' && it.id && L && L.visual ? L.visual(courseId, act.homeworkId, it.id) : null;
    if (pic) body += '<button type="button" class="qvis" aria-expanded="false" aria-label="Picture for this question. Select to make it bigger."><img src="' + pic + '" alt="Picture for this question, from your file"></button>';
    else if (it.visualExpected) body += '<p class="qvis-miss">The picture for this question could not be saved in this browser. Use your sheet for it.</p>';
    if (it.example) {
      body += '<ol class="qsteps">' + it.steps.map(function (st) { return '<li>' + esc(st) + '</li>'; }).join('') + '</ol>' +
        '<button type="button" class="bb-chip dark small" id="q-yourturn">Your turn' + ic('right') + '</button>';
    } else if (it.type === 'spot') {
      var sv = attempt && attempt.answers[qi];
      body += '<ol class="qspot">' + it.lines.map(function (l, i) {
        var cls = sv && sv.ok && i === it.answer ? ' right' : sv && !sv.ok && !noHints && i === +sv.v ? ' picked' : sv && noHints && i === +sv.v ? ' chosen' : '';
        return '<li><button type="button" class="qline' + cls + '" data-spot="' + i + '" aria-pressed="' + !!(sv && +sv.v === i) + '"><span class="ln">' + (i + 1) + '</span>' + esc(mathText(l)) + '</button></li>';
      }).join('') + '</ol><p class="qfb" id="qfb" aria-live="polite">' + spotFeedback(sv, it) + '</p>';
    } else if (it.type === 'fill') {
      var fv = attempt && attempt.answers[qi], vals = fv && Array.isArray(fv.vals) ? fv.vals : [], bi = 0;
      body += '<form class="qfill" id="qfill" novalidate>' + it.steps.map(function (st) {
        return '<div class="fl">' + st.map(function (p) {
          if (p && typeof p === 'object') {
            var k = bi++, mark = fv && fv.each && !noHints ? (fv.each[k] ? ' ok' : ' no') : '';
            return '<input class="fb' + mark + '" data-b="' + k + '" aria-label="Blank ' + (k + 1) + '" autocomplete="off" spellcheck="false" value="' + esc(vals[k] || '') + '">';
          }
          return '<span>' + esc(mathText(p)) + '</span>';
        }).join('') + '</div>';
      }).join('') + '<button type="submit" class="bb-chip small">' + (noHints ? 'Save' : 'Check the blanks') + '</button></form>' +
        '<p class="qfb" id="qfb" aria-live="polite">' + (fv ? (noHints ? 'Saved. You see how it went when you finish.' : fv.ok ? '<span class="ok">' + ic('check') + 'All correct</span>' : '<span class="no">Not yet.</span> Look again at the boxes marked in red.') : '') + '</p>';
    } else if (it.answer != null && !isExtra) {
      var saved = attempt && attempt.answers[qi];
      body += '<form class="qans" id="qans" novalidate><label class="sr-only" for="ans-in">Your answer to this question</label>' +
        '<input id="ans-in" type="text" autocomplete="off" spellcheck="false" inputmode="text" placeholder="' + esc(PB.placeholder(it)) + '" value="' + esc(saved ? saved.v : '') + '">' +
        '<button type="submit" class="bb-chip small">' + (noHints ? 'Save answer' : 'Check answer') + '</button></form>' +
        '<p class="qfb" id="qfb" aria-live="polite">' + answerFeedback(saved, it) + '</p>';
    }
    card.className = 'bb-question' + (settings.qMini ? ' mini' : '') + (it.example ? ' example' : '');
    card.innerHTML = '<button type="button" class="q-grip" id="q-grip" aria-label="Move the question card: drag it, or use the arrow keys. Shift and arrows resize it. Double-click to put it back." title="Drag to move. Double-click to put it back.">' + ic('grip') + '</button>' +
      '<span class="qlabel">' + esc(label) + '</span><div class="qbody">' + body + '</div>' +
      '<button type="button" class="bb-icon" id="q-toggle" aria-expanded="' + !settings.qMini + '" aria-label="' + (settings.qMini ? 'Show the question' : 'Hide the question') + '">' + ic(settings.qMini ? 'expand' : 'minus') + '</button>' +
      (settings.qMini ? '' : '<span class="q-size" id="q-size" aria-hidden="true" title="Drag to resize"></span>');
    placeCard();
    $('q-count').textContent = act || questions.length > 1 ? 'Question ' + (qi + 1) + ' of ' + questions.length : questions.length ? 'Your question' : 'Free practice';
    $('q-prev').disabled = qi <= 0; $('q-next').disabled = qi >= questions.length - 1;
    $('q-prev').hidden = $('q-next').hidden = questions.length < 2;
    renderDots();
    document.title = (title ? title + ' · ' : '') + 'Whiteboard · Markov.ink';
  }
  function spotFeedback(sv, it) {
    if (!sv) return '';
    if (noHints) return 'Saved. You see how it went when you finish.';
    if (sv.ok) return '<span class="ok">' + ic('check') + 'Found it.</span> ' + esc(it.explain);
    return '<span class="no">Not that one.</span> That line follows from the one above it. Look for where the first slip happened.';
  }
  // What happens after any answer: feedback, a small win, and the next step.
  function onAnswered(ok, why) {
    renderDots();
    if (noHints) { if (qi < questions.length - 1) setTimeout(function () { goTo(qi + 1); }, 600); else subtitle('All answers saved. Press Finish when you are ready.', 'tutor'); return; }
    if (ok) {
      var last = qi >= questions.length - 1 - extra;
      celebrate($('question'));
      var dot = $('q-dots').querySelector('[data-dot="' + qi + '"]'); celebrate(dot);
      tutorSays(last ? 'Correct. That was the last one. Press Finish when you are ready.' : 'Correct. On to the next one when you are ready.');
      exitFocus(false);
      var r = lastInkRect(); if (r && !demo.on) playActions([{ type: 'tick' }], r);
    } else if (!why) {
      subtitle('Not yet. Look back at each step, or tap I need help.', 'tutor');
    }
  }
  // The question card can sit anywhere on the board and be resized. Its place and size are
  // remembered in this browser for every board (settings.qBox).
  function placeCard() {
    var card = $('question'), b = settings.qBox;
    if (!b) { card.classList.remove('placed', 'sized'); card.style.left = card.style.top = card.style.width = card.style.height = ''; return; }
    var w = b.w ? Math.max(220, Math.min(b.w, W - 16)) : null;
    var h = b.h && !settings.qMini ? Math.max(60, Math.min(b.h, H - 16)) : null;
    card.classList.add('placed');
    card.classList.toggle('sized', !!(w || h));
    card.style.width = w ? w + 'px' : '';
    card.style.height = h ? h + 'px' : '';
    var r = card.getBoundingClientRect();
    card.style.left = Math.max(8, Math.min(b.x, W - Math.min(r.width, W - 16) - 8)) + 'px';
    card.style.top = Math.max(8, Math.min(b.y, H - 48)) + 'px';
  }
  function cardBox() {
    var card = $('question'), r = card.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return { x: Math.round(r.left - sr.left), y: Math.round(r.top - sr.top), w: Math.round(r.width), h: Math.round(r.height) };
  }
  (function () {
    var card = $('question'), mode = null, start = null, lastTap = 0;
    function resetCard() {
      delete settings.qBox; saveSettings(); placeCard();
      subtitle('The question card is back in its place.', 'tutor');
    }
    card.addEventListener('pointerdown', function (e) {
      var grip = e.target.closest('#q-grip, .qlabel'), size = e.target.closest('#q-size');
      if (!grip && !size) return;
      // two quick presses on the grip put the card back (dblclick is unreliable while dragging)
      if (grip && Date.now() - lastTap < 400) { lastTap = 0; mode = null; resetCard(); e.preventDefault(); return; }
      if (grip) lastTap = Date.now();
      var b = cardBox();
      mode = size ? 'size' : 'move';
      start = { px: e.clientX, py: e.clientY, x: b.x, y: b.y, w: b.w, h: b.h, moved: false };
      card.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    card.addEventListener('pointermove', function (e) {
      if (!mode) return;
      var dx = e.clientX - start.px, dy = e.clientY - start.py;
      if (Math.abs(dx) + Math.abs(dy) > 3) start.moved = true;
      if (!start.moved) return;
      var b = settings.qBox || {};
      if (mode === 'move') settings.qBox = { x: start.x + dx, y: start.y + dy, w: b.w || null, h: b.h || null };
      else settings.qBox = { x: start.x, y: start.y, w: start.w + dx, h: settings.qMini ? null : start.h + dy };
      placeCard();
    });
    function end() {
      if (!mode) return;
      var moved = start.moved; mode = null;
      if (moved) { lastTap = 0; saveSettings(); stepsSoon(); }
    }
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('keydown', function (e) {
      if (!e.target.closest('#q-grip')) return;
      var d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
      if (!d) return;
      e.preventDefault();
      var b = cardBox(), q = settings.qBox || {};
      settings.qBox = e.shiftKey ? { x: b.x, y: b.y, w: b.w + d[0], h: b.h + d[1] } : { x: b.x + d[0], y: b.y + d[1], w: q.w || null, h: q.h || null };
      placeCard(); saveSettings();
    });
  })();

  function answerFeedback(saved, it) {
    if (!saved) return '';
    if (noHints) return 'Saved. You see how it went when you finish.';
    if (saved.ok) return '<span class="ok">' + ic('check') + 'Correct</span>';
    return '<span class="no">Not yet.</span> ' + esc(saved.why || 'Look at your steps again, or ask for help.');
  }
  $('question').addEventListener('submit', function (e) {
    if (e.target.id !== 'qans') return;
    e.preventDefault();
    var it = currentItem(), v = $('ans-in').value.trim();
    if (!v) { $('qfb').textContent = 'Type your answer first.'; $('ans-in').focus(); return; }
    var res = PB.check(it, v);
    if (!res) { $('qfb').textContent = 'I could not read that. Try a form like ' + PB.placeholder(it).replace('Like ', '').replace('Your answer', '19') + '.'; return; }
    attempt.answers[qi] = { v: v.slice(0, 40), ok: res.ok, why: res.why || '' };
    saveAttempt();
    $('qfb').innerHTML = answerFeedback(attempt.answers[qi], it);
    onAnswered(res.ok, res.why);
  });
  $('question').addEventListener('submit', function (e) {
    if (e.target.id !== 'qfill') return;
    e.preventDefault();
    var it = currentItem(), ins = Array.prototype.slice.call(e.target.querySelectorAll('input[data-b]')), vals = ins.map(function (i) { return i.value.trim(); });
    if (vals.some(function (v) { return !v; })) { $('qfb').textContent = 'Fill every box first.'; (ins.filter(function (i) { return !i.value.trim(); })[0] || ins[0]).focus(); return; }
    var res = PB.check(it, vals);
    if (!res) { $('qfb').textContent = 'Use numbers in the boxes, like 12 or ' + MINUS + '3.'; return; }
    attempt.answers[qi] = { v: vals.join(', '), vals: vals, ok: res.ok, each: res.each };
    saveAttempt(); renderQuestion();
    onAnswered(res.ok, false);
    var bad = $('question').querySelector('input.fb.no'); if (bad) bad.focus();
  });
  $('question').addEventListener('click', function (e) {
    if (e.target.closest('#q-yourturn')) { goTo(qi + 1); return; }
    var vb = e.target.closest('.qvis');
    if (vb) { var big = vb.classList.toggle('big'); vb.setAttribute('aria-expanded', String(big)); vb.setAttribute('aria-label', big ? 'Picture for this question. Select to make it smaller.' : 'Picture for this question. Select to make it bigger.'); return; }
    var sb = e.target.closest('[data-spot]');
    if (sb && attempt) {
      var it = currentItem(), pick = +sb.getAttribute('data-spot'), res = PB.check(it, pick);
      attempt.answers[qi] = { v: pick, ok: res.ok };
      saveAttempt(); renderQuestion();
      var again = $('question').querySelector('[data-spot="' + pick + '"]'); if (again) again.focus();
      onAnswered(res.ok, false);
      return;
    }
    if (e.target.closest('#q-toggle')) { settings.qMini = !settings.qMini; saveSettings(); renderQuestion(); $('q-toggle').focus(); }
  });
  function goTo(i) {
    if (i < 0 || i >= questions.length || i === qi) return;
    // finish and save this question's work before the next one is shown
    if (cur || lassoPts || moving || erasing) endStroke();
    commitText();
    clearTimeout(saveTimer); saveNow();
    histories[boardKey()] = history;
    exitFocus(false); closePops(); $('ask-chip').hidden = true; T.voice.stopSpeaking();
    qi = i;
    history = histories[boardKey()] || [];
    renderQuestion(); loadBoard(); markActivity(); renderChat();
    subtitle('', 'tutor'); cursorPark();
  }
  $('q-prev').innerHTML = ic('left'); $('q-next').innerHTML = ic('right');
  $('q-prev').addEventListener('click', function () { goTo(qi - 1); });
  $('q-next').addEventListener('click', function () { goTo(qi + 1); });

  /* ---------- menu ---------- */
  var clearArmed = false;
  function renderMenu() {
    var onoff = function (v) { return '<span class="on-off">' + (v ? 'On' : 'Off') + '</span>'; };
    $('menu').innerHTML =
      '<button type="button" role="menuitem" data-m="demo">' + ic('play') + 'Watch a 30 second demo</button>' +
      '<hr>' +
      (T.voice.canSpeak ? '<button type="button" role="menuitemcheckbox" aria-checked="' + !!settings.readAloud + '" data-m="aloud">' + ic('speaker') + 'Read the tutor aloud' + onoff(settings.readAloud) + '</button>' : '') +
      (T.isLive() ? '<button type="button" role="menuitemcheckbox" aria-checked="' + !!settings.watch + '" data-m="watch">' + ic('eye') + 'Tutor watches as I write' + onoff(settings.watch) + '</button>' : '') +
      '<button type="button" role="menuitemcheckbox" aria-checked="' + !settings.hideMarks + '" data-m="marks">' + ic('eye') + 'Show tutor drawings' + onoff(!settings.hideMarks) + '</button>' +
      '<button type="button" role="menuitem" data-m="clear-marks">' + ic('close') + 'Clear tutor drawings</button>' +
      '<button type="button" role="menuitem" data-m="clear">' + ic('trash') + (clearArmed ? 'Tap again to clear your work' : 'Clear my work') + '</button>' +
      '<hr>' +
      '<button type="button" role="menuitem" data-m="download">' + ic('download') + 'Save the board as an image</button>' +
      '<button type="button" role="menuitem" data-m="replay">' + ic('replay') + 'Replay this board</button>' +
      '<button type="button" role="menuitemcheckbox" aria-checked="' + (settings.scribble !== false) + '" data-m="scribble">' + ic('eraser') + 'Scribble over ink to erase' + onoff(settings.scribble !== false) + '</button>' +
      '<button type="button" role="menuitem" data-m="keys">' + ic('keys') + 'Keyboard shortcuts</button>';
  }
  $('menu-btn').innerHTML = ic('more');
  $('menu-btn').addEventListener('click', function () {
    var m = $('menu'), open = m.hidden;
    $('tool-pop').hidden = true;
    clearArmed = false; renderMenu();
    m.hidden = !open; this.setAttribute('aria-expanded', String(open));
    if (open) m.querySelector('button').focus();
  });
  $('menu').addEventListener('keydown', function (e) {
    var items = Array.prototype.slice.call(this.querySelectorAll('button')), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (e.key === 'Escape') { e.preventDefault(); closePops(); $('menu-btn').focus(); }
  });
  $('menu').addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]'); if (!b) return;
    var m = b.getAttribute('data-m');
    if (m === 'clear' && !clearArmed) { clearArmed = true; renderMenu(); $('menu').querySelector('[data-m="clear"]').focus(); return; }
    closePops(); $('menu-btn').focus();
    if (m === 'demo') startDemo();
    if (m === 'aloud') { settings.readAloud = !settings.readAloud; if (!settings.readAloud) T.voice.stopSpeaking(); saveSettings(); subtitle(settings.readAloud ? 'I will read my replies aloud.' : 'Replies stay as subtitles only.', 'tutor'); }
    if (m === 'watch') { settings.watch = !settings.watch; saveSettings(); idleStatus(); }
    if (m === 'marks') { settings.hideMarks = !settings.hideMarks; saveSettings(); renderMarks(); }
    if (m === 'clear-marks') { marks = []; renderMarks(); saveSoon(); }
    if (m === 'clear') { var prev = snapshot(); objs = []; pushUndo(prev); redraw(); saveSoon(); exitFocus(false); subtitle('Your work is cleared. Undo brings it back.', 'tutor'); }
    if (m === 'download') download();
    if (m === 'replay') startReplay();
    if (m === 'scribble') { settings.scribble = settings.scribble === false; saveSettings(); subtitle(settings.scribble ? 'Scribble over ink to erase it.' : 'Scribbles stay as ink now.', 'tutor'); }
    if (m === 'keys') { openChat(); history.push({ role: 'tutor', text: 'Shortcuts: P pen, H highlighter, E eraser, V select and move, S shapes, T text, Delete removes a selection, Ctrl+Z undo, Ctrl+Shift+Z redo, M mic, ? help, Esc leaves focus or closes panels.' }); renderChat(); }
  });
  function download() {
    var c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(canvas, 0, 0);
    var xml = new XMLSerializer().serializeToString(layer), img = new Image();
    img.onload = function () {
      if (!settings.hideMarks) x.drawImage(img, 0, 0, c.width, c.height);
      var a = document.createElement('a'); a.download = 'markov-board.png'; a.href = c.toDataURL('image/png'); a.click();
    };
    img.onerror = function () { var a = document.createElement('a'); a.download = 'markov-board.png'; a.href = c.toDataURL('image/png'); a.click(); };
    var styled = xml.replace('<svg', '<svg width="' + W + '" height="' + H + '"').replace(/class="t-stroke[^"]*"/g, 'fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"').replace(/class="t-fill[^"]*"/g, 'fill="#2563EB"').replace(/<text /g, '<text fill="#2563EB" font-family="Caveat, cursive" ');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(styled);
  }

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === 'Escape') {
      if (replay.on) { endReplay(); return; }
      if (!$('menu').hidden || !$('tool-pop').hidden || !$('step-pop').hidden) { closePops(); return; }
      if (sel) { clearSel(); return; }
      if (!$('chat').hidden) { closeChat(); return; }
      if (focus.on) { exitFocus(true); return; }
      if (demo.on) { endDemo(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && !typing) {
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); return redo(); }
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey || demo.on) return;
    var k = e.key.toLowerCase();
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); deleteSel(); return; }
    var map = { p: 'pen', h: 'hl', e: 'eraser', t: 'text', v: 'lasso' };
    if (map[k]) { setTool(map[k]); return; }
    var shapes = { l: 'line', a: 'arrow', r: 'rect', o: 'ellipse' };
    if (shapes[k]) { shapeKind = shapes[k]; setTool('shape'); return; }
    if (k === 's') { setTool('shape'); return; }
    if (k === 'm') { toggleMic(); return; }
    if (e.key === '?') { askTutor('help'); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('#menu, #menu-btn, #tool-pop, #tools, #step-pop, .bb-step')) closePops();
  });

  /* ---------- interactive tools on the board (balance, terms, graph, fraction) ---------- */
  var widgets = [];
  var wapi = {
    size: function () { return { w: W, h: H }; },
    place: function (w, h) { var p = placeFree(w, Math.max(h, 400), { x: W * 0.62, y: 80 }); return { x: p.x, y: Math.min(p.y, Math.max(8, H - 470)) }; },
    question: function () { return currentQ(); },
    changed: function () { saveSoon(); },
    addText: function (text) { addTextLine(text); },
    win: function (el) { celebrate(el); }
  };
  function mountWidgets() { if (window.MarkovWidgets) window.MarkovWidgets.mount($('widgets'), widgets, wapi); }
  function addTextLine(text) {
    var r = lastInkRect();
    var x = r ? r.x : Math.max(90, Math.round(W * 0.18)), y = r ? r.y + r.h + 22 : Math.max(120, Math.round(H * 0.24));
    if (y > H - 170) y = H - 170;
    var prev = snapshot();
    objs.push({ type: 'text', text: String(text).slice(0, 120), x: x, y: y, color: color, size: 22, t: Date.now() });
    pushUndo(prev); redraw(); saveSoon(); changed(); stepsSoon();
    subtitle('Written on your board. Select (V) moves it.', 'tutor');
  }
  function celebrate(el) {
    if (!el || reduced) return;
    el.classList.remove('bb-win'); void el.offsetWidth; el.classList.add('bb-win');
    setTimeout(function () { el.classList.remove('bb-win'); }, 1100);
  }

  /* ---------- your work, line by line: tap a step to ask about it ---------- */
  var HINT_KINDS = { help: 1, stuck: 1, showme: 1, 'step-hint': 1, 'step-why': 1, unsure: 1, circle: 1 };
  var freeHints = {};
  function qHints() { return attempt ? ((attempt.qh || {})[qi] || 0) : (freeHints[qi] || 0); }
  function addQHint() {
    if (attempt) { attempt.qh = attempt.qh || {}; attempt.qh[qi] = (attempt.qh[qi] || 0) + 1; attempt.hints++; saveAttempt(); }
    else freeHints[qi] = (freeHints[qi] || 0) + 1;
  }
  function workLines() {
    var boxes = objs.filter(function (o) { return o.type !== 'stamp'; }).map(bbox)
      .sort(function (a, b) { return (a.y + a.h / 2) - (b.y + b.h / 2); });
    var lines = [];
    boxes.forEach(function (b) {
      var cy = b.y + b.h / 2, L = lines[lines.length - 1];
      if (L && cy >= L.y - 4 && cy <= L.y + L.h + 4 && b.h < L.h * 2.6 + 30) { var u = union([L, b]); L.x = u.x; L.y = u.y; L.w = u.w; L.h = u.h; }
      else lines.push({ x: b.x, y: b.y, w: b.w, h: b.h });
    });
    return lines.filter(function (l) { return l.w >= 24 && l.h < 220; }).slice(0, 30);
  }
  var stepTimer = null, handleRects = [], tapHandle = null;
  // The buttons never block the pen: a quick tap on one opens its menu, a stroke draws as usual.
  function handleAt(x, y) {
    if ($('steps-layer').hidden) return null;
    for (var i = 0; i < handleRects.length; i++) { var h = handleRects[i]; if (x >= h.x - 2 && x <= h.x + 30 && y >= h.y - 2 && y <= h.y + 30) return h; }
    return null;
  }
  // The line buttons wait for a pause in writing, so they never sit where the next stroke goes.
  function stepsSoon() { clearTimeout(stepTimer); $('steps-layer').hidden = true; stepTimer = setTimeout(renderStepHandles, 1600); }
  function renderStepHandles() {
    var lay = $('steps-layer');
    lay.innerHTML = ''; lay.hidden = false;
    if (demo.on || replay.on || noHints || cur || tool === 'eraser' || tool === 'lasso') return;
    // Buttons sit just before the start of each line (writing continues to the right). When the
    // tool panel leaves no room there, they sit above the line's start instead.
    var tr = $('tools').getBoundingClientRect(), sr = stage.getBoundingClientRect(), toolsRight = tr.right - sr.left + 6;
    handleRects = [];
    workLines().forEach(function (l, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bb-step';
      var left = l.x - 34, top = l.y + l.h / 2 - 14;
      if (left < toolsRight && l.y + l.h > tr.top - sr.top && l.y < tr.bottom - sr.top) { left = l.x - 6; top = l.y - 30; }
      b.style.left = Math.max(4, left) + 'px'; b.style.top = Math.max(0, top) + 'px';
      handleRects.push({ x: Math.max(4, left), y: Math.max(0, top), l: l, i: i });
      b.setAttribute('aria-label', 'Ask about line ' + (i + 1) + ' of your work'); b.title = 'Ask about this line';
      b.innerHTML = ic('more');
      b.addEventListener('click', function (e) { e.stopPropagation(); openStepMenu(l, i); });
      lay.appendChild(b);
    });
  }
  function openStepMenu(l, i) {
    var pop = $('step-pop');
    pop.innerHTML = '<p class="sp-h">Line ' + (i + 1) + ' of your work</p>' +
      '<button type="button" role="menuitem" data-s="step-check">' + ic('check') + 'Check this step</button>' +
      '<button type="button" role="menuitem" data-s="step-why">' + ic('help') + 'Why does this work?</button>' +
      '<button type="button" role="menuitem" data-s="step-hint">' + ic('spark') + 'Hint for this step</button>' +
      '<button type="button" role="menuitem" data-s="unsure">' + ic('flag') + 'I am unsure here</button>';
    pop.hidden = false;
    pop.style.left = Math.max(8, Math.min(W - 240, l.x + l.w + 44)) + 'px';
    pop.style.top = Math.max(8, Math.min(H - 230, l.y - 10)) + 'px';
    pop.onclick = function (e) {
      var b = e.target.closest('[data-s]'); if (!b) return;
      var k = b.getAttribute('data-s'); pop.hidden = true;
      if (k === 'unsure') stampUnsure(l);
      askTutor(k, '', { rect: l });
    };
    pop.onkeydown = function (e) {
      var items = Array.prototype.slice.call(pop.querySelectorAll('button')), j = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(j + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(j - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { e.preventDefault(); pop.hidden = true; }
    };
    var f = pop.querySelector('button'); if (f) f.focus();
  }
  function stampUnsure(l) {
    var prev = snapshot();
    objs.push({ type: 'stamp', x: Math.min(W - 30, l.x + l.w + 40), y: l.y + l.h / 2 - 13, t: Date.now() });
    pushUndo(prev); redraw(); saveSoon(); stepsSoon();
  }

  /* ---------- circle part of your work to ask about it ---------- */
  function pointIn(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function pathLen(p) { var len = 0; for (var i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return len; }
  function loopAround(o) {
    if (o.type !== 'stroke' || o.tool !== 'pen' || o.pts.length < 12) return null;
    var p = o.pts, b = bbox(o), gap = Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]);
    if (pathLen(p) < 140 || b.w < 40 || b.h < 26 || gap > Math.max(30, 0.2 * Math.max(b.w, b.h))) return null;
    var inside = objs.filter(function (q) {
      if (q === o || q.type === 'stamp') return false;
      var c = bbox(q), cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      return pointIn(p, cx, cy);
    });
    return inside.length ? b : null;
  }
  function offerCircleAsk(b) {
    var chip = $('ask-chip');
    chip.innerHTML = '<button type="button" class="bb-chip small dark" data-ask>' + ic('help') + 'Ask about this</button>' +
      '<button type="button" class="bb-chip small icon-only" data-no aria-label="No thanks">' + ic('close') + '</button>';
    chip.hidden = false;
    chip.style.left = Math.max(8, Math.min(W - 210, b.x + b.w - 30)) + 'px'; chip.style.top = Math.max(8, b.y - 48) + 'px';
    chip.onclick = function (e) {
      if (e.target.closest('[data-ask]')) { chip.hidden = true; askTutor('circle', '', { rect: b }); }
      else if (e.target.closest('[data-no]')) chip.hidden = true;
    };
    clearTimeout(chip._t); chip._t = setTimeout(function () { chip.hidden = true; }, 8000);
  }

  /* ---------- scribble over something to erase it ---------- */
  function scribbleHits(o) {
    if (settings.scribble === false || o.type !== 'stroke' || o.tool !== 'pen' || o.pts.length < 16) return null;
    var p = o.pts, rev = 0, dir = 0, lastX = p[0][0];
    for (var i = 1; i < p.length; i++) {
      var dx = p[i][0] - lastX;
      if (Math.abs(dx) > 6) { var d = dx > 0 ? 1 : -1; if (dir && d !== dir) rev++; dir = d; lastX = p[i][0]; }
    }
    var b = bbox(o);
    if (rev < 4 || pathLen(p) < b.w * 2.5) return null;
    var hits = objs.filter(function (q) {
      var c = bbox(q);
      var ix = Math.max(0, Math.min(c.x + c.w, b.x + b.w) - Math.max(c.x, b.x)), iy = Math.max(0, Math.min(c.y + c.h, b.y + b.h) - Math.max(c.y, b.y));
      return ix * iy >= 0.5 * c.w * c.h;
    });
    return hits.length ? hits : null;
  }

  /* ---------- select and move (lasso) ---------- */
  var sel = null, lassoPts = null, moving = null;
  function clearSel() { sel = null; $('sel-box').hidden = true; }
  function selRect() { return sel && sel.length ? union(sel.map(bbox)) : null; }
  function showSel() {
    var r = selRect(), s = $('sel-box');
    if (!r) { clearSel(); return; }
    s.hidden = false;
    s.style.left = (r.x - 6) + 'px'; s.style.top = (r.y - 6) + 'px'; s.style.width = (r.w + 12) + 'px'; s.style.height = (r.h + 12) + 'px';
  }
  function moveObj(o, dx, dy) {
    if (o.type === 'stroke') o.pts.forEach(function (p) { p[0] += dx; p[1] += dy; });
    else if (o.type === 'shape') { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; }
    else { o.x += dx; o.y += dy; }
  }
  function deleteSel() {
    if (!sel || !sel.length) return;
    var prev = snapshot(), gone = sel;
    objs = objs.filter(function (o) { return gone.indexOf(o) < 0; });
    pushUndo(prev); clearSel(); redraw(); saveSoon(); changed(); stepsSoon();
    subtitle('Deleted. Undo brings it back.', 'tutor');
  }
  $('sel-del').innerHTML = ic('trash') + 'Delete';
  $('sel-del').addEventListener('click', deleteSel);

  /* ---------- progress dots and the hint meter ---------- */
  function renderDots() {
    var box = $('q-dots');
    if (!act || questions.length > 12 || questions.length < 2) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = items.map(function (it, i) {
      var a = attempt && attempt.answers[i], st = it.example ? 'ex' : !a ? '' : noHints ? 'saved' : a.ok ? 'ok' : 'no';
      var word = it.example ? 'worked example' : !a ? (it.answer == null ? 'work on the board' : 'no answer yet') : noHints ? 'answer saved' : a.ok ? 'correct' : 'not yet';
      return '<button type="button" class="dot ' + st + (i === qi ? ' cur' : '') + '" data-dot="' + i + '" aria-label="Question ' + (i + 1) + ', ' + word + '"' + (i === qi ? ' aria-current="step"' : '') + '></button>';
    }).join('');
  }
  $('q-dots').addEventListener('click', function (e) { var d = e.target.closest('[data-dot]'); if (d) goTo(+d.getAttribute('data-dot')); });
  function hintMeter() {
    var h = Math.min(3, qHints());
    return '<span class="hm" aria-hidden="true">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < h ? 'on' : '') + '"></i>'; }).join('') + '</span>';
  }

  /* ---------- replay the board ---------- */
  var replay = { on: false, run: 0, speed: 1, paused: false };
  function startReplay() {
    if (!objs.length && !marks.length) { subtitle('Nothing to replay yet. Write something first.', 'tutor'); return; }
    closePops(); exitFocus(false); clearSel(); T.voice.stopSpeaking();
    var run = ++replay.run; replay.on = true; replay.paused = false;
    canvas.style.pointerEvents = 'none'; $('steps-layer').innerHTML = '';
    var evs = objs.map(function (o, i) { return { o: o, t: o.t || i }; })
      .concat(marks.map(function (m, i) { return { m: m, t: m.t || (1e13 + i) }; }))
      .sort(function (a, b) { return a.t - b.t; });
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); layer.innerHTML = '';
    var i = 0;
    renderReplayBar(0, evs.length);
    function gate() { return new Promise(function (res) { (function chk() { if (run !== replay.run) return; if (replay.paused) { setTimeout(chk, 150); return; } res(); })(); }); }
    function strokeAnim(o) {
      return new Promise(function (res) {
        var k = 1;
        (function frame() {
          if (run !== replay.run) return;
          if (replay.paused) { setTimeout(frame, 120); return; }
          var to = Math.min(o.pts.length, k + Math.ceil((reduced ? 40 : 3) * replay.speed));
          ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          drawObj({ type: 'stroke', tool: o.tool, color: o.color, size: o.size, pressure: o.pressure, pts: o.pts.slice(k - 1, to) });
          ctx.restore(); k = to;
          if (k >= o.pts.length) res(); else requestAnimationFrame(frame);
        })();
      });
    }
    function next() {
      if (run !== replay.run) return;
      if (i >= evs.length) { renderReplayBar(evs.length, evs.length, true); return; }
      var e = evs[i++];
      renderReplayBar(i, evs.length);
      gate().then(function () {
        if (e.m) { drawMark(e.m, true); return wait(520 / replay.speed); }
        if (e.o.type === 'stroke' && e.o.pts.length > 2) return strokeAnim(e.o);
        ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); drawObj(e.o); ctx.restore();
        return wait(260 / replay.speed);
      }).then(function () { return wait(110 / replay.speed); }).then(next);
    }
    next();
  }
  function renderReplayBar(i, n, done) {
    var bar = $('replay-bar'); bar.hidden = false;
    bar.innerHTML = '<span class="rb-t">' + (done ? 'Replay finished' : 'Replaying ' + i + ' of ' + n) + '</span>' +
      '<span class="rb-track" aria-hidden="true"><i style="width:' + Math.round(100 * i / Math.max(1, n)) + '%"></i></span>' +
      (done ? '<button type="button" class="bb-chip small" data-r="again">' + ic('play') + 'Again</button>'
        : '<button type="button" class="bb-chip small icon-only" data-r="pause" aria-label="' + (replay.paused ? 'Play' : 'Pause') + '">' + ic(replay.paused ? 'play' : 'pause') + '</button>' +
          '<button type="button" class="bb-chip small" data-r="speed" aria-label="Speed, ' + replay.speed + ' times">' + replay.speed + 'x</button>') +
      '<button type="button" class="bb-chip small dark" data-r="close">Close</button>';
  }
  $('replay-bar').addEventListener('click', function (e) {
    var b = e.target.closest('[data-r]'); if (!b) return;
    var r = b.getAttribute('data-r');
    if (r === 'close') { endReplay(); return; }
    if (r === 'again') { startReplay(); return; }
    if (r === 'pause') { replay.paused = !replay.paused; }
    if (r === 'speed') { replay.speed = replay.speed === 1 ? 2 : replay.speed === 2 ? 4 : 1; }
    var txt = $('replay-bar').querySelector('.rb-t').textContent.match(/(\d+) of (\d+)/);
    if (txt) renderReplayBar(+txt[1], +txt[2]);
    var again = $('replay-bar').querySelector('[data-r="' + r + '"]'); if (again) again.focus();
  });
  function endReplay() {
    if (!replay.on) return;
    replay.run++; replay.on = false; replay.paused = false;
    $('replay-bar').hidden = true; canvas.style.pointerEvents = '';
    redraw(); renderMarks(); stepsSoon();
  }

  /* ---------- finishing an activity ---------- */
  // The student looks back over the set and says how it went. That review is what
  // makes the activity count: points, the streak, and evidence for the topic.
  var finishBtn = $('finish-btn'), dlg = $('finish-dlg'), rating = null;
  function realItems() { return items.map(function (it, i) { return { it: it, i: i }; }).filter(function (x) { return !x.it.example && x.i < questions.length - extra; }); }
  function scoreSummary() {
    var withAns = realItems().filter(function (x) { return x.it.answer != null; });
    var correct = withAns.filter(function (x) { var a = attempt.answers[x.i]; return a && a.ok; }).length;
    var answered = withAns.filter(function (x) { return attempt.answers[x.i]; }).length;
    return { total: withAns.length, correct: correct, answered: answered };
  }
  function openFinish() {
    if (!act || demo.on) return;
    T.voice.stopSpeaking(); exitFocus(false); closePops();
    rating = null;
    var sc = scoreSummary(), list = realItems();
    var rows = list.map(function (x, k) {
      var a = attempt.answers[x.i], st;
      if (x.it.answer == null) st = '<span class="st">Worked on the board</span>';
      else if (!a) st = '<span class="st none">No answer</span>';
      else if (a.ok) st = '<span class="st ok">' + ic('check') + 'Correct</span>';
      else st = '<span class="st no">Not yet</span>' + (noHints ? '<small>Answer: ' + esc(PB.answerText(x.it)) + '</small>' : '');
      return '<li><b>' + (k + 1) + '</b><span class="q">' + esc(mathText(x.it.text)) + '</span>' + st + '</li>';
    }).join('');
    var missing = sc.total - sc.answered;
    dlg.innerHTML = '<form class="fin" id="fin-form" novalidate>' +
      '<h2 id="fin-title">Look back before you finish</h2>' +
      '<p class="lead">' + (sc.total ? sc.correct + ' of ' + sc.total + ' correct · ' : '') + (noHints ? 'No hints in a check' : attempt.hints + ' hint' + (attempt.hints === 1 ? '' : 's') + ' used') + '</p>' +
      '<ol class="fin-list">' + rows + '</ol>' +
      (missing > 0 ? '<p class="fin-note">' + missing + ' question' + (missing === 1 ? ' has' : 's have') + ' no answer yet. You can still finish, or keep working.</p>' : '') +
      '<fieldset class="fin-rate"><legend>How did it go?</legend>' +
      [['got', 'I can do these on my own'], ['mostly', 'Mostly, with some help'], ['confused', 'Still confusing']].map(function (r) {
        return '<label><input type="radio" name="rate" value="' + r[0] + '"><span>' + r[1] + '</span></label>';
      }).join('') + '</fieldset>' +
      '<p class="fin-err" id="fin-err" aria-live="polite"></p>' +
      '<div class="fin-actions"><button type="button" class="bb-chip" id="fin-keep">Keep working</button><button type="submit" class="bb-chip dark" id="fin-go">Finish</button></div></form>';
    dlg.showModal();
    var first = dlg.querySelector('input[name=rate]'); if (first) first.focus();
    dlg.querySelectorAll('input[name=rate]').forEach(function (r) { r.addEventListener('change', function () { rating = r.value; $('fin-err').textContent = ''; }); });
    $('fin-keep').addEventListener('click', function () { dlg.close(); });
    $('fin-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!rating) { $('fin-err').textContent = 'Choose how it went first.'; dlg.querySelector('input[name=rate]').focus(); return; }
      completeActivity(sc);
    });
  }
  function dominantTopic() {
    if (topicId) return topicId;
    var c = {}; items.forEach(function (it) { if (it.topicId) c[it.topicId] = (c[it.topicId] || 0) + 1; });
    var best = null; Object.keys(c).forEach(function (k) { if (!best || c[k] > c[best]) best = k; });
    return best;
  }
  function completeActivity(sc) {
    var success = sess.kind === 'independent'
      ? (sc.total ? sc.correct / sc.total >= 2 / 3 : rating === 'got')
      : rating !== 'confused';
    // One topic: the result belongs to it. Several topics: each gets its own result.
    var byTopic = {};
    realItems().forEach(function (x) { if (!x.it.topicId) return; var t = byTopic[x.it.topicId] = byTopic[x.it.topicId] || { n: 0, ok: 0 }; t.n++; if (x.it.answer != null && attempt.answers[x.i] && attempt.answers[x.i].ok) t.ok++; else if (x.it.answer == null && rating !== 'confused') t.ok++; });
    var topics = Object.keys(byTopic), multi = !topicId && topics.length > 1;
    var tid = multi ? null : dominantTopic(), res = { points: 0 };
    var topicResults = multi ? topics.map(function (t) { return { topicId: t, success: sess.kind === 'independent' ? byTopic[t].ok === byTopic[t].n : rating !== 'confused' }; }) : null;
    try {
      res = L.recordCompletion({ courseId: courseId, activityId: act.id, attemptId: attempt.id, topicId: tid, topicResults: topicResults, kind: sess.kind, reviewed: true, hintsUsed: attempt.hints, success: success });
    } catch (e) {}
    endAttempt();
    var st = L.streak(), ev = tid ? L.topicEvidence(courseId, tid) : null, today = L.pointsToday(), goal = L.dailyGoal();
    var again = act.type === 'topic' || act.type === 'test-step';
    dlg.innerHTML = '<div class="fin done">' +
      '<span class="fin-badge" aria-hidden="true">' + ic('check') + '</span>' +
      '<h2 id="fin-title">' + (res.points ? '+' + res.points + ' practice points' : 'Finished') + '</h2>' +
      '<p class="lead">' + (sess.kind === 'independent' ? (success ? 'Nice. This counts as independent evidence.' : 'This check showed something to review. That is useful to know.') : 'Finished with help. Looking back over it is what makes it stick.') + '</p>' +
      '<ul class="fin-facts">' +
      '<li><b>' + st.current + '</b><span>day streak</span></li>' +
      '<li><b>' + today + '</b><span>points today' + (today >= goal ? ', goal met' : ' of ' + goal) + '</span></li>' +
      (ev ? '<li><b>' + esc(ev.label) + '</b><span>' + esc(topicTitle(tid) || 'this topic') + '</span></li>' : '') +
      (multi ? topics.slice(0, 4).map(function (t) { var e2 = L.topicEvidence(courseId, t); return '<li><b>' + esc(e2.label) + '</b><span>' + esc(topicTitle(t) || t) + '</span></li>'; }).join('') : '') + '</ul>' +
      '<div class="fin-actions">' + (again ? '<button type="button" class="bb-chip" id="fin-again">Try a new set</button>' : '') +
      '<a class="bb-chip dark" href="' + esc(backHref) + '">Back to course' + ic('right') + '</a></div></div>';
    var ag = $('fin-again'); if (ag) ag.addEventListener('click', function () { location.reload(); });
    var back = dlg.querySelector('a'); if (back) back.focus();
    finishBtn.hidden = true;
    renderActions();
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); location.href = backHref; }, { once: true });
  }
  finishBtn.addEventListener('click', openFinish);

  /* ---------- a short demo that plays itself ---------- */
  var demo = { on: false, done: false, saved: null, run: 0 };
  function startDemo() {
    exitFocus(false); $('chat').hidden = true; T.voice.stopSpeaking();
    if (!demo.on) demo.saved = { questions: questions, items: items, qi: qi, objs: objs, marks: marks, widgets: widgets, extra: extra, history: history };
    endReplay(); clearSel(); widgets = []; mountWidgets(); $('steps-layer').innerHTML = '';
    finishBtn.hidden = true;
    demo.on = true; demo.done = false; var run = ++demo.run;
    questions = ['5x ' + MINUS + ' 4 = 21']; items = [{ text: questions[0] }]; qi = 0; extra = 0; objs = []; marks = []; history = [];
    renderQuestion(); redraw(); renderMarks(); renderActions(); idleStatus(); cursorPark();
    canvas.style.pointerEvents = 'none';
    var line = function (text, x, y) {
      var o = { type: 'text', text: '', x: x, y: y, color: '#0A1929', size: 30, hand: true }; objs.push(o);
      var chain = Promise.resolve();
      text.split('').forEach(function (ch) { chain = chain.then(function () { if (run !== demo.run) throw 0; o.text += ch; redraw(); return wait(85); }); });
      return chain.then(function () { return o; });
    };
    var x0 = Math.max(90, Math.min(W * 0.18, 220)), y0 = Math.max(110, H * 0.2);
    var say = function (t) { if (run !== demo.run) throw 0; subtitle(t, 'tutor'); logMsg('tutor', t); };
    var l3;
    wait(500).then(function () { say('Here is how we work together. You write, I watch.'); return wait(1400); })
      .then(function () { return line('5x ' + MINUS + ' 4 = 21', x0, y0); })
      .then(function () { return wait(400); })
      .then(function () { return line('5x = 25', x0, y0 + 52); })
      .then(function (o) { var r = bbox(o); return playActions([{ type: 'tick' }], r).then(function () { say('Adding 4 to both sides. Nice.'); return wait(1500); }); })
      .then(function () { return line('x = 6', x0, y0 + 104); })
      .then(function (o) { l3 = o; return wait(700); })
      .then(function () { var r = bbox(l3); return playActions([{ type: 'ring' }], r).then(function () { enterFocus(r, ''); say('Look at just this line with me. What is 25 ' + String.fromCharCode(0xf7) + ' 5?'); return wait(2600); }); })
      .then(function () { say('Here is a picture. 25 dots shared into 5 equal groups. Count one group.'); return playActions([{ type: 'diagram', kind: 'dots', total: 25, groups: 5, caption: '25 shared into 5 groups' }], bbox(l3)); })
      .then(function () { return wait(2400); })
      .then(function () { if (run !== demo.run) throw 0; objs.splice(objs.indexOf(l3), 1); marks = marks.filter(function (m) { return m.type !== 'ring'; }); renderMarks(); redraw(); return line('x = 5', x0, y0 + 104); })
      .then(function (o) { exitFocus(false); renderActions(); return playActions([{ type: 'tick' }], bbox(o)); })
      .then(function () { say('Yes, x = 5. You found it yourself.'); return wait(2200); })
      .then(function () { say('That is the board. Ask for help any time, or talk to me with the mic.'); demo.done = true; renderActions(); setTimeout(cursorPark, 600); var b = $('actions').querySelector('[data-act="end-demo"]'); if (b) b.focus(); })
      .catch(function () {});
  }
  function endDemo() {
    if (!demo.on) return;
    demo.run++; demo.on = false; demo.done = false;
    var s = demo.saved || { questions: [], items: [], qi: 0, objs: [], marks: [], extra: 0, history: [] };
    questions = s.questions; items = s.items || questions.map(function (t) { return { text: t }; }); qi = s.qi; objs = s.objs; marks = s.marks; extra = s.extra; history = s.history;
    finishBtn.hidden = !act; widgets = s.widgets || []; mountWidgets(); stepsSoon();
    canvas.style.pointerEvents = '';
    exitFocus(false); renderQuestion(); redraw(); renderMarks(); renderActions(); renderChat(); idleStatus(); cursorPark();
    subtitle(questions.length ? 'Your turn. Start writing whenever you are ready.' : 'Your turn. Write a problem, or tap Practice for one.', 'tutor');
    var h = $('actions').querySelector('[data-act="help"]'); if (h) h.focus();
  }

  /* ---------- start ---------- */
  var backLabel = !act ? 'Back' : act.type === 'homework' || act.type === 'assignment' ? 'Back to homework' : act.type === 'test-step' ? 'Back to test plan' : 'Back to topic';
  $('back').innerHTML = ic('back') + '<span>' + backLabel + '</span>';
  $('back').setAttribute('href', backHref);
  $('back').setAttribute('aria-label', act ? backLabel : 'Back to your courses');
  window.addEventListener('resize', function () { resize(); placeCard(); stepsSoon(); if (sel) showSel(); if (focus.on) enterFocus(focus.rect, lastSub.text); });
  resize(); renderTools(); renderQuestion(); renderActions(); renderChat(); loadBoard(); markActivity();
  finishBtn.hidden = !act;
  setStatus('thinking', 'Getting ready');
  cursorEl.classList.add('away');
  T.init().then(function () {
    idleStatus(); cursorPark();
    if (params.get('tour') === '1') { startDemo(); return; }
    subtitle(noHints ? 'This is a check. Work on the board, type each answer, then press Finish. Feedback comes at the end.'
      : currentItem().example ? 'Read the worked example, then press Your turn.'
      : act ? 'Work on the board' + (currentItem().answer != null ? ' and type your answer in the box' : '') + '. Ask for help any time, and press Finish when you are done.'
      : T.isLive() ? (questions.length ? 'Start writing. I will watch and help when you ask.' : 'Write a problem, or tap Practice for one.')
      : 'Demo replies for now: I give general hints but cannot read handwriting yet. Try the demo in the menu.', 'tutor');
  });
  if (document.fonts && document.fonts.load) document.fonts.load('600 26px Caveat').then(function () { redraw(); renderMarks(); });

  window.MarkovBoard = { _test: { item: function () { return currentItem(); }, key: function () { return boardKey(); }, goTo: function (i) { goTo(i); }, lines: function () { return workLines(); }, compile: compile, state: function () { return { objs: objs, marks: marks, focus: focus.on, qi: qi, questions: questions, tool: tool, demo: demo.on }; }, askTutor: askTutor, startDemo: startDemo, placeFree: placeFree } };
})();
