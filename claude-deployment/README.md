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
