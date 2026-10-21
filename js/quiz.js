// ── Quiz page (index.html) ─────────────────────────────────────────
// Owned by Person 1 (page and DOM) with Person 2 (questions).

// Select DOM elements with querySelector
const startSection = document.querySelector("#start-section");
const quizSection = document.querySelector("#quiz-section");
const resultsSection = document.querySelector("#results-section");
const statusText = document.querySelector("#status");
const quizChoices = document.querySelector("#quiz-choices");

const quizTitle = document.querySelector("#quiz-title");
const quizProgress = document.querySelector("#quiz-progress");
const quizTimer = document.querySelector("#quiz-timer");
const progressFill = document.querySelector("#progress-fill");
const answerForm = document.querySelector("#answer-form");
const questionTopic = document.querySelector("#question-topic");
const questionText = document.querySelector("#question-text");
const optionsBox = document.querySelector("#options");
const errorMessage = document.querySelector("#error-message");
const checkBtn = document.querySelector("#check-btn");
const feedbackBox = document.querySelector("#feedback");
const nextBtn = document.querySelector("#next-btn");

const scoreEl = document.querySelector("#score");
const scoreText = document.querySelector("#score-text");
const topicResultsBox = document.querySelector("#topic-results");
const nextStepBox = document.querySelector("#next-step");
const retryBtn = document.querySelector("#retry-btn");
const homeBtn = document.querySelector("#home-btn");

// State
let allQuestions = [];
let topics = [];
let quiz = null; // { topic, questions, index, answers }
let timerInterval = null;

// ── Screens ────────────────────────────────────────────────────────

function showScreen(section) {
  [startSection, quizSection, resultsSection].forEach((s) => {
    s.hidden = s !== section;
  });
  window.scrollTo(0, 0);
}

// ── Start screen ───────────────────────────────────────────────────

function renderChoices() {
  quizChoices.innerHTML = "";

  const mixedBtn = el("button", "btn btn-primary", `Start ${MIXED_EXAM_QUESTION_COUNT}-question timed exam`);
  mixedBtn.type = "button";
  mixedBtn.addEventListener("click", () => startQuiz(null));
  quizChoices.appendChild(mixedBtn);

  quizChoices.appendChild(el("h2", "choices-heading", "Or practise one topic"));

  const list = el("ul", "topic-cards");
  topics.forEach((topic) => {
    const count = allQuestions.filter((q) => q.topic === topic).length;
    const li = el("li");
    const btn = el("button", `topic-card ${topicClass(topic)}`);
    btn.type = "button";
    btn.appendChild(el("span", "topic-card-name", topic));
    btn.appendChild(el("span", "topic-card-count", pluralize(count, "question")));
    btn.addEventListener("click", () => startQuiz(topic));
    li.appendChild(btn);
    list.appendChild(li);
  });
  quizChoices.appendChild(list);
}

// ── Quiz ───────────────────────────────────────────────────────────

function startQuiz(topic) {
  if (timerInterval) clearInterval(timerInterval);
  const pool = topic ? allQuestions.filter((q) => q.topic === topic) : allQuestions;
  const selectedQuestions = topic
    ? shuffle(pool)
    : buildMixedExam(pool, topics);
  quiz = {
    topic: topic,
    questions: selectedQuestions,
    index: 0,
    answers: [],
    secondsRemaining: EXAM_DURATION_SECONDS,
    finished: false
  };
  quizTitle.textContent = topic || "AZ-900 mock exam";
  showScreen(quizSection);
  renderQuestion();
  updateTimer();
  timerInterval = setInterval(() => {
    if (!quiz || quiz.finished) return;
    quiz.secondsRemaining -= 1;
    updateTimer();
    if (quiz.secondsRemaining <= 0) finishQuiz(true);
  }, 1000);
}

function updateTimer() {
  quizTimer.textContent = `Time left: ${formatCountdown(quiz.secondsRemaining)}`;
  quizTimer.classList.toggle("quiz-timer-warning", quiz.secondsRemaining <= 5 * 60);
}

function currentQuestion() {
  return quiz.questions[quiz.index];
}

function renderQuestion() {
  const question = currentQuestion();
  const total = quiz.questions.length;

  quizProgress.textContent = `Question ${quiz.index + 1} of ${total}`;
  progressFill.style.width = `${(quiz.index / total) * 100}%`;

  // Only show the topic line in mixed quizzes (it's already the title otherwise)
  questionTopic.textContent = quiz.topic ? "" : question.topic;
  questionTopic.className = `question-topic ${topicClass(question.topic)}`;
  questionText.textContent = question.question;

  optionsBox.innerHTML = "";
  question.options.forEach((option, i) => {
    const label = el("label", "option");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = i;
    label.appendChild(input);
    label.appendChild(el("span", "option-letter", String.fromCharCode(65 + i)));
    label.appendChild(el("span", "option-text", option));
    optionsBox.appendChild(label);
  });

  errorMessage.textContent = "";
  feedbackBox.hidden = true;
  feedbackBox.innerHTML = "";
  checkBtn.hidden = false;
  nextBtn.hidden = true;
}

function checkAnswer(event) {
  event.preventDefault();
  if (quiz.finished) return;
  const chosen = answerForm.querySelector('input[name="answer"]:checked');

  // Validation: same idea as QuickNotes' empty-note check
  if (!chosen) {
    errorMessage.textContent = "Please choose an answer first.";
    return;
  }

  const question = currentQuestion();
  if (quiz.answers.some((answer) => answer.questionId === question.id)) return;

  const selected = Number(chosen.value);
  const correct = selected === question.correctAnswer;

  quiz.answers.push({
    questionId: question.id,
    topic: question.topic,
    concept: question.concept,
    selected: selected,
    correct: correct
  });

  // Preserve the submitted result while allowing learners to explore each choice.
  optionsBox.querySelectorAll(".option").forEach((label, i) => {
    if (i === question.correctAnswer) label.classList.add("is-correct");
    if (i === selected && !correct) label.classList.add("is-wrong");
  });

  renderFeedback(question, correct, selected);
  progressFill.style.width = `${((quiz.index + 1) / quiz.questions.length) * 100}%`;
  checkBtn.hidden = true;
  nextBtn.hidden = false;
  nextBtn.textContent = quiz.index === quiz.questions.length - 1 ? "See results" : "Next question";
  nextBtn.focus();
}

function renderFeedback(question, correct, selected) {
  feedbackBox.className = `feedback ${correct ? "feedback-right" : "feedback-wrong"}`;
  feedbackBox.appendChild(el("h3", "", correct ? "Correct." : "Not quite — here's why."));

  if (!correct) {
    feedbackBox.appendChild(el("p", "", question.incorrectExplanations?.[selected] || "Review the explanation below to see how this choice differs from the correct answer."));

    const p = el("p", "", "The right answer is ");
    p.appendChild(el("strong", "", question.options[question.correctAnswer]));
    p.appendChild(document.createTextNode("."));
    feedbackBox.appendChild(p);
  }

  feedbackBox.appendChild(el("p", "", question.explanation));

  const example = el("p", "feedback-example");
  example.appendChild(el("strong", "", "Real-life example: "));
  example.appendChild(document.createTextNode(question.example));
  feedbackBox.appendChild(example);

  renderOptionFlashcard(question, selected);

  if (!correct) {
    const link = el("a", "text-link", "Ask the Study Buddy about this");
    link.href = `study-buddy.html?concept=${encodeURIComponent(question.concept)}`;
    feedbackBox.appendChild(link);
  }

  feedbackBox.hidden = false;
}

function renderOptionFlashcard(question, selected) {
  let flashcard = feedbackBox.querySelector(".option-flashcard");
  if (!flashcard) {
    flashcard = el("section", "option-flashcard");
    flashcard.setAttribute("aria-live", "polite");
    feedbackBox.appendChild(flashcard);
  }

  flashcard.innerHTML = "";
  flashcard.appendChild(el("p", "option-flashcard-label", `Option ${String.fromCharCode(65 + selected)} · What it means`));
  flashcard.appendChild(el("h4", "", question.options[selected]));
  flashcard.appendChild(el("p", "", selected === question.correctAnswer
    ? question.explanation
    : question.incorrectExplanations?.[selected] || "Review the explanation above to understand this option."));
}

function exploreSelectedOption() {
  if (feedbackBox.hidden) return;

  const selected = answerForm.querySelector('input[name="answer"]:checked');
  if (!selected) return;

  const selectedIndex = Number(selected.value);
  optionsBox.querySelectorAll(".option").forEach((label, index) => {
    label.classList.toggle("is-exploring", index === selectedIndex);
  });
  renderOptionFlashcard(currentQuestion(), selectedIndex);
}

function nextQuestion() {
  if (quiz.index === quiz.questions.length - 1) {
    finishQuiz();
  } else {
    quiz.index += 1;
    renderQuestion();
  }
}

// ── Results ────────────────────────────────────────────────────────

function finishQuiz(timeExpired = false) {
  if (!quiz || quiz.finished) return;
  quiz.finished = true;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  const summary = summarizeAnswers(quiz.answers);
  const totalQuestions = quiz.questions.length;
  const unansweredCount = totalQuestions - summary.total;
  const score = percent(summary.correctCount, totalQuestions) ?? 0;

  saveAttempt({
    quizTopic: quiz.topic,
    score: score,
    correctCount: summary.correctCount,
    totalQuestions: totalQuestions,
    answers: quiz.answers
  });

  scoreEl.textContent = "";
  scoreEl.appendChild(document.createTextNode(score));
  scoreEl.appendChild(el("span", "", "%"));
  scoreText.textContent = `You answered ${summary.correctCount} of ${pluralize(totalQuestions, "question")} correctly.${unansweredCount > 0 ? ` ${unansweredCount} unanswered.` : ""}${timeExpired ? " Time is up; unanswered questions count as incorrect." : ""}`;

  topicResultsBox.innerHTML = "";
  Object.keys(summary.topicResults).forEach((topic) => {
    const r = summary.topicResults[topic];
    topicResultsBox.appendChild(createMasteryBar(topic, r.correct, r.total));
  });

  nextStepBox.innerHTML = "";
  if (timeExpired && unansweredCount > 0) {
    nextStepBox.appendChild(el("p", "", "Review the concepts in unanswered questions before your next attempt."));
  } else if (summary.weakTopics.length > 0) {
    const weakest = summary.weakTopics[0];
    const p = el("p", "", "Start with ");
    p.appendChild(el("strong", "", weakest));
    p.appendChild(document.createTextNode(", where you made the most mistakes."));
    nextStepBox.appendChild(p);

    const actions = el("div", "actions");
    const practiseBtn = el("button", "btn btn-primary", `Practise ${weakest}`);
    practiseBtn.type = "button";
    practiseBtn.addEventListener("click", () => startQuiz(weakest));
    actions.appendChild(practiseBtn);

    const missed = quiz.answers.find((a) => !a.correct);
    const buddyLink = el("a", "btn btn-secondary", "Explain a concept I missed");
    buddyLink.href = `study-buddy.html?concept=${encodeURIComponent(missed.concept)}`;
    actions.appendChild(buddyLink);
    nextStepBox.appendChild(actions);
  } else {
    nextStepBox.appendChild(el("p", "", "No mistakes in this quiz. Try a mixed quiz to test every topic together."));
  }

  showScreen(resultsSection);
}

// ── Event listeners ────────────────────────────────────────────────

answerForm.addEventListener("submit", checkAnswer);
nextBtn.addEventListener("click", nextQuestion);
retryBtn.addEventListener("click", () => startQuiz(quiz.topic));
homeBtn.addEventListener("click", () => showScreen(startSection));

// Clear the error as soon as an answer is picked
optionsBox.addEventListener("change", () => {
  errorMessage.textContent = "";
  exploreSelectedOption();
});

// ── Load questions, then show the start screen ─────────────────────

async function init() {
  try {
    const data = await loadQuestions();
    allQuestions = data.questions;
    topics = data.topics;
    statusText.textContent = "";
    statusText.hidden = true;
    renderChoices();

    // dashboard.html links here with ?topic=… to start a topic quiz
    const requestedTopic = getUrlParam("topic");
    if (requestedTopic && topics.includes(requestedTopic)) startQuiz(requestedTopic);
    if (getUrlParam("mixed") === "1") startQuiz(null);
  } catch (error) {
    statusText.textContent = LOAD_ERROR_MESSAGE;
    statusText.classList.add("status-error");
    console.error(error);
  }
}

init();
