// ── Dashboard page (dashboard.html) ────────────────────────────────
// Owned by Person 3 (Dashboard & Progress).

const statusText = document.querySelector("#status");
const emptySection = document.querySelector("#empty-section");
const dashboard = document.querySelector("#dashboard");
const latestScore = document.querySelector("#latest-score");
const totalAnswered = document.querySelector("#total-answered");
const quizCount = document.querySelector("#quiz-count");
const readinessBox = document.querySelector("#readiness");
const masteryList = document.querySelector("#mastery-list");
const recommendText = document.querySelector("#recommend-text");
const recommendLink = document.querySelector("#recommend-link");
const historyCount = document.querySelector("#history-count");
const historyList = document.querySelector("#history-list");
const clearAllBtn = document.querySelector("#clear-all-btn");

let topics = [];

function formatDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function renderReadiness(readiness) {
  readinessBox.innerHTML = "";
  readinessBox.className = `readiness readiness-${readiness.level}`;

  const label = el("p", "readiness-label", "Practice-based readiness estimate: ");
  let strongText = readiness.label;
  if (readiness.level !== "insufficient") strongText += ` (${readiness.percent}%)`;
  label.appendChild(el("strong", "", strongText));

  readinessBox.appendChild(label);
  readinessBox.appendChild(el("p", "", readiness.detail));
  readinessBox.appendChild(el("p", "fine-print",
    `Based on ${pluralize(readiness.total, "answered question")}. This is an estimate from practice in this app, not a prediction of your exam result.`));
}

function renderHistory(attempts) {
  historyList.innerHTML = "";
  historyCount.textContent = `You have completed ${pluralize(attempts.length, "quiz", "quizzes")}.`;

  // Newest first, show up to 8
  [...attempts].reverse().slice(0, 8).forEach((attempt) => {
    const li = el("li");
    const time = el("time", "history-date", formatDate(attempt.date));
    time.dateTime = attempt.date;
    li.appendChild(time);
    li.appendChild(el("span", "history-topic", attempt.quizTopic || "Mixed quiz"));
    li.appendChild(el("span", "history-score",
      `${attempt.correctCount}/${attempt.totalQuestions} (${attempt.score}%)`));
    historyList.appendChild(li);
  });
}

function render() {
  const attempts = getAttempts();
  statusText.hidden = true;

  if (attempts.length === 0) {
    emptySection.hidden = false;
    dashboard.hidden = true;
    return;
  }

  emptySection.hidden = true;
  dashboard.hidden = false;

  const mastery = computeMastery(attempts, topics);
  const readiness = getReadiness(mastery);
  const recommendation = getRecommendation(mastery);
  const latest = attempts[attempts.length - 1];

  latestScore.textContent = `${latest.score}%`;
  totalAnswered.textContent = readiness.total;
  quizCount.textContent = attempts.length;

  renderReadiness(readiness);

  masteryList.innerHTML = "";
  topics.forEach((topic) => {
    masteryList.appendChild(createMasteryBar(topic, mastery[topic].correct, mastery[topic].total));
  });

  recommendText.textContent = recommendation.text;
  if (recommendation.topic) {
    recommendLink.href = `index.html?topic=${encodeURIComponent(recommendation.topic)}`;
    recommendLink.textContent = `Practise ${recommendation.topic}`;
  } else {
    recommendLink.href = "index.html?mixed=1";
    recommendLink.textContent = "Start a mixed quiz";
  }

  renderHistory(attempts);
}

// Clear all — asks for confirmation first, like QuickNotes
clearAllBtn.addEventListener("click", () => {
  if (confirm("Delete all saved practice history from this browser?")) {
    clearAttempts();
    render();
  }
});

async function init() {
  try {
    const data = await loadQuestions(); // we need the official topic list
    topics = data.topics;
    render();
  } catch (error) {
    statusText.textContent = LOAD_ERROR_MESSAGE;
    statusText.classList.add("status-error");
    console.error(error);
  }
}

init();
