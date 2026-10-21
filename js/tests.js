// ── Logic tests (tests.html) ───────────────────────────────────────
// Like the Day 3 exercises: call a function, compare with the expected
// result. Owned by Person 5 (QA). Add a test whenever you fix a bug.

const testList = document.querySelector("#test-list");
const testSummary = document.querySelector("#test-summary");
let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? passed++ : failed++;

  const li = document.createElement("li");
  const label = document.createElement("span");
  label.textContent = name;
  const result = document.createElement("span");
  result.className = "history-score";
  result.textContent = ok ? "Pass" : `Fail — got ${JSON.stringify(actual)}`;
  result.style.color = ok ? "var(--right)" : "var(--wrong)";
  li.style.gridTemplateColumns = "1fr auto";
  li.appendChild(label);
  li.appendChild(result);
  testList.appendChild(li);

  console.log(ok ? "✅" : "❌", name, ok ? "" : { actual, expected });
}

const TOPICS = ["Cloud concepts", "Azure architecture and services", "Management and governance"];
const answer = (topic, correct, concept = "rbac") => ({ topic, correct, concept });

// percent & pluralize
check("percent(3, 4) is 75", percent(3, 4), 75);
check("percent(0, 0) is null", percent(0, 0), null);
check("pluralize 1 question", pluralize(1, "question"), "1 question");
check("pluralize 5 questions", pluralize(5, "question"), "5 questions");
check("pluralize 2 quizzes", pluralize(2, "quiz", "quizzes"), "2 quizzes");

// summarizeAnswers
const summary = summarizeAnswers([
  answer("Cloud concepts", true),
  answer("Cloud concepts", false),
  answer("Management and governance", false)
]);
check("summary score is 33", summary.score, 33);
check("summary correctCount is 1", summary.correctCount, 1);
check("weakest topic comes first", summary.weakTopics, ["Management and governance", "Cloud concepts"]);
check("empty quiz scores 0", summarizeAnswers([]).score, 0);

// computeMastery uses ALL attempts
const attempts = [
  { answers: [answer("Cloud concepts", true), answer("Cloud concepts", true)] },
  { answers: [answer("Cloud concepts", false), answer("Cloud concepts", true)] }
];
const mastery = computeMastery(attempts, TOPICS);
check("mastery across attempts is 75%", mastery["Cloud concepts"].percent, 75);
check("untried topic is null", mastery["Management and governance"].percent, null);

// readiness and recommendation
check("readiness needs evidence", getReadiness(mastery).level, "insufficient");
check("recommends untried topic", getRecommendation(mastery).topic, "Azure architecture and services");

const many = [{ answers: [
  ...Array(4).fill(answer("Cloud concepts", true)),
  ...Array(3).fill(answer("Azure architecture and services", true)),
  answer("Azure architecture and services", false),
  answer("Management and governance", true),
  ...Array(2).fill(answer("Management and governance", false))
] }];
const m2 = computeMastery(many, TOPICS);
check("readiness 'building' at 73%", getReadiness(m2).level, "building");
check("recommends weakest topic", getRecommendation(m2).topic, "Management and governance");

// missed concepts
check("most-missed concept first", getMissedConcepts([{ answers: [
  answer("Cloud concepts", false, "elasticity"),
  answer("Cloud concepts", false, "tags"),
  answer("Cloud concepts", false, "tags")
] }]), ["tags", "elasticity"]);

// validation
check("empty question rejected", validateQuestion("   "), "Please type a question first.");
check("long question rejected", validateQuestion("a".repeat(301)), "Questions must be 300 characters or fewer.");
check("normal question accepted", validateQuestion("What is RBAC?"), "");

// search
const sample = [{ title: "Azure Policy", topic: "Management and governance", explanation: "Rules" }];
check("search is case-insensitive", searchConcepts(sample, "POLICY").length, 1);
check("search with no match", searchConcepts(sample, "zzz").length, 0);
const cachedQuestionRequest = loadJSON("data/questions.json");
check("duplicate JSON loads share the same request",
  loadJSON("data/questions.json") === cachedQuestionRequest, true);

const tutorConcepts = [
  { id: "resource-locks", title: "Resource locks", topic: "Management and governance",
    explanation: "Prevent accidental deletion of resources.", confusion: "Locks override permissions.",
    practice: { question: "Which lock prevents deletion?", answer: "CanNotDelete." } },
  { id: "rbac", title: "Azure RBAC", topic: "Management and governance",
    explanation: "Assign roles to control resource permissions.", confusion: "RBAC controls who can act.",
    practice: { question: "What controls permissions?", answer: "Azure RBAC." } }
];
const tutorQuestions = [
  { id: 1, concept: "resource-locks", question: "How can you prevent resource deletion?",
    options: ["A resource lock", "Azure RBAC", "Azure Monitor", "A region"],
    correctAnswer: 0, explanation: "A CanNotDelete lock blocks deletion." }
];
const tutorMatch = findTutorMatch(
  "How do I prevent someone deleting a resource?",
  tutorConcepts,
  tutorQuestions,
  "rbac"
);
check("tutor finds the relevant saved concept", tutorMatch?.concept.id, "resource-locks");
check("tutor finds a related saved question", tutorMatch?.question.id, 1);
check("tutor returns no unrelated database match",
  findTutorMatch("Which football team should I support?", tutorConcepts, tutorQuestions), null);

// shuffle keeps every item
check("shuffle keeps all items", shuffle([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
check("105-minute timer formats as 1:45:00", formatCountdown(EXAM_DURATION_SECONDS), "1:45:00");

// Data checks: every question follows the shared format
async function checkData() {
  try {
    const data = await loadQuestions();
    const concepts = await loadConcepts();
    const ids = data.questions.map((q) => q.id);
    check("question ids are unique", new Set(ids).size, ids.length);
    check("every question has 4 options", data.questions.every((q) => q.options.length === 4), true);
    check("every correctAnswer is 0–3",
      data.questions.every((q) => q.correctAnswer >= 0 && q.correctAnswer <= 3), true);
    check("every wrong option has a rationale", data.questions.every((q) =>
      q.options.every((_, i) => i === q.correctAnswer || Boolean(q.incorrectExplanations?.[i]))), true);
    check("no correct option has an incorrect rationale", data.questions.every((q) =>
      !q.incorrectExplanations?.[q.correctAnswer]), true);
    check("every topic is official", data.questions.every((q) => data.topics.includes(q.topic)), true);
    check("every concept has notes",
      data.questions.every((q) => concepts.some((c) => c.id === q.concept)), true);
    check("every concept is covered by a question",
      concepts.every((concept) => data.questions.some((q) => q.concept === concept.id)), true);

    const exam = buildMixedExam(data.questions, data.topics);
    check("mixed exam selects 50 questions", exam.length, MIXED_EXAM_QUESTION_COUNT);
    check("mixed exam follows domain weighting",
      data.topics.map((topic) => exam.filter((q) => q.topic === topic).length), [14, 19, 17]);
    check("mixed exam has no repeated questions",
      new Set(exam.map((q) => q.id)).size, exam.length);

    const originalRandom = Math.random;
    let firstExam;
    let secondExam;
    try {
      Math.random = () => 0;
      firstExam = buildMixedExam(data.questions, data.topics).map((q) => q.id).sort((a, b) => a - b);
      Math.random = () => 0.999999;
      secondExam = buildMixedExam(data.questions, data.topics).map((q) => q.id).sort((a, b) => a - b);
    } finally {
      Math.random = originalRandom;
    }
    check("new exam attempts can select different questions",
      JSON.stringify(firstExam) !== JSON.stringify(secondExam), true);
  } catch (error) {
    check("data files load (use Live Server)", false, true);
  }
  testSummary.textContent = `${passed} passed, ${failed} failed.`;
  testSummary.className = failed ? "status status-error" : "status";
}

checkData();
