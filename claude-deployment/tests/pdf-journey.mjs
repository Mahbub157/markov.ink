// Browser check of the homework PDF journey: upload, review, save, whiteboard per question,
// rapid switching, refresh, and identical question text.
//
// Needs: a local server for claude-deployment/ with clean URLs (the preview server on port
// 4317 works), and Chrome running headless with --remote-debugging-port=9339.
// Run:   node tests/pdf-journey.mjs <path to PDF> [base URL]
import path from 'node:path';

const pdf = path.resolve(process.argv[2] || '../output/pdf/Markov_Algebra_Homework.pdf');
const B = process.argv[3] || 'http://127.0.0.1:4317';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = await (await fetch('http://127.0.0.1:9339/json/list')).json();
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data);
  if (d.method === 'Runtime.exceptionThrown') errors.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 200));
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception?.description || '').slice(0, 200)); return r.result?.result?.value; };
const go = async (url, ms = 1800) => { await send('Page.navigate', { url }); await sleep(ms); };
const draw = async (pts) => { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pts[0][0], y: pts[0][1], button: 'left', clickCount: 1 });
  for (const p of pts.slice(1)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1], button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pts.at(-1)[0], y: pts.at(-1)[1], button: 'left', clickCount: 1 }); };
const stroke = (x, y) => Array.from({ length: 14 }, (_, i) => [x + i * 8, y + Math.sin(i / 2) * 6]);

let failures = 0;
function check(name, ok, detail) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + detail : '')); if (!ok) failures++; }
const state = () => ev("JSON.stringify({ q: MarkovBoard._test.state().qi, objs: MarkovBoard._test.state().objs.length, marks: MarkovBoard._test.state().marks.length, key: MarkovBoard._test.key() })").then(JSON.parse);

await send('Runtime.enable'); await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
// a fresh student with an Algebra I course
await go(B + '/onboarding', 1500);
await ev("localStorage.clear(); 1");
const profile = { version: 1, setupComplete: true, draftStep: null, path: 'independent', name: 'Riya', stage: 'g9',
  context: { country: 'US', region: 'NY', curriculum: 'common-core', curriculumName: '', source: 'student' }, school: null,
  courses: [{ id: 'p-algebra-1', origin: 'personal', title: 'Algebra I', catalogId: 'algebra-1', custom: false, area: 'math', glyph: 'x2', teacher: '', section: '', addedAt: new Date().toISOString() }],
  goal: 'keep-up', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
await ev("localStorage.setItem('markov.learningProfile.v1', " + JSON.stringify(JSON.stringify(profile)) + "); 1");

// 1. course home, choose Homework, bring classwork
await go(B + '/course?c=p-algebra-1');
await ev("document.querySelector('[data-intent=homework]').click()"); await sleep(800);
await ev("document.querySelector('a.dropzone').click()"); await sleep(800);
await ev("document.querySelector('input[name=method][value=file]').click()"); await sleep(600);
// 2. upload the PDF
const doc = await send('DOM.getDocument', { depth: -1 });
const node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#hw-file' });
await send('DOM.setFileInputFiles', { nodeId: node.result.nodeId, files: [pdf] });
for (let i = 0; i < 120 && !(await ev("!!document.querySelector('.qcard')")); i++) await sleep(500);
// 3-5. review: six questions in order, pictures and subparts kept
const review = JSON.parse(await ev("JSON.stringify([...document.querySelectorAll('.qcard')].map(c => ({ text: c.querySelector('textarea').value, pic: !!c.querySelector('.qcard-vis img') })))"));
check('review shows exactly six questions', review.length === 6, review.length);
check('questions are in order (first starts "Solve", sixth mentions a rectangle)', /^Solve for x/.test(review[0]?.text) && /rectangle/i.test(review[5]?.text));
check('no page header text inside any question', !review.some((q) => /MARKOV|Homework practice/.test(q.text)));
check('pictures kept for questions 5 and 6 only', review.map((q) => q.pic).join() === 'false,false,false,false,true,true', review.map((q) => q.pic).join());
check('question 5 keeps (a) and (b)', /\n\(a\) .+\n\(b\) /.test(review[4]?.text || ''), JSON.stringify(review[4]?.text));
check('question 6 keeps (a) and (b)', /\n\(a\) .+\n\(b\) /.test(review[5]?.text || ''), JSON.stringify(review[5]?.text));
check('graph tick labels are not in question 5 text', !/\b0 2 4\b|\n[0-9AB]\n/.test(review[4]?.text || ''));
check('review flags nothing to check for this clean PDF', !(await ev("!!document.querySelector('.read-checks')")));
await ev("document.querySelector('#hw-form button[type=submit]').click()"); await sleep(1200);
const hwId = (await ev("location.hash")).split('/').pop();
check('homework brief shows pictures for 5 and 6', (await ev("document.querySelectorAll('.qbox .qbox-vis').length")) === 2);

// 6-7. each question in its own whiteboard space, different work on 1, 5 and 6
await ev("document.querySelector('[data-start]').click()"); await sleep(2200);
check('board opens on question 1 of 6', /Question 1 of 6/.test(await ev("document.getElementById('q-count').innerText")));
await draw(stroke(300, 330));                                       // q1: one stroke
await ev("document.querySelector('[data-act=help]').click()"); await sleep(2500);   // q1: a tutor annotation (demo replies)
await ev("document.querySelector('[data-act=leave-focus]')?.click()"); await sleep(300);
const q1 = await state();
await ev("MarkovBoard._test.goTo(4)"); await sleep(400);
check('question 5 shows its graph on the board', await ev("!!document.querySelector('.qvis img')"));
check('question 5 board starts empty', (await state()).objs === 0 && (await state()).marks === 0);
await draw(stroke(700, 520)); await draw(stroke(700, 580));          // q5: two strokes
await ev("MarkovBoard._test.goTo(5)"); await sleep(400);
check('question 6 shows its rectangle on the board', await ev("!!document.querySelector('.qvis img')"));
await draw(stroke(700, 520)); await draw(stroke(700, 580)); await draw(stroke(700, 640));   // q6: three strokes
// 8. switch rapidly, drawing right before each switch (inside the 400 ms save delay)
// (through the visible controls: the question dots in the top bar and the next arrow)
const dot = (qn) => ev(`document.querySelector('#q-dots [data-dot="${qn}"]').click()`);
for (let r = 0; r < 6; r++) {
  for (const qn of [0, 4, 5, 2]) await dot(qn);
}
await dot(2); await draw(stroke(500, 700)); await ev("document.getElementById('q-next').click()");   // q3 stroke, switch at once
await ev("MarkovBoard._test.goTo(0)");
const counts = {};
for (const qn of [0, 1, 2, 3, 4, 5]) { await ev(`MarkovBoard._test.goTo(${qn})`); await sleep(120); counts[qn + 1] = await state(); }
check('question 1 kept 1 stroke and its tutor mark', counts[1].objs === 1 && counts[1].marks === q1.marks && q1.marks > 0, JSON.stringify(counts[1]));
check('question 5 kept exactly its 2 strokes, no tutor marks', counts[5].objs === 2 && counts[5].marks === 0, JSON.stringify(counts[5]));
check('question 6 kept exactly its 3 strokes, no tutor marks', counts[6].objs === 3 && counts[6].marks === 0, JSON.stringify(counts[6]));
check('stroke drawn just before a quick switch was saved on question 3', counts[3].objs === 1, JSON.stringify(counts[3]));
check('questions 2 and 4 stayed empty', counts[2].objs === 0 && counts[4].objs === 0 && counts[2].marks === 0 && counts[4].marks === 0);
check('every question has its own board key', new Set(Object.values(counts).map((c) => c.key)).size === 6);

// a tutor reply that arrives after switching never lands on the new question
await ev("MarkovBoard._test.goTo(0)"); await sleep(200);
await ev("document.querySelector('[data-act=help]').click(); MarkovBoard._test.goTo(1); 1"); await sleep(2500);
const q2 = await state();
check('help asked on question 1 does not draw on question 2', q2.marks === 0 && q2.objs === 0, JSON.stringify(q2));

// 10. refresh and reopen
await go(B + '/course?c=p-algebra-1#/homework/h/' + hwId);
check('after refresh the brief still has 6 questions and both pictures', (await ev("document.querySelectorAll('.qbox').length")) === 6 && (await ev("document.querySelectorAll('.qbox-vis').length")) === 2);
await ev("document.querySelectorAll('.tag-board')[4].click()"); await sleep(2200);
const r5 = await state();
check('reopened question 5: picture and 2 strokes', (await ev("!!document.querySelector('.qvis img')")) && r5.objs === 2, JSON.stringify(r5));
await ev("MarkovBoard._test.goTo(5)"); await sleep(300); const r6 = await state();
await ev("MarkovBoard._test.goTo(0)"); await sleep(300); const r1 = await state();
check('reopened question 6: 3 strokes', r6.objs === 3, JSON.stringify(r6));
check('reopened question 1: 1 stroke and its tutor mark', r1.objs === 1 && r1.marks === q1.marks, JSON.stringify(r1));
check('question 1 text reads back unchanged', /Solve for x: 2x \+ 5 = 13/.test(await ev("document.querySelector('.qtext').innerText.replace(/\\u2212/g,'-')")));

// identical question text gets separate whiteboards
await go(B + '/course?c=p-algebra-1#/homework/new');
await ev("(()=>{ const t=document.getElementById('hw-title'); t.value='Same twice'; t.dispatchEvent(new Event('input')); const a=document.getElementById('hw-text'); a.value='1. Solve 2x = 8\\n2. Solve 2x = 8'; a.dispatchEvent(new Event('input')); document.getElementById('btn-find').click(); return 1 })()"); await sleep(300);
await ev("document.querySelector('#hw-form button[type=submit]').click()"); await sleep(1200);
await ev("document.querySelector('[data-start]').click()"); await sleep(2200);
await draw(stroke(300, 330));
await ev("MarkovBoard._test.goTo(1)"); await sleep(300);
const twin = await state();
check('identical question text: question 2 has its own empty board', twin.objs === 0, JSON.stringify(twin));
await ev("MarkovBoard._test.goTo(0)"); await sleep(300);
check('identical question text: question 1 still has its stroke', (await state()).objs === 1);

check('no script errors', errors.length === 0, errors.join(' | '));
console.log('\n' + (failures ? failures + ' check(s) failed' : 'all checks passed'));
ws.close();
process.exit(failures ? 1 : 0);
