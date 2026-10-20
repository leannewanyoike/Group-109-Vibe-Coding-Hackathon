# Vibe coding CloudReady with Web Foundations skills

Vibe coding means describing what you want to an AI coding assistant (Copilot,
Claude, ChatGPT, Cursor…) and letting it write the first draft. In this hackathon
the AI writes the draft, but **you own the code**: you review it, test it, and can
explain every line using what you learned in Web Foundations.

> **Team rule:** if you can't explain a line during the demo, it doesn't get merged.

---

## 1. The ground-rules prompt

Paste this at the start of **every** AI session. It stops the assistant from
reaching for tools the course didn't cover.

```text
You are helping a beginner team build CloudReady, an unofficial AZ-900 practice
web app, for a hackathon. We completed a Web Foundations course, so follow these
rules exactly:

- Use only plain HTML, CSS and vanilla JavaScript. No React, no frameworks,
  no npm, no build step. The app must run with VS Code Live Server.
- HTML: semantic elements (header, nav, main, section, footer), labels for
  every input, forms with novalidate and our own validation.
- CSS: one stylesheet, CSS variables in :root, Flexbox and Grid, a
  @media (max-width: 600px) breakpoint. Respect prefers-reduced-motion.
- JavaScript: select elements with document.querySelector, use
  addEventListener, build elements with document.createElement and set text
  with textContent. NEVER put data into innerHTML (innerHTML = "" to clear
  a list is fine).
- Data: questions live in data/questions.json and are loaded with fetch,
  async/await, response.ok checks and try/catch/finally.
- Progress is saved in localStorage with JSON.stringify / JSON.parse inside
  try/catch.
- Keep functions small, add short comments, and explain your code so a
  beginner can follow it.
- Do not invent Microsoft Azure features, and never copy real exam questions.

Our shared question format is:
{ id, topic, concept, question, options: [4 strings], correctAnswer: 0-3,
  explanation, example }
Topics are exactly: "Cloud concepts", "Azure architecture and services",
"Management and governance".
```

---

## 2. Prompts for each team member

Each person works in their own files and their own Git branch. Run the prompts
in order, test after each one, and commit when it works.

### Person 1: Frontend developer
Files: `index.html`, `about.html`, `css/style.css`, `js/ui.js`, `js/quiz.js`

1. *"Create index.html with a header and nav linking to index.html, dashboard.html,
   study-buddy.html and about.html. Add three sections: a start section, a quiz
   section and a results section. Hide the quiz and results sections with the
   hidden attribute."*
2. *"Write css/style.css using CSS variables for colours, a centred 820px column,
   card styles and a 600px media query that stacks buttons vertically."*
3. *"In js/quiz.js, load data/questions.json with fetch and render one button per
   topic plus a 'mixed quiz' button. Use createElement and textContent."*
4. *"Show one question at a time as a form with radio buttons. On submit, show the
   error 'Please choose an answer first.' if nothing is selected; otherwise lock
   the options, colour the right answer green and the wrong one red, and show the
   explanation."*

✅ **Check:** Use the keyboard alone to answer a question. Check it at 390px wide.
Search your files for `innerHTML` and make sure it's only used to clear elements.

### Person 2: Quiz and content developer
Files: `data/questions.json`, `data/concepts.json`

1. *"Write 5 original AZ-900 practice questions about [topic] in our shared format.
   Use Kenyan examples. Each must have exactly one correct answer and three
   clearly wrong but believable options. Do not copy real exam questions."*
2. *"Review these questions as a strict examiner: is any option arguably also
   correct? Is any fact out of date?"*

✅ **Check:** Verify **every** answer yourself on Microsoft Learn. AI assistants
can be confidently wrong, so the AI's review doesn't replace yours. Then open
`tests.html` to confirm the data passes the format checks.

### Person 3: Dashboard and progress developer
Files: `js/logic.js`, `js/storage.js`, `js/dashboard.js`, `dashboard.html`

1. *"Write pure functions (no DOM, no localStorage) in js/logic.js: summarizeAnswers,
   computeMastery across all attempts, getReadiness and getRecommendation. Topic
   mastery = correct ÷ attempted × 100. Show null when there are no answers."*
2. *"Write getAttempts, saveAttempt and clearAttempts in js/storage.js using
   localStorage, JSON.parse/stringify and try/catch, like a notes app."*
3. *"Build dashboard.html showing latest score, total questions, a mastery bar per
   topic with an 80% target line, a recommended next step and a 'Clear all'
   button that asks confirm() first."*

✅ **Check:** Complete two quizzes, refresh the page, and confirm the numbers still
add up by hand. Add a test to `js/tests.js` for any bug you fix.

### Person 4: Study Buddy developer
Files: `study-buddy.html`, `js/study-buddy.js`, `js/config.js`

1. *"Build study-buddy.html with a concept list and a live search box that filters
   concepts as I type, case-insensitively, like a notes search."*
2. *"When a concept is clicked, show its explanation, example, common confusion
   and a practice question with a 'Show answer' button."*
3. *"Add an 'Ask your own question' form that validates 1–300 characters. If
   AI_ENDPOINT in config.js is empty, show a friendly message. Otherwise POST
   { concept, question } with fetch and show the reply using textContent, with
   try/catch/finally re-enabling the button."*

✅ **Check:** Open `study-buddy.html?concept=rbac` directly. Search for a word that
matches nothing. Confirm that **no API key ever appears in any frontend file**:
the browser can read everything in them.

### Person 5: Integration, QA and pitch lead
Files: `README.md`, `docs/`, `tests.html`, `js/tests.js`, GitHub

1. *"Write test cases for these functions in the style: call the function, compare
   with the expected value, show Pass or Fail."* (paste `js/logic.js`)
2. *"Review this pull request for bugs, accessibility problems and use of
   innerHTML with data."* (paste the diff)
3. *"Help me write a five-minute demo script: problem, solution, live demo,
   Study Buddy moment, impact."*

✅ **Check:** Run the demo checklist in the README on a teammate's laptop, not your own.

---

## 3. Review checklist for any AI-generated code

Before you commit, go through each item:

- [ ] I can explain what every function does and why.
- [ ] Only plain HTML, CSS and JS: no `import`, no `npm`, no framework.
- [ ] Text from data or users is set with `textContent`, never `innerHTML`.
- [ ] Every `fetch` checks `response.ok` and has `try/catch`.
- [ ] Every `localStorage` read is wrapped in `try/catch`.
- [ ] Forms validate input and show a clear message in an `aria-live` element.
- [ ] Inputs have `<label>`s; everything works with the keyboard.
- [ ] It works at 390px wide and in dark mode.
- [ ] The question format and file ownership match what the team agreed.
- [ ] `tests.html` still shows 0 failed.

## 4. Prompt for when something breaks

```text
I'm a beginner using plain HTML/CSS/JS (no frameworks).
What I expected: …
What happened instead: …
The error in the browser console (F12) is: …
Here is the relevant code: …
Explain the cause in simple terms before giving the fix.
```

Asking for the cause first means you learn something, not just paste a fix.

## 5. Red flags: stop and push back

| The AI suggests… | Why it's a problem | Reply with |
| --- | --- | --- |
| React, Vue, npm, Vite | Outside the course; adds setup risk | "Use vanilla JS only." |
| `innerHTML = \`…${data}…\`` | XSS risk (Web Foundations, QuickNotes) | "Use createElement and textContent." |
| An API key in a `.js` file | Anyone can steal it from the browser | "Keys belong on a server only." |
| A new Azure "feature" you can't find on Microsoft Learn | Possibly invented | Delete it, or verify it |
| Rewriting a teammate's file | Causes merge conflicts | "Only change the files I gave you." |

## 6. Git habits (same as the course repo)

- Commit small, working steps with clear messages:
  `Add quiz form validation`, `Add mastery bars to dashboard`.
- Pull `main` and merge at least twice a day.
- Never commit a file containing a secret key.
