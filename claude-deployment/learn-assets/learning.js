/* Markov.ink learning record: activity status, practice events, points,
   streaks, and learning evidence.
   Stored in this browser under markov.learning.v1. It is not an account,
   not synced, and not shared with any school.
   Demo mode (course.html?demo=1) uses markov.learning.demo.v1 so simulated
   activity never touches the real record. */
(function () {
  'use strict';

  var VERSION = 1;
  var DEMO = /(^|[?&])demo=1(&|$)/.test(window.location.search);
  var KEY = DEMO ? 'markov.learning.demo.v1' : 'markov.learning.v1';

  // Product rules for practice points. Hints never change these numbers.
  var RULES = {
    guidedCompleteReviewed: 20,
    independentCompleteReviewed: 30,
    dailyGoalChoices: [20, 40, 60],
    defaultDailyGoal: 20
  };

  var STATUSES = {
    ready: 'Ready to begin',
    started: 'Started',
    paused: 'Paused',
    finished: 'Finished',
    submitted: 'Submitted'
  };

  /* ---------- Storage with the same fallback as the profile ---------- */

  function makeStore() {
    try {
      var p = '__markov_probe__';
      window.localStorage.setItem(p, '1'); window.localStorage.removeItem(p);
      return {
        kind: 'local',
        get: function () { return window.localStorage.getItem(KEY); },
        set: function (v) { window.localStorage.setItem(KEY, v); },
        backup: function (v) { try { window.localStorage.setItem(KEY + '.unreadable', v); } catch (e) {} }
      };
    } catch (e) {}
    function read() { try { var o = JSON.parse(window.name || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
    return {
      kind: 'tab',
      get: function () { var o = read(); return typeof o[KEY] === 'string' ? o[KEY] : null; },
      set: function (v) { var o = read(); o[KEY] = v; window.name = JSON.stringify(o); },
      backup: function () {}
    };
  }
  var store = makeStore();

  function localTimeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
  }

  function blank() {
    return { version: VERSION, demo: DEMO, timezone: localTimeZone(), dailyGoal: RULES.defaultDailyGoal, courses: {}, events: [], rewards: [] };
  }

  var data = null;
  var loadStatus = 'empty';

  function str(v, max) { return typeof v === 'string' ? v.slice(0, max || 200) : ''; }
  function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }

  function sanitize(raw) {
    if (!raw || typeof raw !== 'object' || raw.version !== VERSION) return null;
    var d = blank();
    d.timezone = str(raw.timezone, 60) || d.timezone;
    d.dailyGoal = RULES.dailyGoalChoices.indexOf(raw.dailyGoal) !== -1 ? raw.dailyGoal : RULES.defaultDailyGoal;
    d.courses = obj(raw.courses);
    d.events = Array.isArray(raw.events) ? raw.events.filter(function (e) { return e && typeof e.id === 'string'; }) : [];
    d.rewards = Array.isArray(raw.rewards) ? raw.rewards.filter(function (r) { return r && typeof r.eventId === 'string' && typeof r.points === 'number'; }) : [];
    return d;
  }

  function load() {
    var raw = null;
    try { raw = store.get(); } catch (e) {}
    if (raw == null) { data = blank(); loadStatus = 'empty'; return; }
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) {}
    data = sanitize(parsed);
    if (!data) { store.backup(raw); data = blank(); loadStatus = 'unreadable'; return; }
    loadStatus = 'ok';
  }

  function save() {
    try { store.set(JSON.stringify(data)); return true; }
    catch (e) {
      if (store.kind === 'local') {
        // storage blocked or full: keep this tab working
        var keep = JSON.stringify(data);
        store = { kind: 'tab', get: function () { return null; }, set: function (v) { var o = {}; try { o = JSON.parse(window.name || '{}') || {}; } catch (x) {} o[KEY] = v; window.name = JSON.stringify(o); }, backup: function () {} };
        try { store.set(keep); return true; } catch (e2) {}
      }
      return false;
    }
  }

  load();

  function course(courseId) {
    var c = data.courses[courseId];
    if (!c || typeof c !== 'object') {
      c = data.courses[courseId] = {};
    }
    c.activities = obj(c.activities);
    c.homework = obj(c.homework);
    c.assignments = obj(c.assignments);
    c.plans = obj(c.plans);
    c.topicPrefs = obj(c.topicPrefs);
    return c;
  }

  function uid(prefix) { return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function now() { return new Date().toISOString(); }

  /* ---------- Days in one consistent time zone ---------- */

  function dayKey(iso) {
    var d = iso ? new Date(iso) : new Date();
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch (e) { return d.toISOString().slice(0, 10); }
  }
  function shiftDay(key, n) {
    var p = key.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.toISOString().slice(0, 10);
  }

  /* ---------- Intent, resume, preferences ---------- */

  function setIntent(courseId, intent) {
    var c = course(courseId);
    c.lastIntent = intent;
    c.lastVisitedAt = now();
    save();
  }

  function setResume(courseId, route, label, status) {
    var c = course(courseId);
    c.resume = { route: str(route, 120), label: str(label, 120), status: status || 'ready', at: now() };
    save();
  }

  function setNotInClass(courseId, topicId, flag) {
    var c = course(courseId);
    if (flag) c.topicPrefs[topicId] = { notInClass: true, at: now() };
    else delete c.topicPrefs[topicId];
    save();
  }

  /* ---------- Activities: preparing never earns points ---------- */

  function prepareActivity(courseId, spec) {
    var c = course(courseId);
    var id = spec.id;
    var existing = c.activities[id];
    if (existing) {
      existing.updatedAt = now();
      save();
      return existing;
    }
    var a = {
      id: id, type: spec.type, mode: spec.mode || null, kind: spec.kind || 'guided',
      topicId: spec.topicId || null, title: str(spec.title, 140),
      homeworkId: spec.homeworkId || null, assignmentId: spec.assignmentId || null, planId: spec.planId || null,
      status: 'ready', position: null, createdAt: now(), updatedAt: now()
    };
    c.activities[id] = a;
    save();
    return a;
  }

  function activity(courseId, id) { return course(courseId).activities[id] || null; }

  function setStatus(courseId, id, status, position) {
    var a = activity(courseId, id);
    if (!a || !STATUSES[status]) return null;
    a.status = status;
    if (position) a.position = position;
    a.updatedAt = now();
    save();
    return a;
  }

  /* ---------- Completion events and rewards ---------- */

  function pointsFor(ev) {
    if (!ev.reviewed) return 0;
    if (ev.kind === 'independent') return RULES.independentCompleteReviewed;
    if (ev.kind === 'guided') return RULES.guidedCompleteReviewed;
    return 0;
  }

  // The future workspace calls this once an attempt is finished and reviewed.
  // The event id is stable per attempt, so a replay, refresh, or retry of the
  // same report can never add points twice.
  function recordCompletion(e) {
    var id = 'done:' + e.courseId + ':' + e.activityId + ':' + e.attemptId;
    if (data.events.some(function (x) { return x.id === id; })) return { duplicate: true, points: 0, eventId: id };
    var at = e.at || now();
    var ev = {
      id: id, type: 'activity_completed', courseId: e.courseId, activityId: e.activityId, attemptId: String(e.attemptId),
      topicId: e.topicId || null, kind: e.kind === 'independent' ? 'independent' : 'guided',
      reviewed: e.reviewed === true, hintsUsed: Math.max(0, Number(e.hintsUsed) || 0),
      success: e.success === true, at: at, day: dayKey(at), demo: DEMO
    };
    data.events.push(ev);
    // A set that covers several topics also leaves one result per topic, so each
    // topic gets its own evidence. These never add points or practice days.
    (Array.isArray(e.topicResults) ? e.topicResults : []).slice(0, 20).forEach(function (r) {
      if (!r || !r.topicId) return;
      data.events.push({ id: id + ':' + r.topicId, type: 'topic_result', courseId: e.courseId, activityId: e.activityId, attemptId: String(e.attemptId),
        topicId: r.topicId, kind: ev.kind, reviewed: ev.reviewed, hintsUsed: 0, success: r.success === true, at: at, day: ev.day, demo: DEMO });
    });
    var pts = pointsFor(ev);
    if (pts > 0 && !data.rewards.some(function (r) { return r.eventId === id; })) {
      data.rewards.push({ eventId: id, points: pts, at: at, day: ev.day });
    }
    var a = activity(e.courseId, e.activityId);
    if (a && a.status !== 'submitted') { a.status = 'finished'; a.updatedAt = now(); }
    save();
    return { duplicate: false, points: pts, eventId: id };
  }

  function totalPoints() { return data.rewards.reduce(function (s, r) { return s + r.points; }, 0); }
  function pointsOn(day) { return data.rewards.filter(function (r) { return r.day === day; }).reduce(function (s, r) { return s + r.points; }, 0); }

  // A practice day is a day with at least one completed, reviewed activity.
  function practiceDays() {
    var set = {};
    data.events.forEach(function (e) { if (e.type === 'activity_completed' && e.reviewed) set[e.day] = true; });
    return Object.keys(set).sort();
  }

  function streak() {
    var days = practiceDays();
    var has = {};
    days.forEach(function (d) { has[d] = true; });
    var today = dayKey();
    // today without practice yet still keeps yesterday's streak alive
    var start = has[today] ? today : shiftDay(today, -1);
    var n = 0;
    while (has[shiftDay(start, -n)]) n++;
    var longest = 0, run = 0, prev = null;
    days.forEach(function (d) { run = (prev && shiftDay(prev, 1) === d) ? run + 1 : 1; longest = Math.max(longest, run); prev = d; });
    var weekDays = [];
    for (var i = 6; i >= 0; i--) { var k = shiftDay(today, -i); weekDays.push({ day: k, practiced: !!has[k], today: i === 0 }); }
    return { current: n, longest: longest, practicedToday: !!has[today], totalDays: days.length, week: weekDays, today: today };
  }

  function setDailyGoal(n) {
    if (RULES.dailyGoalChoices.indexOf(n) === -1) return;
    data.dailyGoal = n;
    save();
  }

  /* ---------- Learning evidence ---------- */

  var EVIDENCE = {
    none: { label: 'No evidence yet', basis: 'No finished activities for this topic yet.' },
    progress: { label: 'In progress', basis: 'You started an activity here but have not finished it.' },
    helped: { label: 'Practiced with help', basis: 'You finished a guided activity, where hints and step checks were available.' },
    independent: { label: 'Independent evidence', basis: 'Your latest independent check went well without hints. That is evidence, not a promise you will never need review.' },
    review: { label: 'Review suggested', basis: 'Your latest independent check showed something to work on.' }
  };

  function topicEvidence(courseId, topicId) {
    var evs = data.events.filter(function (e) { return e.courseId === courseId && e.topicId === topicId && (e.type === 'activity_completed' || e.type === 'topic_result') && e.reviewed; })
      .sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var indep = evs.filter(function (e) { return e.kind === 'independent'; });
    var state = 'none';
    if (indep.length) state = indep[indep.length - 1].success ? 'independent' : 'review';
    else if (evs.length) state = 'helped';
    else {
      var acts = course(courseId).activities;
      var started = Object.keys(acts).some(function (k) { var a = acts[k]; return a.topicId === topicId && (a.status === 'started' || a.status === 'paused'); });
      if (started) state = 'progress';
    }
    return { state: state, label: EVIDENCE[state].label, basis: EVIDENCE[state].basis, history: evs };
  }

  function participation(courseId) {
    var acts = course(courseId).activities;
    var keys = Object.keys(acts);
    return {
      ready: keys.filter(function (k) { return acts[k].status === 'ready'; }).length,
      attempted: keys.filter(function (k) { return acts[k].status !== 'ready'; }).length,
      finished: keys.filter(function (k) { return acts[k].status === 'finished' || acts[k].status === 'submitted'; }).length
    };
  }

  /* ---------- Homework the student brings ---------- */

  function splitQuestions(text) {
    return String(text || '').split(/\r?\n/)
      .map(function (l) { return l.replace(/^\s*(\(?\d{1,2}[.)]|\(?[a-z][.)]|[-*•])\s+/i, '').trim(); })
      .filter(function (l) { return l.length > 0; })
      .slice(0, 40)
      .map(function (l) { return l.slice(0, 200); });
  }

  function saveHomework(courseId, hw) {
    var c = course(courseId);
    var id = hw.id || uid('hw');
    c.homework[id] = {
      id: id, title: str(hw.title, 80) || 'Untitled classwork',
      source: ['paste', 'file', 'file-read', 'demo'].indexOf(hw.source) !== -1 ? hw.source : 'paste',
      readMethod: ['ocr', 'pdf-text', 'claude'].indexOf(hw.readMethod) >= 0 ? hw.readMethod : null,
      file: hw.file ? { name: str(hw.file.name, 120), type: str(hw.file.type, 60), size: Number(hw.file.size) || 0 } : null,
      demo: hw.demo === true,
      // questions keep their line breaks so parts like (a) and (b) stay separate
      questions: (hw.questions || []).slice(0, 40).map(function (q, i) {
        return { id: q.id || ('q' + (i + 1)), text: str(q.text, 600), topicId: q.topicId || null, suggested: q.suggested || null };
      }),
      // questions that should have a picture from the file (the pictures live in saveVisuals)
      visualIds: (hw.visualIds || []).filter(function (v) { return typeof v === 'string'; }).slice(0, 40),
      createdAt: (c.homework[id] && c.homework[id].createdAt) || now(), updatedAt: now()
    };
    save();
    return c.homework[id];
  }

  /* ---------- Pictures kept from a homework file ---------- */
  // Kept apart from the learning record so the record stays small, keyed by homework and
  // question id. Browser storage can be full; the caller learns which pictures did not save.
  var VKEY = DEMO ? 'markov.visuals.demo.v1' : 'markov.visuals.v1';
  function readVisuals() { try { return JSON.parse(window.localStorage.getItem(VKEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveVisuals(courseId, hwId, map) {
    var all = readVisuals(), k = courseId + '|' + hwId;
    var ids = Object.keys(map || {}).filter(function (id) { return typeof map[id] === 'string' && /^data:image\/(jpeg|png);base64,/.test(map[id]); });
    if (!ids.length) {
      if (all[k]) { delete all[k]; try { window.localStorage.setItem(VKEY, JSON.stringify(all)); } catch (e) {} }
      return { saved: 0, failed: [] };
    }
    var entry = { t: Date.now(), items: {} };
    ids.forEach(function (id) { entry.items[id] = map[id]; });
    all[k] = entry;
    // if space runs out, older homework pictures make room for these
    for (var tries = 0; tries < 30; tries++) {
      try { window.localStorage.setItem(VKEY, JSON.stringify(all)); return { saved: ids.length, failed: [] }; }
      catch (e) {
        var older = Object.keys(all).filter(function (x) { return x !== k; }).sort(function (a, b) { return all[a].t - all[b].t; });
        if (!older.length) break;
        delete all[older[0]];
      }
    }
    return { saved: 0, failed: ids };
  }
  function visual(courseId, hwId, qid) {
    var e = readVisuals()[courseId + '|' + hwId];
    return (e && e.items && e.items[qid]) || null;
  }

  /* ---------- Test plans ---------- */

  function savePlan(courseId, p) {
    var c = course(courseId);
    var id = p.id || uid('plan');
    c.plans[id] = {
      id: id, name: str(p.name, 80) || 'Upcoming test', date: str(p.date, 10) || '',
      topicIds: (p.topicIds || []).slice(0, 40), freeTopics: (p.freeTopics || []).map(function (t) { return str(t, 60); }).filter(Boolean).slice(0, 20),
      unsure: p.unsure === true, sessionMinutes: [15, 30, 45, 60].indexOf(p.sessionMinutes) !== -1 ? p.sessionMinutes : 30,
      useReview: p.useReview === true,
      createdAt: (c.plans[id] && c.plans[id].createdAt) || now(), updatedAt: now()
    };
    save();
    return c.plans[id];
  }

  function deletePlan(courseId, id) { delete course(courseId).plans[id]; save(); }

  // Builds a transparent starting plan. It never claims readiness.
  function buildPlan(courseId, plan, topicTitle) {
    var topics = plan.topicIds.map(function (id) { return { id: id, title: topicTitle(id), free: false }; })
      .concat(plan.freeTopics.map(function (t, i) { return { id: 'free-' + i, title: t, free: true }; }));
    var hasEvidence = topics.some(function (t) { return !t.free && topicEvidence(courseId, t.id).state !== 'none'; });
    var steps = [];
    steps.push({ id: plan.id + ':start', phase: 1, title: 'Starting check', detail: 'A few questions from each topic, no hints, so the plan knows where to focus.', minutes: Math.min(15, 5 + topics.length * 2), kind: 'independent' });
    topics.forEach(function (t) {
      var ev = t.free ? { state: 'none' } : topicEvidence(courseId, t.id);
      if (ev.state === 'independent') return;
      steps.push({ id: plan.id + ':review:' + t.id, phase: 2, topicId: t.free ? null : t.id, title: 'Review: ' + t.title,
        detail: ev.state === 'review' ? 'Your last check here showed something to work on.' : (hasEvidence ? 'No independent evidence here yet.' : 'Kept until the starting check shows whether you need it.'),
        minutes: 12, kind: 'guided' });
    });
    steps.push({ id: plan.id + ':mixed', phase: 3, title: 'Mixed practice', detail: 'Problems from all the topics, in a shuffled order like a real test.', minutes: 15, kind: 'guided' });
    steps.push({ id: plan.id + ':fresh', phase: 4, title: 'Fresh independent check', detail: 'New questions, no hints. Shows what you can do on your own today.', minutes: 15, kind: 'independent' });
    var budget = plan.sessionMinutes, used = 0, now1 = [], later = [];
    steps.forEach(function (s) {
      if (used + s.minutes <= budget && later.length === 0) { now1.push(s); used += s.minutes; }
      else later.push(s);
    });
    var total = steps.reduce(function (a, s) { return a + s.minutes; }, 0);
    return { steps: steps, thisSession: now1, later: later, sessionMinutes: budget, usedMinutes: used, totalMinutes: total, starting: !hasEvidence, topics: topics };
  }

  /* ---------- Demo mode only ---------- */

  function demoSeed(courseId, topicId, kind, success, daysAgo) {
    if (!DEMO) return null;
    var at = new Date(Date.now() - (daysAgo || 0) * 86400000).toISOString();
    var actId = 'demo:' + topicId + ':' + kind;
    prepareActivity(courseId, { id: actId, type: 'topic', mode: kind === 'independent' ? 'check' : 'practice', kind: kind, topicId: topicId, title: 'Demo activity' });
    return recordCompletion({ courseId: courseId, activityId: actId, attemptId: 'a' + Date.now(), topicId: topicId, kind: kind, reviewed: true, hintsUsed: kind === 'guided' ? 2 : 0, success: success, at: at });
  }

  function resetDemo() {
    if (!DEMO) return;
    data = blank();
    save();
  }

  window.MarkovLearning = {
    DEMO: DEMO, KEY: KEY, RULES: RULES, STATUSES: STATUSES, EVIDENCE: EVIDENCE,
    loadStatus: function () { return loadStatus; },
    storageKind: function () { return store.kind; },
    reload: load,
    timezone: function () { return data.timezone; },
    dailyGoal: function () { return data.dailyGoal; },
    setDailyGoal: setDailyGoal,
    course: course, setIntent: setIntent, setResume: setResume, setNotInClass: setNotInClass,
    prepareActivity: prepareActivity, activity: activity, setStatus: setStatus,
    recordCompletion: recordCompletion, totalPoints: totalPoints, pointsToday: function () { return pointsOn(dayKey()); },
    streak: streak, practiceDays: practiceDays, dayKey: dayKey,
    topicEvidence: topicEvidence, participation: participation,
    splitQuestions: splitQuestions, saveHomework: saveHomework, saveVisuals: saveVisuals, visual: visual,
    savePlan: savePlan, deletePlan: deletePlan, buildPlan: buildPlan,
    events: function () { return data.events.slice(); },
    demoSeed: demoSeed, resetDemo: resetDemo
  };
})();
