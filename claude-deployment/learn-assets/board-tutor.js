/* Markov.ink board tutor: what the tutor says and draws, and voice in and out.
   Live mode: when /api/tutor has a key, a picture of the board and the kind of help
   asked for go to the server, which asks Claude and returns one short line plus
   drawing actions.
   Demo mode: without a key, short general hints that never claim to read handwriting. */
(function () {
  'use strict';

  var API = '/api/tutor';
  var live = false;
  var ready = null;

  function init() {
    if (!ready) {
      ready = fetch(API, { method: 'GET', cache: 'no-store' }).then(function (r) {
        return r.ok ? r.json() : {};
      }).then(function (j) { live = !!(j && j.live); return { live: live }; })
        .catch(function () { live = false; return { live: false }; });
    }
    return ready;
  }

  /* ---------- What the tutor may draw ---------- */

  var KINDS = ['ring', 'underline', 'arrow', 'note', 'tick', 'diagram'];
  var DIAGRAMS = ['dots', 'numberline', 'balance', 'triangle', 'plot', 'fraction'];

  function num(v, lo, hi, d) { v = Number(v); if (!isFinite(v)) return d; return Math.max(lo, Math.min(hi, v)); }
  function str(v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; }

  // Keeps only known actions with sane values, scaled from image pixels to board pixels.
  function cleanActions(list, scale, W, H) {
    if (!Array.isArray(list)) return [];
    var s = scale || 1;
    return list.slice(0, 4).map(function (a) {
      if (!a || KINDS.indexOf(a.type) < 0) return null;
      var o = { type: a.type };
      ['x', 'y', 'x2', 'y2'].forEach(function (k) { if (a[k] != null) o[k] = num(a[k] * s, -20, (k[0] === 'x' ? W : H) + 20, 0); });
      ['w', 'h'].forEach(function (k) { if (a[k] != null) o[k] = num(a[k] * s, 10, k === 'w' ? W : H, 60); });
      if (a.type === 'note') { o.text = str(a.text, 60); if (!o.text) return null; }
      if (a.type === 'diagram') {
        if (DIAGRAMS.indexOf(a.kind) < 0) return null;
        o.kind = a.kind;
        o.total = num(a.total, 1, 60, 12); o.groups = num(a.groups, 1, 12, 3);
        o.min = num(a.min, -100, 100, 0); o.max = num(a.max, -100, 100, 10);
        o.marks = Array.isArray(a.marks) ? a.marks.slice(0, 6).map(function (m) { return num(m, -100, 100, 0); }) : [];
        o.jumps = Array.isArray(a.jumps) ? a.jumps.slice(0, 4).filter(Array.isArray).map(function (j) { return [num(j[0], -100, 100, 0), num(j[1], -100, 100, 0)]; }) : [];
        o.left = str(a.left, 16); o.right = str(a.right, 16);
        o.base = str(String(a.base == null ? '' : a.base), 10); o.height = str(String(a.height == null ? '' : a.height), 10);
        o.fn = str(a.fn, 40);
        o.num = num(a.num, 0, 24, 1); o.den = num(a.den, 1, 24, 4);
        o.caption = str(a.caption, 50);
      }
      return o;
    }).filter(Boolean);
  }

  /* ---------- Live mode ---------- */

  // Live mode: the browser sends only structured fields. The tutor's instructions live on
  // the server (api/tutor.js), so the endpoint cannot be used as a general proxy.
  function liveAsk(req) {
    var s = req.image ? req.image.scale : 1;   // board pixels per image pixel
    var box = req.box && req.image ? { x: req.box.x / s, y: req.box.y / s, w: req.box.w / s, h: req.box.h / s } : null;
    var payload = {
      kind: req.kind, mode: req.noHints ? 'check' : '',
      question: String(req.question || '').slice(0, 600), topic: String(req.topic || '').slice(0, 80), text: String(req.text || '').slice(0, 400),
      history: (req.history || []).slice(-8).map(function (m) { return { role: m.role === 'tutor' ? 'tutor' : 'you', text: String(m.text || '').slice(0, 300) }; }),
      image: req.image ? { data: req.image.data, w: req.image.w, h: req.image.h } : null,
      box: box
    };
    return fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.reply) { var e = new Error('tutor'); e.status = r.status; throw e; }
        var out = j.reply;
        var reply = {
          say: str(out.say, 280),
          verdict: ['correct', 'mistake', 'working', 'unclear'].indexOf(out.verdict) >= 0 ? out.verdict : null,
          actions: cleanActions(out.actions, s, req.boardW, req.boardH),
          focus: null
        };
        if (out.focus && out.focus.w && out.focus.h) {
          reply.focus = { x: num(out.focus.x * s, 0, req.boardW, 0), y: num(out.focus.y * s, 0, req.boardH, 0), w: num(out.focus.w * s, 30, req.boardW, 120), h: num(out.focus.h * s, 24, req.boardH, 50) };
        }
        if (req.kind === 'practice') {
          var m = reply.say.match(/try this:?\s*(.+)$/i);
          if (m) reply.practice = m[1].replace(/[.\s]+$/, '');
        }
        return reply;
      });
    });
  }

  /* ---------- Demo replies ---------- */

  var MINUS = String.fromCharCode(0x2212);
  function norm(q) { return String(q || '').split(MINUS).join('-').replace(/\s+/g, ' ').trim(); }

  // ax + b = c, with whole numbers, for the worked hints.
  function linear(q) {
    var m = norm(q).match(/(-?\d*)\s*x\s*([+-])\s*(\d+)\s*=\s*(-?\d+)/);
    if (!m) return null;
    var a = m[1] === '' ? 1 : m[1] === '-' ? -1 : +m[1];
    return { a: a, op: m[2], b: +m[3], c: +m[4] };
  }
  function sides(q) {
    var eq = norm(q).split('\n').filter(function (l) { return l.indexOf('=') > 0; })[0];
    if (!eq) return null;
    var p = eq.split('=');
    return { left: p[0].replace(/^.*?:\s*/, '').trim().slice(0, 16), right: p.slice(1).join('=').trim().slice(0, 16) };
  }
  function pretty(s) { return String(s).replace(/(\S)\s*-\s*(\S)/g, '$1 ' + MINUS + ' $2'); }

  function practiceQ() {
    var a = 2 + Math.floor(Math.random() * 7), x = 1 + Math.floor(Math.random() * 11), b = 1 + Math.floor(Math.random() * 14);
    var plus = Math.random() < 0.5;
    return a + 'x ' + (plus ? '+' : MINUS) + ' ' + b + ' = ' + (plus ? a * x + b : a * x - b);
  }

  function demoAsk(req) {
    var q = req.question || '', lin = linear(q), sd = sides(q);
    var kind = req.kind;
    if (kind === 'chat') {
      var t = (req.text || '').toLowerCase();
      if (/help|stuck|don.?t (get|know)|confus/.test(t)) kind = 'help';
      else if (/check|right|correct/.test(t)) kind = 'check';
      else if (/practi|another|new (one|question)/.test(t)) kind = 'practice';
      else if (/show/.test(t)) kind = 'showme';
      else return { say: 'Demo replies are on, so I can only give general hints for now. Try I need help, or Practice.', actions: [] };
    }
    if (kind === 'watch') return null;
    var H = req.hints || [];
    if (kind === 'step-check') return { say: 'In demo replies I cannot read handwriting, so I cannot check this line yet. Compare it with the line above: was the same thing done to both sides?', actions: [] };
    if (kind === 'step-why') return { say: H[0] || 'Each step should do the same thing to both sides, so the two sides stay equal. What was done here?', actions: [] };
    if (kind === 'step-hint') return { say: H[1] || 'Look at what changed from the line above. Only one small thing should change at a time.', actions: [] };
    if (kind === 'unsure') return { say: 'Good call marking that. ' + (H[0] || 'What did you do to get from the line above to this one?'), actions: [] };
    if (kind === 'circle') return { say: 'Let us look at the part you circled. ' + (H[0] || 'What is it asking you to do?'), actions: [] };
    if (kind === 'practice') {
      var p = practiceQ();
      return { say: 'Try this one: ' + p, practice: p, actions: [] };
    }
    if (kind === 'fixed') {
      return { say: 'Good. In demo replies I cannot read handwriting, so compare with your sheet. With the live tutor on, I confirm it here.', actions: [] };
    }
    if (kind === 'check') {
      return { say: 'In demo replies I cannot read handwriting yet, so I cannot check this. When the live tutor is on, I mark each step.', actions: [] };
    }
    if (kind === 'help') {
      if (lin) return { say: 'What is being done to x here? Undo the ' + (lin.op === '+' ? 'adding' : 'taking away') + ' first, the same on both sides.', actions: sd ? [{ type: 'diagram', kind: 'balance', left: pretty(sd.left), right: pretty(sd.right), caption: 'both sides stay equal' }] : [] };
      if (req.hints) return { say: req.hints[0], actions: sd ? [{ type: 'diagram', kind: 'balance', left: pretty(sd.left), right: pretty(sd.right), caption: 'keep it balanced' }] : [] };
      if (sd) return { say: 'Think of the two sides as a balance. Whatever you do to one side, do to the other.', actions: [{ type: 'diagram', kind: 'balance', left: pretty(sd.left), right: pretty(sd.right), caption: 'keep it balanced' }] };
      return { say: 'Start by writing down what you know and what you need to find. Which step feels hardest?', actions: [] };
    }
    if (kind === 'stuck') {
      if (lin) return { say: (lin.op === '+' ? 'Take away ' : 'Add ') + lin.b + ' on both sides. What is left on the x side?', actions: [{ type: 'note', text: (lin.op === '+' ? MINUS : '+') + ' ' + lin.b + ' on both sides' }] };
      if (req.hints) return { say: req.hints[1], actions: [] };
      return { say: 'Try just the first small step, and write it on its own line.', actions: [] };
    }
    if (kind === 'showme') {
      if (lin) {
        var rhs = lin.op === '+' ? lin.c - lin.b : lin.c + lin.b;
        if (lin.a > 1 && lin.a <= 8 && rhs > 0 && rhs <= 48 && rhs % lin.a === 0) {
          return { say: 'After that step you have ' + lin.a + 'x = ' + rhs + '. Share ' + rhs + ' into ' + lin.a + ' equal groups. How many in each?', actions: [{ type: 'diagram', kind: 'dots', total: rhs, groups: lin.a, caption: rhs + ' shared into ' + lin.a + ' groups' }] };
        }
        return { say: 'Here are both sides as a balance. Do the same thing to each pan.', actions: [{ type: 'diagram', kind: 'balance', left: pretty(sd.left), right: pretty(sd.right), caption: 'same on both sides' }] };
      }
      if (req.hints) return { say: req.hints[2], actions: [] };
      return { say: 'Draw a quick picture of the problem. What do the numbers stand for?', actions: [] };
    }
    return { say: 'Keep going. I am here if you need me.', actions: [] };
  }

  function ask(req) {
    return init().then(function () {
      if (!live) return demoAsk(req);
      return liveAsk(req).catch(function () {
        var r = demoAsk(req);
        if (r) r.offline = true;
        return r;
      });
    });
  }

  /* ---------- Voice ---------- */

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null;

  function listen(onInterim) {
    if (!SR) return Promise.reject(Object.assign(new Error('unsupported'), { code: 'unsupported' }));
    stopSpeaking();
    return new Promise(function (resolve, reject) {
      rec = new SR();
      rec.lang = document.documentElement.lang === 'en' ? 'en-US' : (navigator.language || 'en-US');
      rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      var finalText = '';
      rec.onresult = function (e) {
        var interim = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        if (onInterim) onInterim((finalText + ' ' + interim).trim());
      };
      rec.onerror = function (e) { rec = null; reject(Object.assign(new Error(e.error || 'voice'), { code: e.error || 'voice' })); };
      rec.onend = function () { rec = null; resolve(finalText.trim()); };
      try { rec.start(); } catch (e) { rec = null; reject(Object.assign(new Error('voice'), { code: 'voice' })); }
    });
  }
  function stopListening() { if (rec) { try { rec.stop(); } catch (e) {} } }

  function spoken(t) {
    return String(t)
      .replace(/\^2\b/g, ' squared').replace(/\^3\b/g, ' cubed').replace(/\^/g, ' to the power ')
      .replace(/sqrt\(/g, 'square root of (')
      .split(MINUS).join(' minus ')
      .replace(/(\d)\s*-\s*(\d)/g, '$1 minus $2').replace(/\s-\s/g, ' minus ')
      .replace(/=/g, ' equals ').replace(/\//g, ' over ')
      .split(String.fromCharCode(0xf7)).join(' divided by ')
      .split(String.fromCharCode(0xd7)).join(' times ');
  }
  var canSpeak = !!window.speechSynthesis;
  function speak(text, onEnd) {
    if (!canSpeak || !text) { if (onEnd) onEnd(); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(spoken(text));
    u.rate = 1; u.pitch = 1;
    var v = window.speechSynthesis.getVoices().filter(function (x) { return /^en/i.test(x.lang); });
    if (v.length) u.voice = v.filter(function (x) { return /natural|google|samantha|aria|jenny/i.test(x.name); })[0] || v[0];
    u.onend = u.onerror = function () { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(u);
  }
  function stopSpeaking() { if (canSpeak) window.speechSynthesis.cancel(); }

  window.BoardTutor = {
    init: init,
    ask: ask,
    isLive: function () { return live; },
    practiceQ: practiceQ,
    voice: { canListen: !!SR, canSpeak: canSpeak, listen: listen, stopListening: stopListening, speak: speak, stopSpeaking: stopSpeaking },
    _test: { demoAsk: demoAsk, cleanActions: cleanActions, linear: linear, spoken: spoken }
  };
})();
