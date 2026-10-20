# CloudReady Database Design

Version 1 of CloudReady stores questions in JSON files and progress in
`localStorage`. This design is for a future version where learners sign in and
their progress follows them between devices. The SQL is in `schema.sql` and runs
in SQLite.

## Tables

- `topics` stores the three official AZ-900 domains. Each name is unique.
- `concepts` stores the Study Buddy concepts (such as `rbac`). Each belongs to one topic.
- `questions` stores each question's text, explanation and example, and links to its topic and concept.
- `options` stores the four answer choices for each question, their position (0–3), and whether each one is correct.
- `learners` stores each learner's ID, required name and unique email address.
- `attempts` records each completed quiz: who took it, when, and which topic it covered (`NULL` for a mixed quiz).
- `attempt_answers` records which option the learner chose for each question in an attempt.

## Relationships

One topic has many concepts and many questions. One question has four options.
One learner has many attempts, and one attempt has many answers.

`attempt_answers` is a join table. It connects attempts and questions, which have a
many-to-many relationship: one attempt includes many questions, and one question
appears in many learners' attempts. It also stores the option the learner chose
for that attempt–question pair. Its `UNIQUE (attempt_id, question_id)` constraint
stops the same question being saved twice in one attempt.

Correctness is **not** stored in `attempt_answers`. It comes from joining to
`options.is_correct`, so if a question's answer key is ever fixed, every learner's
mastery is recalculated correctly.

## Indexes

- `idx_attempts_learner_id` on `attempts(learner_id)` helps SQLite find a learner's attempts quickly for the dashboard.
- `idx_questions_topic_id` on `questions(topic_id)` speeds up loading a single-topic quiz and grouping results by topic.
- The `UNIQUE` constraints on `options(question_id, position)` and `attempt_answers(attempt_id, question_id)` already create useful indexes for those lookups.

## Topic mastery query

The last query in `schema.sql` calculates mastery the same way `computeMastery()`
does in `js/logic.js`: correct answers ÷ attempted questions × 100, grouped by
topic, across all of a learner's attempts.

## SQL or NoSQL

I would choose SQL. Topics, questions, options, learners and attempts have clear
relationships, and the app needs foreign keys, unique emails, exactly one
position per option, and protection against duplicate answers. Calculating
mastery is a natural `JOIN` + `GROUP BY`. A NoSQL database could store attempts as
documents, but the app would then have to enforce these rules itself and work
harder to calculate mastery across many attempts.
