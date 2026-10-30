/* Markov.ink problem bank for the Algebra I pilot outline.
   - Makes fresh problems per topic from a seed, so a refresh shows the same set
     and a new attempt shows new numbers.
   - Knows each answer and can check what the student types (numbers, x = n,
     equivalent expressions, inequalities).
   - Builds the question list for any activity: topic modes, homework,
     assignments, and test plan steps. */
(function () {
  'use strict';

  var MINUS = String.fromCharCode(0x2212), SQ = String.fromCharCode(0xb2), TICK = String.fromCharCode(0x2713);
  var LE = String.fromCharCode(0x2264), GE = String.fromCharCode(0x2265);

  /* ---------- seeded numbers ---------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    var a = hash(String(seed));
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function int(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function pick(r, list) { return list[Math.floor(r() * list.length)]; }

  function n(v) { return v < 0 ? MINUS + Math.abs(v) : String(v); }
  // " + 4" or " − 4" after a term
  function sgn(v) { return v < 0 ? ' ' + MINUS + ' ' + Math.abs(v) : ' + ' + v; }
  function xt(c) { return c === 1 ? 'x' : c === -1 ? MINUS + 'x' : n(c) + 'x'; }

  /* ---------- generators: each returns { text, answer, type } ---------- */
  var GEN = {
    'alg1-evaluate': function (r) {
      var v = pick(r, ['a', 'n', 'x', 'y']), p = int(r, 2, 9), q = int(r, 1, 12), k = int(r, 2, 9), f = int(r, 0, 2);
      if (f === 0) return { text: 'Find ' + p + v + ' + ' + q + ' when ' + v + ' = ' + k, answer: p * k + q, type: 'value' };
      if (f === 1) return { text: 'Find ' + p + v + ' ' + MINUS + ' ' + q + ' when ' + v + ' = ' + k, answer: p * k - q, type: 'value' };
      return { text: 'Find ' + v + SQ + ' + ' + q + ' when ' + v + ' = ' + k, answer: k * k + q, type: 'value' };
    },
    'alg1-like-terms': function (r) {
      var a = int(r, 2, 9), c = int(r, 2, 9), b = int(r, 1, 12), d = int(r, 1, 12);
      if (r() < 0.5) return { text: 'Simplify ' + a + 'x + ' + b + ' + ' + c + 'x ' + MINUS + ' ' + d, answer: { x: a + c, k: b - d }, type: 'expr', rule: 'simple' };
      if (a === c) c = a + 1;
      return { text: 'Simplify ' + a + 'x ' + MINUS + ' ' + b + ' ' + MINUS + ' ' + c + 'x + ' + d, answer: { x: a - c, k: d - b }, type: 'expr', rule: 'simple' };
    },
    'alg1-distribute': function (r) {
      var a = int(r, 2, 9), b = int(r, 1, 9), f = int(r, 0, 2);
      if (f === 0) return { text: 'Expand ' + a + '(x + ' + b + ')', answer: { x: a, k: a * b }, type: 'expr', rule: 'expanded' };
      if (f === 1) return { text: 'Expand ' + a + '(x ' + MINUS + ' ' + b + ')', answer: { x: a, k: -a * b }, type: 'expr', rule: 'expanded' };
      return { text: 'Expand ' + MINUS + a + '(x + ' + b + ')', answer: { x: -a, k: -a * b }, type: 'expr', rule: 'expanded' };
    },
    'alg1-one-step': function (r) {
      var x = int(r, -6, 15) || 4, b = int(r, 2, 12), a = int(r, 2, 9), f = int(r, 0, 3);
      if (f === 0) return { text: 'Solve x + ' + b + ' = ' + n(x + b), answer: x, type: 'solve' };
      if (f === 1) return { text: 'Solve x ' + MINUS + ' ' + b + ' = ' + n(x - b), answer: x, type: 'solve' };
      if (f === 2) return { text: 'Solve ' + a + 'x = ' + n(a * x), answer: x, type: 'solve' };
      return { text: 'Solve x/' + a + ' = ' + n(x), answer: a * x, type: 'solve' };
    },
    'alg1-two-step': function (r) {
      var a = int(r, 2, 9), x = int(r, -4, 12) || 3, b = int(r, 1, 15);
      return r() < 0.5 ? { text: 'Solve ' + a + 'x + ' + b + ' = ' + n(a * x + b), answer: x, type: 'solve' }
        : { text: 'Solve ' + a + 'x ' + MINUS + ' ' + b + ' = ' + n(a * x - b), answer: x, type: 'solve' };
    },
    'alg1-both-sides': function (r) {
      var c = int(r, 1, 5), a = c + int(r, 1, 5), x = int(r, -5, 10) || 2, b = int(r, -9, 12) || 3, d = (a - c) * x + b;
      return { text: 'Solve ' + xt(a) + sgn(b) + ' = ' + xt(c) + sgn(d), answer: x, type: 'solve' };
    },
    'alg1-fractions': function (r) {
      var a = int(r, 2, 6), k = int(r, -3, 9) || 2, b = int(r, 1, 9);
      if (r() < 0.6) return { text: 'Solve x/' + a + ' + ' + b + ' = ' + n(k + b), answer: a * k, type: 'solve' };
      return { text: 'Solve (x + ' + b + ')/' + a + ' = ' + n(k), answer: a * k - b, type: 'solve' };
    },
    'alg1-inequalities': function (r) {
      var a = int(r, 2, 6), m = int(r, -6, 6), b = int(r, 1, 12);
      if (r() < 0.6) return { text: 'Solve ' + MINUS + a + 'x + ' + b + ' > ' + n(-a * m + b), answer: { op: '<', v: m }, type: 'ineq' };
      return { text: 'Solve ' + a + 'x ' + MINUS + ' ' + b + ' ' + LE + ' ' + n(a * m - b), answer: { op: '<=', v: m }, type: 'ineq' };
    }
  };

  /* ---------- worked examples for "Learn the idea" ---------- */
  var WORKED = {
    'alg1-evaluate': ['Swap a for 5: 3(5) + 4', 'Multiply first: 15 + 4', 'Then add: 19'],
    'alg1-like-terms': ['Group the x terms and the numbers: 4x + 2x + 3 ' + MINUS + ' 5', 'Add the x terms: 6x', 'Add the numbers: 3 ' + MINUS + ' 5 = ' + MINUS + '2', 'So 4x + 3 + 2x ' + MINUS + ' 5 = 6x ' + MINUS + ' 2'],
    'alg1-distribute': ['Multiply the 3 by x: 3x', 'Multiply the 3 by 4: 12', 'So 3(x + 4) = 3x + 12'],
    'alg1-one-step': ['x has 7 added to it', 'Take 7 from both sides: x = 12 ' + MINUS + ' 7', 'x = 5', 'Check: 5 + 7 = 12 ' + TICK],
    'alg1-two-step': ['Undo the ' + MINUS + ' 7 first: add 7 to both sides, 3x = 18', 'Undo the times 3: divide both sides by 3, x = 6', 'Check: 3(6) ' + MINUS + ' 7 = 11 ' + TICK],
    'alg1-both-sides': ['Take x from both sides: 2x + 2 = 10', 'Take 2 from both sides: 2x = 8', 'Divide both sides by 2: x = 4', 'Check: 3(4) + 2 = 14 and 4 + 10 = 14 ' + TICK],
    'alg1-fractions': ['Take 1 from both sides: x/4 = 2', 'Multiply both sides by 4: x = 8', 'Check: 8/4 + 1 = 3 ' + TICK],
    'alg1-inequalities': ['Take 5 from both sides: ' + MINUS + '2x > 4', 'Divide both sides by ' + MINUS + '2 and flip the sign: x < ' + MINUS + '2', 'Check with x = ' + MINUS + '3: 6 + 5 = 11, and 11 > 9 ' + TICK]
  };

  /* ---------- hint ladders for demo replies (no answers) ---------- */
  var HINTS = {
    'alg1-evaluate': ['Swap the letter for its number first. Write that line before working anything out.', 'Now do multiplication or powers before adding or taking away.', 'Put the number in brackets where the letter was, so 3a becomes 3(5).'],
    'alg1-like-terms': ['Which parts have an x, and which are plain numbers? Circle the x terms.', 'Add the x terms together, then the plain numbers together. Watch the minus signs.', 'Keep the sign in front of each term with it when you move it.'],
    'alg1-distribute': ['The number outside multiplies every part inside the bracket.', 'Do it one part at a time: outside times the first term, then outside times the second.', 'If the outside number is negative, it changes the sign of each part.'],
    'alg1-one-step': ['What is being done to x? Do the opposite to both sides.', 'If a number is added, take it away from both sides. If x is multiplied, divide both sides.', 'Check by putting your answer back into the first line.'],
    'alg1-two-step': ['Two things happen to x. Undo the adding or taking away first.', 'After that step you have a number times x. Divide both sides by that number.', 'Check your answer in the original equation.'],
    'alg1-both-sides': ['Get all the x terms on one side first. Take the smaller x term from both sides.', 'Now it is a two-step equation. Undo the plain number next.', 'Check both sides give the same value with your answer.'],
    'alg1-fractions': ['Get the fraction part on its own first, then clear the fraction.', 'To undo dividing by a number, multiply both sides by it.', 'Check: put your answer back in and see if both sides match.'],
    'alg1-inequalities': ['Solve it like an equation, step by step.', 'When you divide or multiply both sides by a negative number, flip the inequality sign.', 'Test a number that fits your answer in the original inequality.']
  };

  /* ---------- checking answers ---------- */
  function clean(s) {
    return String(s || '').toLowerCase().split(MINUS).join('-').split(String.fromCharCode(0x2013)).join('-')
      .split(LE).join('<=').split(GE).join('>=').split(SQ).join('^2').replace(/\s+/g, '');
  }
  function num(s) {
    var m = String(s).match(/^-?\d+(\.\d+)?(\/-?\d+)?$/);
    if (!m) return null;
    if (m[2]) { var p = s.split('/'); return +p[0] / +p[1]; }
    return +s;
  }

  // Small safe expression evaluator in x: + - * / ^, brackets, implicit multiplication.
  function compile(src) {
    var s = clean(src), i = 0;
    if (!s || s.length > 60) return null;
    function peek() { return s[i]; }
    function prim() {
      if (peek() === '(') { i++; var e = expr(); if (peek() !== ')') throw 0; i++; return e; }
      if (peek() === '-') { i++; var p = pow(); return function (x) { return -p(x); }; }
      if (peek() === 'x') { i++; return function (x) { return x; }; }
      var m = s.slice(i).match(/^\d+(\.\d+)?/); if (!m) throw 0; i += m[0].length; var v = +m[0]; return function () { return v; };
    }
    function implicit() { var a = prim(); while (peek() === 'x' || peek() === '(') { var b = prim(), l = a; a = (function (l, b) { return function (x) { return l(x) * b(x); }; })(l, b); } return a; }
    function pow() { var a = implicit(); if (peek() === '^') { i++; var b = pow(), l = a; return function (x) { return Math.pow(l(x), b(x)); }; } return a; }
    function term() { var a = pow(); while (peek() === '*' || peek() === '/') { var op = s[i++], b = pow(), l = a; a = (function (l, b, op) { return function (x) { return op === '*' ? l(x) * b(x) : l(x) / b(x); }; })(l, b, op); } return a; }
    function expr() { var a = term(); while (peek() === '+' || peek() === '-') { var op = s[i++], b = term(), l = a; a = (function (l, b, op) { return function (x) { return op === '+' ? l(x) + b(x) : l(x) - b(x); }; })(l, b, op); } return a; }
    try { var f = expr(); return i === s.length ? f : null; } catch (e) { return null; }
  }

  // Returns { ok: true|false, why } or null when the input cannot be read.
  function check(item, input) {
    if (item.type === 'spot') { var k = Number(input); return isFinite(k) ? { ok: k === item.answer } : null; }
    if (item.type === 'fill') {
      var want = fillBlanks(item), got = Array.isArray(input) ? input : [];
      if (got.length !== want.length || got.some(function (g) { return !clean(g); })) return null;
      var each = want.map(function (w, i) { var v = num(clean(got[i])); return v != null && Math.abs(v - w) < 1e-9; });
      return { ok: each.every(Boolean), each: each };
    }
    var s = clean(input);
    if (!s || item.answer == null) return null;
    if (item.type === 'value') {
      var v = num(s.replace(/^[a-z]?=/, ''));
      return v == null ? null : { ok: Math.abs(v - item.answer) < 1e-9 };
    }
    if (item.type === 'solve') {
      var m = s.match(/^(?:x=)?(-?[\d./]+)$/) || s.match(/^(-?[\d./]+)=x$/);
      var x = m ? num(m[1]) : null;
      return x == null ? null : { ok: Math.abs(x - item.answer) < 1e-9 };
    }
    if (item.type === 'expr') {
      var f = compile(s); if (!f) return null;
      var want = function (x) { return item.answer.x * x + item.answer.k; };
      var same = [-2.5, 0, 1.5, 4].every(function (x) { return Math.abs(f(x) - want(x)) < 1e-9; });
      if (!same) return { ok: false };
      if (item.rule === 'expanded' && s.indexOf('(') >= 0) return { ok: false, why: 'Same value, but the bracket is still there. Multiply it out.' };
      if (item.rule === 'simple' && (s.match(/x/g) || []).length > 1) return { ok: false, why: 'Same value, but the x terms can still be combined.' };
      return { ok: true };
    }
    if (item.type === 'ineq') {
      var q = s.match(/^x(<=|>=|<|>)(-?[\d./]+)$/), op, val;
      if (q) { op = q[1]; val = num(q[2]); }
      else {
        q = s.match(/^(-?[\d./]+)(<=|>=|<|>)x$/);
        if (!q) return null;
        val = num(q[1]); op = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[q[2]];
      }
      if (val == null) return null;
      return { ok: op === item.answer.op && Math.abs(val - item.answer.v) < 1e-9 };
    }
    return null;
  }

  function answerText(item) {
    if (item.answer == null) return '';
    if (item.type === 'spot') return 'Line ' + (item.answer + 1) + ' is wrong';
    if (item.type === 'fill') return fillBlanks(item).map(n).join(', ');
    if (item.type === 'value') return n(item.answer);
    if (item.type === 'solve') return 'x = ' + n(item.answer);
    if (item.type === 'expr') { var a = item.answer; return (a.x ? xt(a.x) : '') + (a.k ? (a.x ? sgn(a.k) : n(a.k)) : (a.x ? '' : '0')); }
    if (item.type === 'ineq') return 'x ' + ({ '<': '<', '>': '>', '<=': LE, '>=': GE })[item.answer.op] + ' ' + n(item.answer.v);
    return '';
  }
  function placeholder(item) {
    return { value: 'Your answer', solve: 'x = ?', expr: 'Like 6x ' + MINUS + ' 2', ineq: 'x < ?' }[item.type] || 'Your answer';
  }

  /* ---------- spot the mistake: a worked solution with one wrong line ---------- */
  // Each returns { type: 'spot', text, lines, answer: index of the wrong line, explain }.
  function frac(a, b) { return b === 1 ? n(a) : (a % b === 0 ? n(a / b) : n(a) + '/' + b); }
  var SPOT = {
    'alg1-evaluate': function (r) {
      var p = int(r, 2, 9), k = int(r, 2, 9), q = int(r, 1, 9);
      return { lines: ['Find ' + p + 'a + ' + q + ' when a = 5'.replace('5', String(k)), p + 'a + ' + q + ' = ' + p + String(k) + ' + ' + q, '= ' + (p * 10 + k + q)], answer: 1,
        explain: p + 'a means ' + p + ' times a, so it becomes ' + p + '(' + k + ') = ' + p * k + ', not the number ' + p + String(k) + '.' };
    },
    'alg1-like-terms': function (r) {
      var a = int(r, 2, 8), c = int(r, 2, 8), b = int(r, 2, 9), d = int(r, 2, 9);
      return { lines: ['Simplify ' + a + 'x + ' + b + ' + ' + c + 'x ' + MINUS + ' ' + d, '= ' + a + 'x + ' + c + 'x + ' + b + ' ' + MINUS + ' ' + d, '= ' + (a + c) + 'x + ' + (b + d)], answer: 2,
        explain: 'The ' + d + ' is taken away, so the numbers give ' + b + ' ' + MINUS + ' ' + d + ' = ' + n(b - d) + ', not ' + (b + d) + '.' };
    },
    'alg1-distribute': function (r) {
      var a = int(r, 2, 9), b = int(r, 2, 9), k = a * b + int(r, 1, 9);
      return { lines: [a + '(x + ' + b + ') = ' + k, a + 'x + ' + b + ' = ' + k, a + 'x = ' + (k - b)], answer: 1,
        explain: 'The ' + a + ' multiplies both parts of the bracket: ' + a + 'x + ' + a * b + ', not ' + a + 'x + ' + b + '.' };
    },
    'alg1-one-step': function (r) {
      var x = int(r, 2, 15), b = int(r, 2, 12);
      return { lines: ['x + ' + b + ' = ' + (x + b), 'x = ' + (x + b) + ' + ' + b, 'x = ' + (x + 2 * b)], answer: 1,
        explain: 'To undo + ' + b + ', take ' + b + ' away from both sides: x = ' + (x + b) + ' ' + MINUS + ' ' + b + '.' };
    },
    'alg1-two-step': function (r) {
      var a = int(r, 2, 9), x = int(r, 1, 10), b = int(r, 2, 12), c = a * x + b;
      return { lines: [a + 'x + ' + b + ' = ' + c, a + 'x = ' + (c + b), 'x = ' + frac(c + b, a)], answer: 1,
        explain: 'To undo + ' + b + ', take ' + b + ' from both sides: ' + a + 'x = ' + c + ' ' + MINUS + ' ' + b + ' = ' + (c - b) + '.' };
    },
    'alg1-both-sides': function (r) {
      var c = int(r, 1, 4), a = c + int(r, 1, 5), x = int(r, 1, 8), b = int(r, 1, 9), d = (a - c) * x + b;
      return { lines: [a + 'x + ' + b + ' = ' + (c === 1 ? '' : c) + 'x + ' + d, (a + c) + 'x + ' + b + ' = ' + d, (a + c) + 'x = ' + (d - b)], answer: 1,
        explain: 'Taking ' + (c === 1 ? '' : c) + 'x from both sides leaves ' + (a - c) + 'x, not ' + (a + c) + 'x.' };
    },
    'alg1-fractions': function (r) {
      var a = int(r, 2, 6), k = int(r, 1, 8), b = int(r, 1, 9);
      return { lines: ['x/' + a + ' + ' + b + ' = ' + (k + b), 'x/' + a + ' = ' + k, 'x = ' + frac(k, a)], answer: 2,
        explain: 'x is divided by ' + a + ', so multiply both sides by ' + a + ': x = ' + a * k + '.' };
    },
    'alg1-inequalities': function (r) {
      var a = int(r, 2, 6), m = int(r, -5, 5), b = int(r, 1, 9), c = -a * m + b;
      return { lines: [MINUS + a + 'x + ' + b + ' > ' + n(c), MINUS + a + 'x > ' + n(c - b), 'x > ' + n(m)], answer: 2,
        explain: 'Dividing by ' + MINUS + a + ' flips the sign: x < ' + n(m) + '.' };
    }
  };

  /* ---------- fill in the blank: the steps are written, a few numbers are missing ---------- */
  // Each returns { type: 'fill', text, steps: [[text or { blank: value }]...] }.
  function B(v) { return { blank: v }; }
  var FILL = {
    'alg1-evaluate': function (r) { var p = int(r, 2, 9), k = int(r, 2, 9), q = int(r, 1, 9);
      return { text: 'Find ' + p + 'a + ' + q + ' when a = ' + k, steps: [[p + '(', B(k), ') + ' + q], ['= ', B(p * k), ' + ' + q], ['= ', B(p * k + q)]] }; },
    'alg1-like-terms': function (r) { var a = int(r, 2, 8), c = int(r, 2, 8), b = int(r, 5, 12), d = int(r, 1, 4);
      return { text: 'Simplify ' + a + 'x + ' + b + ' + ' + c + 'x ' + MINUS + ' ' + d, steps: [['x terms: ' + a + 'x + ' + c + 'x = ', B(a + c), 'x'], ['numbers: ' + b + ' ' + MINUS + ' ' + d + ' = ', B(b - d)]] }; },
    'alg1-distribute': function (r) { var a = int(r, 2, 9), b = int(r, 1, 9);
      return { text: 'Expand ' + a + '(x + ' + b + ')', steps: [[a + ' times x = ', B(a), 'x'], [a + ' times ' + b + ' = ', B(a * b)], ['so ' + a + '(x + ' + b + ') = ' + a + 'x + ', B(a * b)]] }; },
    'alg1-one-step': function (r) { var x = int(r, 2, 15), b = int(r, 2, 12);
      return { text: 'Solve x + ' + b + ' = ' + (x + b), steps: [['take ' + b + ' from both sides: x = ' + (x + b) + ' ' + MINUS + ' ' + b], ['x = ', B(x)]] }; },
    'alg1-two-step': function (r) { var a = int(r, 2, 9), x = int(r, 1, 10), b = int(r, 2, 12), c = a * x + b;
      return { text: 'Solve ' + a + 'x + ' + b + ' = ' + c, steps: [['take ' + b + ' from both sides: ' + a + 'x = ', B(c - b)], ['divide both sides by ' + a + ': x = ', B(x)]] }; },
    'alg1-both-sides': function (r) { var c = int(r, 1, 4), a = c + int(r, 1, 5), x = int(r, 1, 8), b = int(r, 1, 9), d = (a - c) * x + b;
      return { text: 'Solve ' + a + 'x + ' + b + ' = ' + (c === 1 ? '' : c) + 'x + ' + d, steps: [['take ' + (c === 1 ? '' : c) + 'x from both sides: ', B(a - c), 'x + ' + b + ' = ' + d], ['take ' + b + ' from both sides: ' + (a - c) + 'x = ', B(d - b)], ['x = ', B(x)]] }; },
    'alg1-fractions': function (r) { var a = int(r, 2, 6), k = int(r, 1, 8), b = int(r, 1, 9);
      return { text: 'Solve x/' + a + ' + ' + b + ' = ' + (k + b), steps: [['take ' + b + ' from both sides: x/' + a + ' = ', B(k)], ['multiply both sides by ' + a + ': x = ', B(a * k)]] }; },
    'alg1-inequalities': function (r) { var a = int(r, 2, 6), m = int(r, -5, 5), b = int(r, 1, 9), c = -a * m + b;
      return { text: 'Solve ' + MINUS + a + 'x + ' + b + ' > ' + n(c), steps: [['take ' + b + ' from both sides: ' + MINUS + a + 'x > ', B(c - b)], ['divide by ' + MINUS + a + ' and flip the sign: x < ', B(m)]] }; }
  };

  function makeSpot(topicId, r) {
    var g = SPOT[topicId]; if (!g) return null;
    var s = g(r);
    return { type: 'spot', topicId: topicId, text: 'Spot the mistake: one line below is wrong. Tap it.', lines: s.lines, answer: s.answer, explain: s.explain };
  }
  function makeFill(topicId, r) {
    var g = FILL[topicId]; if (!g) return null;
    var s = g(r);
    return { type: 'fill', topicId: topicId, text: s.text, steps: s.steps, answer: 'fill' };
  }
  function fillBlanks(item) { var out = []; item.steps.forEach(function (st) { st.forEach(function (p) { if (p && typeof p === 'object') out.push(p.blank); }); }); return out; }

  /* ---------- building an activity's questions ---------- */
  function make(topicId, r, count, used) {
    var g = GEN[topicId], out = [];
    if (!g) return out;
    for (var tries = 0; out.length < count && tries < count * 10; tries++) {
      var p = g(r);
      if (used[p.text]) continue;
      used[p.text] = true; p.topicId = topicId; out.push(p);
    }
    return out;
  }
  function shuffle(r, list) { for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t; } return list; }

  // ctx: { courseId, activity, attemptId, topicExample(id), topicTitle(id), plan, homework, assignment }
  function sessionFor(ctx) {
    var a = ctx.activity, r = rng(ctx.courseId + '|' + a.id + '|' + ctx.attemptId), used = {};
    var s = { kind: a.kind === 'independent' ? 'independent' : 'guided', topicId: a.topicId || null, items: [], noHints: a.kind === 'independent', mode: a.mode || a.type };
    function fallback(tid) { return { text: (ctx.topicExample && ctx.topicExample(tid)) || 'Write a problem from ' + ((ctx.topicTitle && ctx.topicTitle(tid)) || 'this topic') + ' and solve it.', topicId: tid }; }
    if (a.type === 'topic') {
      var tid = a.topicId;
      if (a.mode === 'learn') {
        if (WORKED[tid]) s.items.push({ example: true, text: (ctx.topicExample && ctx.topicExample(tid)) || '', steps: WORKED[tid], topicId: tid });
        var fl = makeFill(tid, r); if (fl) s.items.push(fl);
        s.items = s.items.concat(make(tid, r, 1, used));
      } else if (a.mode === 'practice') {
        s.items = make(tid, r, 3, used);
        var sp = makeSpot(tid, r); if (sp) s.items.splice(2, 0, sp);
      } else s.items = make(tid, r, 3, used);
      if (!s.items.length) s.items.push(fallback(tid));
    } else if (a.type === 'homework' && ctx.homework) {
      s.items = ctx.homework.questions.map(function (q) {
        return { id: q.id, text: q.text, topicId: q.topicId || null, visualExpected: (ctx.homework.visualIds || []).indexOf(q.id) >= 0 };
      });
    } else if (a.type === 'assignment' && ctx.assignment) {
      s.items = ctx.assignment.questions.map(function (q) { return { text: q }; });
    } else if (a.type === 'test-step' && ctx.plan) {
      var topics = ctx.plan.topicIds || [], step = a.id.slice(ctx.plan.id.length + 1);
      if (step.indexOf('review:') === 0) s.items = make(step.slice(7), r, 3, used);
      else if (step === 'mixed') { topics.forEach(function (t) { s.items = s.items.concat(make(t, r, 2, used)); }); shuffle(r, s.items); s.items = s.items.slice(0, 7); var ms = topics.length ? makeSpot(topics[Math.floor(r() * topics.length)], r) : null; if (ms) s.items.splice(3, 0, ms); }
      else topics.forEach(function (t) { s.items = s.items.concat(make(t, r, topics.length < 3 ? 2 : 1, used)); }), s.items = s.items.slice(0, 6);
      if (step.indexOf('review:') !== 0) (ctx.plan.freeTopics || []).slice(0, 2).forEach(function (f) { s.items.push({ text: 'Write and solve one problem from: ' + f }); });
      if (!s.items.length) s.items.push({ text: 'Write a problem from this test and solve it.' });
    }
    return s;
  }

  window.MarkovProblems = {
    sessionFor: sessionFor, check: check, answerText: answerText, placeholder: placeholder,
    hintsFor: function (topicId) { return HINTS[topicId] || null; },
    fillBlanks: fillBlanks, spots: SPOT, fills: FILL,
    compile: compile, generators: GEN, worked: WORKED
  };
})();
