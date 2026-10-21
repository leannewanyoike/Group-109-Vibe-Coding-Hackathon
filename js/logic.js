// ── CloudGenius logic ───────────────────────────────────────────────
// Pure functions: they take data in and return data out.
// They never touch the page or localStorage, so they are easy to test
// (see tests.html). Owned by Person 3.

const TARGET_MASTERY = 80;      // the yellow target line on mastery bars
const MIN_TOPIC_ANSWERS = 2;    // answers needed before a topic % is shown
const MIN_TOTAL_ANSWERS = 10;   // answers needed before a readiness estimate
const MIXED_EXAM_QUESTION_COUNT = 50;
const EXAM_DURATION_SECONDS = 105 * 60;

const EXAM_TOPIC_WEIGHTS = {
  "Cloud concepts": 0.275,
  "Azure architecture and services": 0.375,
  "Management and governance": 0.35
};

// Randomly reorders a copy of an array (Fisher–Yates shuffle).
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatCountdown(totalSeconds) {
  const secondsRemaining = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Builds a fresh exam close to the official AZ-900 domain weightings.
function buildMixedExam(questions, topics, count = MIXED_EXAM_QUESTION_COUNT) {
  const weights = topics.map((topic) => EXAM_TOPIC_WEIGHTS[topic] || 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = totalWeight > 0
    ? weights.map((weight) => weight / totalWeight)
    : topics.map(() => 1 / topics.length);
  const exactQuotas = normalizedWeights.map((weight) => weight * count);
  const quotas = exactQuotas.map(Math.floor);
  let remainingSlots = count - quotas.reduce((sum, quota) => sum + quota, 0);
  const remainderOrder = exactQuotas
    .map((quota, index) => ({ index, remainder: quota - Math.floor(quota) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let index = 0; index < remainingSlots; index++) {
    quotas[remainderOrder[index].index] += 1;
  }

  const exam = [];
  topics.forEach((topic, index) => {
    const topicPool = shuffle(questions.filter((question) => question.topic === topic));
    const quota = quotas[index];
    if (topicPool.length < quota) {
      throw new Error(`Not enough ${topic} questions to build a ${count}-question exam.`);
    }

    const selectedConcepts = new Set();
    const conceptFirstQuestions = topicPool.filter((question) => {
      if (selectedConcepts.has(question.concept)) return false;
      selectedConcepts.add(question.concept);
      return true;
    }).slice(0, quota);
    const selectedIds = new Set(conceptFirstQuestions.map((question) => question.id));
    const remainingQuestions = shuffle(topicPool.filter((question) => !selectedIds.has(question.id)));

    exam.push(...conceptFirstQuestions, ...remainingQuestions.slice(0, quota - conceptFirstQuestions.length));
  });

  if (exam.length !== count) {
    throw new Error(`Could not build an exam with ${count} questions.`);
  }

  return shuffle(exam);
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

// Finds the best-supported concept and practice question for a tutor query.
function findTutorMatch(text, concepts, questions, preferredConceptId = null) {
  const stopWords = new Set([
    "a", "about", "an", "and", "are", "can", "do", "does", "for", "from",
    "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "please",
    "help", "need", "please", "service", "should", "support", "team", "tell",
    "that", "the", "this", "to", "use", "using", "want", "what", "when",
    "where", "which", "who", "why", "with", "you", "your", "azure"
  ]);
  const terms = [...new Set((text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((term) => !stopWords.has(term)))];
  if (terms.length === 0) return null;

  const scoreText = (value, weight) => {
    const words = new Set((value.toLowerCase().match(/[a-z0-9]+/g) || []));
    return terms.reduce((score, term) => score + (words.has(term) ? weight : 0), 0);
  };

  const matches = concepts.map((concept) => {
    const relatedQuestions = questions.filter((question) => question.concept === concept.id);
    let score = scoreText(
      `${concept.title} ${concept.id.replace(/-/g, " ")} ${concept.topic}`,
      5
    );
    score += scoreText(`${concept.explanation} ${concept.confusion}`, 2);
    score += scoreText(
      `${concept.practice.question} ${concept.practice.answer}`,
      3
    );

    relatedQuestions.forEach((question) => {
      score += scoreText(question.question, 4);
      score += scoreText(question.options.join(" "), 2);
    });

    return { concept, relatedQuestions, score };
  }).filter((match) => match.score >= 4)
    .sort((a, b) => b.score - a.score ||
      Number(b.concept.id === preferredConceptId) - Number(a.concept.id === preferredConceptId));

  if (matches.length === 0) return null;

  const bestMatch = matches[0];
  const relatedQuestion = bestMatch.relatedQuestions
    .map((question) => ({
      question,
      score: scoreText(question.question, 4) +
        scoreText(question.options.join(" "), 2) +
        scoreText(`${question.explanation} ${question.example}`, 1)
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  return {
    concept: bestMatch.concept,
    question: relatedQuestion?.question || null
  };
}

// Checks a Study Buddy question. Returns an error message, or "" if valid.
function validateQuestion(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "Please type a question first.";
  if (trimmed.length > 300) return "Questions must be 300 characters or fewer.";
  return "";
}
