# CloudReady

CloudReady is an unofficial AZ-900 (Azure Fundamentals) practice web app. Learners take a quiz, see exactly why each answer is right or wrong, track their mastery across the three official exam domains, and use a Study Buddy to understand the concepts they missed.

It is built with semantic HTML, CSS (Flexbox, Grid and media queries) and vanilla JavaScript, using only the skills from the [Web Foundations course](https://github.com/leannewanyoike/web-foundations). There are no frameworks, no build steps and no backend.

> CloudReady is not affiliated with or endorsed by Microsoft. All questions are original practice items, not exam questions. Verify content against the [official AZ-900 study guide](https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-900).

## Features

- **Topic quizzes**: 80 original questions across the three AZ-900 domains. The timed mixed exam selects 50 questions across the domains for each attempt; topic practice remains available.
- **Timed mock exam**: 1 hour 45 minutes, with a live countdown. Unanswered questions count as incorrect when time expires.
- **Form validation**: checking without choosing an answer shows "Please choose an answer first." in an `aria-live` message.
- **Instant feedback**: the right answer turns green and the wrong one red, followed by an explanation and a Kenyan real-life example.
- **Distractor explanations**: each incorrect choice explains the specific misconception, both during a quiz and in a saved missed-answer review on the dashboard.
- **Topic mastery dashboard**: mastery = correct ÷ attempted × 100, calculated across all saved quizzes and drawn as bars with an 80% target line. Topics with too few answers say "Not enough data".
- **Practice-based readiness estimate**: shown only after 10+ answers covering every topic, always with the number of answers behind it. It is never presented as an exam prediction.
- **Recommended next step**: points to the untried or weakest topic and starts a quiz on it in one click.
- **Study Buddy**: live search across 57 concepts, plain-language explanations, a common confusion and a "test yourself" question. Tutor questions are matched against saved concepts and practice questions; concepts you've missed are shown first.
- **localStorage persistence**: practice history survives refreshes, with a "Clear all" button that asks for confirmation.
- **Safe DOM rendering**: all content is built with `createElement` and `textContent`, never `innerHTML` with data.
- **Responsive and accessible**: works at phone width, in dark mode and with the keyboard alone.
- **Logic tests**: `tests.html` runs 38 checks on the logic and the question data.

## How to run locally

No build tools or dependencies are needed, but the app **must be served** (not double-clicked) because it loads JSON files with `fetch`.

1. Open the `cloudready` folder in VS Code.
2. Right-click `index.html` → **Open with Live Server** (port 5501 is preset in `.vscode/settings.json`).
3. Or use a local static server:
   ```bash
   # Python 3
   python -m http.server 5501
   # Node.js
   npx serve .
   ```
4. Open `tests.html` to confirm everything passes: it should say **0 failed**.

## Project structure

```
cloudready/
├── index.html          # Practise: choose a quiz, answer questions, see results
├── dashboard.html      # My progress: mastery, readiness, recommendation, history
├── study-buddy.html    # Study Buddy: search concepts and test yourself
├── about.html          # The problem, how it helps, disclaimer, team
├── tests.html          # Logic and data tests
├── css/style.css       # One stylesheet, organised in numbered sections
├── js/
│   ├── logic.js        # Pure functions: scoring, mastery, readiness, search, validation
│   ├── storage.js      # localStorage helpers
│   ├── data.js         # fetch helpers for the JSON files
│   ├── ui.js           # Shared DOM helpers (el, createMasteryBar)
│   ├── quiz.js         # index.html behaviour
│   ├── dashboard.js    # dashboard.html behaviour
│   ├── study-buddy.js  # study-buddy.html behaviour
│   ├── config.js       # Optional AI endpoint (empty by default)
│   └── tests.js        # tests.html checks
├── data/
│   ├── questions.json  # Question bank in the shared format
│   └── concepts.json   # Approved Study Buddy notes
└── docs/
    ├── vibe-coding-guide.md   # Prompts and review checklists for each team member
    ├── api-design.md          # REST API design for a future backend
    ├── database-design.md     # Database design for learner accounts
    └── schema.sql             # SQLite schema, sample data and mastery query
```

## Web Foundations skills applied

| Course skill | Where it was learned | Where CloudReady uses it |
| --- | --- | --- |
| Semantic, multi-page HTML | Day 1 (`index.html`, `about.html`) | Four linked pages with `header`, `nav`, `main`, `section`, `footer` |
| CSS layout and responsive design | Day 2 | CSS variables, Flexbox header and actions, Grid topic cards and dashboard stats, 600px breakpoint |
| JavaScript functions and arrays | Day 3 (`searchNotes`, `countByCategory`) | `filter`, `reduce`, `sort` in `logic.js` (`summarizeAnswers`, `computeMastery`, `searchConcepts`) |
| DOM manipulation | Day 4 | `querySelector`, `addEventListener`, `createElement`, `textContent` throughout |
| Categories with colours | QuickNotes | Each AZ-900 topic has its own border colour on cards and concepts |
| Form validation and error messages | QuickNotes | Quiz answer form and Study Buddy question form (1–300 characters) |
| Live search | QuickNotes | Study Buddy concept search |
| Grammatical counts | QuickNotes | `pluralize()`: "1 concept", "5 concepts", "2 quizzes" |
| localStorage with JSON | QuickNotes | `storage.js` saves every quiz attempt |
| Clear all with `confirm()` | QuickNotes | Dashboard "Clear all" button |
| `fetch`, async/await, try/catch/finally | Day 5, API Lab | Loading `questions.json` and `concepts.json`; optional POST to the AI tutor |
| Loading local JSON | Day 5 (`users.json`) | `data/questions.json`, `data/concepts.json` |
| REST API design | Day 5 (`library-api.md`) | `docs/api-design.md` |
| SQL database design | Day 6 (`school.sql`) | `docs/schema.sql` and `docs/database-design.md` |

## Team roles (5 people)

| Person | Role | Owns |
| --- | --- | --- |
| 1 | Frontend developer | `index.html`, `about.html`, `css/style.css`, `js/ui.js`, `js/quiz.js` |
| 2 | Quiz and content developer | `data/questions.json`, `data/concepts.json` (verify everything on Microsoft Learn) |
| 3 | Dashboard and progress developer | `dashboard.html`, `js/logic.js`, `js/storage.js`, `js/dashboard.js` |
| 4 | Study Buddy developer | `study-buddy.html`, `js/study-buddy.js`, `js/config.js` |
| 5 | Integration, QA and pitch lead | `tests.html`, `js/tests.js`, `docs/`, README, GitHub, demo |

See **[docs/vibe-coding-guide.md](docs/vibe-coding-guide.md)** for the ground-rules prompt, step-by-step prompts for each role, and the review checklist every AI-generated change must pass.

### Shared question format

```json
{
  "id": 20,
  "topic": "Cloud concepts",
  "concept": "elasticity",
  "question": "…",
  "options": ["…", "…", "…", "…"],
  "correctAnswer": 1,
  "explanation": "…",
  "incorrectExplanations": { "0": "Why this distractor is wrong…", "2": "…", "3": "…" },
  "example": "…"
}
```

`topic` must be one of the three official domains, `concept` must match an `id` in `concepts.json`, and `id` values are never reused.
Each index in `incorrectExplanations` must be a wrong option index; explain every incorrect option. Microsoft Learn and the three domains supplied by the user define the exam scope. The linked Quizlet set and YouTube video are topic references only; all CloudReady question wording, choices, and explanations are original. Video captions were unavailable, and no questions or answers were copied.

## Demo checklist

- [ ] A wrong answer shows the right answer and an explanation
- [ ] Results are grouped under the three AZ-900 domains
- [ ] The dashboard recommends the weakest topic
- [ ] Refreshing keeps saved history
- [ ] The Study Buddy explains the missed concept
- [ ] `tests.html` shows 0 failed

**Five-minute demo story:** the problem → CloudReady → answer a question wrongly and read the explanation → open My progress and follow the recommendation → open the missed concept in the Study Buddy → impact and next steps.

## Optional stretch: AI tutor

The Study Buddy works fully from `concepts.json`. To add a live AI tutor, a team member would build the small backend described in `docs/api-design.md` → `POST /study-buddy` and set its address in `js/config.js`. **The AI provider's API key must only ever live on that server.** Anything in a frontend file can be read by anyone who opens the page.

## Known limitations

- 80 questions is enough for a demo, not for a reliable readiness estimate; aim for a larger bank before treating readiness estimates as representative.
- Progress is stored per browser; there are no accounts yet (see `docs/database-design.md`).
- The AI tutor needs a backend, which is outside the Web Foundations course.

## What we learned

1. **Pure functions make testing easy.** Keeping scoring logic separate from the DOM meant `tests.html` could check it without clicking through quizzes.
2. **One render step, many views.** Like QuickNotes' `render()`, the dashboard recalculates everything from saved attempts, so it can never go out of sync.
3. **AI drafts, humans verify.** Vibe coding was fastest when the ground-rules prompt kept the AI within our course skills, and every Azure fact was checked on Microsoft Learn.
