// Regression checks for splitting homework into questions (learn-assets/reader.js).
// Run from claude-deployment/: node tests/reader.test.js
'use strict';
const path = require('path');
const assert = require('assert');

global.window = {};
require(path.join(__dirname, '..', 'learn-assets', 'reader.js'));
const R = global.window.MarkovReader;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n   ', e.message); }
}
// a positioned PDF line, as the PDF reader produces it (points from the page top)
function L(page, x, top, s, h) { return { s: s, page: page, x: x, top: top, bottom: top + (h || 11) * 1.15, right: x + s.length * 5, h: h || 11 }; }

test('3(x + 4) - 2x stays one expression', () => {
  const seg = R.fromText(['1. Solve for x: 2x + 5 = 13.', '2. Expand and simplify: 3(x + 4) - 2x.', '3. Solve -2x + 5 > 13.'].join('\n'));
  assert.deepStrictEqual(seg.questions, ['Solve for x: 2x + 5 = 13.', 'Expand and simplify: 3(x + 4) - 2x.', 'Solve -2x + 5 > 13.']);
  assert.deepStrictEqual(seg.numbers, [1, 2, 3]);
});

test('a number inside brackets or after an operator never starts a question', () => {
  assert.deepStrictEqual(R._test.splitInline('Expand 3(x + 4) - 2x', 4), ['Expand 3(x + 4) - 2x']);
  assert.deepStrictEqual(R._test.splitInline('A = (0, 1) and B = (2, 5).', 5), ['A = (0, 1) and B = (2, 5).']);
  assert.deepStrictEqual(R._test.splitInline('1. 3x = 9 2. x + 4 = 7', 2), ['1. 3x = 9', '2. x + 4 = 7']);
});

test('numbering continues across PDF pages, headers excluded', () => {
  const p0 = [L(0, 48, 32, 'MARKOV.INK', 10), L(0, 48, 52, 'Algebra I', 28), L(0, 48, 88, 'Homework practice | Equations', 11),
    L(0, 48, 190, '1. Solve 2x + 5 = 13.'), L(0, 48, 300, '2. Simplify 4x + 3 + 2x - 5.')];
  const p1 = [L(1, 48, 32, 'MARKOV.INK', 10), L(1, 48, 52, 'Algebra I', 28), L(1, 48, 88, 'Homework practice | Visual questions', 11),
    L(1, 48, 140, '3. Solve -2x + 5 > 13.'), L(1, 48, 300, '4. Find the area of the square.')];
  const pages = [{ lines: p0, height: 792 }, { lines: p1, height: 792 }];
  R._test.markFurniture(pages);
  const seg = R.segment(p0.concat(p1));
  assert.deepStrictEqual(seg.numbers, [1, 2, 3, 4]);
  assert.strictEqual(seg.questions.length, 4);
  assert.ok(!seg.questions.join(' ').includes('MARKOV'), 'repeated header leaked into a question');
  assert.ok(!seg.questions.join(' ').includes('Homework practice'), 'page header variant leaked into a question');
  assert.strictEqual(seg.title, 'Algebra I');
  assert.deepStrictEqual(seg.warnings, []);
});

test('a question at the top of a later page is never treated as a header', () => {
  const p0 = [L(0, 48, 40, '1. Solve for x: 2x = 8.')], p1 = [L(1, 48, 40, '2. Solve for x: 3x = 9.')];
  R._test.markFurniture([{ lines: p0, height: 792 }, { lines: p1, height: 792 }]);
  assert.strictEqual(R.segment(p0.concat(p1)).questions.length, 2);
});

test('subparts stay with their parent question, each on its own line', () => {
  const seg = R.fromText(['5. A rectangle has length (x + 3) cm.', 'Its perimeter is 26 cm. (a) Find x. (b) Find its area.', '(c) Draw it.', '6. Solve 2x = 4.'].join('\n'));
  assert.strictEqual(seg.questions.length, 2);
  assert.strictEqual(seg.questions[0], 'A rectangle has length (x + 3) cm.\nIts perimeter is 26 cm.\n(a) Find x.\n(b) Find its area.\n(c) Draw it.');
});

test('graph and diagram labels stay out of the text but are kept for the picture', () => {
  const lines = [L(0, 48, 140, '5. The line passes through A = (0, 1) and B = (2, 5).', 12), L(0, 60, 162, '(a) Find the slope. (b) Write the equation.'),
    L(0, 122, 180, 'y', 10), L(0, 112, 190, '6', 8), L(0, 190, 220, 'B', 10), L(0, 123, 370, '0   2   4', 8),
    L(0, 48, 440, '6. A rectangle has length (x + 3) cm and width 4 cm.', 12), L(0, 143, 500, '(x + 3) cm'), L(0, 277, 550, '4 cm')];
  const seg = R.segment(lines);
  assert.strictEqual(seg.questions.length, 2);
  assert.strictEqual(seg.questions[0], 'The line passes through A = (0, 1) and B = (2, 5).\n(a) Find the slope.\n(b) Write the equation.');
  assert.strictEqual(seg.questions[1], 'A rectangle has length (x + 3) cm and width 4 cm.');
  assert.strictEqual(seg.regions[0].labels.length, 4);
  assert.strictEqual(seg.regions[1].labels.length, 2);
});

test('negative signs and inequality signs are preserved', () => {
  const seg = R.fromText('1. Solve -2x + 5 > 13.\n2. Solve x/3 - 4 <= -1.');
  assert.deepStrictEqual(seg.questions, ['Solve -2x + 5 > 13.', 'Solve x/3 - 4 <= -1.']);
});

test('a gap in the numbering is flagged for review, not hidden', () => {
  const seg = R.fromText('1. Solve 2x = 8.\n2. Solve 3x = 9.\n4. Solve x + 1 = 5.');
  assert.strictEqual(seg.questions.length, 3);
  assert.ok(seg.warnings.some((w) => /Question 4 comes right after question 2/.test(w)), JSON.stringify(seg.warnings));
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
