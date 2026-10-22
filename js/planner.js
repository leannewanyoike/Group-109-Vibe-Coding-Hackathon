// ── Study plan page (planner.html) ─────────────────────────────────
// Reads the form, asks logic.js for a plan, draws it with createElement and
// textContent, and saves it in localStorage so it survives a refresh.

const form = document.querySelector("#planner-form");
const examDateInput = document.querySelector("#exam-date");
const hoursInput = document.querySelector("#hours-per-day");
const dayPicker = document.querySelector("#day-picker");
const weakPicker = document.querySelector("#weak-picker");
const weakHint = document.querySelector("#weak-hint");
const errorMessage = document.querySelector("#error-message");
const statusText = document.querySelector("#status");
const planSection = document.querySelector("#plan-section");
const planHeading = document.querySelector("#plan-heading");
const planSummary = document.querySelector("#plan-summary");
const planWarnings = document.querySelector("#plan-warnings");
const planList = document.querySelector("#plan-list");
const revisitBox = document.querySelector("#revisit-box");
const revisitList = document.querySelector("#revisit-list");
const clearPlanBtn = document.querySelector("#clear-plan-btn");

let topics = [];
let concepts = [];

const TYPE_LABELS = {
  learn: "Learn + practise",
  practice: "Practise + revise",
  mock: "Mock exam",
  review: "Final review",
  exam: "Exam day"
};

function todayKey() {
  return formatDateKey(new Date());
}

function formatPlanDate(dateKey) {
  return parseLocalDate(dateKey).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

// ── Reading the form ───────────────────────────────────────────────
function getSelectedStudyDays() {
  return [...dayPicker.querySelectorAll("input:checked")].map((input) => Number(input.value));
}

function getSelectedWeakTopics() {
  return [...weakPicker.querySelectorAll("input:checked")].map((input) => input.value);
}

// ── Weak-area checkboxes ───────────────────────────────────────────
function buildWeakPicker(selected) {
  weakPicker.replaceChildren();
  topics.forEach((topic, index) => {
    const row = el("div", "check-row");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `weak-${index}`;
    input.value = topic;
    input.checked = selected.includes(topic);
    const label = el("label", "", topic);
    label.htmlFor = input.id;
    row.append(input, label);
    weakPicker.appendChild(row);
  });
}

// Topics whose saved practice mastery is below the 80% target
function suggestWeakTopics() {
  const mastery = computeMastery(getAttempts(), topics);
  return topics.filter((topic) => mastery[topic].enoughData && mastery[topic].percent < TARGET_MASTERY);
}

// ── Drawing the plan ───────────────────────────────────────────────
function createPlanDay(day, saved, today, onToggle) {
  const item = el("li", `plan-day plan-day-${day.type}`);
  if (day.topic) item.classList.add(topicClass(day.topic));
  if (day.date === today) item.classList.add("plan-day-today");

  const head = el("div", "plan-day-head");
  head.appendChild(el("h3", "plan-date", formatPlanDate(day.date)));
  if (day.date === today) head.appendChild(el("span", "plan-badge plan-badge-today", "Today"));
  head.appendChild(el("span", "plan-badge", TYPE_LABELS[day.type]));
  if (day.weak) head.appendChild(el("span", "plan-badge plan-badge-weak", "Weak area"));
  item.appendChild(head);

  if (day.hours > 0) item.appendChild(el("p", "plan-hours", `Study time: ${formatHours(day.hours)}`));

  const tasks = el("ul", "plan-tasks");
  day.tasks.forEach((task) => tasks.appendChild(el("li", "", task)));
  item.appendChild(tasks);

  // Helpful one-click links
  const links = el("div", "actions");
  const addLink = (text, href) => {
    const link = el("a", "btn btn-secondary btn-small", text);
    link.href = href;
    links.appendChild(link);
  };
  if (day.type === "learn" || day.type === "practice") {
    addLink(`Practise ${day.topic}`, `index.html?topic=${encodeURIComponent(day.topic)}`);
    addLink("Open Study Buddy", "study-buddy.html");
  } else if (day.type === "mock") {
    addLink("Start the timed exam", "index.html?mixed=1");
  } else if (day.type === "review") {
    addLink("Open My progress", "dashboard.html");
  }
  if (links.children.length > 0) item.appendChild(links);

  if (day.type === "exam") return item;

  // "Mark as done" checkbox
  const done = saved.completed.includes(day.date);
  if (done) item.classList.add("plan-day-done");
  const row = el("div", "check-row plan-done");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.id = `done-${day.date}`;
  box.checked = done;
  const label = el("label", "", "Mark as done");
  label.htmlFor = box.id;
  box.addEventListener("change", () => {
    item.classList.toggle("plan-day-done", box.checked);
    missed.hidden = box.checked || day.date >= today;
    onToggle(day.date, box.checked);
  });
  row.append(box, label);
  item.appendChild(row);

  // Days in the past that were not ticked
  const missed = el("p", "plan-missed",
    "Not done yet. Fit it in when you can, or create a new plan starting today.");
  missed.hidden = done || day.date >= today;
  item.appendChild(missed);

  return item;
}

function addStat(label, value) {
  const wrapper = el("div");
  wrapper.appendChild(el("dt", "", label));
  const dd = el("dd", "", String(value));
  wrapper.appendChild(dd);
  planSummary.appendChild(wrapper);
  return dd;
}

function renderRevisit() {
  const missedIds = getMissedConcepts(getAttempts(), 5);
  const missed = missedIds
    .map((id) => concepts.find((concept) => concept.id === id))
    .filter(Boolean);

  revisitList.replaceChildren();
  revisitBox.hidden = missed.length === 0;
  missed.forEach((concept) => {
    const li = el("li");
    const link = el("a", "chip", concept.title);
    link.href = `study-buddy.html?concept=${encodeURIComponent(concept.id)}`;
    li.appendChild(link);
    revisitList.appendChild(li);
  });
}

function renderPlan(saved) {
  const today = todayKey();

  if (daysBetween(today, saved.examDate) < 0) {
    planSection.hidden = true;
    statusText.textContent = "Your saved exam date has passed. Create a new plan below.";
    return;
  }

  const result = generateStudyPlan({
    examDate: saved.examDate,
    startDate: saved.startDate,
    hoursPerDay: saved.hoursPerDay,
    studyDays: saved.studyDays,
    weakTopics: saved.weakTopics,
    topics: topics
  });

  planSection.hidden = false;
  planSummary.replaceChildren();
  const daysLeft = daysBetween(today, saved.examDate);
  addStat("Exam date", formatPlanDate(saved.examDate));
  addStat("Days to go", daysLeft);
  addStat("Study days", result.studyDayCount);
  addStat("Study hours", Math.round(result.totalHours * 4) / 4);
  const doneStat = addStat("Days done", "");

  const studyDays = result.days.filter((day) => day.type !== "exam");
  const updateDone = () => {
    const done = studyDays.filter((day) => saved.completed.includes(day.date)).length;
    doneStat.textContent = `${done} of ${studyDays.length}`;
  };
  updateDone();

  planWarnings.replaceChildren();
  result.warnings.forEach((warning) => planWarnings.appendChild(el("li", "", warning)));

  planList.replaceChildren();
  result.days.forEach((day) => {
    planList.appendChild(createPlanDay(day, saved, today, (date, checked) => {
      saved.completed = checked
        ? [...new Set([...saved.completed, date])]
        : saved.completed.filter((d) => d !== date);
      savePlan(saved);
      updateDone();
    }));
  });

  renderRevisit();
}

// ── Events ─────────────────────────────────────────────────────────
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const input = {
    examDate: examDateInput.value,
    today: todayKey(),
    hoursPerDay: parseFloat(hoursInput.value),
    studyDays: getSelectedStudyDays()
  };

  const error = validatePlannerInput(input);
  if (error) {
    errorMessage.textContent = error;
    return;
  }
  errorMessage.textContent = "";

  const plan = {
    examDate: input.examDate,
    startDate: input.today,
    hoursPerDay: input.hoursPerDay,
    studyDays: input.studyDays,
    weakTopics: getSelectedWeakTopics(),
    completed: []
  };
  savePlan(plan);
  renderPlan(plan);
  statusText.textContent = "Your study plan is ready and saved in this browser.";
  planHeading.focus();
});

clearPlanBtn.addEventListener("click", () => {
  if (confirm("Delete your study plan and your ticked-off days?")) {
    clearPlan();
    planSection.hidden = true;
    statusText.textContent = "Your plan was deleted. Create a new one below.";
  }
});

// ── Start ──────────────────────────────────────────────────────────
async function init() {
  try {
    const [data, conceptList] = await Promise.all([loadQuestions(), loadConcepts()]);
    topics = data.topics;
    concepts = conceptList;
  } catch (error) {
    statusText.textContent = LOAD_ERROR_MESSAGE;
    statusText.classList.add("status-error");
    console.error(error);
    return;
  }

  examDateInput.min = formatDateKey(addDays(new Date(), 1));

  const saved = getSavedPlan();
  if (saved) {
    // Restore the form from the saved plan
    examDateInput.value = saved.examDate;
    hoursInput.value = saved.hoursPerDay;
    dayPicker.querySelectorAll("input").forEach((input) => {
      input.checked = saved.studyDays.includes(Number(input.value));
    });
    buildWeakPicker(saved.weakTopics);
    weakHint.textContent = "These are the weak areas from your saved plan.";
    statusText.textContent = "Welcome back. Here is your saved plan.";
    renderPlan(saved);
    return;
  }

  const suggested = suggestWeakTopics();
  buildWeakPicker(suggested);
  weakHint.textContent = suggested.length > 0
    ? "Pre-selected from your practice results (below the 80% target). Change them if you like."
    : "Tick the topics you find hardest. They get extra study days.";
  statusText.textContent = "Fill in your details to create a plan.";
}

init();