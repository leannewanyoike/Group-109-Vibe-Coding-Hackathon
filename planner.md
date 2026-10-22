# Study planner (added feature)

A new page, `planner.html`, turns a learner's exam date, study hours per day, available weekdays and weak topics into a day-by-day AZ-900 study plan. It is built only from **new files**; no existing file was changed.

## New files

| File | Purpose |
| --- | --- |
| `planner.html` | The Study plan page (form and plan) |
| `js/planner.js` | Page behaviour: reads the form, draws the plan with `createElement` and `textContent`, ticks days off |
| `js/planner-logic.js` | Pure functions: `validatePlannerInput`, `getStudyDates`, `allocateTopicDays`, `generateStudyPlan` and date helpers |
| `js/planner-storage.js` | localStorage helpers for the plan (`cloudready_plan`) |
| `css/planner.css` | Planner styles, using the existing CSS variables (works in dark mode) |
| `planner-tests.html`, `js/planner-tests.js` | 41 checks for the planner logic |

It reuses the existing `logic.js`, `storage.js`, `data.js` and `ui.js` and the shared stylesheet, so it looks like the rest of the app.

## How the plan is built

1. Study days run from the day the plan is created to the day *before* the exam, keeping only the weekdays the learner chose.
2. The last study day is a light final review. With at least 4 study days and 2+ hours a day, the day before it is a timed 50-question mock exam (1 h 45 min).
3. The remaining days are shared between the three AZ-900 domains by their exam weightings. A weak topic counts double and is studied first. If there are too few days, the plan says which topics it could not cover.
4. Learning days are about 60% reading (Microsoft Learn and Study Buddy) and 40% practice. Later days on the same topic are practice and revision.
5. Weak topics are pre-selected from saved practice results (mastery below 80%). Missed concepts are listed to revisit, and days can be ticked off.

Only the inputs and ticked days are saved; the plan is rebuilt from them each time. The plan is a study guide made by this app, not an official Microsoft schedule or a prediction of the exam result.

## Optional: link it from the other pages

The planner page works on its own. To make it easy to find, add this one line to the `<nav>` of each page (for example after the "Practise" link):

```html
<a href="planner.html">Study plan</a>
```

## Run it

Serve the folder (Live Server or `python -m http.server 5501`), open `planner.html`, and open `planner-tests.html` to check that it says **0 failed**.