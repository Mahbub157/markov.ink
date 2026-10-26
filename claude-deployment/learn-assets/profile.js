/* Markov.ink learning profile.
   Holds onboarding answers and course choices for /onboarding and /learn.
   Prototype storage: saved in this browser only. It is not an account, not
   secure, not synced, and not proof of school enrollment.
   The whiteboard's own keys (ciq_mistakes, ciq_reviews, ciq_sessions) are never read or written here. */
(function () {
  'use strict';

  var KEY = 'markov.learningProfile.v1';
  var VERSION = 1;

  /* ---------- Storage ---------- */

  function localStore() {
    try {
      var probe = '__markov_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
    } catch (e) { return null; }
    return {
      kind: 'local',
      get: function () { return window.localStorage.getItem(KEY); },
      set: function (v) { window.localStorage.setItem(KEY, v); },
      remove: function () { window.localStorage.removeItem(KEY); },
      backup: function (v) { try { window.localStorage.setItem(KEY + '.unreadable', v); } catch (e) {} }
    };
  }

  // Fallback when the browser blocks storage: window.name survives page loads
  // in the same tab and never leaves the browser. Lost when the tab closes.
  function tabStore() {
    function read() {
      try { var o = JSON.parse(window.name || '{}'); return o && typeof o === 'object' ? o : {}; }
      catch (e) { return {}; }
    }
    return {
      kind: 'tab',
      get: function () { var o = read(); return typeof o[KEY] === 'string' ? o[KEY] : null; },
      set: function (v) { var o = read(); o[KEY] = v; window.name = JSON.stringify(o); },
      remove: function () { var o = read(); delete o[KEY]; window.name = JSON.stringify(o); },
      backup: function () {}
    };
  }

  var store = localStore() || tabStore();

  /* ---------- Reference data ---------- */

  var STAGES = [
    { id: 'k', label: 'Kindergarten', short: 'K', group: 'Elementary', band: 'k2' },
    { id: 'g1', label: 'Grade 1', short: '1', group: 'Elementary', band: 'k2' },
    { id: 'g2', label: 'Grade 2', short: '2', group: 'Elementary', band: 'k2' },
    { id: 'g3', label: 'Grade 3', short: '3', group: 'Elementary', band: 'g35' },
    { id: 'g4', label: 'Grade 4', short: '4', group: 'Elementary', band: 'g35' },
    { id: 'g5', label: 'Grade 5', short: '5', group: 'Elementary', band: 'g35' },
    { id: 'g6', label: 'Grade 6', short: '6', group: 'Middle school', band: 'g68' },
    { id: 'g7', label: 'Grade 7', short: '7', group: 'Middle school', band: 'g68' },
    { id: 'g8', label: 'Grade 8', short: '8', group: 'Middle school', band: 'g68' },
    { id: 'g9', label: 'Grade 9', short: '9', group: 'High school', band: 'g912' },
    { id: 'g10', label: 'Grade 10', short: '10', group: 'High school', band: 'g912' },
    { id: 'g11', label: 'Grade 11', short: '11', group: 'High school', band: 'g912' },
    { id: 'g12', label: 'Grade 12', short: '12', group: 'High school', band: 'g912' },
    { id: 'college', label: 'College or university', short: 'College', group: 'Beyond school', band: 'college' },
    { id: 'adult', label: 'Adult learner', short: 'Adult learner', group: 'Beyond school', band: 'college' },
    { id: 'other', label: 'Something else', short: 'Something else', group: 'Beyond school', band: null }
  ];

  var AREAS = {
    math: { label: 'Math' },
    science: { label: 'Science' },
    language: { label: 'Reading and writing' },
    custom: { label: 'Your own' }
  };

  // glyph names map to drawings in ui.js
  var COURSES = [
    { id: 'number-sense', title: 'Number sense', area: 'math', glyph: 'numbers', bands: ['k2'] },
    { id: 'arithmetic', title: 'Arithmetic and fractions', area: 'math', glyph: 'fraction', bands: ['g35'] },
    { id: 'pre-algebra', title: 'Pre-algebra', area: 'math', glyph: 'fraction', bands: ['g68'] },
    { id: 'algebra-1', title: 'Algebra I', area: 'math', glyph: 'x2', bands: ['g68', 'g912'] },
    { id: 'geometry', title: 'Geometry', area: 'math', glyph: 'triangle', bands: ['g912'] },
    { id: 'algebra-2', title: 'Algebra II', area: 'math', glyph: 'x2', bands: ['g912'] },
    { id: 'precalculus', title: 'Precalculus', area: 'math', glyph: 'wave', bands: ['g912'] },
    { id: 'statistics', title: 'Statistics', area: 'math', glyph: 'bars', bands: ['g912', 'college'] },
    { id: 'calculus', title: 'Calculus', area: 'math', glyph: 'curve', bands: ['g912', 'college'] },
    { id: 'linear-algebra', title: 'Linear algebra', area: 'math', glyph: 'matrix', bands: ['college'] },
    { id: 'early-science', title: 'Science explorations', area: 'science', glyph: 'leaf', bands: ['k2', 'g35'] },
    { id: 'earth-science', title: 'Earth science', area: 'science', glyph: 'globe', bands: ['g68'] },
    { id: 'life-science', title: 'Life science', area: 'science', glyph: 'leaf', bands: ['g68'] },
    { id: 'physical-science', title: 'Physical science', area: 'science', glyph: 'atom', bands: ['g68'] },
    { id: 'biology', title: 'Biology', area: 'science', glyph: 'leaf', bands: ['g912', 'college'] },
    { id: 'chemistry', title: 'Chemistry', area: 'science', glyph: 'flask', bands: ['g912', 'college'] },
    { id: 'physics', title: 'Physics', area: 'science', glyph: 'atom', bands: ['g912', 'college'] },
    { id: 'reading-writing', title: 'Reading and writing', area: 'language', glyph: 'book', bands: ['k2', 'g35'] },
    { id: 'ela', title: 'English language arts', area: 'language', glyph: 'book', bands: ['g68', 'g912'] },
    { id: 'essay-writing', title: 'Essay writing', area: 'language', glyph: 'nib', bands: ['g912', 'college'] },
    { id: 'research-writing', title: 'Research writing', area: 'language', glyph: 'quote', bands: ['college'] }
  ];

  var GOALS = [
    { id: 'keep-up', title: 'Keep up with class', line: 'Stay on top of what your class is covering right now.' },
    { id: 'understand', title: 'Understand difficult topics', line: 'Slow down on the ideas that keep tripping you up.' },
    { id: 'test-prep', title: 'Prepare for a test', line: 'Get ready for a quiz, an exam, or a standardized test.' },
    { id: 'explore', title: 'Explore ahead', line: 'Go past what your class covers, at your own pace.' }
  ];

  var COUNTRIES = [
    { id: 'US', label: 'United States' },
    { id: 'CA', label: 'Canada' },
    { id: 'GB', label: 'United Kingdom' },
    { id: 'IN', label: 'India' },
    { id: 'BD', label: 'Bangladesh' },
    { id: 'AU', label: 'Australia' },
    { id: 'other', label: 'Somewhere else' },
    { id: 'unsure', label: 'I’m not sure' }
  ];

  var US_STATES = [
    ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
    ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
    ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
    ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
    ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
    ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
    ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
    ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
    ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
    ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
    ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']
  ];

  var CURRICULA = {
    us: [
      { id: 'common-core', label: 'Common Core State Standards' },
      { id: 'state', label: 'My state’s own standards' },
      { id: 'ap-ib', label: 'AP or IB courses' },
      { id: 'unsure', label: 'I’m not sure' }
    ],
    intl: [
      { id: 'national', label: 'My country’s national curriculum' },
      { id: 'ib', label: 'International Baccalaureate (IB)' },
      { id: 'cambridge', label: 'Cambridge (IGCSE or A Level)' },
      { id: 'unsure', label: 'I’m not sure' }
    ],
    higher: [
      { id: 'syllabus', label: 'My college or program syllabus' },
      { id: 'self', label: 'Self-directed, no set curriculum' },
      { id: 'unsure', label: 'I’m not sure' }
    ]
  };

  // Fictional invitations for demonstrating the school route. No real school,
  // teacher, or class is behind these. Accepting one enrolls no one.
  var DEMO_INVITES = {
    'DEMO-ALG1': {
      code: 'DEMO-ALG1',
      demo: true,
      school: { name: 'Northfield Demo High School', country: 'US', region: 'OH', curriculum: 'state', curriculumName: 'Ohio Learning Standards' },
      teacher: 'Ms. Alvarez',
      course: { id: 's-northfield-alg1-p3', catalogId: 'algebra-1', title: 'Algebra I', section: 'Period 3', area: 'math', glyph: 'x2' },
      student: { name: 'Sam', stage: 'g9' }
    }
  };

  /* ---------- Lookups ---------- */

  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function stage(id) { return byId(STAGES, id); }
  function course(id) { return byId(COURSES, id); }
  function goal(id) { return byId(GOALS, id); }
  function country(id) { return byId(COUNTRIES, id); }
  function stateName(code) { for (var i = 0; i < US_STATES.length; i++) if (US_STATES[i][0] === code) return US_STATES[i][1]; return ''; }

  function curriculumSet(p) {
    var st = stage(p.stage);
    if (st && st.band === 'college') return 'higher';
    return p.context.country === 'US' ? 'us' : 'intl';
  }
  function curriculumOptions(p) { return CURRICULA[curriculumSet(p)]; }

  function curriculumLabel(p) {
    var c = p.context || {};
    if (c.curriculumName) return c.curriculumName;
    var all = CURRICULA.us.concat(CURRICULA.intl, CURRICULA.higher);
    var opt = byId(all, c.curriculum);
    if (!opt) return '';
    return opt.id === 'unsure' ? 'Curriculum not sure yet' : opt.label.replace('My ', 'Your ');
  }

  function placeLabel(p) {
    var c = p.context || {};
    if (!c.country || c.country === 'unsure') return 'Place not set';
    var parts = [];
    if (c.country === 'US' && c.region) parts.push(stateName(c.region));
    else if (c.region) parts.push(c.region);
    var co = country(c.country);
    if (co && c.country !== 'other') parts.push(co.label);
    return parts.join(', ') || 'Outside the listed countries';
  }

  function findInvite(code) {
    var k = String(code || '').trim().toUpperCase();
    return DEMO_INVITES[k] ? JSON.parse(JSON.stringify(DEMO_INVITES[k])) : null;
  }

  /* ---------- Profile shape ---------- */

  function blank(path) {
    var now = new Date().toISOString();
    return {
      version: VERSION,
      setupComplete: false,
      draftStep: null,
      path: path === 'school' || path === 'independent' ? path : null,
      name: '',
      stage: null,
      context: { country: null, region: '', curriculum: null, curriculumName: '', source: 'student' },
      school: null,
      courses: [],
      goal: null,
      createdAt: now,
      updatedAt: now
    };
  }

  function str(v, max) { return typeof v === 'string' ? v.trim().slice(0, max || 80) : ''; }

  // Accepts anything, returns a valid profile or null. Never throws.
  function sanitize(raw) {
    if (!raw || typeof raw !== 'object' || raw.version !== VERSION) return null;
    var p = blank(raw.path);
    p.setupComplete = raw.setupComplete === true;
    p.draftStep = str(raw.draftStep, 20) || null;
    p.name = str(raw.name, 40);
    p.stage = stage(raw.stage) ? raw.stage : null;
    var c = raw.context || {};
    p.context.country = country(c.country) ? c.country : null;
    p.context.region = str(c.region, 60);
    p.context.curriculum = str(c.curriculum, 30) || null;
    p.context.curriculumName = str(c.curriculumName, 80);
    p.context.source = c.source === 'school' ? 'school' : 'student';
    if (raw.school && typeof raw.school === 'object' && str(raw.school.name)) {
      p.school = {
        code: str(raw.school.code, 30), name: str(raw.school.name), teacher: str(raw.school.teacher),
        demo: raw.school.demo !== false, joinedAt: str(raw.school.joinedAt, 40)
      };
    }
    var seen = {};
    (Array.isArray(raw.courses) ? raw.courses : []).forEach(function (rc) {
      if (!rc || typeof rc !== 'object') return;
      var id = str(rc.id, 60), title = str(rc.title, 60);
      if (!id || !title || seen[id]) return;
      var origin = rc.origin === 'school' ? 'school' : 'personal';
      if (origin === 'school' && !p.school) return;
      seen[id] = true;
      p.courses.push({
        id: id, origin: origin, title: title,
        catalogId: course(rc.catalogId) ? rc.catalogId : null,
        custom: rc.custom === true,
        area: AREAS[rc.area] ? rc.area : 'custom',
        glyph: str(rc.glyph, 20) || 'star',
        teacher: origin === 'school' ? str(rc.teacher) : '',
        section: origin === 'school' ? str(rc.section, 40) : '',
        addedAt: str(rc.addedAt, 40)
      });
    });
    p.goal = goal(raw.goal) ? raw.goal : null;
    // a "finished" record with holes goes back to review instead of showing a broken home
    if (p.setupComplete && (!p.path || !p.name || !p.stage || !p.context.country || !p.context.curriculum || !p.courses.length || !p.goal)) {
      p.setupComplete = false;
      p.draftStep = 'review';
    }
    p.createdAt = str(raw.createdAt, 40) || p.createdAt;
    p.updatedAt = str(raw.updatedAt, 40) || p.updatedAt;
    return p;
  }

  function clone(p) { return JSON.parse(JSON.stringify(p)); }

  /* ---------- Load and save ---------- */

  // status: 'ok' | 'empty' | 'unreadable'
  function load() {
    var raw = null;
    try { raw = store.get(); } catch (e) { raw = null; }
    if (raw == null) return { profile: null, status: 'empty', storage: store.kind };
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    var p = sanitize(parsed);
    if (!p) {
      store.backup(raw);
      return { profile: null, status: 'unreadable', storage: store.kind };
    }
    return { profile: p, status: 'ok', storage: store.kind };
  }

  function save(p) {
    p.updatedAt = new Date().toISOString();
    var data = JSON.stringify(p);
    try { store.set(data); return { ok: true, storage: store.kind }; }
    catch (e) {
      // quota or a storage block that appeared after load: keep working for this tab
      if (store.kind !== 'tab') {
        store = tabStore();
        try { store.set(data); return { ok: true, storage: 'tab' }; } catch (e2) {}
      }
      return { ok: false, storage: store.kind };
    }
  }

  // Removes only this profile key. Whiteboard data is left alone.
  function clear() { try { store.remove(); } catch (e) {} }

  /* ---------- Course rules ---------- */

  function schoolCourses(p) { return p.courses.filter(function (c) { return c.origin === 'school'; }); }
  function personalCourses(p) { return p.courses.filter(function (c) { return c.origin === 'personal'; }); }
  function hasPersonalCatalog(p, catalogId) { return p.courses.some(function (c) { return c.origin === 'personal' && c.catalogId === catalogId; }); }
  function schoolHasCatalog(p, catalogId) { return p.courses.some(function (c) { return c.origin === 'school' && c.catalogId === catalogId; }); }

  function addPersonal(p, catalogId) {
    var cat = course(catalogId);
    if (!cat || hasPersonalCatalog(p, catalogId) || schoolHasCatalog(p, catalogId)) return false;
    p.courses.push({ id: 'p-' + cat.id, origin: 'personal', title: cat.title, catalogId: cat.id, custom: false, area: cat.area, glyph: cat.glyph, teacher: '', section: '', addedAt: new Date().toISOString() });
    return true;
  }

  // Returns {ok, course?, reason?}
  function addCustom(p, title) {
    var t = str(title, 60).replace(/\s+/g, ' ');
    if (t.length < 2) return { ok: false, reason: 'Give the course a name of at least two letters.' };
    var low = t.toLowerCase();
    var listed = COURSES.filter(function (c) { return c.title.toLowerCase() === low; })[0];
    if (listed) {
      if (schoolHasCatalog(p, listed.id)) return { ok: false, reason: listed.title + ' is already in your class list.' };
      if (hasPersonalCatalog(p, listed.id)) return { ok: false, reason: listed.title + ' is already selected.' };
      addPersonal(p, listed.id);
      return { ok: true, listed: true };
    }
    if (p.courses.some(function (c) { return c.title.toLowerCase() === low; })) return { ok: false, reason: 'You already have a course with that name.' };
    var id = 'c-' + low.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) + '-' + Math.random().toString(36).slice(2, 7);
    p.courses.push({ id: id, origin: 'personal', title: t, catalogId: null, custom: true, area: 'custom', glyph: 'star', teacher: '', section: '', addedAt: new Date().toISOString() });
    return { ok: true };
  }

  // Personal courses only. School courses are never removed here.
  function removePersonal(p, id) {
    var before = p.courses.length;
    p.courses = p.courses.filter(function (c) { return !(c.id === id && c.origin === 'personal'); });
    return p.courses.length !== before;
  }

  // Connects a fictional invitation. Keeps every personal course and answer.
  function applyInvite(p, inv, opts) {
    opts = opts || {};
    p.school = { code: inv.code, name: inv.school.name, teacher: inv.teacher, demo: inv.demo !== false, joinedAt: new Date().toISOString() };
    // a personal copy of the same course gives way to the class version
    p.courses = p.courses.filter(function (c) { return !(c.origin === 'personal' && c.catalogId === inv.course.catalogId); });
    if (!p.courses.some(function (c) { return c.id === inv.course.id; })) {
      p.courses.unshift({ id: inv.course.id, origin: 'school', title: inv.course.title, catalogId: inv.course.catalogId, custom: false, area: inv.course.area, glyph: inv.course.glyph, teacher: inv.teacher, section: inv.course.section, addedAt: new Date().toISOString() });
    }
    if (opts.prefill) {
      if (!p.name) p.name = inv.student.name;
      if (!p.stage) p.stage = inv.student.stage;
      if (!p.context.country || p.context.country === 'unsure') {
        p.context = { country: inv.school.country, region: inv.school.region, curriculum: inv.school.curriculum, curriculumName: inv.school.curriculumName, source: 'school' };
      }
    }
    return p;
  }

  // Removes the demo class and its course. Personal courses stay.
  function leaveSchool(p) {
    p.courses = p.courses.filter(function (c) { return c.origin !== 'school'; });
    p.school = null;
    if (p.context.source === 'school') p.context.source = 'student';
    return p;
  }

  function suggestedFor(p) {
    var st = stage(p.stage);
    if (!st || !st.band) return [];
    return COURSES.filter(function (c) { return c.bands.indexOf(st.band) !== -1; }).map(function (c) { return c.id; });
  }

  window.MarkovProfile = {
    KEY: KEY,
    STAGES: STAGES, AREAS: AREAS, COURSES: COURSES, GOALS: GOALS, COUNTRIES: COUNTRIES, US_STATES: US_STATES,
    stage: stage, course: course, goal: goal, country: country, stateName: stateName,
    curriculumOptions: curriculumOptions, curriculumLabel: curriculumLabel, placeLabel: placeLabel,
    findInvite: findInvite, blank: blank, sanitize: sanitize, clone: clone,
    load: load, save: save, clear: clear,
    storageKind: function () { return store.kind; },
    schoolCourses: schoolCourses, personalCourses: personalCourses,
    hasPersonalCatalog: hasPersonalCatalog, schoolHasCatalog: schoolHasCatalog,
    addPersonal: addPersonal, addCustom: addCustom, removePersonal: removePersonal,
    applyInvite: applyInvite, leaveSchool: leaveSchool, suggestedFor: suggestedFor
  };
})();
