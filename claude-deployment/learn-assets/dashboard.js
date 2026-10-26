/* Markov.ink learning home: courses first, nothing invented. */
(function () {
  'use strict';

  var P = window.MarkovProfile, U = window.MarkovUI, esc = U.esc;
  var home = document.getElementById('home');
  var topbar = document.getElementById('topbar');
  var dlgCourse = document.getElementById('dlg-course');
  var dlgProfile = document.getElementById('dlg-profile');
  var dlgJoin = document.getElementById('dlg-join');

  // How each goal frames the first step. Guidance only, never based on history.
  var GOAL_START = {
    'keep-up': 'Start with what your class is covering this week.',
    'understand': 'Start with the topic that feels hardest right now.',
    'test-prep': 'Start with the topics your test will cover.',
    'explore': 'Start with whatever looks interesting next.'
  };

  var profile = null;
  var loadStatus = 'empty';

  function load() {
    var r = P.load();
    profile = r.profile;
    loadStatus = r.status;
  }

  function stageLabel(id) { var s = P.stage(id); return s ? s.label : ''; }
  function firstName() { return (profile.name || '').split(' ')[0]; }

  /* ---------- Top bar ---------- */

  function renderTop() {
    var right = '<a class="toplink" href="whiteboard">' + U.icon('board') + '<span>Whiteboard</span></a>';
    if (profile && profile.setupComplete) {
      right += '<button type="button" class="toplink" id="btn-profile" aria-haspopup="dialog">' + U.icon('user') + '<span>' + esc(firstName()) + '</span><span class="sr-only">, open learning profile</span></button>';
    }
    topbar.innerHTML = U.wordmark() + '<span class="spacer"></span>' + right;
    var b = document.getElementById('btn-profile');
    if (b) b.addEventListener('click', openProfile);
  }

  /* ---------- Page ---------- */

  function render() {
    renderTop();
    if (!profile || !profile.setupComplete) { renderEmpty(); return; }

    var d = profile;
    var school = P.schoolCourses(d);
    var personal = P.personalCourses(d);
    var featured = school[0] || personal[0];
    var g = P.goal(d.goal);

    var html = '<div class="home">';
    if (P.storageKind() === 'tab') {
      html += '<div class="note warn" style="margin-bottom:20px">' + U.icon('lock') + '<p><strong>This browser is blocking saved data.</strong> Your setup will last while this tab stays open.</p></div>';
    }

    // header: who, where, and the goal
    html += '<div class="home-head"><div>' +
      '<span class="kicker">Your learning space</span>' +
      '<h1 class="home-title">Hi, ' + esc(firstName()) + '</h1>' +
      '<p class="home-sub">' + esc([stageLabel(d.stage), P.placeLabel(d) === 'Place not set' ? '' : P.placeLabel(d), P.curriculumLabel(d)].filter(Boolean).join(' · ')) + '</p>' +
      '</div>' +
      (g ? '<div class="goal-pill"><div style="flex:1"><span class="kicker">Your goal</span><strong>' + esc(g.title) + '</strong></div><a class="btn btn-quiet" href="onboarding?edit=goal" aria-label="Change your goal">Change</a></div>' : '') +
      '</div>';

    // begin here
    if (featured) {
      var isSchool = featured.origin === 'school';
      html += '<section class="begin" data-area="' + featured.area + '" aria-labelledby="begin-title">' +
        '<div class="begin-main">' +
        '<span class="kicker">Begin here</span>' +
        '<h2 id="begin-title">' + esc(featured.title) + '</h2>' +
        '<p>' + (isSchool
          ? 'Your class with ' + esc(featured.teacher) + '. ' + esc(GOAL_START[d.goal] || '')
          : 'Your own course. ' + esc(GOAL_START[d.goal] || '')) + '</p>' +
        '<div class="begin-actions">' +
        '<button type="button" class="btn btn-primary" data-open="' + esc(featured.id) + '">Open ' + esc(featured.title) + U.icon('right') + '</button>' +
        '<a class="btn btn-ghost" href="whiteboard">' + U.icon('board') + 'Practice on the whiteboard</a>' +
        '</div></div>' +
        '<div class="begin-art">' + (isSchool ? '<span class="tag school">' + U.icon('school') + 'School course</span>' : '<span class="tag">' + U.icon('user') + 'Your course</span>') +
        U.glyph(featured.glyph) + '</div>' +
        '</section>';
    }

    // school classes
    if (school.length) {
      html += '<div class="section-head"><h2>Your class</h2><p>Managed by your school. Shown only as the invitation described it.</p></div><div class="classes">' +
        school.map(function (c) {
          return '<article class="class-card" data-area="' + c.area + '" aria-label="' + esc(c.title) + ' class">' +
            '<span class="class-spine" aria-hidden="true"></span>' +
            '<div class="class-info">' +
            '<h3>' + esc(c.title) + '</h3>' +
            '<div class="class-meta">' + (c.section ? esc(c.section) + ' &middot; ' : '') + 'Teacher <b>' + esc(c.teacher) + '</b></div>' +
            '<div class="class-meta">' + esc(d.school ? d.school.name : '') + '</div>' +
            '<div class="row"><span class="tag school">' + U.icon('lock') + 'School course</span>' + (d.school && d.school.demo ? '<span class="badge-demo">Fictional demo</span>' : '') +
            '<button type="button" class="btn btn-quiet" data-open="' + esc(c.id) + '">Open course' + U.icon('right') + '</button></div>' +
            '</div>' +
            '<div class="class-work"><h4 class="kicker">Class work</h4>' +
            '<div class="empty-work">' + U.icon('tray') + '<p style="margin:0">Nothing assigned yet. When ' + esc(c.teacher) + ' posts work for ' + esc(c.title) + ', it will show up here.</p></div>' +
            '</div></article>';
        }).join('') + '</div>';
    }

    // personal courses
    html += '<div class="section-head"><h2>' + (school.length ? 'Your own courses' : 'Your courses') + '</h2><p>' + (personal.length ? 'Only you manage these.' : '') + '</p></div>';
    if (personal.length) {
      html += '<ul class="shelf">' + personal.map(function (c) {
        return '<li data-area="' + c.area + '"><button type="button" class="shelf-row" data-open="' + esc(c.id) + '">' +
          '<span class="shelf-icon">' + U.glyph(c.glyph) + '</span>' +
          '<span><span class="shelf-title">' + esc(c.title) + '</span><br><span class="shelf-sub">' + esc(c.custom ? 'Added by you' : P.AREAS[c.area].label) + '</span></span>' +
          '<span class="shelf-go">Open' + U.icon('right') + '</span></button></li>';
      }).join('') + '</ul>';
    } else {
      html += '<p class="home-sub" style="margin:0">No personal courses yet. Add one whenever you are studying something on your own.</p>';
    }

    html += '<div class="quiet-actions">' +
      '<a class="btn btn-quiet" href="onboarding?edit=courses">' + U.icon('plus') + 'Add or remove courses</a>' +
      (school.length ? '' : '<button type="button" class="btn btn-quiet" id="btn-join">' + U.icon('school') + 'Join a class with a code</button>') +
      '</div>';

    html += '<footer class="home-foot"><p>Saved in this browser only. This prototype has no accounts: clearing site data removes your setup, and it does not sync to other devices.</p>' +
      '<div><a class="btn btn-quiet" href="onboarding?edit=review">' + U.icon('pencil') + 'Edit setup</a>' +
      '<button type="button" class="btn btn-danger" id="btn-reset">Reset setup</button></div></footer>';

    html += '</div>';
    home.innerHTML = html;

    home.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { openCourse(b.getAttribute('data-open'), b); });
    });
    var j = document.getElementById('btn-join');
    if (j) j.addEventListener('click', openJoin);
    document.getElementById('btn-reset').addEventListener('click', resetSetup);
  }

  function renderEmpty() {
    var draft = profile && !profile.setupComplete;
    home.innerHTML = '<div class="empty-home">' +
      '<span class="kicker">Your learning space</span>' +
      (loadStatus === 'unreadable'
        ? '<h1>Let’s set things up again</h1><p>An earlier setup saved in this browser could not be read. Nothing else was changed.</p>'
        : draft
          ? '<h1>Your setup is almost done</h1><p>Pick up where you left off. Your answers so far are saved in this browser.</p>'
          : '<h1>Set up your learning space</h1><p>Tell Markov about your courses and your goal. It takes about two minutes, and you can change anything later.</p>') +
      '<div class="begin-actions">' +
      '<a class="btn btn-primary" href="onboarding">' + (draft ? 'Continue setup' : 'Get started') + U.icon('right') + '</a>' +
      '<a class="btn btn-ghost" href="whiteboard">' + U.icon('board') + 'Open the whiteboard</a>' +
      '</div></div>';
  }

  /* ---------- Dialogs ---------- */

  var lastTrigger = null;
  function openDialog(dlg, trigger) {
    lastTrigger = trigger || document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    var f = dlg.querySelector('[autofocus]') || dlg.querySelector('.sheet-close');
    if (f) f.focus();
  }
  function closeDialog(dlg) {
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  [dlgCourse, dlgProfile, dlgJoin].forEach(function (dlg) {
    dlg.addEventListener('close', function () { if (lastTrigger && document.body.contains(lastTrigger)) lastTrigger.focus(); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) closeDialog(dlg); // backdrop
      if (e.target.closest('.sheet-close') || e.target.closest('[data-close]')) closeDialog(dlg);
    });
  });

  function sheetHead(id, title) {
    return '<div class="sheet-head"><h2 id="' + id + '">' + title + '</h2><button type="button" class="sheet-close" aria-label="Close">' + U.icon('close') + '</button></div>';
  }

  function openCourse(id, trigger) {
    var c = profile.courses.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var isSchool = c.origin === 'school';
    dlgCourse.setAttribute('data-area', c.area);
    dlgCourse.innerHTML = sheetHead('dlg-course-title', esc(c.title)) +
      '<div class="sheet-body">' +
      '<p>' + (isSchool ? '<span class="tag school">' + U.icon('lock') + 'School course &middot; ' + esc(c.teacher) + '</span>' : '<span class="tag">' + U.icon('user') + (c.custom ? 'Added by you' : 'Your course') + '</span>') + '</p>' +
      '<div class="note">' + U.glyph(c.glyph, 'icon') + '<p><strong>The course experience is coming next.</strong> ' +
      (isSchool ? 'Class work from ' + esc(c.teacher) + ' will appear here once teacher connections are live.' : 'This is where your work for ' + esc(c.title) + ' will live.') +
      ' For now, the whiteboard is open for practice.</p></div>' +
      '<div class="sheet-actions"><a class="btn btn-primary" href="whiteboard" autofocus>' + U.icon('board') + 'Practice on the whiteboard</a>' +
      '<button type="button" class="btn btn-ghost" data-close>Close</button></div></div>';
    openDialog(dlgCourse, trigger);
  }

  function openProfile() {
    var d = profile, g = P.goal(d.goal);
    var rows = [
      ['Name', esc(d.name)],
      ['Grade or stage', esc(stageLabel(d.stage))],
      ['Studying in', esc(P.placeLabel(d)) + '<br><span style="font-weight:400;color:var(--muted)">' + esc(P.curriculumLabel(d)) + '</span>'],
      ['Goal', g ? esc(g.title) : '']
    ];
    if (d.school) rows.push(['Class', esc(d.school.name) + '<br><span style="font-weight:400;color:var(--muted)">' + esc(d.school.teacher) + (d.school.demo ? ' &middot; fictional demo' : '') + '</span>']);
    dlgProfile.innerHTML = sheetHead('dlg-profile-title', 'Your learning profile') +
      '<div class="sheet-body"><dl class="profile-list">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' +
      '<div class="sheet-actions"><a class="btn btn-primary" href="onboarding?edit=review" autofocus>' + U.icon('pencil') + 'Edit setup</a>' +
      (d.school ? '<button type="button" class="btn btn-danger" id="btn-leave">Leave demo class</button>' : '') +
      '</div><p class="input-help" style="margin-top:16px">Saved in this browser only. Not an account.</p></div>';
    openDialog(dlgProfile, document.getElementById('btn-profile'));
    var leave = document.getElementById('btn-leave');
    if (leave) leave.addEventListener('click', function () {
      if (!window.confirm('Leave the demo class? Your own courses and answers stay.')) return;
      P.leaveSchool(profile);
      profile.path = 'independent';
      P.save(profile);
      closeDialog(dlgProfile);
      render();
    });
  }

  function openJoin(e) {
    dlgJoin.innerHTML = sheetHead('dlg-join-title', 'Join a class') +
      '<form class="sheet-body" id="join-form" novalidate>' +
      '<p>Enter the code from your teacher. Your own courses stay exactly as they are.</p>' +
      '<label class="label" for="join-code">Class code</label>' +
      '<input class="text-input mono" id="join-code" maxlength="20" autocapitalize="characters" spellcheck="false" autocomplete="off" autofocus placeholder="ABCD-1234">' +
      '<p class="input-help">School connections are not live yet. For this preview, use the fictional code <strong class="mono">DEMO-ALG1</strong>.</p>' +
      '<p class="field-error" id="join-error" role="alert" hidden>' + U.icon('close') + '<span></span></p>' +
      '<div class="sheet-actions"><button type="submit" class="btn btn-primary">Find my class' + U.icon('right') + '</button>' +
      '<button type="button" class="btn btn-ghost" data-close>Cancel</button></div></form>';
    openDialog(dlgJoin, e && e.currentTarget);
    document.getElementById('join-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var input = document.getElementById('join-code');
      var err = document.getElementById('join-error');
      var code = input.value.trim();
      var inv = code ? P.findInvite(code) : null;
      if (!inv) {
        err.hidden = false;
        err.querySelector('span').textContent = code ? 'That code does not match a class. Check it with your teacher.' : 'Type the code your teacher gave you.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      window.location.href = 'onboarding?invite=' + encodeURIComponent(inv.code);
    });
  }

  function resetSetup() {
    if (!window.confirm('Reset your learning setup? This removes it from this browser. Your whiteboard history is not affected.')) return;
    P.clear();
    load();
    render();
    var h = home.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  // stay in step with edits made in another tab
  window.addEventListener('storage', function (e) { if (e.key === P.KEY) { load(); render(); } });

  load();
  render();
})();
