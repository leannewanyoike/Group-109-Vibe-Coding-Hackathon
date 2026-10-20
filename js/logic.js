// ── CloudReady logic ───────────────────────────────────────────────
// Pure functions: they take data in and return data out.
// They never touch the page or localStorage, so they are easy to test
// (see tests.html). Owned by Person 3.

const TARGET_MASTERY = 80;      // the yellow target line on mastery bars
const MIN_TOPIC_ANSWERS = 2;    // answers needed before a topic % is shown
const MIN_TOTAL_ANSWERS = 10;   // answers needed before a readiness estimate

// Randomly reorders a copy of an array (Fisher–Yates shuffle).
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Returns a percentage rounded to a whole number, or null if total is 0.
function percent(correct, total) {
  if (total === 0) return null;
  return Math.round((correct / total) * 100);
}

// "1 question" / "5 questions" — grammatically correct counts.
// Pass the plural yourself for irregular words: pluralize(2, "quiz", "quizzes")
function pluralize(count, word, plural = word + "s") {
  return `${count} ${count === 1 ? word : plural}`;
}

// answers: [{ questionId, topic, concept, selected, correct }]
// Returns the score and a per-topic breakdown for ONE quiz.
function summarizeAnswers(answers) {
  const topicResults = {};

  answers.forEach((answer) => {
    if (!topicResults[answer.topic]) {
      topicResults[answer.topic] = { correct: 0, total: 0 };
    }
    topicResults[answer.topic].total += 1;
    if (answer.correct) topicResults[answer.topic].correct += 1;
  });

  const correctCount = answers.filter((a) => a.correct).length;

  // Weakest topic first
  const weakTopics = Object.keys(topicResults)
    .filter((topic) => topicResults[topic].correct < topicResults[topic].total)
    .sort((a, b) =>
      topicResults[a].correct / topicResults[a].total -
      topicResults[b].correct / topicResults[b].total
    );

  return {
    correctCount: correctCount,
    total: answers.length,
    score: percent(correctCount, answers.length) ?? 0,
    topicResults: topicResults,
    weakTopics: weakTopics
  };
}

// Topic mastery across ALL saved attempts:
// mastery = correct answers ÷ attempted questions × 100
function computeMastery(attempts, topics) {
  const mastery = {};
  topics.forEach((topic) => {
    mastery[topic] = { correct: 0, total: 0, percent: null, enoughData: false };
  });

  attempts.forEach((attempt) => {
    (attempt.answers || []).forEach((answer) => {
      const entry = mastery[answer.topic];
      if (!entry) return;
      entry.total += 1;
      if (answer.correct) entry.correct += 1;
    });
  });

  topics.forEach((topic) => {
    const entry = mastery[topic];
    entry.percent = percent(entry.correct, entry.total);
    entry.enoughData = entry.total >= MIN_TOPIC_ANSWERS;
  });

  return mastery;
}

// A practice-based estimate. Never presented as an exam prediction.
function getReadiness(mastery) {
  const entries = Object.values(mastery);
  const total = entries.reduce((sum, m) => sum + m.total, 0);
  const correct = entries.reduce((sum, m) => sum + m.correct, 0);
  const everyTopicCovered = entries.every((m) => m.enoughData);
  const overall = percent(correct, total);

  if (total < MIN_TOTAL_ANSWERS || !everyTopicCovered) {
    return {
      level: "insufficient",
      label: "Not enough practice yet",
      percent: overall,
      total: total,
      detail: `Answer at least ${MIN_TOTAL_ANSWERS} questions, with at least ${MIN_TOPIC_ANSWERS} in every topic, to see an estimate.`
    };
  }

  const weakest = Math.min(...entries.map((m) => m.percent));

  if (overall >= TARGET_MASTERY && weakest >= 70) {
    return { level: "strong", label: "Practice looks strong", percent: overall, total: total,
      detail: "Keep practising with fresh questions and the official study guide before booking the exam." };
  }
  if (overall >= 60) {
    return { level: "building", label: "Getting closer", percent: overall, total: total,
      detail: "Focus on your weakest topic to raise your overall estimate." };
  }
  return { level: "early", label: "Building foundations", percent: overall, total: total,
    detail: "Read the explanations carefully and use the Study Buddy for concepts you missed." };
}

// Picks the most useful next topic to practise.
function getRecommendation(mastery) {
  const topics = Object.keys(mastery);

  const untried = topics.find((t) => mastery[t].total === 0);
  if (untried) {
    return { topic: untried,
      text: `You haven't practised ${untried} yet. Take a short quiz on it to see where you stand.` };
  }

  const thin = topics.find((t) => !mastery[t].enoughData);
  if (thin) {
    return { topic: thin,
      text: `Answer a few more ${thin} questions so the estimate has enough evidence.` };
  }

  const weakest = topics.reduce((low, t) =>
    mastery[t].percent < mastery[low].percent ? t : low
  );

  if (mastery[weakest].percent < TARGET_MASTERY) {
    return { topic: weakest,
      text: `Revise ${weakest} (${mastery[weakest].percent}%), then complete another short quiz on that topic.` };
  }

  return { topic: null,
    text: "Every topic is at or above the 80% target. Take a mixed quiz to check it holds up." };
}

// The concepts a learner has got wrong most often (most first).
function getMissedConcepts(attempts, limit = 3) {
  const counts = {};
  attempts.forEach((attempt) => {
    (attempt.answers || []).forEach((answer) => {
      if (!answer.correct && answer.concept) {
        counts[answer.concept] = (counts[answer.concept] || 0) + 1;
      }
    });
  });

  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, limit);
}

// Filters concepts by a search word in the title or topic (case-insensitive).
function searchConcepts(concepts, word) {
  const term = word.trim().toLowerCase();
  if (term === "") return concepts;
  return concepts.filter((c) =>
    c.title.toLowerCase().includes(term) ||
    c.topic.toLowerCase().includes(term) ||
    c.explanation.toLowerCase().includes(term)
  );
}

// Checks a Study Buddy question. Returns an error message, or "" if valid.
function validateQuestion(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "Please type a question first.";
  if (trimmed.length > 300) return "Questions must be 300 characters or fewer.";
  return "";
}
