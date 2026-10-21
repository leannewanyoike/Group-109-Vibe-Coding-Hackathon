// ── Study Buddy page (study-buddy.html) ────────────────────────────
// Tutor answers are grounded in concepts.json and questions.json.
// If AI_ENDPOINT is set, it can elaborate on a matched concept.

const statusText = document.querySelector("#status");
const missedBox = document.querySelector("#missed-box");
const missedChips = document.querySelector("#missed-chips");
const searchInput = document.querySelector("#concept-search");
const conceptCount = document.querySelector("#concept-count");
const conceptList = document.querySelector("#concept-list");

const conceptTopic = document.querySelector("#concept-topic");
const conceptTitle = document.querySelector("#concept-title");
const conceptBody = document.querySelector("#concept-body");
const askForm = document.querySelector("#ask-form");
const askInput = document.querySelector("#ask-input");
const errorMessage = document.querySelector("#error-message");
const askBtn = document.querySelector("#ask-btn");
const askStatus = document.querySelector("#ask-status");
const aiAnswer = document.querySelector("#ai-answer");
const sources = document.querySelector("#sources");

let concepts = [];
let questions = [];
let selectedId = null;

// ── Concept list with live search ──────────────────────────────────

function renderConceptList() {
  const visible = searchConcepts(concepts, searchInput.value);
  conceptList.innerHTML = "";

  conceptCount.textContent = searchInput.value.trim() === ""
    ? `${pluralize(concepts.length, "concept")} available.`
    : `${pluralize(visible.length, "concept")} match your search.`;

  if (visible.length === 0) {
    conceptList.appendChild(el("li", "empty-hint", "No concepts match your search. Try a shorter word."));
    return;
  }

  visible.forEach((concept) => {
    const li = el("li");
    const btn = el("button", `concept-btn ${topicClass(concept.topic)}`);
    btn.type = "button";
    btn.appendChild(el("span", "concept-btn-title", concept.title));
    btn.appendChild(el("span", "concept-btn-topic", concept.topic));
    if (concept.id === selectedId) btn.setAttribute("aria-current", "true");
    btn.addEventListener("click", () => selectConcept(concept.id));
    li.appendChild(btn);
    conceptList.appendChild(li);
  });
}

function renderMissed() {
  const missed = getMissedConcepts(getAttempts())
    .map((id) => concepts.find((c) => c.id === id))
    .filter(Boolean);

  missedChips.innerHTML = "";
  missedBox.hidden = missed.length === 0;
  missed.forEach((concept) => {
    const chip = el("button", "chip", concept.title);
    chip.type = "button";
    chip.addEventListener("click", () => selectConcept(concept.id));
    missedChips.appendChild(chip);
  });
}

// ── Explanation card ───────────────────────────────────────────────

function addBlock(heading, text) {
  conceptBody.appendChild(el("h3", "", heading));
  conceptBody.appendChild(el("p", "", text));
}

function selectConcept(id) {
  const concept = concepts.find((c) => c.id === id);
  if (!concept) return;
  selectedId = id;

  conceptTopic.textContent = concept.topic;
  conceptTopic.className = `question-topic ${topicClass(concept.topic)}`;
  conceptTitle.textContent = concept.title;

  conceptBody.innerHTML = "";
  addBlock("Simple explanation", concept.explanation);
  addBlock("Real-life example", concept.example);
  addBlock("Common confusion", concept.confusion);

  // Practice question with a reveal button
  conceptBody.appendChild(el("h3", "", "Test yourself"));
  conceptBody.appendChild(el("p", "", concept.practice.question));
  const answer = el("p", "practice-answer", concept.practice.answer);
  answer.hidden = true;
  const revealBtn = el("button", "text-link", "Show answer");
  revealBtn.type = "button";
  revealBtn.addEventListener("click", () => {
    answer.hidden = false;
    revealBtn.hidden = true;
  });
  conceptBody.appendChild(revealBtn);
  conceptBody.appendChild(answer);

  // Ask form is always available; it falls back to saved notes without AI
  askForm.hidden = false;
  askInput.value = "";
  errorMessage.textContent = "";
  askStatus.textContent = "";
  aiAnswer.hidden = true;
  aiAnswer.innerHTML = "";

  sources.innerHTML = "";
  sources.appendChild(document.createTextNode("Check this on "));
  const learnLink = el("a", "", `Microsoft Learn: ${concept.title}`);
  learnLink.href = learnSearchUrl(concept.title);
  learnLink.target = "_blank";
  learnLink.rel = "noreferrer";
  sources.appendChild(learnLink);
  sources.appendChild(document.createTextNode(" and the "));
  const guideLink = el("a", "", "AZ-900 study guide");
  guideLink.href = STUDY_GUIDE_URL;
  guideLink.target = "_blank";
  guideLink.rel = "noreferrer";
  sources.appendChild(guideLink);
  sources.appendChild(document.createTextNode("."));

  renderConceptList();
}

// ── Ask the tutor (local database, optional AI) ────────────────────

// Shows tutor text safely: each paragraph becomes a <p> via textContent.
function showTutorText(text, isAi = false, relatedConcept = null) {
  aiAnswer.innerHTML = "";
  aiAnswer.appendChild(el("h3", "", "Tutor's answer"));
  text.split(/\n{2,}/).forEach((para) => {
    aiAnswer.appendChild(el("p", "", para.replace(/\*\*/g, "").trim()));
  });
  if (relatedConcept && relatedConcept.id !== selectedId) {
    const relatedLink = el("a", "text-link", `Open ${relatedConcept.title}`);
    relatedLink.href = `study-buddy.html?concept=${encodeURIComponent(relatedConcept.id)}`;
    aiAnswer.appendChild(el("p", "", "This question is about a different study topic: "));
    aiAnswer.lastChild.appendChild(relatedLink);
  }
  const note = isAi
    ? "AI answers can be wrong. Check them against Microsoft Learn."
    : "Matched from the saved AZ-900 concept notes and practice questions.";
  aiAnswer.appendChild(el("p", "fine-print", note));
  aiAnswer.hidden = false;
}

function buildDatabaseAnswer(match) {
  const paragraphs = [
    `${match.concept.title} (${match.concept.topic}): ${match.concept.explanation}`
  ];

  if (match.question) {
    paragraphs.push(
      `Related practice question: ${match.question.question}\nAnswer: ${match.question.options[match.question.correctAnswer]}\n${match.question.explanation}`
    );
  }

  return paragraphs.join("\n\n");
}

askForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const problem = validateQuestion(askInput.value);
  if (problem) {
    errorMessage.textContent = problem;
    return;
  }

  aiAnswer.hidden = true;
  const match = findTutorMatch(askInput.value.trim(), concepts, questions, selectedId);

  if (!match) {
    showTutorText("I couldn't find a close match in the saved study database. Try asking with a specific AZ-900 term, such as RBAC, availability zones, Key Vault, or storage tiers.");
    askStatus.textContent = "";
    return;
  }

  const relatedConcept = match.concept.id === selectedId ? null : match.concept;
  showTutorText(buildDatabaseAnswer(match), false, relatedConcept);

  if (!AI_ENDPOINT) {
    askStatus.textContent = "";
    return;
  }

  askBtn.disabled = true;
  askStatus.textContent = "Checking with the optional AI tutor…";

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept: match.concept.id, question: askInput.value.trim() })
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    if (typeof data.explanation !== "string") throw new Error("Unexpected response");
    showTutorText(data.explanation, true, relatedConcept);
    askStatus.textContent = "";
  } catch (error) {
    askStatus.textContent = "The AI tutor is unavailable. The matched database answer is shown above.";
    console.error(error);
  } finally {
    askBtn.disabled = false; // runs whether it worked or failed
  }
});

askInput.addEventListener("input", () => {
  if (errorMessage.textContent) errorMessage.textContent = "";
});

searchInput.addEventListener("input", renderConceptList);

// ── Load concepts ──────────────────────────────────────────────────

async function init() {
  try {
    const [loadedConcepts, questionData] = await Promise.all([
      loadConcepts(),
      loadQuestions()
    ]);
    concepts = loadedConcepts;
    questions = questionData.questions;
    statusText.hidden = true;
    renderMissed();

    // quiz pages link here with ?concept=…
    const requested = getUrlParam("concept");
    if (requested && concepts.some((c) => c.id === requested)) {
      selectConcept(requested);
    } else {
      renderConceptList();
    }
  } catch (error) {
    statusText.textContent = LOAD_ERROR_MESSAGE;
    statusText.classList.add("status-error");
    console.error(error);
  }
}

init();
