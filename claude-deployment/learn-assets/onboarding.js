/* Markov.ink onboarding: one question at a time, then the learning home. */
(function () {
  'use strict';

  var P = window.MarkovProfile, U = window.MarkovUI, esc = U.esc;
  var params = new URLSearchParams(window.location.search);
  var form = document.getElementById('flow');
  var main = document.getElementById('main');
  var bar = document.getElementById('actionbar');
  var topbar = document.getElementById('topbar');

  var LABELS = { start: 'Getting started', invite: 'Your class', name: 'Your name', stage: 'Grade or stage', context: 'Where you study', courses: 'Courses', goal: 'Goal', review: 'Review' };
  var EDITABLE = ['name', 'stage', 'context', 'courses', 'goal'];

  var S = {
    mode: 'new',          // 'new' | 'edit' | 'already' | 'join'
    draft: null,
    step: 'start',
    dir: 'fwd',
    toReview: false,      // came from a review Edit button
    editEntry: null,      // the step the dashboard opened in edit mode
    invite: null,         // resolved demo invitation
    filter: null,
    notice: null,
    error: null
  };

  /* ---------- Boot ---------- */

  var loaded = P.load();
  var editParam = params.get('edit');
  var invite = params.get('invite') ? P.findInvite(params.get('invite')) : null;

  if (loaded.status === 'unreadable') {
    S.notice = { warn: true, text: 'An earlier setup saved in this browser could not be read, so this starts fresh. Nothing else in your browser was changed.' };
  }

  if (loaded.profile && loaded.profile.setupComplete) {
    S.draft = P.clone(loaded.profile);
    if (editParam) {
      S.mode = 'edit';
      S.editEntry = EDITABLE.indexOf(editParam) !== -1 ? editParam : 'review';
      S.step = S.editEntry;
    } else if (invite) {
      S.mode = 'join';
      S.invite = invite;
      S.step = 'join';
    } else {
      S.mode = 'already';
      S.step = 'already';
    }
  } else if (loaded.profile) {
    S.draft = loaded.profile;
    S.step = validStep(S.draft.draftStep) ? S.draft.draftStep : 'start';
    if (S.step !== 'start') S.notice = { text: 'Picking up where you left off.' };
    if (S.draft.path === 'school' && S.draft.school) S.invite = P.findInvite(S.draft.school.code);
  } else {
    S.draft = P.blank(invite ? 'school' : 'independent');
    S.draft.path = invite ? 'school' : null;
    if (invite) { S.invite = invite; S.step = 'invite'; }
    else if (params.get('invite')) { S.draft.path = 'school'; S.step = 'invite'; S.error = 'That invitation code does not match a class. Check it with your teacher.'; }
  }

  function validStep(s) { return s && LABELS[s] && (s !== 'invite' || (S.draft && S.draft.path === 'school')); }

  function seq() {
    if (S.mode === 'edit') return ['name', 'stage', 'context', 'courses', 'goal', 'review'];
    return S.draft.path === 'school'
      ? ['start', 'invite', 'name', 'stage', 'context', 'courses', 'goal', 'review']
      : ['start', 'name', 'stage', 'context', 'courses', 'goal', 'review'];
  }

  function persistDraft() {
    if (S.mode !== 'new') return;
    S.draft.draftStep = S.step;
    P.save(S.draft);
  }

  /* ---------- Shell ---------- */

  function renderTop() {
    var steps = seq().filter(function (s) { return s !== 'start'; });
    var idx = steps.indexOf(S.step);
    var prog = '';
    if (S.mode === 'new' && idx !== -1) {
      prog = '<div class="progress" role="progressbar" aria-label="Setup progress" aria-valuemin="1" aria-valuemax="' + steps.length + '" aria-valuenow="' + (idx + 1) + '" aria-valuetext="Step ' + (idx + 1) + ' of ' + steps.length + ', ' + LABELS[S.step] + '">' +
        steps.map(function (s, i) { return '<span class="progress-seg ' + (i < idx ? 'done' : i === idx ? 'current' : '') + '"><i></i></span>'; }).join('') + '</div>';
    } else {
      prog = '<span class="spacer"></span>';
    }
    var exit = (S.mode === 'edit')
      ? '<a class="toplink" href="learn">' + U.icon('close') + '<span>Cancel</span></a>'
      : (S.mode === 'new' && S.step !== 'start')
        ? '<a class="toplink" href="./">' + U.icon('close') + '<span>Save and exit</span></a>'
        : '<a class="toplink" href="whiteboard-v2">' + U.icon('board') + '<span>Whiteboard</span></a>';
    topbar.innerHTML = U.wordmark() + prog + exit;
  }

  function kicker() {
    if (S.mode !== 'new') return S.mode === 'edit' ? '<span class="kicker">Edit your setup</span>' : '';
    var steps = seq().filter(function (s) { return s !== 'start'; });
    var i = steps.indexOf(S.step);
    return i === -1 ? '<span class="kicker">Welcome to Markov.ink</span>' : '<span class="kicker">Step ' + (i + 1) + ' of ' + steps.length + ' &middot; ' + LABELS[S.step] + '</span>';
  }

  function notice() {
    var parts = [];
    if (P.storageKind() === 'tab') parts.push('<div class="note warn" style="margin-bottom:22px">' + U.icon('lock') + '<p><strong>This browser is blocking saved data.</strong> Your setup will last while this tab stays open.</p></div>');
    if (S.notice) { parts.push('<div class="note' + (S.notice.warn ? ' warn' : '') + '" style="margin-bottom:22px">' + U.icon(S.notice.warn ? 'lock' : 'check') + '<p>' + esc(S.notice.text) + '</p></div>'); S.notice = null; }
    return parts.join('');
  }

  function errorSlot() {
    return '<p class="field-error" id="step-error" role="alert"' + (S.error ? '' : ' hidden') + '>' + U.icon('close') + '<span>' + esc(S.error || '') + '</span></p>';
  }

  function showError(msg, focusEl) {
    S.error = msg;
    var el = document.getElementById('step-error');
    if (el) { el.hidden = !msg; el.querySelector('span').textContent = msg || ''; }
    if (focusEl && msg) { focusEl.setAttribute('aria-invalid', 'true'); focusEl.focus(); }
  }

  function render() {
    renderTop();
    var def = STEPS[S.step];
    var html = def.html();
    main.innerHTML = '<div class="step' + (def.wide ? ' wide' : '') + (U.reducedMotion() ? '' : ' step-enter' + (S.dir === 'back' ? ' back' : '')) + '">' + notice() + kicker() +
      '<h1 class="q" id="step-title" tabindex="-1">' + def.title() + '</h1>' +
      (def.lede ? '<p class="lede">' + def.lede() + '</p>' : '') +
      '<div class="step-body">' + html + errorSlot() + '</div></div>';
    renderBar(def);
    S.error = null;
    // a step may name its own first field; otherwise focus the question
    var target = def.mount ? def.mount() : null;
    if (!target) target = document.getElementById('step-title');
    if (target) target.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function renderBar(def) {
    var a = def.actions ? def.actions() : defaultActions();
    if (!a) { bar.hidden = true; bar.innerHTML = ''; return; }
    bar.hidden = false;
    bar.innerHTML = '<div class="actionbar-inner">' +
      (a.back ? '<button type="button" class="btn btn-ghost" id="btn-back">' + U.icon('left') + esc(a.back) + '</button>' : '') +
      '<span class="grow"></span>' +
      (a.hint ? '<span class="hint">' + esc(a.hint) + '</span>' : '') +
      (a.extra || '') +
      '<button type="submit" class="btn btn-primary" id="btn-next">' + esc(a.next) + U.icon('right') + '</button>' +
      '</div>';
    var back = document.getElementById('btn-back');
    if (back) back.addEventListener('click', goBack);
  }

  function defaultActions() {
    if (S.toReview) return { next: 'Back to review' };
    if (S.mode === 'edit' && S.editEntry === S.step) return { back: 'Cancel', next: 'Save and return' };
    var s = seq(), i = s.indexOf(S.step);
    return { back: i > 0 ? 'Back' : null, next: 'Continue' };
  }

  /* ---------- Navigation ---------- */

  function go(step, dir) {
    S.dir = dir || 'fwd';
    S.step = step;
    persistDraft();
    render();
  }

  function goBack() {
    if (S.mode === 'join') { window.location.href = 'learn'; return; }
    if (S.mode === 'edit') {
      if (S.editEntry === S.step || S.step === 'review') { window.location.href = 'learn'; return; }
      go('review', 'back'); S.toReview = false; return;
    }
    var s = seq(), i = s.indexOf(S.step);
    if (i > 0) go(s[i - 1], 'back');
    else window.location.href = './';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var def = STEPS[S.step];
    if (def.submit && def.submit() === false) return;
    if (def.validate) {
      var err = def.validate();
      if (err) { showError(err.msg, err.el); return; }
    }
    advance();
  });

  function advance() {
    if (S.toReview) { S.toReview = false; go('review', 'back'); return; }
    if (S.mode === 'edit' && S.editEntry === S.step && S.step !== 'review') { finish(); return; }
    var s = seq(), i = s.indexOf(S.step);
    if (i < s.length - 1) go(s[i + 1]);
  }

  function finish() {
    var d = S.draft;
    d.setupComplete = true;
    d.draftStep = null;
    var res = P.save(d);
    if (!res.ok) { showError('Markov could not save your setup in this browser. Check that site data is allowed, then try again.'); return; }
    window.location.href = 'learn';
  }

  /* ---------- Small builders ---------- */

  function choice(name, value, checked, title, line, extraClass, lead) {
    return '<label class="choice' + (extraClass ? ' ' + extraClass : '') + '">' +
      '<input type="radio" name="' + name + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="choice-body">' + (lead || '') + '<span class="choice-text"><span class="choice-title">' + title + '</span>' + (line ? '<span class="choice-line">' + line + '</span>' : '') + '</span>' +
      '<span class="choice-mark">' + U.icon('check') + '</span></span></label>';
  }

  function radiosValue(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function onRadio(name, fn) {
    form.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
      r.addEventListener('change', function () { fn(r.value); showError(null); });
    });
  }

  function inviteCard(inv) {
    return '<div class="invite">' +
      '<div class="invite-top"><span class="invite-seal">' + U.icon('school') + '</span><div><div class="invite-school">' + esc(inv.school.name) + '</div><div class="invite-sub">Class invitation &middot; code ' + esc(inv.code) + '</div></div></div>' +
      '<dl class="invite-rows">' +
      '<dt>Course</dt><dd>' + esc(inv.course.title) + '<small>' + esc(inv.course.section) + '</small></dd>' +
      '<dt>Teacher</dt><dd>' + esc(inv.teacher) + '</dd>' +
      '<dt>Connects</dt><dd>This course and the class work your teacher posts for it</dd>' +
      '</dl></div>';
  }

  function demoNote() {
    return '<div class="note warn" style="margin-top:16px">' + U.icon('lock') + '<p><span class="badge-demo">Fictional demo</span> This school, teacher, and class are made up for this preview. Accepting enrolls you nowhere, and no teacher can see this setup.</p></div>';
  }

  function stageLabel(id) { var s = P.stage(id); return s ? s.label : ''; }

  /* ---------- Steps ---------- */

  var STEPS = {};

  STEPS.start = {
    title: function () { return 'How are you joining Markov?'; },
    lede: function () { return 'Pick one. You can connect a class later, and courses you add yourself stay yours either way.'; },
    html: function () {
      var p = S.draft.path;
      function door(value, art, title, line, foot) {
        return '<label class="choice door"><input type="radio" name="path" value="' + value + '"' + (p === value ? ' checked' : '') + '>' +
          '<span class="choice-body"><span class="door-art">' + U.icon(art) + '</span>' +
          '<span class="choice-text"><span class="choice-title">' + title + '</span><span class="choice-line">' + line + '</span></span>' +
          '<span class="door-foot">' + foot + '</span>' +
          '<span class="choice-mark">' + U.icon('check') + '</span></span></label>';
      }
      return '<div class="choices doors" role="radiogroup" aria-labelledby="step-title">' +
        door('school', 'school', 'A teacher invited me', 'Use a class code to connect to your teacher’s course.', 'This preview uses a fictional demo class.') +
        door('independent', 'user', 'I’m learning on my own', 'Build a space around the courses you are taking.', 'You can add a class whenever you get a code.') +
        '</div>' +
        '<div class="note" style="margin-top:20px">' + U.icon('lock') + '<p><strong>This is a prototype.</strong> Your answers are saved in this browser only. There is no account, password, or sync yet.</p></div>';
    },
    mount: function () {
      onRadio('path', function (v) { setPath(v); });
    },
    actions: function () { return { back: 'Home', next: 'Continue' }; },
    validate: function () {
      if (!S.draft.path) return { msg: 'Choose one to continue.', el: form.querySelector('input[name="path"]') };
    }
  };

  // Removes a connected invitation and undoes only what it filled in.
  // Anything the student typed or chose stays.
  function dropInvite() {
    var d = S.draft;
    if (d.school) {
      var inv = P.findInvite(d.school.code);
      P.leaveSchool(d);
      if (inv) {
        if (d.name === inv.student.name) d.name = '';
        if (d.stage === inv.student.stage) d.stage = null;
        if (d.context.curriculumName === inv.school.curriculumName) d.context = { country: null, region: '', curriculum: null, curriculumName: '', source: 'student' };
      }
    }
    S.invite = null;
  }

  function setPath(v) {
    if (v === S.draft.path) return;
    if (S.draft.path === 'school') dropInvite();
    S.draft.path = v;
    renderTop();
  }

  STEPS.invite = {
    title: function () { return S.invite ? 'You’re invited to ' + esc(S.invite.course.title) : 'Enter your class code'; },
    lede: function () { return S.invite ? 'Check that this is your class before you continue.' : 'Your teacher shares a code that connects you to their course.'; },
    html: function () {
      if (!S.invite) {
        return '<label class="label" for="code">Class code</label>' +
          '<input class="big-input mono" id="code" name="code" maxlength="20" autocapitalize="characters" spellcheck="false" placeholder="ABCD-1234" value="' + esc(S.codeTyped || '') + '">' +
          '<p class="input-help">For this preview, use the fictional code <strong class="mono">DEMO-ALG1</strong>.</p>';
      }
      return inviteCard(S.invite) +
        '<div class="split-explain">' +
        '<div><strong>' + U.icon('school') + 'School work</strong>Class work from ' + esc(S.invite.teacher) + ' stays with ' + esc(S.invite.course.title) + '.</div>' +
        '<div><strong>' + U.icon('user') + 'Your own learning</strong>Courses you add yourself are yours. Your teacher does not manage them.</div>' +
        '</div>' + demoNote();
    },
    mount: function () {
      var c = document.getElementById('code');
      if (c) c.addEventListener('input', function () { S.codeTyped = c.value; c.removeAttribute('aria-invalid'); showError(null); });
      return c;
    },
    actions: function () {
      if (!S.invite) return { back: 'Back', next: 'Find my class' };
      return { back: 'Back', next: 'This is my class', extra: '<button type="button" class="btn btn-quiet" id="btn-other-code">Use a different code</button>' };
    },
    submit: function () {
      if (S.invite) {
        // reapplying is safe: it keeps personal courses and only fills empty answers
        P.applyInvite(S.draft, S.invite, { prefill: true });
        return true;
      }
      var c = document.getElementById('code');
      var v = (c.value || '').trim();
      if (!v) { showError('Type the code your teacher gave you.', c); return false; }
      var inv = P.findInvite(v);
      if (!inv) { showError('That code does not match a class. Check it with your teacher, or go back and choose to learn on your own.', c); return false; }
      S.invite = inv;
      S.codeTyped = '';
      render();
      return false;
    }
  };

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#btn-other-code')) {
      dropInvite();
      render();
      var c = document.getElementById('code');
      if (c) c.focus();
    }
  });

  STEPS.name = {
    title: function () { return 'What should Markov call you?'; },
    lede: function () {
      var inv = S.invite;
      if (S.draft.path === 'school' && inv && S.draft.name === inv.student.name) return 'Your invitation lists you as ' + esc(inv.student.name) + '. Keep it, or change it to the name you go by.';
      return 'A first name or nickname is perfect.';
    },
    html: function () {
      return '<input class="big-input" id="name" name="name" maxlength="40" autocomplete="nickname" placeholder="Your name" aria-labelledby="step-title" aria-describedby="name-help" value="' + esc(S.draft.name) + '">' +
        '<p class="input-help" id="name-help">Markov does not need your email or a password in this preview.</p>';
    },
    mount: function () {
      var n = document.getElementById('name');
      n.addEventListener('input', function () { S.draft.name = n.value.trim().slice(0, 40); n.removeAttribute('aria-invalid'); showError(null); });
      return n;
    },
    validate: function () {
      var n = document.getElementById('name');
      S.draft.name = n.value.trim().replace(/\s+/g, ' ').slice(0, 40);
      if (!S.draft.name) return { msg: 'Add a name so Markov knows what to call you.', el: n };
    }
  };

  STEPS.stage = {
    title: function () { return 'Where are you in school?'; },
    lede: function () {
      var inv = S.invite;
      if (inv && S.draft.stage === inv.student.stage && S.draft.path === 'school') return 'Your class lists ' + esc(stageLabel(inv.student.stage)) + '. Change it if that is not right. It never limits what you can learn.';
      return 'This helps suggest courses. It never limits what you can learn.';
    },
    html: function () {
      var groups = {};
      P.STAGES.forEach(function (s) { (groups[s.group] = groups[s.group] || []).push(s); });
      return '<div class="grade-groups" role="radiogroup" aria-labelledby="step-title">' + Object.keys(groups).map(function (g) {
        return '<div class="grade-group"><span class="grade-group-label">' + esc(g) + '</span><div class="keys">' +
          groups[g].map(function (s) {
            return '<label class="key' + (s.short.length > 2 ? ' wide' : '') + '"><input type="radio" name="stage" value="' + s.id + '"' + (S.draft.stage === s.id ? ' checked' : '') + ' aria-label="' + esc(s.label) + '"><span>' + esc(s.short) + '</span></label>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
    },
    mount: function () {
      onRadio('stage', function (v) {
        var wasCollege = (P.stage(S.draft.stage) || {}).band === 'college';
        S.draft.stage = v;
        // curriculum options differ for college; drop an answer that no longer fits
        var nowCollege = (P.stage(v) || {}).band === 'college';
        if (wasCollege !== nowCollege && S.draft.context.source !== 'school') S.draft.context.curriculum = null;
      });
    },
    validate: function () {
      if (!S.draft.stage) return { msg: 'Pick the one closest to where you are.', el: form.querySelector('input[name="stage"]') };
    }
  };

  STEPS.context = {
    title: function () { return 'Where do you study?'; },
    lede: function () { return 'Course names and standards differ by place. Not sure? That is fine too.'; },
    html: function () {
      var c = S.draft.context;
      var out = '';
      if (c.source === 'school' && S.draft.school) {
        out += '<div class="note" style="margin-bottom:22px">' + U.icon('school') + '<p>Filled in from your class invitation. Change anything that looks wrong.</p></div>';
      }
      out += '<div class="field"><label class="label" for="country">Country</label><select class="select" id="country"><option value="">Choose one</option>' +
        P.COUNTRIES.map(function (o) { return '<option value="' + o.id + '"' + (c.country === o.id ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select></div>';
      if (c.country === 'US') {
        out += '<div class="field"><label class="label" for="region">State <span style="font-weight:400;color:var(--muted)">(optional)</span></label><select class="select" id="region"><option value="">Choose a state</option>' +
          P.US_STATES.map(function (s) { return '<option value="' + s[0] + '"' + (c.region === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('') + '</select></div>';
      } else if (c.country && c.country !== 'unsure') {
        out += '<div class="field"><label class="label" for="region">State, province, or region <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input class="text-input" id="region" maxlength="60" value="' + esc(c.region) + '"></div>';
      }
      if (c.country && c.country !== 'unsure') {
        var opts = P.curriculumOptions(S.draft);
        out += '<fieldset class="field" style="border:0;padding:0;margin:22px 0 0"><legend class="label">Which curriculum does your learning follow?</legend><div class="choices">' +
          (c.curriculumName && c.source === 'school'
            ? choice('curriculum', c.curriculum, true, esc(c.curriculumName), 'From your class invitation')
            : '') +
          opts.filter(function (o) { return !(c.source === 'school' && c.curriculumName && o.id === c.curriculum); }).map(function (o) {
            return choice('curriculum', o.id, c.curriculum === o.id && !(c.source === 'school' && c.curriculumName), esc(o.label));
          }).join('') + '</div></fieldset>';
      }
      return out;
    },
    mount: function () {
      var c = S.draft.context;
      var country = document.getElementById('country');
      country.addEventListener('change', function () {
        S.draft.context = { country: country.value || null, region: '', curriculum: null, curriculumName: '', source: 'student' };
        showError(null);
        rerenderKeepFocus('country');
      });
      var region = document.getElementById('region');
      if (region) {
        region.addEventListener(region.tagName === 'SELECT' ? 'change' : 'input', function () {
          c.region = region.value.trim().slice(0, 60);
          if (c.source === 'school') { c.source = 'student'; c.curriculumName = ''; rerenderKeepFocus('region'); }
        });
      }
      onRadio('curriculum', function (v) {
        // picking a different option detaches the school-provided name
        var r = form.querySelector('input[name="curriculum"]:checked');
        var isSchoolChoice = r && r.closest('.choice') && r.closest('.choice').querySelector('.choice-line');
        if (!isSchoolChoice) { c.curriculumName = ''; c.source = 'student'; }
        c.curriculum = v;
      });
    },
    validate: function () {
      var c = S.draft.context;
      if (!c.country) return { msg: 'Choose a country, or pick “I’m not sure”.', el: document.getElementById('country') };
      if (c.country === 'unsure') { c.curriculum = 'unsure'; return; }
      if (!c.curriculum) return { msg: 'Choose a curriculum, or pick “I’m not sure”.', el: form.querySelector('input[name="curriculum"]') };
    }
  };

  function rerenderKeepFocus(id) {
    render();
    var el = document.getElementById(id);
    if (el) el.focus();
  }

  STEPS.courses = {
    wide: true,
    title: function () { return 'Which courses are you taking?'; },
    lede: function () {
      return P.schoolCourses(S.draft).length
        ? 'Your class is already here. Add anything else you are studying on your own.'
        : 'Choose as many as you like. You can change these anytime.';
    },
    html: function () {
      var d = S.draft;
      var suggested = P.suggestedFor(d);
      if (!S.filter) S.filter = suggested.length ? 'suggested' : 'all';
      if (S.filter === 'suggested' && !suggested.length) S.filter = 'all';
      var st = P.stage(d.stage);
      var filters = (suggested.length ? [['suggested', 'Common in ' + (st.band === 'college' ? 'college' : st.label)]] : [])
        .concat([['math', 'Math'], ['science', 'Science'], ['language', 'Reading and writing'], ['all', 'All courses']]);
      var out = '<div class="tray" id="tray" aria-live="polite"></div>';
      out += '<div class="course-toolbar" role="radiogroup" aria-label="Show courses">' + filters.map(function (f) {
        return '<label class="filter"><input type="radio" name="filter" value="' + f[0] + '"' + (S.filter === f[0] ? ' checked' : '') + '><span>' + esc(f[1]) + '</span></label>';
      }).join('') + '</div>';
      out += '<div id="tiles">' + tilesHtml() + '</div>';
      out += '<div class="custom-add"><div class="field"><label class="label" for="custom">Not listed? Add your own course</label>' +
        '<input class="text-input" id="custom" maxlength="60" placeholder="For example, Robotics or AP Biology"></div>' +
        '<button type="button" class="btn btn-ghost" id="btn-add-custom">' + U.icon('plus') + 'Add course</button></div>' +
        '<p class="field-error" id="custom-error" role="alert" hidden>' + U.icon('close') + '<span></span></p>';
      return out;
    },
    mount: function () {
      renderTray();
      bindTiles();
      onRadio('filter', function (v) { S.filter = v; document.getElementById('tiles').innerHTML = tilesHtml(); bindTiles(); });
      var input = document.getElementById('custom');
      var addBtn = document.getElementById('btn-add-custom');
      function add() {
        var res = P.addCustom(S.draft, input.value);
        var errEl = document.getElementById('custom-error');
        if (!res.ok) { errEl.hidden = false; errEl.querySelector('span').textContent = res.reason; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
        errEl.hidden = true; input.removeAttribute('aria-invalid'); input.value = '';
        showError(null);
        persistDraft();
        renderTray();
        if (res.listed) { document.getElementById('tiles').innerHTML = tilesHtml(); bindTiles(); }
        input.focus();
      }
      addBtn.addEventListener('click', add);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    },
    validate: function () {
      if (!S.draft.courses.length) return { msg: 'Choose at least one course, or add your own.', el: form.querySelector('.tile input') };
    }
  };

  function tilesHtml() {
    var d = S.draft;
    var suggested = P.suggestedFor(d);
    var st = P.stage(d.stage);
    var list = P.COURSES.filter(function (c) {
      if (S.filter === 'suggested') return suggested.indexOf(c.id) !== -1;
      if (S.filter === 'all') return true;
      return c.area === S.filter;
    });
    function tile(c) {
      var inClass = P.schoolHasCatalog(d, c.id);
      var teacher = inClass ? (P.schoolCourses(d).filter(function (s) { return s.catalogId === c.id; })[0] || {}).teacher : '';
      var meta = inClass ? U.icon('lock') + 'In your class' + (teacher ? ' with ' + esc(teacher) : '')
        : (suggested.indexOf(c.id) !== -1 && st ? 'Common in ' + esc(st.band === 'college' ? 'college' : st.label) : esc(P.AREAS[c.area].label));
      if (inClass) {
        return '<div class="tile locked" data-area="' + c.area + '"><div class="tile-body">' + U.glyph(c.glyph) +
          '<span class="tile-title"><b>' + esc(c.title) + '</b></span><span class="tile-meta">' + meta + '</span></div></div>';
      }
      return '<label class="tile" data-area="' + c.area + '"><input type="checkbox" value="' + c.id + '"' + (P.hasPersonalCatalog(d, c.id) ? ' checked' : '') + '>' +
        '<span class="tile-body">' + U.glyph(c.glyph) + '<span class="tile-title"><b>' + esc(c.title) + '</b></span><span class="tile-meta">' + meta + '</span>' +
        '<span class="tile-stamp">' + U.icon('check') + '</span></span></label>';
    }
    if (S.filter === 'all') {
      return ['math', 'science', 'language'].map(function (a) {
        return '<div class="group-head"><h2>' + esc(P.AREAS[a].label) + '</h2></div><div class="tiles">' + list.filter(function (c) { return c.area === a; }).map(tile).join('') + '</div>';
      }).join('');
    }
    return '<div class="tiles">' + list.map(tile).join('') + '</div>';
  }

  function bindTiles() {
    form.querySelectorAll('#tiles .tile input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) P.addPersonal(S.draft, cb.value);
        else P.removePersonal(S.draft, 'p-' + cb.value);
        showError(null);
        persistDraft();
        renderTray();
      });
    });
  }

  function renderTray() {
    var tray = document.getElementById('tray');
    if (!tray) return;
    var d = S.draft;
    var chips = P.schoolCourses(d).map(function (c) {
      return '<span class="chip school" data-area="' + c.area + '">' + U.icon('lock') + esc(c.title) + (c.teacher ? ' &middot; ' + esc(c.teacher) : '') + '<span class="sr-only"> (managed by your school, cannot be removed here)</span></span>';
    }).concat(P.personalCourses(d).map(function (c) {
      return '<span class="chip" data-area="' + c.area + '">' + esc(c.title) +
        '<button type="button" data-remove="' + esc(c.id) + '" aria-label="Remove ' + esc(c.title) + '">' + U.icon('close') + '</button></span>';
    }));
    tray.innerHTML = '<span class="tray-label">Your courses</span>' + (chips.length ? chips.join('') : '<span class="tray-empty">None yet. Tap a course below to add it.</span>');
    tray.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-remove');
        P.removePersonal(S.draft, id);
        persistDraft();
        var cb = form.querySelector('#tiles .tile input[value="' + id.replace(/^p-/, '') + '"]');
        if (cb) cb.checked = false;
        renderTray();
        var next = document.querySelector('#tray [data-remove]') || document.getElementById('custom');
        if (next) next.focus();
      });
    });
  }

  STEPS.goal = {
    title: function () { return 'What would help most right now?'; },
    lede: function () { return 'This shapes where you start. You can change it anytime, and it never locks you out of anything.'; },
    html: function () {
      return '<div class="choices goals" role="radiogroup" aria-labelledby="step-title">' + P.GOALS.map(function (g, i) {
        return choice('goal', g.id, S.draft.goal === g.id, esc(g.title), esc(g.line), '', '<span class="goal-num mono">0' + (i + 1) + '</span>');
      }).join('') + '</div>';
    },
    mount: function () { onRadio('goal', function (v) { S.draft.goal = v; }); },
    validate: function () {
      if (!S.draft.goal) return { msg: 'Pick the goal that fits best. You can change it later.', el: form.querySelector('input[name="goal"]') };
    }
  };

  STEPS.review = {
    title: function () { return S.mode === 'edit' ? 'Your learning setup' : 'Here is your learning space'; },
    lede: function () { return 'Check everything. Edit any answer without losing the rest.'; },
    html: function () {
      var d = S.draft;
      function row(label, value, step) {
        return '<div class="review-row"><dt class="kicker">' + label + '</dt><dd>' + value + '</dd>' +
          (step ? '<button type="button" class="btn btn-quiet" data-edit="' + step + '" aria-label="Edit ' + label.toLowerCase() + '">' + U.icon('pencil') + 'Edit</button>' : '<span></span>') + '</div>';
      }
      var g = P.goal(d.goal);
      var place = P.placeLabel(d), curr = P.curriculumLabel(d);
      var rows = [
        row('Name', esc(d.name), 'name'),
        row('Grade or stage', esc(stageLabel(d.stage)), 'stage'),
        row('Studying in', esc(place) + '<small>' + esc(curr) + (d.context.source === 'school' ? ' &middot; from your class invitation' : '') + '</small>', 'context')
      ];
      if (d.school) {
        var sc = P.schoolCourses(d)[0];
        rows.push(row('Class', esc(sc ? sc.title + (sc.section ? ', ' + sc.section : '') : '') + '<small>' + esc(d.school.teacher) + ' &middot; ' + esc(d.school.name) + '</small>' +
          (d.school.demo ? '<span class="badge-demo" style="margin-top:8px">Fictional demo</span>' : ''), null));
      }
      rows.push(row('Courses', '<div class="review-courses">' +
        P.schoolCourses(d).map(function (c) { return '<span class="chip school" data-area="' + c.area + '">' + U.icon('lock') + esc(c.title) + '</span>'; }).join('') +
        P.personalCourses(d).map(function (c) { return '<span class="chip" data-area="' + c.area + '">' + esc(c.title) + '</span>'; }).join('') + '</div>', 'courses'));
      rows.push(row('Goal', g ? esc(g.title) + '<small>' + esc(g.line) + '</small>' : '', 'goal'));
      return '<dl class="review">' + rows.join('') + '</dl>' +
        '<p class="input-help" style="margin-top:16px">Saved in this browser only. Not an account, and not shared with any school.</p>';
    },
    mount: function () {
      main.querySelectorAll('[data-edit]').forEach(function (b) {
        b.addEventListener('click', function () { S.toReview = true; go(b.getAttribute('data-edit'), 'back'); });
      });
    },
    actions: function () {
      if (S.mode === 'edit') return { back: 'Cancel', next: 'Save changes' };
      return { back: 'Back', next: 'Create my learning space' };
    },
    validate: function () {
      // guard against a resumed or edited draft with a hole in it
      var d = S.draft;
      var order = ['name', 'stage', 'context', 'courses', 'goal'];
      var missing = order.filter(function (s) {
        if (s === 'name') return !d.name;
        if (s === 'stage') return !d.stage;
        if (s === 'context') return !d.context.country || !d.context.curriculum;
        if (s === 'courses') return !d.courses.length;
        return !d.goal;
      })[0];
      if (missing) return { msg: 'One answer is missing: ' + LABELS[missing].toLowerCase() + '. Use Edit to add it.' };
    },
    submit: function () {
      if (STEPS.review.validate()) return true; // let the shared handler show the error
      finish();
      return false;
    }
  };

  /* returning visitor with a finished setup */
  STEPS.already = {
    title: function () { return 'Welcome back, ' + esc(S.draft.name) + '.'; },
    lede: function () { return 'Your learning space is already set up in this browser.'; },
    html: function () {
      return '<div class="begin-actions">' +
        '<a class="btn btn-primary" href="learn">Go to my courses' + U.icon('right') + '</a>' +
        '<a class="btn btn-ghost" href="onboarding?edit=review">' + U.icon('pencil') + 'Edit my setup</a>' +
        '<button type="button" class="btn btn-danger" id="btn-restart">Start over</button></div>';
    },
    mount: function () {
      document.getElementById('btn-restart').addEventListener('click', function () {
        if (!window.confirm('Start over? This replaces your learning setup in this browser. Your whiteboard history is not affected.')) return;
        P.clear();
        window.location.href = 'onboarding';
      });
    },
    actions: function () { return null; }
  };

  /* returning visitor who opened a class invitation */
  STEPS.join = {
    title: function () { return 'Add ' + esc(S.invite.course.title) + ' to your learning space?'; },
    lede: function () {
      return P.schoolCourses(S.draft).some(function (c) { return c.id === S.invite.course.id; })
        ? 'This class is already connected.'
        : 'Your own courses and answers stay exactly as they are. The class is added alongside them.';
    },
    html: function () { return inviteCard(S.invite) + demoNote(); },
    actions: function () {
      var already = P.schoolCourses(S.draft).some(function (c) { return c.id === S.invite.course.id; });
      return already ? { next: 'Go to my courses' } : { back: 'Not now', next: 'Add this class' };
    },
    submit: function () {
      if (!P.schoolCourses(S.draft).some(function (c) { return c.id === S.invite.course.id; })) {
        if (S.draft.school) P.leaveSchool(S.draft);
        P.applyInvite(S.draft, S.invite, { prefill: false });
        S.draft.path = 'school';
        if (!P.save(S.draft).ok) { showError('Markov could not save this change in your browser.'); return false; }
      }
      window.location.href = 'learn';
      return false;
    }
  };
  render();
})();
