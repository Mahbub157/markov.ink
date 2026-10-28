# CanvasIQ / Markov.ink

Whiteboard-native AI tutor. Static site plus one serverless function.

- `index.html` – landing page
- `whiteboard.html` – the tutor app
- `pitch-deck.html` – investor deck (print to PDF with Cmd/Ctrl+P)
- `api/tutor.js` – Vercel function that holds the Anthropic key and forwards requests
- `onboarding.html` (`/onboarding`): student setup, school-invited or independent
- `learn.html` (`/learn`): the learning home, organized by course
- `learn-assets/`: shared profile storage, UI helpers, and styles for those two pages only

## Student onboarding and learning home

The landing page links to `/onboarding` ("Set up your learning space") and `/learn` ("Your courses").
The whiteboard is unchanged and still opens directly, with its own name and subject screen.

Answers are stored in the browser under `markov.learningProfile.v1`. This is a prototype store:
no account, no sync, no verified school membership. The whiteboard keys (`ciq_mistakes`,
`ciq_reviews`, `ciq_sessions`) are never read or written by these pages. If the browser blocks
storage, the setup lasts for the open tab only and the page says so.

School invitations are simulated. The only valid code is the fictional `DEMO-ALG1`
(Northfield Demo High School, Ms. Alvarez, Algebra I). Try it at `/onboarding?invite=DEMO-ALG1`.
School courses stay locked to their teacher; personal courses can be added or removed freely.

## Course pages

`course.html?c=<course id>` (`/course`) is a course's home, opened from Your courses. It is built
around three intentions: work on homework, understand a topic, and prepare for a test. Screens are
in-page routes: `#/homework`, `#/homework/new`, `#/topics`, `#/topic/<id>`, `#/topic/<id>/<mode>`,
`#/test`, `#/test/<plan id>`, and `#/progress`.

- `learn-assets/course-data.js`: the Algebra I pilot outline (3 units, 8 topics, written for this
  prototype and not aligned to standards), topic search, the three ways into a topic, and the
  fictional demo assignment for `DEMO-ALG1`. Other courses have no outline and say so.
- `learn-assets/learning.js`: activity status, practice points, streaks, and learning evidence,
  stored under `markov.learning.v1`.
- `learn-assets/course.js` and `course.css`: the screens.

Rules worth knowing:

- Activities stop at a saved brief. The learning workspace is the next phase; its interface is
  described at the bottom of `course-data.js`. It reports finished work through
  `MarkovLearning.recordCompletion()`.
- Practice points: +20 for a finished, reviewed guided activity, +30 for a finished, reviewed
  independent check. Hints never lower points. Opening, saving, uploading, and planning earn
  nothing. Each attempt has a stable event id, so a replayed report adds nothing.
- A streak day is a day with at least one finished, reviewed activity, counted in the time zone
  saved with the record. A missed day never removes points or progress.
- Topic states come from finished activities: no evidence yet, in progress, practiced with help,
  independent evidence, review suggested.
- Photos and PDFs are read in the browser by `learn-assets/reader.js`: PDFs with a text layer
  through pdf.js, photos and scanned PDFs through Tesseract.js text recognition (both pinned, loaded
  only when a file is chosen). The reader separates numbered questions, keeps (a)/(b) parts with
  their question, and tidies math spacing. Each question gets its own editable card. Nothing is
  uploaded and the file is not saved; only the questions the student keeps are stored.
  Printed sheets read well; handwriting does not, and symbols can be misread, so students check
  each card.
- Optional Claude vision: `api/read-questions.js` sends the page images to Claude
  (`claude-opus-5-5`, structured JSON output) and gets back only the questions, with sub-parts,
  shared directions, and a list of what was left out (names, student working, answers, scores,
  teacher notes, page headers). It reports honestly when a page has no questions or cannot be
  read, and never solves anything. The page shows a "Read with Claude" switch only when
  `GET /api/read-questions` says the key is set; if the call fails, the on-device reader takes
  over. Limits: 5 pages, about 1.2 MB per page image, allowed origins only, 12 reads per
  10 minutes per visitor. Needs `ANTHROPIC_API_KEY` and the functions in this folder to be live
  (`npm install` here pins `@anthropic-ai/sdk`).

- Whiteboard v2 (`whiteboard-v2.html`, `learn-assets/board.js`, `board-tutor.js`, `board.css`):
  one board with a floating, collapsible tool panel (pen, highlighter, eraser, shapes, text,
  undo). The tutor has its own blue layer and a labeled cursor: it circles steps, ticks correct
  ones, writes short notes, and draws small diagrams (dots, number line, balance, triangle, plot,
  fraction bar), and never edits the student's ink. It talks in one line of subtitles, read
  aloud when voice is on; the mic uses the browser's speech recognition. "I need help" opens
  focus mode: the board dims, one step is lit, and the tutor asks one question with Show me,
  Still stuck, and I fixed it. Homework questions open here ("Work on the board", Start and
  Continue), and the saved place follows the question. With a key, a picture of the board goes
  to `/api/tutor` and Claude answers with JSON actions; without one, demo replies give general
  hints and say they cannot read handwriting. The menu has a 30 second demo. Boards are saved
  in `markov.board.v1`; the previous whiteboard is unchanged at `whiteboard.html`.

Demo mode: `course.html?c=<id>&demo=1` shows a labeled banner, uses a separate key
(`markov.learning.demo.v1`), and adds simulation controls on the progress page. Nothing in demo
mode touches the real record, and the normal student pages have no simulation controls.

Run these pages locally with any static server that supports clean URLs, for example:

    npx serve@14.2.4 .

## Live AI

Set one environment variable in Vercel (Project → Settings → Environment Variables):

    ANTHROPIC_API_KEY = sk-ant-...

Optional: `TUTOR_MODEL` (default `claude-opus-5`; also `claude-sonnet-5`, `claude-fable-5-1`).

The page checks `/api/tutor` on load. If the key is set, every user gets live AI with nothing to paste.
If it is not set (or the file is opened locally), the gear menu still accepts a personal key.

## Run locally with the function

    npm install -g vercel
    vercel dev

## Deploy

Push to `main`. Vercel redeploys automatically.
