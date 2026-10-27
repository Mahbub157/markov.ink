/* Markov.ink course experience: course home, homework, topics, test plans,
   and progress. Activities stop at a saved brief; the learning workspace is
   the next phase. */
(function () {
  'use strict';

  var P = window.MarkovProfile, U = window.MarkovUI, C = window.MarkovCourse, L = window.MarkovLearning;
  var esc = U.esc;
  var view = document.getElementById('view');
  var topbar = document.getElementById('topbar');
  var dlg = document.getElementById('dlg');

  var params = new URLSearchParams(window.location.search);
  var courseId = params.get('c') || '';
  var profileLoad = P.load();
  var profile = profileLoad.profile;
  var crs = profile && profile.setupComplete ? profile.courses.filter(function (c) { return c.id === courseId; })[0] : null;
  var outline = crs ? C.outlineFor(crs.catalogId) : null;
  var isSchool = !!(crs && crs.origin === 'school' && profile.school);
  var schoolCode = isSchool ? profile.school.code : null;

  /* ---------- Small drawings ---------- */

  var ART = {
    hw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="3" width="12" height="17" rx="2"/><path d="M7.5 8h6M7.5 11.5h5"/><path d="M7.5 15.5c1-1.2 2 .8 3-.3s1.6.6 2.4-.2"/><path d="M19 10.5l2 2-5.5 5.5H13.5v-2Z"/></svg>',
    un: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0-3.5 10.9c.7.5 1 1.2 1 2V17h5v-1.1c0-.8.3-1.5 1-2A6 6 0 0 0 12 3Z"/><path d="M10 20h4"/><path d="M9.6 9.8l1.7 1.7 3.1-3.3"/></svg>',
    te: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13.5" r="7"/><path d="M12 6.5V4M10 4h4M18 8l1.4-1.4"/><path d="M12 13.5V10M12 13.5l3 2"/></svg>',
    flame: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c-3.9 0-7-2.7-7-6.5 0-3.6 2.6-5.6 3.8-8.5.4 2 1.6 3.2 2.7 3.6C11.3 6.7 12.8 4.4 15 3c-.4 3 1.4 4.6 2.6 6.4A7 7 0 0 1 19 14.5C19 18.3 15.9 21 12 21Z"/></svg>',
    drop: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0C6 9.8 12 3.5 12 3.5Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/></svg>',
    sheet: '<svg class="sheet" viewBox="0 0 40 48" fill="none" aria-hidden="true"><rect x="3" y="3" width="30" height="40" rx="4" fill="#fff" stroke="currentColor" stroke-width="1.8"/><path d="M9 13h16M9 19h18M9 25h12" stroke="#B9C9DA" stroke-width="1.8" stroke-linecap="round"/><path d="M9 33c2-2 4 1 6-1s3 1 5-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    chev: '<svg class="icon chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    underline: '<svg class="ink" viewBox="0 0 90 30" fill="none" aria-hidden="true"><path d="M4 20c14-8 26 6 40-2s24 4 42-6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
  };

  /* ---------- Helpers ---------- */

  function h(hash) { return '#' + hash; }
  function topicTitle(id) { var x = C.findTopic(outline, id); return x ? x.topic.title : id; }
  function statusChip(s) { return '<span class="status ' + esc(s) + '">' + esc(L.STATUSES[s] || s) + '</span>'; }
  function dot(state) { return '<span class="dot ' + state + '" aria-hidden="true"></span>'; }
  function firstName() { return (profile.name || '').split(' ')[0]; }
  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function daysUntil(iso) {
    if (!iso) return null;
    var today = L.dayKey();
    var a = Date.UTC.apply(null, iso.split('-').map(function (n, i) { return i === 1 ? n - 1 : +n; }));
    var b = Date.UTC.apply(null, today.split('-').map(function (n, i) { return i === 1 ? n - 1 : +n; }));
    return Math.round((a - b) / 86400000);
  }
  function crumbs(items) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + items.map(function (it, i) {
      return (i ? '<span aria-hidden="true">/</span>' : '') + (it[1] ? '<a href="' + it[1] + '">' + esc(it[0]) + '</a>' : '<span aria-current="page">' + esc(it[0]) + '</span>');
    }).join('') + '</nav>';
  }
  function base() { return [['Your courses', 'learn'], [crs.title, h('/')]]; }
  function assignments() { return isSchool ? C.assignmentsFor(schoolCode) : []; }
  function evidenceSummary() {
    var all = C.allTopics(outline);
    var practiced = 0, indep = 0, states = [];
    all.forEach(function (x) {
      var s = L.topicEvidence(courseId, x.topic.id).state;
      states.push(s);
      if (s === 'helped' || s === 'independent' || s === 'review') practiced++;
      if (s === 'independent') indep++;
    });
    return { total: all.length, practiced: practiced, indep: indep, states: states };
  }
  // The unit the student is working in: their latest topic activity, else the suggestion.
  function currentUnit() {
    var acts = L.course(courseId).activities;
    var latest = Object.keys(acts).map(function (k) { return acts[k]; })
      .filter(function (a) { return a.topicId && C.findTopic(outline, a.topicId); })
      .sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; })[0];
    if (latest) return C.findTopic(outline, latest.topicId).unit;
    var s = suggestedTopic();
    return s ? s.unit : outline.units[0];
  }

  function suggestedTopic() {
    var prefs = L.course(courseId).topicPrefs;
    var all = C.allTopics(outline);
    var pick = all.filter(function (x) { return !prefs[x.topic.id] && L.topicEvidence(courseId, x.topic.id).state !== 'independent'; })[0];
    return pick || all[0] || null;
  }

  /* ---------- Shell ---------- */

  function rewardsHtml() {
    var st = L.streak();
    var pts = L.totalPoints();
    var goal = L.dailyGoal();
    var today = Math.min(goal, L.pointsToday());
    var frac = goal ? today / goal : 0;
    var circ = 2 * Math.PI * 10;
    var ring = '<svg class="goal-ring" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="10" fill="none" stroke="#DDE7F2" stroke-width="4"/>' +
      '<circle cx="13" cy="13" r="10" fill="none" stroke="#0284C7" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (circ * frac).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 13 13)"/></svg>';
    var label = st.current + ' day streak, ' + pts + ' practice points, ' + today + ' of ' + goal + ' points toward today’s goal. Open progress.';
    return '<a class="rewards" href="' + h('/progress') + '" aria-label="' + esc(label) + '">' +
      '<span class="rw streak">' + ART.flame + st.current + '</span>' +
      '<span class="rw points">' + ART.drop + pts + '</span>' +
      '<span class="rw">' + ring + '<small>' + today + '/' + goal + '</small></span></a>';
  }

  function renderTop() {
    topbar.innerHTML = U.wordmark() +
      '<a class="toplink" href="learn">' + U.icon('left') + '<span>Your courses</span></a>' +
      '<span class="spacer"></span>' +
      '<a class="toplink" href="whiteboard">' + U.icon('board') + '<span>Whiteboard prototype</span></a>';
    if (L.DEMO) {
      document.getElementById('demo-banner').innerHTML = '<div class="demo-banner" role="note">' + U.icon('lock') + 'Demo mode: simulated activity, kept separate from your real record.</div>';
    }
  }

  function storageNote() {
    var parts = [];
    if (L.storageKind() === 'tab' || P.storageKind() === 'tab') parts.push('<div class="note warn" style="margin-bottom:18px">' + U.icon('lock') + '<p><strong>This browser is blocking saved data.</strong> Your work here lasts while this tab stays open.</p></div>');
    if (L.loadStatus() === 'unreadable') parts.push('<div class="note warn" style="margin-bottom:18px">' + U.icon('lock') + '<p>An earlier course record in this browser could not be read, so this starts fresh. Your profile and whiteboard data were not changed.</p></div>');
    return parts.join('');
  }

  function mount(html) {
    view.innerHTML = '<div class="' + (U.reducedMotion() ? '' : 'view-enter') + '">' + storageNote() + html + '</div>';
    var hd = view.querySelector('h1');
    if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  /* ---------- Dialog ---------- */

  var lastTrigger = null;
  function openSheet(title, body, trigger) {
    lastTrigger = trigger || document.activeElement;
    dlg.innerHTML = '<div class="sheet-head"><h2 id="dlg-title">' + title + '</h2><button type="button" class="sheet-close" aria-label="Close">' + U.icon('close') + '</button></div><div class="sheet-body">' + body + '</div>';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    var f = dlg.querySelector('[autofocus]') || dlg.querySelector('.sheet-close');
    if (f) f.focus();
  }
  function closeSheet() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
  dlg.addEventListener('close', function () { if (lastTrigger && document.body.contains(lastTrigger)) lastTrigger.focus(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('.sheet-close') || e.target.closest('[data-close]')) closeSheet(); });

  function workspaceNotice(title, trigger) {
    openSheet('Saved and ready', '<p><strong>' + esc(title) + '</strong> is saved as <em>Ready to begin</em>.</p>' +
      '<div class="note">' + U.icon('board') + '<p>The learning workspace where you work through this activity is the next phase of Markov.ink. When it opens, this activity will start right here with the same rules.</p></div>' +
      '<p style="margin-top:14px;font-size:14px">Points start when you finish and review an activity in that workspace. Saving it does not earn points.</p>' +
      '<div class="sheet-actions"><button type="button" class="btn btn-primary" data-close autofocus>Got it</button>' +
      '<a class="btn btn-ghost" href="whiteboard">' + U.icon('board') + 'Open the current whiteboard prototype</a></div>', trigger);
  }

  /* ---------- Course home ---------- */

  function viewHome() {
    var c = L.course(courseId);
    var acts = Object.keys(c.activities).map(function (k) { return c.activities[k]; })
      .sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
    var inMotion = acts.filter(function (a) { return a.status === 'started' || a.status === 'paused'; })[0];
    var resume = c.resume && c.resume.route ? c.resume : null;
    var sugg = outline ? suggestedTopic() : null;
    var asg = assignments();
    var plans = Object.keys(c.plans).map(function (k) { return c.plans[k]; });

    // One clear next action, said plainly.
    function split(title) {
      var i = title.indexOf(': ');
      return i === -1 ? { main: title, sub: '' } : { main: title.slice(i + 2), sub: title.slice(0, i) };
    }
    var next;
    if (inMotion) {
      var t1 = split(inMotion.title);
      next = { label: 'Continue where you left off', main: t1.main, sub: [t1.sub, inMotion.status === 'paused' ? 'Paused' : 'Started'].filter(Boolean).join(' · '), go: 'Continue', href: h(routeForActivity(inMotion)) };
    } else if (resume) {
      var t2 = split(resume.label);
      next = { label: 'Your next step', main: t2.main, sub: [t2.sub, 'Saved, not started'].filter(Boolean).join(' · '), go: 'Open', href: h(resume.route) };
    } else if (sugg) {
      next = { label: 'Your next step', main: 'Start with ' + sugg.topic.title, sub: 'Unit ' + sugg.unit.n + ' · ' + sugg.unit.title, go: 'Start', href: h('/topic/' + sugg.topic.id) };
    } else {
      next = { label: 'Your next step', main: 'Add your first homework', sub: crs.title + ' has no topic outline yet', go: 'Add homework', href: h('/homework/new') };
    }

    var who = isSchool
      ? esc(crs.teacher) + (crs.section ? ' · ' + esc(crs.section) : '') + (profile.school.demo ? ' <span class="badge-demo">Fictional demo</span>' : '')
      : 'Your course';

    var left = '<header class="ch-head" data-area="' + esc(crs.area) + '">' +
      '<div class="ch-id"><span class="course-mark">' + U.glyph(crs.glyph) + '</span>' +
      '<div><h1 class="ch-title">' + esc(crs.title) + '</h1><div class="ch-who">' + who + '</div></div></div>' +
      rewardsHtml() + '</header>' +

      '<h2 class="ask" id="ask">What do you want to do?</h2>' +
      '<nav class="cta-row" aria-labelledby="ask">' +
      '<a class="cta" href="' + h('/homework') + '" data-intent="homework">' + ART.hw + 'Work on homework</a>' +
      '<a class="cta" href="' + h('/topics') + '" data-intent="understand">' + ART.un + 'Understand a topic</a>' +
      '<a class="cta" href="' + h('/test') + '" data-intent="test">' + ART.te + 'Prepare for a test</a>' +
      '</nav>' +

      '<section class="nextrow" aria-labelledby="next-main">' +
      '<span class="next-icon" aria-hidden="true">' + U.icon('right') + '</span>' +
      '<div class="next-text"><span class="next-label">' + esc(next.label) + '</span>' +
      '<span class="next-main" id="next-main">' + esc(next.main) + '</span>' +
      (next.sub ? '<span class="next-sub">' + esc(next.sub) + '</span>' : '') + '</div>' +
      '<a class="btn btn-primary" href="' + next.href + '">' + esc(next.go) + U.icon('right') + '</a></section>';

    var upcoming = [];
    asg.forEach(function (a) {
      var act = L.activity(courseId, 'asg:' + a.id);
      upcoming.push('<a class="soon" href="' + h('/homework/a/' + a.id) + '">' + ART.hw + '<span class="grow">' + esc(a.title.split(':')[0]) + '</span><small>' + (a.due ? 'Due ' + esc(fmtDate(a.due)) : esc(crs.teacher)) + '</small>' + (act ? statusChip(act.status) : '') + '</a>');
    });
    plans.forEach(function (p) {
      var d = daysUntil(p.date);
      upcoming.push('<a class="soon" href="' + h('/test/' + p.id) + '">' + ART.te + '<span class="grow">' + esc(p.name) + '</span><small>' + (p.date ? esc(fmtDate(p.date)) + (d != null && d >= 0 ? ' · in ' + d + ' day' + (d === 1 ? '' : 's') : '') : 'No date') + '</small></a>');
    });
    if (upcoming.length) left += '<h2 class="sub-h">Coming up</h2><div class="soon-list">' + upcoming.join('') + '</div>';

    var hereId = inMotion && inMotion.topicId ? inMotion.topicId : (sugg ? sugg.topic.id : null);
    var right = outline ? courseMapHtml(hereId) : '';

    mount('<div class="home2' + (outline ? '' : ' no-map') + '"><div class="home2-main">' + left + '</div>' + right + '</div>');
    view.querySelectorAll('[data-intent]').forEach(function (a) {
      a.addEventListener('click', function () { L.setIntent(courseId, a.getAttribute('data-intent')); });
    });
    if (outline) bindCourseMap(hereId);
  }

  /* ---------- Course map: a clickable path with progress rings ---------- */

  var RING = { none: 0, progress: 0.25, helped: 0.6, review: 0.6, independent: 1 };
  var XS = [36, 92, 136, 92]; // winding path positions, repeated per unit
  var ROW = 82;

  function nodeSvg(state) {
    var r = 22, circ = 2 * Math.PI * r, f = RING[state] || 0;
    var col = state === 'independent' ? '#0E7C6B' : state === 'review' ? '#D97706' : '#0284C7';
    return '<svg class="node-ring" viewBox="0 0 52 52" aria-hidden="true">' +
      '<circle cx="26" cy="26" r="' + r + '" fill="none" stroke="#DDE7F2" stroke-width="5"/>' +
      (f ? '<circle cx="26" cy="26" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + (circ * f).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 26 26)"/>' : '') +
      '</svg>';
  }

  function courseMapHtml(hereId) {
    var ev = evidenceSummary();
    var html = '<aside class="cmap" aria-labelledby="cmap-title">' +
      '<div class="cmap-head"><h2 id="cmap-title">Course map</h2><a href="' + h('/progress') + '">' + ev.practiced + ' of ' + ev.total + ' practiced</a></div>' +
      '<div class="cmap-bar" aria-hidden="true">' + ev.states.map(function (s) { return '<i class="' + s + '"></i>'; }).join('') + '</div>' +
      '<div class="cmap-detail" id="cmap-detail" aria-live="polite"></div>';
    outline.units.forEach(function (u) {
      var states = u.topics.map(function (t) { return L.topicEvidence(courseId, t.id).state; });
      var done = states.filter(function (s) { return s !== 'none' && s !== 'progress'; }).length;
      var height = u.topics.length * ROW;
      var pts = u.topics.map(function (t, i) { return XS[i % XS.length] + ',' + (i * ROW + 30); });
      html += '<section class="cmap-unit" aria-label="Unit ' + u.n + ': ' + esc(u.title) + '">' +
        '<div class="cmap-unit-head"><span class="unit-n">' + u.n + '</span><b>' + esc(u.title) + '</b><small>' + done + '/' + u.topics.length + '</small></div>' +
        '<div class="cmap-path" style="height:' + height + 'px">' +
        '<svg class="cmap-line" viewBox="0 0 280 ' + height + '" preserveAspectRatio="xMinYMin meet" aria-hidden="true"><polyline points="' + pts.join(' ') + '" fill="none" stroke="#C3D3E4" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/></svg>' +
        u.topics.map(function (t, i) {
          var x = XS[i % XS.length], y = i * ROW + 4;
          var st = states[i];
          var here = t.id === hereId;
          return '<button type="button" class="cnode ' + st + (here ? ' here' : '') + '" data-topic="' + t.id + '" style="left:' + (x - 26) + 'px;top:' + y + 'px" aria-pressed="false" aria-label="' + esc(t.title + ', ' + L.EVIDENCE[st].label + (here ? ', you are here' : '')) + '">' +
            nodeSvg(st) + '<span class="cnode-core">' + (st === 'independent' ? U.icon('check') : '<span>' + (i + 1) + '</span>') + '</span></button>' +
            '<span class="cnode-label" style="left:' + (x + 40) + 'px;top:' + (y + 6) + 'px">' + esc(t.title) + (here ? '<em>You are here</em>' : '') + '</span>';
        }).join('') + '</div></section>';
    });
    html += '<p class="map-note">' + esc(outline.outlineLabel) + '</p></aside>';
    return html;
  }

  function bindCourseMap(hereId) {
    var detail = document.getElementById('cmap-detail');
    var nodes = view.querySelectorAll('.cnode');
    function select(id) {
      var hit = C.findTopic(outline, id);
      if (!hit) return;
      var e = L.topicEvidence(courseId, id);
      nodes.forEach(function (n) { n.setAttribute('aria-pressed', n.getAttribute('data-topic') === id ? 'true' : 'false'); });
      detail.innerHTML = '<span class="cd-unit">Unit ' + hit.unit.n + ' · ' + esc(hit.unit.title) + '</span>' +
        '<b class="cd-title">' + esc(hit.topic.title) + '</b>' +
        '<span class="cd-state">' + dot(e.state) + esc(e.label) + '</span>' +
        '<a class="btn btn-primary cd-go" href="' + h('/topic/' + id) + '">' + (e.state === 'none' ? 'Start' : 'Open') + U.icon('right') + '</a>';
    }
    nodes.forEach(function (n) { n.addEventListener('click', function () { select(n.getAttribute('data-topic')); }); });
    select(hereId || (nodes[0] && nodes[0].getAttribute('data-topic')));
  }

  function routeForActivity(a) {
    if (a.type === 'assignment') return '/homework/a/' + a.assignmentId;
    if (a.type === 'homework') return '/homework/h/' + a.homeworkId;
    if (a.type === 'test-step') return '/test/' + a.planId;
    if (a.topicId && a.mode) return '/topic/' + a.topicId + '/' + a.mode;
    return '/';
  }

  function outlineHtml(openUnit) {
    var prefs = L.course(courseId).topicPrefs;
    return '<div class="outline">' + outline.units.map(function (u) {
      var states = u.topics.map(function (t) { return L.topicEvidence(courseId, t.id).state; });
      var done = states.filter(function (s) { return s !== 'none' && s !== 'progress'; }).length;
      return '<details class="unit"' + (u.id === openUnit ? ' open' : '') + '><summary><span class="unit-n">' + u.n + '</span><span class="unit-title">' + esc(u.title) + '</span><span class="unit-meta">' + done + ' of ' + u.topics.length + ' practiced</span>' + ART.chev + '</summary>' +
        u.topics.map(function (t, i) {
          return '<a class="topic-row" href="' + h('/topic/' + t.id) + '">' + dot(states[i]) +
            '<span><span class="t">' + esc(t.title) + '</span>' + (prefs[t.id] ? ' <span class="tag">Not in my class now</span>' : '') + '<br><span class="d">' + esc(t.plain) + '</span></span>' +
            '<span class="math">' + esc(t.example.replace(/^(Solve|Find|Simplify|Expand)\s+/, '')) + '</span></a>';
        }).join('') + '</details>';
    }).join('') + '</div>';
  }

  function legendHtml() {
    return '<div class="legend" aria-label="Topic states">' + ['none', 'progress', 'helped', 'independent', 'review'].map(function (s) {
      return '<span>' + dot(s) + esc(L.EVIDENCE[s].label) + '</span>';
    }).join('') + '</div>';
  }

  /* ---------- Homework organizer ---------- */

  function viewHomework() {
    L.setIntent(courseId, 'homework');
    var c = L.course(courseId);
    var asg = assignments();
    var mine = Object.keys(c.homework).map(function (k) { return c.homework[k]; }).sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
    var left = '<div class="inbox-col"><h2>' + U.icon('school') + 'From your teacher</h2>';
    if (isSchool) {
      left += '<p>Work ' + esc(crs.teacher) + ' set for ' + esc(crs.title) + '.' + (profile.school.demo ? ' <span class="badge-demo">Fictional demo</span>' : '') + '</p>';
      left += asg.length ? asg.map(function (a) {
        var act = L.activity(courseId, 'asg:' + a.id);
        return '<a class="hw-item" href="' + h('/homework/a/' + a.id) + '" style="color:#1E3A8A">' + ART.sheet + '<span class="grow"><b style="color:var(--ink)">' + esc(a.title) + '</b><small>' + a.questions.length + ' questions' + (a.due ? ' · due ' + esc(fmtDate(a.due)) : ' · no due date given') + '</small></span>' + (act ? statusChip(act.status) : '<span class="status">New</span>') + '</a>';
      }).join('') : '<div class="empty-teacher"><b>Nothing assigned right now</b>When your teacher posts work for this class, it shows up here.</div>';
    } else {
      left += '<p>&nbsp;</p><div class="empty-teacher"><b>No teacher connected to this course</b>' + esc(crs.title) + ' is your own course, so there is no assigned work here. If a teacher gives you a class code, you can join from Your courses. Your own classwork still works on the right.</div>';
    }
    left += '</div>';
    var right = '<div class="inbox-col"><h2>' + U.icon('user') + 'Your classwork</h2><p>Worksheets, textbook pages, or questions from class.</p>' +
      '<a class="dropzone" href="' + h('/homework/new') + '">' + U.icon('plus') + '<b>Bring classwork</b><small>Paste questions or add a photo or PDF</small></a>' +
      (mine.length ? '<div style="margin-top:14px">' + mine.map(function (w) {
        var act = L.activity(courseId, 'hw:' + w.id);
        return '<a class="hw-item" href="' + h('/homework/h/' + w.id) + '" style="color:var(--blue)">' + ART.sheet + '<span class="grow"><b style="color:var(--ink)">' + esc(w.title) + '</b><small>' + (w.questions.length ? w.questions.length + ' question' + (w.questions.length === 1 ? '' : 's') : 'File saved, no questions typed yet') + (w.demo ? ' · demo' : '') + '</small></span>' + (act ? statusChip(act.status) : '') + '</a>';
      }).join('') + '</div>' : '') + '</div>';
    mount(crumbs(base().concat([['Homework']])) + '<span class="kicker">Work on homework</span><h1 class="page-title">Homework</h1>' +
      '<p class="page-lede">Open what your teacher set, or bring your own. Either way it is saved here so you can come back to it.</p>' +
      '<div class="inbox">' + left + right + '</div>');
  }

  /* ---------- Bring classwork ---------- */

  var draftHw = null;

  function topicOptions(selected) {
    var opts = '<option value="">Not sure yet</option>';
    if (outline) {
      outline.units.forEach(function (u) {
        opts += '<optgroup label="Unit ' + u.n + ': ' + esc(u.title) + '">' + u.topics.map(function (t) {
          return '<option value="' + t.id + '"' + (selected === t.id ? ' selected' : '') + '>' + esc(t.title) + '</option>';
        }).join('') + '</optgroup>';
      });
    }
    return opts;
  }

  function viewHomeworkNew(editId) {
    var c = L.course(courseId);
    var existing = editId ? c.homework[editId] : null;
    if (editId && !existing) { viewMissing('That classwork is no longer saved here.'); return; }
    if (!draftHw || draftHw.forId !== (editId || null)) {
      draftHw = existing
        ? { forId: editId, title: existing.title, source: existing.source, text: existing.questions.map(function (q) { return q.text; }).join('\n'), file: existing.file, demo: existing.demo, questions: JSON.parse(JSON.stringify(existing.questions)), method: existing.file && !existing.questions.length ? 'file' : 'paste' }
        : { forId: null, title: '', source: 'paste', text: '', file: null, demo: false, questions: null, method: 'paste' };
    }
    var d = draftHw;
    var html = crumbs(base().concat([['Homework', h('/homework')], [existing ? 'Edit classwork' : 'Bring classwork']])) +
      '<div class="form-wrap"><span class="kicker">Work on homework</span><h1 class="page-title">' + (existing ? 'Edit your classwork' : 'Bring your classwork') + '</h1>' +
      '<p class="page-lede">Give it a name, add the questions, and link them to topics if you like. You can skip the sorting and save anyway.</p>' +
      '<form id="hw-form" novalidate style="margin-top:26px">' +
      '<div class="field"><label class="label" for="hw-title">Name</label><input class="text-input" id="hw-title" maxlength="80" placeholder="Worksheet 2.3, or Textbook page 84" value="' + esc(d.title) + '"></div>' +
      '<fieldset class="field" style="border:0;padding:0;margin:22px 0 0"><legend class="label">How do you want to add it?</legend><div class="seg">' +
      '<label><input type="radio" name="method" value="paste"' + (d.method === 'paste' ? ' checked' : '') + '><span>' + U.icon('pencil') + 'Type or paste questions</span></label>' +
      '<label><input type="radio" name="method" value="file"' + (d.method === 'file' ? ' checked' : '') + '><span>' + U.icon('plus') + 'Photo or PDF</span></label></div></fieldset>' +
      '<div id="method-body" style="margin-top:14px"></div>' +
      '<p class="field-error" id="hw-error" role="alert" hidden>' + U.icon('close') + '<span></span></p>' +
      '<div id="q-area"></div>' +
      '<div class="form-actions"><button type="submit" class="btn btn-primary">Save classwork' + U.icon('right') + '</button>' +
      '<a class="btn btn-ghost" href="' + h(existing ? '/homework/h/' + existing.id : '/homework') + '">Cancel</a></div>' +
      '</form></div>';
    mount(html);
    renderMethod();
    renderQuestions();
    var form = document.getElementById('hw-form');
    document.getElementById('hw-title').addEventListener('input', function (e) { d.title = e.target.value; hideErr(); });
    form.querySelectorAll('input[name=method]').forEach(function (r) { r.addEventListener('change', function () { d.method = r.value; renderMethod(); }); });
    form.addEventListener('submit', function (e) { e.preventDefault(); saveDraftHomework(); });
  }

  function hideErr() { var el = document.getElementById('hw-error'); if (el) el.hidden = true; }
  function showErr(msg, focusEl) {
    var el = document.getElementById('hw-error');
    el.hidden = false; el.querySelector('span').textContent = msg;
    if (focusEl) { focusEl.setAttribute('aria-invalid', 'true'); focusEl.focus(); }
  }

  function renderMethod() {
    var d = draftHw, box = document.getElementById('method-body');
    if (d.method === 'paste') {
      box.innerHTML = '<label class="label" for="hw-text">Questions, one per line</label>' +
        '<textarea class="textarea" id="hw-text" placeholder="1. 3x + 2 = x + 10&#10;2. Solve 5x - 4 = 21&#10;3. Expand 2(x + 6)">' + esc(d.text) + '</textarea>' +
        '<div class="form-actions" style="margin-top:10px"><button type="button" class="btn btn-ghost" id="btn-find">Find the questions</button>' +
        '<button type="button" class="btn btn-quiet" id="btn-demo">Use a demo worksheet</button></div>';
      var ta = document.getElementById('hw-text');
      ta.addEventListener('input', function () { d.text = ta.value; hideErr(); });
      document.getElementById('btn-find').addEventListener('click', function () { detect(false); });
      document.getElementById('btn-demo').addEventListener('click', function () {
        d.text = '3x + 2 = x + 10\n5x - 4 = 21\nExpand 2(x + 6)\nx/4 + 1 = 3\nA phone plan costs $20 plus $5 per GB. How many GB for $45?';
        d.demo = true;
        if (!d.title) d.title = 'Demo worksheet';
        document.getElementById('hw-title').value = d.title;
        ta.value = d.text;
        detect(true);
      });
    } else {
      box.innerHTML = '<div class="file-pick"><span style="color:var(--royal)">' + U.icon('plus', 'icon') + '</span><div style="flex:1;min-width:0"><label class="label" for="hw-file" style="margin:0 0 6px">Choose an image or PDF</label>' +
        '<input type="file" id="hw-file" accept="image/*,application/pdf">' +
        (d.file ? '<p class="input-help" style="margin-top:6px">Selected: <strong>' + esc(d.file.name) + '</strong></p>' : '') + '</div></div>' +
        '<div class="note warn" style="margin-top:12px">' + U.icon('lock') + '<p><strong>Reading questions from files is not available yet.</strong> Markov saves the file name so you know which sheet this is. The file stays on your device. Type the questions under “Type or paste” if you want them linked to topics.</p></div>';
      document.getElementById('hw-file').addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        d.file = f ? { name: f.name, type: f.type, size: f.size } : null;
        if (f && !d.title) { d.title = f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 80); document.getElementById('hw-title').value = d.title; }
        hideErr();
        renderMethod();
      });
    }
  }

  function detect(isDemo) {
    var d = draftHw;
    var lines = L.splitQuestions(d.text);
    if (!lines.length) { showErr('Type or paste at least one question first.', document.getElementById('hw-text')); return; }
    var prev = {};
    (d.questions || []).forEach(function (q) { prev[q.text] = q; });
    d.questions = lines.map(function (t, i) {
      if (prev[t]) return prev[t];
      var g = outline ? C.guessTopicFromProblem(t) : null;
      return { id: 'q' + (i + 1), text: t, topicId: g && g.confident ? g.id : null, suggested: g ? g.id : null };
    });
    if (!isDemo) d.demo = false;
    hideErr();
    renderQuestions();
  }

  function renderQuestions() {
    var d = draftHw, area = document.getElementById('q-area');
    if (!d.questions || !d.questions.length) { area.innerHTML = ''; return; }
    area.innerHTML = '<div class="section-label"><h2>' + d.questions.length + ' question' + (d.questions.length === 1 ? '' : 's') + ' found</h2><p>' +
      (outline ? 'Suggestions come from the shape of each problem. Change any of them, or leave “Not sure yet”.' : 'Topic links need a course outline, so these stay as “Not sure yet” for now.') + '</p></div>' +
      (d.demo ? '<div class="note warn" style="margin-bottom:10px">' + U.icon('lock') + '<p><span class="badge-demo">Demo worksheet</span> These sample questions were typed in for you. They did not come from a file.</p></div>' : '') +
      '<ol class="q-review">' + d.questions.map(function (q, i) {
        return '<li><span class="math" style="white-space:normal">' + esc(q.text) + '</span><span class="select-wrap"><label class="sr-only" for="qt-' + i + '">Topic for question ' + (i + 1) + '</label>' +
          '<select class="select" id="qt-' + i + '" data-i="' + i + '"' + (outline ? '' : ' disabled') + '>' + topicOptions(q.topicId) + '</select>' +
          (q.suggested && !q.topicId && outline ? '<div class="sugg">Maybe: ' + esc(topicTitle(q.suggested)) + '</div>' : (q.suggested && q.topicId === q.suggested ? '<div class="sugg">Suggested</div>' : '')) + '</span></li>';
      }).join('') + '</ol>';
    area.querySelectorAll('select[data-i]').forEach(function (s) {
      s.addEventListener('change', function () { d.questions[+s.getAttribute('data-i')].topicId = s.value || null; });
    });
  }

  function saveDraftHomework() {
    var d = draftHw;
    var titleEl = document.getElementById('hw-title');
    d.title = titleEl.value.trim();
    if (!d.title) { showErr('Give this classwork a name so you can find it later.', titleEl); return; }
    if (d.method === 'paste' && d.text.trim() && (!d.questions || L.splitQuestions(d.text).join('\n') !== d.questions.map(function (q) { return q.text; }).join('\n'))) detect(d.demo);
    var hasQ = d.questions && d.questions.length;
    if (!hasQ && !d.file) { showErr('Add at least one question, or choose a file.', null); return; }
    var saved = L.saveHomework(courseId, { id: d.forId, title: d.title, source: d.demo ? 'demo' : (hasQ ? 'paste' : 'file'), file: d.file, demo: d.demo, questions: hasQ ? d.questions : [] });
    L.prepareActivity(courseId, { id: 'hw:' + saved.id, type: 'homework', kind: 'guided', homeworkId: saved.id, title: saved.title });
    L.setResume(courseId, '/homework/h/' + saved.id, saved.title, 'ready');
    draftHw = null;
    location.hash = '/homework/h/' + saved.id;
  }

  /* ---------- Homework briefs ---------- */

  function viewHomeworkBrief(id) {
    var w = L.course(courseId).homework[id];
    if (!w) { viewMissing('That classwork is no longer saved here.'); return; }
    var act = L.activity(courseId, 'hw:' + id) || L.prepareActivity(courseId, { id: 'hw:' + id, type: 'homework', kind: 'guided', homeworkId: id, title: w.title });
    var groups = {};
    w.questions.forEach(function (q) { var k = q.topicId || ''; (groups[k] = groups[k] || []).push(q); });
    var keys = Object.keys(groups).sort(function (a, b) { return a === '' ? 1 : b === '' ? -1 : 0; });
    var main = '<section><h2>Source</h2><p style="margin:0;color:var(--ink-2)">' +
      (w.source === 'demo' ? '<span class="badge-demo">Demo worksheet</span> Sample questions, not from a file.' : w.source === 'file' ? 'File: ' + esc(w.file ? w.file.name : '') + '. Questions were not read from it.' : 'Questions you typed or pasted.' + (w.file ? ' File attached: ' + esc(w.file.name) + '.' : '')) + '</p></section>';
    if (w.questions.length) {
      main += '<section><h2>Questions by topic</h2><p style="margin:0 0 10px;color:var(--muted);font-size:14px">One worksheet, linked to each topic it touches.</p>' + keys.map(function (k) {
        return '<div style="margin-top:14px"><div style="display:flex;gap:8px;align-items:center;font-weight:700;font-size:14px">' + (k ? '<a href="' + h('/topic/' + k) + '">' + esc(topicTitle(k)) + '</a>' : '<span class="tag">Not sure yet</span>') + '<span style="color:var(--muted);font-weight:500">' + groups[k].length + '</span></div>' +
          '<ul class="rules" style="margin-top:4px">' + groups[k].map(function (q) { return '<li><span class="math" style="white-space:normal">' + esc(q.text) + '</span></li>'; }).join('') + '</ul></div>';
      }).join('') + '</section>';
    } else {
      main += '<section><h2>Questions</h2><p style="margin:0;color:var(--soft)">No questions typed yet. Edit this classwork to add them, so the tutor knows what you are working on.</p></section>';
    }
    main += '<section><h2>Help you can use</h2><ul class="rules"><li>' + U.icon('check') + 'Hints and step checks</li><li>' + U.icon('check') + 'The tutor will not give final answers</li><li>' + U.icon('check') + 'Nothing is shared with anyone. This is your own classwork.</li></ul></section>';
    mount(crumbs(base().concat([['Homework', h('/homework')], [w.title]])) +
      '<span class="kicker">Your classwork</span><h1 class="page-title">' + esc(w.title) + '</h1>' +
      '<div class="brief"><div class="brief-main">' + main + '</div>' +
      briefSide('Activity', act, 'Work through it on the board', 'guided', '<a class="btn btn-ghost" href="' + h('/homework/edit/' + id) + '">' + U.icon('pencil') + 'Edit questions and topics</a>') + '</div>');
    bindStart(act);
  }

  function briefSide(kicker, act, line, kind, extra) {
    var pts = kind === 'independent' ? L.RULES.independentCompleteReviewed : L.RULES.guidedCompleteReviewed;
    return '<aside class="brief-side" aria-label="Status and actions"><span class="kicker">' + esc(kicker) + '</span><h3>' + esc(line) + '</h3>' +
      '<p style="margin-top:10px">' + statusChip(act.status) + '</p>' +
      (act.position ? '<p>Saved place: question ' + esc(String(act.position.index + 1)) + '</p>' : '') +
      '<button type="button" class="btn btn-primary" data-start="' + esc(act.id) + '">' + (act.status === 'started' || act.status === 'paused' ? 'Continue' : 'Start') + U.icon('right') + '</button>' +
      (extra || '') +
      '<p class="pts-rule">Finish and review this ' + (kind === 'independent' ? 'check' : 'activity') + ': +' + pts + ' practice points, once. Hints never lower that.</p></aside>';
  }

  function bindStart(act) {
    var b = view.querySelector('[data-start]');
    if (b) b.addEventListener('click', function () {
      L.setResume(courseId, routeForActivity(act), act.title, act.status);
      workspaceNotice(act.title, b);
    });
  }

  function viewAssignment(id) {
    var a = assignments().filter(function (x) { return x.id === id; })[0];
    if (!a) { viewMissing(isSchool ? 'That assignment is not available.' : 'This course has no teacher connection, so there are no assignments.'); return; }
    var actId = 'asg:' + a.id;
    var act = L.activity(courseId, actId);
    var status = act ? act.status : null;
    var order = ['ready', 'started', 'finished', 'submitted'];
    var at = status ? order.indexOf(status === 'paused' ? 'started' : status) : -1;
    var stages = [
      ['ready', 'Saved', 'In your homework, not started.'],
      ['started', 'Working', 'Your place is saved as you go.'],
      ['finished', 'Finished', 'You are done working. Nothing is sent yet.'],
      ['submitted', 'Submitted', 'Sent to your teacher. A separate step from finishing.']
    ];
    var html = crumbs(base().concat([['Homework', h('/homework')], [a.title.split(':')[0]]])) +
      '<span class="kicker">From your teacher</span><h1 class="page-title">' + esc(a.title) + '</h1>' +
      '<article class="letter"><div class="letterhead"><span class="seal">' + U.icon('school') + '</span><div style="flex:1"><b>' + esc(crs.teacher) + '</b><div style="font-size:14px;color:var(--muted)">' + esc(crs.title) + (crs.section ? ', ' + esc(crs.section) : '') + ' · ' + esc(profile.school.name) + '</div></div>' + (a.demo ? '<span class="badge-demo">Fictional demo</span>' : '') + '</div>' +
      '<div class="letter-body"><div>' +
      '<h3>Purpose</h3><p style="margin:0">' + esc(a.purpose) + '</p>' +
      '<h3>Instructions</h3><p style="margin:0">' + esc(a.instructions) + '</p>' +
      '<h3>' + a.questions.length + ' questions</h3><ol class="qlist">' + a.questions.map(function (q) { return '<li><span class="math">' + esc(q) + '</span></li>'; }).join('') + '</ol>' +
      '<h3>Included</h3><ul>' + a.materials.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' +
      '<h3>Topics</h3><div class="prereqs">' + a.topicIds.map(function (t) { return '<a class="prereq" href="' + h('/topic/' + t) + '">' + dot(L.topicEvidence(courseId, t).state) + esc(topicTitle(t)) + '</a>'; }).join('') + '</div>' +
      '</div><div>' +
      '<h3>Due</h3><p style="margin:0">' + (a.due ? esc(fmtDate(a.due)) : 'No due date was given.') + '</p>' +
      '<h3>Help allowed</h3><p style="margin:0">' + esc(a.assistance) + '</p>' +
      '<h3>Sharing</h3><p style="margin:0">' + esc(a.sharing) + '</p>' +
      '<h3>Status</h3><ol class="lifecycle">' + stages.map(function (s, i) {
        return '<li class="' + (i < at ? 'on' : i === at ? 'here on' : '') + '"><span class="node" aria-hidden="true"></span><span><b>' + s[1] + (i === at ? ' (now)' : '') + '</b><small>' + s[2] + '</small></span></li>';
      }).join('') + '</ol>' +
      '<div class="form-actions" style="margin-top:12px">' +
      (act ? '<button type="button" class="btn btn-primary" id="asg-start">' + (status === 'started' || status === 'paused' ? 'Continue' : 'Start') + U.icon('right') + '</button>'
           : '<button type="button" class="btn btn-primary" id="asg-save">Save to my homework</button>') +
      '</div>' +
      (act ? '' : '<p class="input-help">Saving does not start it or earn points.</p>') +
      '</div></div></article>';
    mount(html);
    var sv = document.getElementById('asg-save');
    if (sv) sv.addEventListener('click', function () {
      L.prepareActivity(courseId, { id: actId, type: 'assignment', kind: 'guided', assignmentId: a.id, title: a.title });
      L.setResume(courseId, '/homework/a/' + a.id, a.title, 'ready');
      viewAssignment(id);
      var st = document.getElementById('asg-start'); if (st) st.focus();
    });
    var go = document.getElementById('asg-start');
    if (go) go.addEventListener('click', function () { L.setResume(courseId, '/homework/a/' + a.id, a.title, act.status); workspaceNotice(a.title, go); });
  }

  /* ---------- Topics ---------- */

  function viewTopics() {
    L.setIntent(courseId, 'understand');
    if (!outline) {
      mount(crumbs(base().concat([['Topics']])) + '<span class="kicker">Understand a topic</span><h1 class="page-title">Topics for ' + esc(crs.title) + '</h1>' +
        '<div class="panel" style="margin-top:24px;max-width:640px"><h3>Topic pages for this course are not written yet</h3><p>Markov has a pilot outline for Algebra I only. Bring the problem you are stuck on as classwork, and it will be saved for the workspace when it opens.</p>' +
        '<div class="form-actions"><a class="btn btn-primary" href="' + h('/homework/new') + '">Bring classwork' + U.icon('right') + '</a></div></div>');
      return;
    }
    mount(crumbs(base().concat([['Topics']])) + '<span class="kicker">Understand a topic</span><h1 class="page-title">What do you want to understand?</h1>' +
      '<p class="page-lede">Search by the topic name, how you would say it, or paste a problem.</p>' +
      '<div class="finder" role="search">' + ART.search + '<label class="sr-only" for="q">Search topics</label><input id="q" type="search" autocomplete="off" placeholder="x on both sides, or 3x + 2 = x + 10"></div>' +
      '<div class="finder-hints">Try <button type="button" class="hint-chip" data-q="3x + 2 = x + 10">3x + 2 = x + 10</button><button type="button" class="hint-chip" data-q="flip the sign">flip the sign</button><button type="button" class="hint-chip" data-q="brackets">brackets</button></div>' +
      '<div class="results" id="results" aria-live="polite"></div>' +
      '<div class="section-label"><h2>All topics</h2><p>' + esc(outline.sequenceLabel) + '. No teacher-approved order for this course yet.</p></div>' +
      outlineHtml(currentUnit().id) + legendHtml() +
      '<p class="input-help" style="margin-top:14px">' + esc(outline.outlineNote) + '</p>');
    var q = document.getElementById('q'), out = document.getElementById('results');
    function run() {
      var hits = C.searchTopics(outline, q.value);
      if (!q.value.trim()) { out.innerHTML = ''; return; }
      out.innerHTML = hits.length ? '<div class="outline">' + hits.slice(0, 5).map(function (x) {
        return '<a class="topic-row" style="padding-left:18px" href="' + h('/topic/' + x.topic.id) + '">' + dot(L.topicEvidence(courseId, x.topic.id).state) +
          '<span><span class="t">' + esc(x.topic.title) + '</span><br><span class="d">Unit ' + x.unit.n + ' · ' + esc(x.topic.plain) + '</span></span><span class="math">' + esc(x.topic.example.replace(/^(Solve|Find|Simplify|Expand)\s+/, '')) + '</span></a>';
      }).join('') + '</div>' : '<div class="panel"><p>No topic in this pilot outline matches that. Try other words, or bring it as classwork so it is saved.</p></div>';
    }
    q.addEventListener('input', run);
    view.querySelectorAll('[data-q]').forEach(function (b) { b.addEventListener('click', function () { q.value = b.getAttribute('data-q'); run(); q.focus(); }); });
  }

  function viewTopic(id) {
    var hit = outline ? C.findTopic(outline, id) : null;
    if (!hit) { viewMissing('That topic is not in this course outline.'); return; }
    var t = hit.topic, u = hit.unit;
    var ev = L.topicEvidence(courseId, t.id);
    var notInClass = !!L.course(courseId).topicPrefs[t.id];
    var ways = ['learn', 'practice', 'check'].map(function (m, i) {
      var M = C.MODES[m];
      var act = L.activity(courseId, 'topic:' + t.id + ':' + m);
      return '<a class="way ' + m + '" href="' + h('/topic/' + t.id + '/' + m) + '"><span class="num">' + (i + 1) + '</span><span><b>' + esc(M.title) + '</b><small>' + esc(M.purpose) + '</small></span>' +
        (act ? statusChip(act.status) : '<span class="tag">' + (M.kind === 'independent' ? 'No hints' : 'Hints on') + ' · ' + M.minutes + ' min</span>') + '</a>';
    }).join('');
    var html = crumbs(base().concat([['Topics', h('/topics')], [t.title]])) +
      '<div class="topic-hero"><div><span class="kicker">Unit ' + u.n + ': ' + esc(u.title) + '</span><h1 class="page-title">' + esc(t.title) + '</h1>' +
      '<p class="page-lede">' + esc(t.plain) + '</p>' +
      '<p style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + dot(ev.state) + '<strong>' + esc(ev.label) + '</strong></p></div>' +
      '<div class="notation"><span class="cap">A problem like this</span><span class="eq">' + esc(t.example) + '</span>' + ART.underline + '</div></div>' +
      '<div class="home-cols"><div>' +
      '<div class="section-label"><h2>Ways in</h2><p>Pick any. Nothing is locked.</p></div><div class="ways">' + ways + '</div>' +
      '</div><div class="side-stack" style="margin-top:36px">' +
      '<div class="panel"><h3>What you will learn</h3><ul class="objectives">' + t.objectives.map(function (o) { return '<li>' + U.icon('check') + esc(o) + '</li>'; }).join('') + '</ul></div>' +
      (t.prereqs.length ? '<div class="panel"><h3>Earlier ideas it uses</h3><div class="prereqs">' + t.prereqs.map(function (p) { return '<a class="prereq" href="' + h('/topic/' + p) + '">' + dot(L.topicEvidence(courseId, p).state) + esc(topicTitle(p)) + '</a>'; }).join('') + '</div></div>' : '') +
      '<div class="panel"><h3>Why it shows “' + esc(ev.label) + '”</h3><p>' + esc(ev.basis) + '</p>' +
      (ev.history.length ? '<ul class="mini-list">' + ev.history.slice(-4).reverse().map(function (e) { return '<li><a href="' + h('/progress') + '"><span class="grow">' + (e.kind === 'independent' ? 'Independent check' : 'Guided activity') + (e.kind === 'independent' ? (e.success ? ', went well' : ', something to review') : '') + '<br><small>' + esc(e.day) + (e.hintsUsed ? ' · ' + e.hintsUsed + ' hints' : '') + '</small></span></a></li>'; }).join('') + '</ul>' : '') +
      '<label class="toggle-row"><input type="checkbox" id="not-in-class"' + (notInClass ? ' checked' : '') + '> My class is not on this right now</label></div>' +
      '</div></div>';
    mount(html);
    document.getElementById('not-in-class').addEventListener('change', function (e) { L.setNotInClass(courseId, t.id, e.target.checked); });
  }

  function viewActivityBrief(topicId, mode) {
    var hit = outline ? C.findTopic(outline, topicId) : null;
    var M = C.MODES[mode];
    if (!hit || !M) { viewMissing('That activity is not available.'); return; }
    var t = hit.topic;
    var actId = 'topic:' + t.id + ':' + mode;
    var act = L.activity(courseId, actId);
    var steps = {
      learn: ['A short explanation built around ' + t.example, 'One worked example, step by step', 'Your turn: one small step on the board'],
      practice: ['Three to five problems like ' + t.example, 'A check after each step you write', 'A quick look back at what tripped you up'],
      check: ['Three fresh problems', 'You work alone, no hints', 'Feedback on every step when you finish']
    }[mode];
    var main = '<section><h2>Purpose</h2><p style="margin:0;color:var(--ink-2)">' + esc(M.purpose) + '</p></section>' +
      '<section><h2>What happens</h2><ol class="rules" style="list-style:decimal;padding-left:20px">' + steps.map(function (s) { return '<li style="display:list-item">' + esc(s) + '</li>'; }).join('') + '</ol></section>' +
      '<section><h2>Help in this activity</h2><ul class="rules">' + M.assistance.map(function (r) { return '<li>' + U.icon('check') + esc(r) + '</li>'; }).join('') + '</ul></section>' +
      '<section><h2>Counts as</h2><p style="margin:0;color:var(--ink-2)">' + (M.kind === 'independent' ? 'Independent evidence for ' + esc(t.title) + ', if it goes well.' : 'Practice with help for ' + esc(t.title) + '. Guided work is not counted as independent evidence.') + '</p></section>';
    var side;
    if (act) side = briefSide(M.title, act, 'About ' + M.minutes + ' minutes', M.kind, '');
    else side = '<aside class="brief-side" aria-label="Status and actions"><span class="kicker">' + esc(M.title) + '</span><h3>About ' + M.minutes + ' minutes</h3><p>Not saved yet.</p>' +
      '<button type="button" class="btn btn-primary" id="save-act">Save to my plan</button>' +
      '<p class="pts-rule">Saving earns no points. Finish and review this ' + (M.kind === 'independent' ? 'check' : 'activity') + ': +' + (M.kind === 'independent' ? L.RULES.independentCompleteReviewed : L.RULES.guidedCompleteReviewed) + ' practice points, once. Hints never lower that.</p></aside>';
    mount(crumbs(base().concat([['Topics', h('/topics')], [t.title, h('/topic/' + t.id)], [M.title]])) +
      '<span class="kicker">' + esc(t.title) + '</span><h1 class="page-title">' + esc(M.title) + '</h1>' +
      '<div class="brief"><div class="brief-main">' + main + '</div>' + side + '</div>');
    var sv = document.getElementById('save-act');
    if (sv) sv.addEventListener('click', function () {
      var a = L.prepareActivity(courseId, { id: actId, type: 'topic', mode: mode, kind: M.kind, topicId: t.id, title: M.title + ': ' + t.title });
      L.setResume(courseId, '/topic/' + t.id + '/' + mode, a.title, 'ready');
      viewActivityBrief(topicId, mode);
      var st = view.querySelector('[data-start]'); if (st) st.focus();
    });
    if (act) bindStart(act);
  }

  /* ---------- Test preparation ---------- */

  function viewTests() {
    L.setIntent(courseId, 'test');
    var plans = Object.keys(L.course(courseId).plans).map(function (k) { return L.course(courseId).plans[k]; });
    if (!plans.length) { viewPlanEdit(null); return; }
    mount(crumbs(base().concat([['Test plans']])) + '<span class="kicker">Prepare for a test</span><h1 class="page-title">Your test plans</h1>' +
      '<div style="margin-top:22px;max-width:720px">' + plans.map(function (p) {
        var d = daysUntil(p.date);
        return '<a class="hw-item" href="' + h('/test/' + p.id) + '" style="color:var(--blue)"><span class="intent-icon" style="background:var(--mist);color:#075985">' + ART.te + '</span><span class="grow"><b style="color:var(--ink)">' + esc(p.name) + '</b><small>' + (p.date ? esc(fmtDate(p.date)) + (d != null && d >= 0 ? ' · in ' + d + ' day' + (d === 1 ? '' : 's') : '') : 'No date set') + ' · ' + (p.topicIds.length + p.freeTopics.length) + ' topics</small></span>' + U.icon('right') + '</a>';
      }).join('') +
      '<a class="dropzone" style="min-height:96px;margin-top:6px" href="' + h('/test/new') + '">' + U.icon('plus') + '<b>New test plan</b></a></div>');
  }

  function viewPlanEdit(id) {
    var c = L.course(courseId);
    var p = id ? c.plans[id] : null;
    if (id && !p) { viewMissing('That plan is no longer saved here.'); return; }
    var review = isSchool ? C.reviewMaterialFor(schoolCode) : null;
    var sel = {}; (p ? p.topicIds : []).forEach(function (t) { sel[t] = true; });
    var scope = '';
    if (outline) {
      scope = '<div class="scope">' + outline.units.map(function (u) {
        var all = u.topics.every(function (t) { return sel[t.id]; });
        return '<div class="scope-unit"><label><input type="checkbox" class="unit-all" data-unit="' + u.id + '"' + (all ? ' checked' : '') + '>Unit ' + u.n + ': ' + esc(u.title) + '</label>' +
          '<div class="scope-topics">' + u.topics.map(function (t) {
            return '<label class="check-chip"><input type="checkbox" name="topic" value="' + t.id + '" data-unit="' + u.id + '"' + (sel[t.id] ? ' checked' : '') + '><span>' + esc(t.title) + '</span></label>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
    } else {
      scope = '<label class="label" for="free">Topics, one per line</label><textarea class="textarea" id="free" style="min-height:120px;font-family:Inter,sans-serif" placeholder="Triangle congruence&#10;Area of circles">' + esc(p ? p.freeTopics.join('\n') : '') + '</textarea>';
    }
    var mins = p ? p.sessionMinutes : 30;
    var html = crumbs(base().concat([['Test plans', h('/test')], [p ? 'Edit plan' : 'New plan']])) +
      '<div class="form-wrap"><span class="kicker">Prepare for a test</span><h1 class="page-title">' + (p ? 'Edit your test plan' : 'What is the test on?') + '</h1>' +
      '<p class="page-lede">Choose what is on it and how long you have today. You get a starting plan you can change anytime.</p>' +
      '<form id="plan-form" novalidate style="margin-top:26px">' +
      '<div class="field"><label class="label" for="pname">Test name</label><input class="text-input" id="pname" maxlength="80" placeholder="Unit 2 quiz" value="' + esc(p ? p.name : '') + '"></div>' +
      '<div class="field"><label class="label" for="pdate">Date <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input class="text-input" type="date" id="pdate" value="' + esc(p ? p.date : '') + '" style="max-width:240px"></div>' +
      '<fieldset class="field" style="border:0;padding:0;margin:22px 0 0"><legend class="label">What is on it?</legend>' + scope +
      '<label class="toggle-row"><input type="checkbox" id="unsure"' + (p && p.unsure ? ' checked' : '') + '> I am not sure of the exact scope yet</label></fieldset>' +
      (review ? '<label class="toggle-row" style="margin-top:8px"><input type="checkbox" id="use-review"' + (p && p.useReview ? ' checked' : '') + '> Use ' + esc(review.title) + ' from ' + esc(crs.teacher) + (review.demo ? ' <span class="badge-demo">Fictional demo</span>' : '') + '</label>' : '') +
      '<fieldset class="field" style="border:0;padding:0;margin:22px 0 0"><legend class="label">Time for today’s session</legend><div class="seg">' + [15, 30, 45, 60].map(function (m) {
        return '<label><input type="radio" name="mins" value="' + m + '"' + (mins === m ? ' checked' : '') + '><span>' + m + ' min</span></label>';
      }).join('') + '</div></fieldset>' +
      '<p class="field-error" id="plan-error" role="alert" hidden>' + U.icon('close') + '<span></span></p>' +
      '<div class="form-actions"><button type="submit" class="btn btn-primary">' + (p ? 'Update plan' : 'Make my starting plan') + U.icon('right') + '</button>' +
      '<a class="btn btn-ghost" href="' + h(p ? '/test/' + p.id : '/') + '">Cancel</a>' +
      (p ? '<button type="button" class="btn btn-danger" id="del-plan">Delete plan</button>' : '') + '</div></form></div>';
    mount(html);
    var form = document.getElementById('plan-form');
    form.querySelectorAll('.unit-all').forEach(function (u) {
      u.addEventListener('change', function () { form.querySelectorAll('input[name=topic][data-unit="' + u.getAttribute('data-unit') + '"]').forEach(function (t) { t.checked = u.checked; }); });
    });
    form.querySelectorAll('input[name=topic]').forEach(function (t) {
      t.addEventListener('change', function () {
        var unit = t.getAttribute('data-unit');
        var all = Array.prototype.every.call(form.querySelectorAll('input[name=topic][data-unit="' + unit + '"]'), function (x) { return x.checked; });
        form.querySelector('.unit-all[data-unit="' + unit + '"]').checked = all;
      });
    });
    var useRev = document.getElementById('use-review');
    if (useRev && review) useRev.addEventListener('change', function () {
      if (!useRev.checked) return;
      review.topics.forEach(function (tid) { var cb = form.querySelector('input[name=topic][value="' + tid + '"]'); if (cb) cb.checked = true; });
      form.querySelectorAll('input[name=topic]').forEach(function (t) { t.dispatchEvent(new Event('change')); });
    });
    var del = document.getElementById('del-plan');
    if (del) del.addEventListener('click', function () {
      if (!window.confirm('Delete this test plan? Your topic progress is not affected.')) return;
      L.deletePlan(courseId, p.id);
      var c2 = L.course(courseId);
      if (c2.resume && c2.resume.route === '/test/' + p.id) { c2.resume = null; L.setIntent(courseId, 'test'); }
      location.hash = '/test';
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = document.getElementById('plan-error');
      function fail(msg, el) { err.hidden = false; err.querySelector('span').textContent = msg; if (el) el.focus(); }
      var name = document.getElementById('pname').value.trim();
      var topics = Array.prototype.map.call(form.querySelectorAll('input[name=topic]:checked'), function (x) { return x.value; });
      var free = outline ? [] : L.splitQuestions((document.getElementById('free') || {}).value || '');
      var unsure = document.getElementById('unsure').checked;
      if (!name) { fail('Give the test a name.', document.getElementById('pname')); return; }
      if (!topics.length && !free.length) {
        if (unsure && outline) { topics = currentUnit().topics.map(function (t) { return t.id; }); }
        else { fail(outline ? 'Choose at least one topic, or tick “not sure” to start with your current unit.' : 'Add at least one topic.', null); return; }
      }
      var minsVal = +((form.querySelector('input[name=mins]:checked') || {}).value || 30);
      var saved = L.savePlan(courseId, { id: p ? p.id : null, name: name, date: document.getElementById('pdate').value, topicIds: topics, freeTopics: free, unsure: unsure, sessionMinutes: minsVal, useReview: !!(useRev && useRev.checked) });
      L.setResume(courseId, '/test/' + saved.id, 'Test plan: ' + saved.name, 'ready');
      location.hash = '/test/' + saved.id;
    });
  }

  function viewPlan(id) {
    var p = L.course(courseId).plans[id];
    if (!p) { viewMissing('That plan is no longer saved here.'); return; }
    var plan = L.buildPlan(courseId, p, topicTitle);
    var d = daysUntil(p.date);
    var phases = [
      [1, 'Check the starting point', 'Find out which topics need attention.'],
      [2, 'Review what needs attention', plan.starting ? 'Every topic is listed until the starting check shows which to keep.' : 'Topics without independent evidence yet.'],
      [3, 'Practice', 'Mixed problems, closer to a real test.'],
      [4, 'Try a fresh independent check', 'New questions, no hints.']
    ];
    var inSession = {}; plan.thisSession.forEach(function (s) { inSession[s.id] = true; });
    function stepHtml(s) {
      var later = !inSession[s.id];
      return '<div class="pstep' + (later ? ' later' : '') + '"><span class="grow"><b>' + esc(s.title) + '</b><small>' + esc(s.detail) + ' · ' + s.minutes + ' min · ' + (s.kind === 'independent' ? 'no hints' : 'hints on') + '</small></span>' +
        (later ? '<span class="tag">Later</span>' : '<button type="button" class="btn btn-ghost" data-step="' + esc(s.id) + '" style="min-height:40px">Start</button>') + '</div>';
    }
    var html = crumbs(base().concat([['Test plans', h('/test')], [p.name]])) +
      '<div class="plan-head"><div><span class="kicker">' + (plan.starting ? 'Starting plan' : 'Plan') + '</span><h1 class="page-title">' + esc(p.name) + '</h1>' +
      '<div class="plan-facts" style="margin-top:10px">' + (p.date ? '<span class="tag">' + U.icon('check') + esc(fmtDate(p.date)) + (d != null ? (d >= 0 ? ' · in ' + d + ' day' + (d === 1 ? '' : 's') : ' · date passed') : '') + '</span>' : '<span class="tag">No date set</span>') +
      '<span class="tag">' + plan.topics.length + ' topic' + (plan.topics.length === 1 ? '' : 's') + '</span>' + (p.unsure ? '<span class="tag">Scope not certain</span>' : '') + (p.useReview ? '<span class="tag school">Teacher review sheet</span>' : '') + '</div></div>' +
      '<a class="btn btn-ghost" href="' + h('/test/' + p.id + '/edit') + '">' + U.icon('pencil') + 'Edit scope</a></div>' +
      (plan.starting ? '<div class="note" style="margin-top:20px">' + U.icon('check') + '<p><strong>This is a starting plan.</strong> There are no results for these topics yet, so it is a sequence to follow, not a readiness check. It cannot predict a score.</p></div>' : '') +
      '<div class="session-bar"><b>Today: ' + p.sessionMinutes + ' minutes</b><span class="track" aria-hidden="true"><i style="width:' + Math.round(100 * plan.usedMinutes / p.sessionMinutes) + '%"></i></span>' +
      '<span style="font-size:14px;color:var(--soft)">' + plan.thisSession.length + ' of ' + plan.steps.length + ' steps fit (' + plan.usedMinutes + ' min). The rest, about ' + (plan.totalMinutes - plan.usedMinutes) + ' min, waits for later sessions.</span></div>' +
      '<div class="timeline">' + phases.map(function (ph) {
        var ss = plan.steps.filter(function (s) { return s.phase === ph[0]; });
        return '<div class="phase"><div class="phase-rail"><span class="phase-n">' + ph[0] + '</span></div><div class="phase-body"><h3>' + esc(ph[1]) + '</h3><p>' + esc(ph[2]) + '</p>' + ss.map(stepHtml).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="section-label"><h2>Topics in this plan</h2><p>Each topic keeps its own evidence. One good result does not mark the whole test ready.</p></div>' +
      '<div class="prereqs">' + plan.topics.map(function (t) { return t.free ? '<span class="prereq">' + esc(t.title) + '</span>' : '<a class="prereq" href="' + h('/topic/' + t.id) + '">' + dot(L.topicEvidence(courseId, t.id).state) + esc(t.title) + '</a>'; }).join('') + '</div>';
    mount(html);
    view.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = plan.steps.filter(function (x) { return x.id === b.getAttribute('data-step'); })[0];
        var a = L.prepareActivity(courseId, { id: s.id, type: 'test-step', kind: s.kind, planId: p.id, topicId: s.topicId || null, title: s.title + ' (' + p.name + ')' });
        L.setResume(courseId, '/test/' + p.id, 'Test plan: ' + p.name, a.status);
        workspaceNotice(a.title, b);
      });
    });
  }

  /* ---------- Progress ---------- */

  function viewProgress() {
    var st = L.streak();
    var part = L.participation(courseId);
    var goal = L.dailyGoal();
    var ev = outline ? evidenceSummary() : null;
    var html = crumbs(base().concat([['Progress']])) + '<span class="kicker">' + esc(crs.title) + '</span><h1 class="page-title">Your progress</h1>' +
      '<p class="page-lede">Three different things, kept apart: how often you practice, what you have done, and what you have shown.</p>' +
      '<div class="prog-grid">' +
      '<section class="prog-card" aria-labelledby="pc1"><span class="kicker" id="pc1">Consistency</span><div class="big">' + st.current + ' <small>day streak</small></div>' +
      '<p>' + st.totalDays + ' practice day' + (st.totalDays === 1 ? '' : 's') + ' in total. Longest streak: ' + st.longest + '.</p>' +
      '<div class="week" aria-label="This week">' + st.week.map(function (w) { return '<span class="' + (w.practiced ? 'on' : '') + (w.today ? ' today' : '') + '"><i></i>' + esc(new Date(w.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })) + '</span>'; }).join('') + '</div>' +
      '<p style="font-size:13px">' + (st.practicedToday ? 'Today counts already.' : (st.current ? 'Finish one activity today to keep it going.' : 'A streak starts with one finished activity.')) + ' A missed day never removes points or progress.</p></section>' +
      '<section class="prog-card" aria-labelledby="pc2"><span class="kicker" id="pc2">Participation</span><div class="big">' + part.finished + ' <small>finished</small></div>' +
      '<p>' + part.attempted + ' started or finished. ' + part.ready + ' saved and ready to begin.</p>' +
      '<p style="font-size:13px;margin-top:10px"><strong>' + L.totalPoints() + ' practice points</strong> across all your courses. Points show effort, not grades.</p></section>' +
      '<section class="prog-card" aria-labelledby="pc3"><span class="kicker" id="pc3">Learning evidence</span>' +
      (ev ? '<div class="big">' + ev.indep + ' <small>of ' + ev.total + ' topics</small></div><p>with independent evidence. ' + ev.practiced + ' of ' + ev.total + ' practiced at all.</p><p style="font-size:13px">Out of the ' + ev.total + ' topics in the pilot outline, not all of ' + esc(crs.title) + '.</p>'
          : '<div class="big">0</div><p>No outline for this course yet, so there is nothing to measure against.</p>') + '</section></div>';

    html += '<div class="section-label"><h2>Daily goal</h2><p>Uses practice points. ' + L.RULES.guidedCompleteReviewed + ' points is about one guided activity.</p></div>' +
      '<div class="seg" role="radiogroup" aria-label="Daily goal">' + L.RULES.dailyGoalChoices.map(function (n) {
        return '<label><input type="radio" name="goal" value="' + n + '"' + (goal === n ? ' checked' : '') + '><span>' + n + ' points a day</span></label>';
      }).join('') + '</div>' +
      '<p class="input-help">Days are counted in ' + esc(L.timezone()) + ' time. Multiple activities in one day add points but count as one streak day.</p>';

    if (outline) {
      html += '<div class="section-label"><h2>Topics</h2><p>What each state is based on</p></div><div class="panel" style="padding:6px 8px"><table class="ev-table"><thead><tr><th>Topic</th><th>State</th><th class="hide-sm">Based on</th></tr></thead><tbody>' +
        C.allTopics(outline).map(function (x) {
          var e = L.topicEvidence(courseId, x.topic.id);
          return '<tr><td><a href="' + h('/topic/' + x.topic.id) + '">' + esc(x.topic.title) + '</a><div class="d">Unit ' + x.unit.n + '</div></td><td>' + dot(e.state) + ' ' + esc(e.label) + '</td><td class="hide-sm d">' + esc(e.basis) + (e.history.length ? ' (' + e.history.length + ' finished)' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    html += '<p class="input-help" style="margin-top:22px">Saved in this browser only. Not an account, not synced to other devices, and not shared with a school.</p>';
    if (L.DEMO) html += devPanel();
    mount(html);
    view.querySelectorAll('input[name=goal]').forEach(function (r) { r.addEventListener('change', function () { L.setDailyGoal(+r.value); }); });
    if (L.DEMO) bindDev();
  }

  /* ---------- Demo-only simulation panel ---------- */

  function devPanel() {
    var opts = outline ? C.allTopics(outline).map(function (x) { return '<option value="' + x.topic.id + '">' + esc(x.topic.title) + '</option>'; }).join('') : '<option value="">No outline</option>';
    return '<section class="dev-panel" aria-labelledby="dev-h"><h2 id="dev-h">Demo controls (not part of the student experience)</h2>' +
      '<p style="margin:0;font-size:14px;color:var(--demo)">Writes only to ' + esc(L.KEY) + '. The real record is never touched.</p>' +
      '<div class="row"><label class="sr-only" for="dev-topic">Topic</label><select class="select" id="dev-topic">' + opts + '</select>' +
      '<label class="sr-only" for="dev-day">Day</label><select class="select" id="dev-day"><option value="0">Today</option><option value="1">Yesterday</option><option value="2">2 days ago</option></select></div>' +
      '<div class="row"><button type="button" class="btn btn-ghost" data-dev="guided">Finish guided activity</button><button type="button" class="btn btn-ghost" data-dev="pass">Independent check, went well</button><button type="button" class="btn btn-ghost" data-dev="fail">Independent check, needs review</button></div>' +
      '<div class="row"><button type="button" class="btn btn-ghost" data-dev="replay">Replay last report</button><button type="button" class="btn btn-ghost" data-dev="pause">Mark latest saved activity started</button><button type="button" class="btn btn-danger" data-dev="reset">Reset demo record</button></div>' +
      '<div class="dev-log" id="dev-log" aria-live="polite"></div></section>';
  }

  var lastReport = null;
  function bindDev() {
    var log = document.getElementById('dev-log');
    view.querySelectorAll('[data-dev]').forEach(function (b) {
      b.addEventListener('click', function () {
        var kind = b.getAttribute('data-dev');
        var topic = document.getElementById('dev-topic').value;
        var ago = +document.getElementById('dev-day').value;
        var r;
        if (kind === 'reset') { L.resetDemo(); lastReport = null; r = 'Demo record cleared.'; }
        else if (kind === 'replay') {
          if (!lastReport) r = 'Nothing to replay yet.';
          else { var res = L.recordCompletion(lastReport); r = 'Replayed ' + lastReport.activityId + ': ' + (res.duplicate ? 'duplicate ignored, +0' : '+' + res.points); }
        } else if (kind === 'pause') {
          var acts = L.course(courseId).activities, ids = Object.keys(acts).filter(function (k) { return acts[k].status === 'ready'; });
          if (!ids.length) r = 'No saved activity to start.';
          else { L.setStatus(courseId, ids[0], 'started', { index: 1 }); r = 'Marked ' + ids[0] + ' as started.'; }
        } else if (topic) {
          var at = new Date(Date.now() - ago * 86400000).toISOString();
          var actId = 'demo:' + topic + ':' + (kind === 'guided' ? 'guided' : 'independent');
          L.prepareActivity(courseId, { id: actId, type: 'topic', mode: kind === 'guided' ? 'practice' : 'check', kind: kind === 'guided' ? 'guided' : 'independent', topicId: topic, title: 'Demo: ' + topicTitle(topic) });
          lastReport = { courseId: courseId, activityId: actId, attemptId: 'a' + Date.now(), topicId: topic, kind: kind === 'guided' ? 'guided' : 'independent', reviewed: true, hintsUsed: kind === 'guided' ? 3 : 0, success: kind !== 'fail', at: at };
          var out = L.recordCompletion(lastReport);
          r = 'Recorded ' + (kind === 'guided' ? 'guided finish' : 'independent check') + ' on ' + topicTitle(topic) + ': +' + out.points;
        }
        route();
        var l2 = document.getElementById('dev-log'); if (l2) l2.textContent = r || '';
      });
    });
  }

  /* ---------- Missing states ---------- */

  function viewMissing(msg) {
    mount(crumbs(base()) + '<h1 class="page-title">Not found</h1><p class="page-lede">' + esc(msg) + '</p><div class="form-actions"><a class="btn btn-primary" href="' + h('/') + '">Back to ' + esc(crs.title) + '</a></div>');
  }

  function viewNoCourse() {
    topbar.innerHTML = U.wordmark() + '<span class="spacer"></span><a class="toplink" href="learn">' + U.icon('left') + '<span>Your courses</span></a>';
    var text = !profile ? 'Set up your learning space first, then open a course from Your courses.'
      : !profile.setupComplete ? 'Your setup is not finished yet. Finish it, then open a course.'
      : 'That course is not in your learning space. It may have been removed.';
    view.innerHTML = '<div class="empty-home"><span class="kicker">Course</span><h1 tabindex="-1">We could not open that course</h1><p>' + esc(text) + '</p><div class="begin-actions">' +
      '<a class="btn btn-primary" href="' + (profile && profile.setupComplete ? 'learn' : 'onboarding') + '">' + (profile && profile.setupComplete ? 'Go to your courses' : 'Set up') + U.icon('right') + '</a></div></div>';
    var hd = view.querySelector('h1'); if (hd) hd.focus();
  }

  /* ---------- Router ---------- */

  function route() {
    if (dlg.open) closeSheet();
    var parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    var a = parts[0] || '';
    document.title = (crs ? crs.title + ' · ' : '') + 'Markov.ink';
    if (a === '') return viewHome();
    if (a === 'homework') {
      if (!parts[1]) return viewHomework();
      if (parts[1] === 'new') { if (draftHw && draftHw.forId) draftHw = null; return viewHomeworkNew(null); }
      if (parts[1] === 'edit' && parts[2]) return viewHomeworkNew(parts[2]);
      if (parts[1] === 'h' && parts[2]) return viewHomeworkBrief(parts[2]);
      if (parts[1] === 'a' && parts[2]) return viewAssignment(parts[2]);
    }
    if (a === 'topics') return viewTopics();
    if (a === 'topic' && parts[1]) return parts[2] ? viewActivityBrief(parts[1], parts[2]) : viewTopic(parts[1]);
    if (a === 'test') {
      if (!parts[1]) return viewTests();
      if (parts[1] === 'new') return viewPlanEdit(null);
      if (parts[2] === 'edit') return viewPlanEdit(parts[1]);
      return viewPlan(parts[1]);
    }
    if (a === 'progress') return viewProgress();
    viewMissing('That page does not exist.');
  }

  if (!crs) { viewNoCourse(); return; }
  renderTop();
  window.addEventListener('hashchange', route);
  window.addEventListener('storage', function (e) { if (e.key === L.KEY) { L.reload(); route(); } });
  route();
})();
