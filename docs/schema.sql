-- CloudReady database schema (SQLite)
-- Design for a future version with learner accounts. See database-design.md.

PRAGMA foreign_keys = ON;

CREATE TABLE topics (
  topic_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE concepts (
  concept_id TEXT PRIMARY KEY,          -- e.g. 'rbac', matches concepts.json
  topic_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
);

CREATE TABLE questions (
  question_id INTEGER PRIMARY KEY,
  topic_id INTEGER NOT NULL,
  concept_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  example TEXT,
  FOREIGN KEY (topic_id) REFERENCES topics(topic_id),
  FOREIGN KEY (concept_id) REFERENCES concepts(concept_id)
);

CREATE TABLE options (
  option_id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 3),
  option_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE,
  UNIQUE (question_id, position)
);

CREATE TABLE learners (
  learner_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE attempts (
  attempt_id INTEGER PRIMARY KEY,
  learner_id INTEGER NOT NULL,
  quiz_topic_id INTEGER,                -- NULL means a mixed quiz
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (learner_id) REFERENCES learners(learner_id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_topic_id) REFERENCES topics(topic_id)
);

-- Join table: one row per question answered in an attempt
CREATE TABLE attempt_answers (
  answer_id INTEGER PRIMARY KEY,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected_option_id INTEGER NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES attempts(attempt_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(question_id),
  FOREIGN KEY (selected_option_id) REFERENCES options(option_id),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_attempts_learner_id ON attempts(learner_id);
CREATE INDEX idx_questions_topic_id ON questions(topic_id);

-- ── Sample data ────────────────────────────────────────────────────
INSERT INTO topics (topic_id, name) VALUES
  (1, 'Cloud concepts'),
  (2, 'Azure architecture and services'),
  (3, 'Management and governance');

INSERT INTO concepts (concept_id, topic_id, title, explanation) VALUES
  ('elasticity', 1, 'Elasticity and scalability', 'Resources grow and shrink automatically with demand.'),
  ('resource-groups', 2, 'Resource groups', 'A logical container for related Azure resources.'),
  ('azure-policy', 3, 'Azure Policy', 'Rules that control how resources may be configured.');

INSERT INTO questions (question_id, topic_id, concept_id, question_text, explanation) VALUES
  (1, 1, 'elasticity', 'Which cloud benefit lets resources adjust to changing demand?', 'Elasticity adds or removes resources as demand changes.'),
  (7, 2, 'resource-groups', 'Which Azure component logically groups resources?', 'A resource group is a logical container.'),
  (14, 3, 'azure-policy', 'Which service enforces rules about resource configuration?', 'Azure Policy evaluates and enforces rules.');

INSERT INTO options (question_id, position, option_text, is_correct) VALUES
  (1, 0, 'High availability', 0), (1, 1, 'Elasticity', 1), (1, 2, 'Governance', 0), (1, 3, 'Fault tolerance', 0),
  (7, 0, 'Azure region', 0), (7, 1, 'Resource group', 1), (7, 2, 'Availability zone', 0), (7, 3, 'Virtual network', 0),
  (14, 0, 'Azure Policy', 1), (14, 1, 'Azure Monitor', 0), (14, 2, 'Azure Advisor', 0), (14, 3, 'Azure Cloud Shell', 0);

INSERT INTO learners (learner_id, name, email) VALUES
  (1, 'Amina Hassan', 'amina.hassan@example.edu'),
  (2, 'Brian Otieno', 'brian.otieno@example.edu');

INSERT INTO attempts (attempt_id, learner_id, quiz_topic_id) VALUES
  (1, 1, NULL),
  (2, 1, 3);

-- Attempt 1: right, right, wrong. Attempt 2: right.
INSERT INTO attempt_answers (attempt_id, question_id, selected_option_id) VALUES
  (1, 1, 2), (1, 7, 6), (1, 14, 10),
  (2, 14, 9);

-- ── Example query: topic mastery for learner 1 across all attempts ─
SELECT
  t.name AS topic,
  SUM(o.is_correct) AS correct,
  COUNT(*) AS total,
  ROUND(100.0 * SUM(o.is_correct) / COUNT(*)) AS percent
FROM attempt_answers aa
JOIN attempts a ON a.attempt_id = aa.attempt_id
JOIN questions q ON q.question_id = aa.question_id
JOIN topics t ON t.topic_id = q.topic_id
JOIN options o ON o.option_id = aa.selected_option_id
WHERE a.learner_id = 1
GROUP BY t.topic_id
ORDER BY percent;
