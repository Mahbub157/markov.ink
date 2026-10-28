/* Markov.ink course content.
   Algebra I has an 8-topic pilot outline. It is a small starting outline written
   for this prototype, not the full course and not aligned to any standard yet.
   Other courses have no outline yet and say so. */
(function () {
  'use strict';

  var ALGEBRA_1 = {
    catalogId: 'algebra-1',
    outlineLabel: 'Pilot outline: 3 units, 8 topics',
    outlineNote: 'This is a short starting outline for the prototype, not the whole Algebra I course. Standards tags have not been added yet.',
    sequenceLabel: 'Suggested order from Markov',
    units: [
      {
        id: 'alg1-u1', n: 1, title: 'Expressions',
        topics: [
          {
            id: 'alg1-evaluate', title: 'Evaluating expressions',
            plain: 'Put a number in for the letter and work out the value.',
            example: 'Find 3a + 4 when a = 5',
            wording: ['plug in', 'substitute', 'what is the value', 'evaluate', 'when x ='],
            objectives: ['Substitute a value for a variable', 'Follow the order of operations to finish'],
            prereqs: [], minutes: 12
          },
          {
            id: 'alg1-like-terms', title: 'Combining like terms',
            plain: 'Tidy an expression by adding the parts that match.',
            example: 'Simplify 4x + 3 + 2x - 5',
            wording: ['simplify', 'collect like terms', 'combine', 'add the x terms'],
            objectives: ['Spot terms with the same variable part', 'Combine them without changing the value'],
            prereqs: ['alg1-evaluate'], minutes: 12
          },
          {
            id: 'alg1-distribute', title: 'The distributive property',
            plain: 'Multiply a number into a bracket so every part gets it.',
            example: 'Expand 3(x + 4)',
            wording: ['expand', 'brackets', 'parentheses', 'multiply out', 'distribute'],
            objectives: ['Multiply every term inside the bracket', 'Handle a negative number outside the bracket'],
            prereqs: ['alg1-like-terms'], minutes: 15
          }
        ]
      },
      {
        id: 'alg1-u2', n: 2, title: 'Linear equations',
        topics: [
          {
            id: 'alg1-one-step', title: 'One-step equations',
            plain: 'Undo one operation to find the unknown.',
            example: 'Solve x + 7 = 12',
            wording: ['solve for x', 'find x', 'what number', 'undo'],
            objectives: ['Use the inverse operation', 'Keep both sides balanced'],
            prereqs: ['alg1-evaluate'], minutes: 10
          },
          {
            id: 'alg1-two-step', title: 'Two-step equations',
            plain: 'Undo two operations in the right order.',
            example: 'Solve 3x - 7 = 11',
            wording: ['two step', 'solve for x', 'isolate x', 'get x by itself'],
            objectives: ['Undo adding or subtracting first', 'Then undo multiplying or dividing'],
            prereqs: ['alg1-one-step'], minutes: 15
          },
          {
            id: 'alg1-both-sides', title: 'Variables on both sides',
            plain: 'Gather the letters on one side before you solve.',
            example: 'Solve 3x + 2 = x + 10',
            wording: ['x on both sides', 'variables on both sides', 'move the x', 'collect x'],
            objectives: ['Move variable terms to one side', 'Finish as a two-step equation'],
            prereqs: ['alg1-two-step', 'alg1-like-terms'], minutes: 15
          },
          {
            id: 'alg1-fractions', title: 'Equations with fractions',
            plain: 'Clear the fractions first so the equation is easier.',
            example: 'Solve x/4 + 1 = 3',
            wording: ['fraction', 'divide by', 'over', 'clear the denominator'],
            objectives: ['Multiply both sides to clear denominators', 'Solve the equation that is left'],
            prereqs: ['alg1-two-step'], minutes: 18
          }
        ]
      },
      {
        id: 'alg1-u3', n: 3, title: 'Inequalities',
        topics: [
          {
            id: 'alg1-inequalities', title: 'Solving linear inequalities',
            plain: 'Solve like an equation, then watch the direction of the sign.',
            example: 'Solve -2x + 5 > 9',
            wording: ['inequality', 'greater than', 'less than', 'flip the sign', 'number line'],
            objectives: ['Solve using balanced steps', 'Reverse the sign when multiplying or dividing by a negative'],
            prereqs: ['alg1-two-step'], minutes: 18
          }
        ]
      }
    ]
  };

  // Three ways into any topic. Assistance rules are shown before entry.
  var MODES = {
    learn: {
      id: 'learn', title: 'Learn the idea', kind: 'guided',
      purpose: 'See the idea explained with one worked example, then try a small step yourself.',
      assistance: ['Explanations and worked examples', 'Hints whenever you ask', 'The tutor never gives the final answer to your own try'],
      minutes: 10
    },
    practice: {
      id: 'practice', title: 'Practice with help', kind: 'guided',
      purpose: 'Work a short set of problems with step checks along the way.',
      assistance: ['Hints and step checks', 'Mistakes are pointed out, not fixed for you', 'No final answers until you show a step'],
      minutes: 15
    },
    check: {
      id: 'check', title: 'Check myself', kind: 'independent',
      purpose: 'Try fresh problems on your own to see what you can show without help.',
      assistance: ['No hints during the check', 'Feedback after you finish', 'This is what counts as independent evidence'],
      minutes: 12
    }
  };

  // Fictional class work for the fictional demo class only (invite code DEMO-ALG1).
  var DEMO_ASSIGNMENTS = {
    'DEMO-ALG1': [
      {
        id: 'demo-asg-2-3', demo: true,
        title: 'Worksheet 2.3: Two-step equations',
        purpose: 'Practice undoing two operations before Friday’s lesson on variables on both sides.',
        instructions: 'Show every step. If you get stuck, ask for a hint before looking anything up.',
        materials: ['Worksheet 2.3 (6 questions)', 'Class notes: two-step equations'],
        questions: ['3x - 7 = 11', '5x + 4 = 29', '-2x + 9 = 1', 'x/3 + 2 = 6', '4(x - 1) = 20', '7 = 2x - 5'],
        topicIds: ['alg1-two-step', 'alg1-fractions', 'alg1-distribute'],
        due: null,
        assistance: 'Hints and step checks are allowed. The tutor will not give final answers.',
        sharing: 'When you submit, your steps would be shared with your teacher. In this demo nothing is sent anywhere.'
      }
    ]
  };

  var REVIEW_MATERIAL = {
    'DEMO-ALG1': { title: 'Unit 2 review sheet', topics: ['alg1-one-step', 'alg1-two-step', 'alg1-both-sides', 'alg1-fractions'], demo: true }
  };

  function outlineFor(catalogId) { return catalogId === 'algebra-1' ? ALGEBRA_1 : null; }

  function allTopics(outline) {
    var out = [];
    if (!outline) return out;
    outline.units.forEach(function (u) { u.topics.forEach(function (t) { out.push({ topic: t, unit: u }); }); });
    return out;
  }

  function findTopic(outline, id) {
    var hit = allTopics(outline).filter(function (x) { return x.topic.id === id; })[0];
    return hit || null;
  }

  // Finds topics by formal name, plain description, example, or common wording.
  function searchTopics(outline, q) {
    var s = String(q || '').toLowerCase().trim();
    if (!s) return [];
    var STOP = { the: 1, a: 1, an: 1, of: 1, to: 1, and: 1, is: 1, in: 1, on: 1, for: 1, by: 1, with: 1, what: 1, how: 1, do: 1, i: 1, it: 1 };
    var words = s.split(/\s+/).filter(function (w) { return !STOP[w]; });
    var scored = allTopics(outline).map(function (x) {
      var t = x.topic;
      var hay = [t.title, t.plain, t.example].concat(t.wording).join(' ').toLowerCase();
      var score = 0;
      if (t.title.toLowerCase().indexOf(s) !== -1) score += 5;
      t.wording.forEach(function (w) { if (s.indexOf(w) !== -1 || w.indexOf(s) !== -1) score += 3; });
      words.forEach(function (w) { if (w.length > 1 && hay.indexOf(w) !== -1) score += 1; });
      var shape = guessTopicFromProblem(s);
      if (shape && shape.id === t.id) score += 4;
      return { x: x, score: score };
    }).filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
    // keep strong matches only, so one shared word does not list everything
    var top = scored.length ? scored[0].score : 0;
    return scored.filter(function (r) { return r.score >= Math.max(1, top / 2); }).map(function (r) { return r.x; });
  }

  // Light pattern matching on a typed problem. Returns {id, confident} or null.
  // It is a suggestion only; the student confirms or picks "Not sure yet".
  function guessTopicFromProblem(text) {
    var s = String(text || '').toLowerCase().replace(/\s+/g, '');
    if (!s) return null;
    var hasEq = s.indexOf('=') !== -1;
    var hasIneq = /[<>≤≥]/.test(s);
    var sides = hasEq ? s.split('=') : [];
    var varRe = /[a-z]/;
    if (hasIneq && varRe.test(s)) return { id: 'alg1-inequalities', confident: true };
    if (/^(expand|distribute)/.test(String(text).toLowerCase().trim()) || (/\d\(/.test(s) && !hasEq)) return { id: 'alg1-distribute', confident: true };
    if (/^simplify/.test(String(text).toLowerCase().trim())) return { id: 'alg1-like-terms', confident: true };
    if (/(when|if)[a-z]=/.test(s) || /^(find|evaluate)/.test(String(text).toLowerCase().trim())) return { id: 'alg1-evaluate', confident: false };
    if (hasEq && sides.length === 2) {
      var l = sides[0], r = sides[1];
      var lv = /[a-z]/.test(l.replace(/solve|find/g, '')), rv = /[a-z]/.test(r);
      if (lv && rv) return { id: 'alg1-both-sides', confident: true };
      if (/\/\d|\d\//.test(s)) return { id: 'alg1-fractions', confident: true };
      if (/\d\(/.test(s)) return { id: 'alg1-distribute', confident: false };
      var side = lv ? l : r;
      var ops = (side.replace(/^-/, '').match(/[+\-]/g) || []).length;
      var coef = /\d[a-z]|[a-z]\d/.test(side) || /-[a-z]/.test(side);
      if (ops >= 1 && coef) return { id: 'alg1-two-step', confident: true };
      if (ops >= 1 || coef) return { id: 'alg1-one-step', confident: true };
    }
    return null;
  }

  // The whiteboard (whiteboard-v2.html?c=<course>&act=<activity id>) is the workspace now.
  // It builds the questions with MarkovProblems and reports back through recordCompletion.
  // Original interface notes:
  // The workspace will receive exactly this context and nothing else.
  // MarkovWorkspace.launch({
  //   courseId, catalogId, unitId, topicId, activityId,
  //   activityKind: 'guided' | 'independent',
  //   mode: 'learn' | 'practice' | 'check' | 'homework' | 'test-step',
  //   assistance: [...rules shown on the brief],
  //   assignmentId?, homeworkId?, planId?,
  //   returnTo: 'course.html?c=...#/...'
  // })
  // On finish it reports back through MarkovLearning.recordCompletion(...).

  window.MarkovCourse = {
    MODES: MODES,
    outlineFor: outlineFor,
    allTopics: allTopics,
    findTopic: findTopic,
    searchTopics: searchTopics,
    guessTopicFromProblem: guessTopicFromProblem,
    assignmentsFor: function (code) { return (code && DEMO_ASSIGNMENTS[code]) ? JSON.parse(JSON.stringify(DEMO_ASSIGNMENTS[code])) : []; },
    reviewMaterialFor: function (code) { return (code && REVIEW_MATERIAL[code]) ? JSON.parse(JSON.stringify(REVIEW_MATERIAL[code])) : null; }
  };
})();
