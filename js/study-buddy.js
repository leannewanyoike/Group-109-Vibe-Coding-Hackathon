// ── Study Buddy page (study-buddy.html) ────────────────────────────
// Owned by Person 4. Works fully offline from data/concepts.json.
// If AI_ENDPOINT is set in js/config.js, the "Ask the tutor" form
// POSTs the question to that backend (see docs/api-design.md).

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

// ── Ask the tutor (optional AI) ────────────────────────────────────

// Shows AI text safely: each paragraph becomes a <p> via textContent.
function showAiText(text) {
  aiAnswer.innerHTML = "";
  aiAnswer.appendChild(el("h3", "", "Tutor's answer"));
  text.split(/\n{2,}/).forEach((para) => {
    aiAnswer.appendChild(el("p", "", para.replace(/\*\*/g, "").trim()));
  });
  aiAnswer.appendChild(el("p", "fine-print", "AI answers can be wrong. Check them against Microsoft Learn."));
  aiAnswer.hidden = false;
}

askForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const problem = validateQuestion(askInput.value);
  if (problem) {
    errorMessage.textContent = problem;
    return;
  }

  aiAnswer.hidden = true;

  if (!AI_ENDPOINT) {
    askStatus.textContent =
      "The AI tutor isn't switched on in this version, so use the saved explanation above. Your team can connect one later (see docs/api-design.md).";
    return;
  }

  askBtn.disabled = true;
  askStatus.textContent = "Asking the tutor…";

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept: selectedId, question: askInput.value.trim() })
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    if (typeof data.explanation !== "string") throw new Error("Unexpected response");
    showAiText(data.explanation);
    askStatus.textContent = "";
  } catch (error) {
    askStatus.textContent = "The tutor is unavailable right now. The saved explanation above still covers this concept.";
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
    concepts = await loadConcepts();
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
