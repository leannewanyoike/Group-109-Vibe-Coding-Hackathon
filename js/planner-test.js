// ── Study planner tests (planner-tests.html) ───────────────────────
// Same style as tests.js: call a function, compare with the expected result.

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

// ── Study planner ──
// 2026-10-22 is a Thursday. The exam is 14 days later, so there are 14 study days.
const PLAN_START = "2026-10-22";
const PLAN_EXAM = "2026-11-05";
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const planInput = (overrides = {}) => ({
  examDate: PLAN_EXAM, startDate: PLAN_START, hoursPerDay: 2,
  studyDays: ALL_WEEKDAYS, weakTopics: [], topics: TOPICS, ...overrides
});
const validInput = (overrides = {}) => ({
  examDate: PLAN_EXAM, today: PLAN_START, hoursPerDay: 2, studyDays: ALL_WEEKDAYS, ...overrides
});
const topicDays = (plan, topic) =>
  plan.days.filter((d) => d.topic === topic).length;

// date helpers
check("parseLocalDate rejects 2026-02-30", parseLocalDate("2026-02-30"), null);
check("parseLocalDate rejects empty text", parseLocalDate(""), null);
check("formatDateKey round-trips", formatDateKey(parseLocalDate("2026-11-05")), "2026-11-05");
check("daysBetween counts 14 days", daysBetween(PLAN_START, PLAN_EXAM), 14);
check("daysBetween is negative for the past", daysBetween(PLAN_EXAM, PLAN_START), -14);
check("formatHours 1 is singular", formatHours(1), "1 hour");
check("formatHours 1.5 is plural", formatHours(1.5), "1.5 hours");

// validatePlannerInput
check("planner: empty date asks for a date", validatePlannerInput(validInput({ examDate: "" })), "Please choose your exam date.");
check("planner: exam today is rejected", validatePlannerInput(validInput({ examDate: PLAN_START })), "Your exam date must be after today.");
check("planner: exam in the past is rejected", validatePlannerInput(validInput({ examDate: "2026-10-01" })), "Your exam date must be after today.");
check("planner: 0 hours is rejected", validatePlannerInput(validInput({ hoursPerDay: 0 })), "Enter between 0.5 and 12 study hours per day.");
check("planner: blank hours is rejected", validatePlannerInput(validInput({ hoursPerDay: NaN })), "Enter between 0.5 and 12 study hours per day.");
check("planner: 13 hours is rejected", validatePlannerInput(validInput({ hoursPerDay: 13 })), "Enter between 0.5 and 12 study hours per day.");
check("planner: no study days is rejected", validatePlannerInput(validInput({ studyDays: [] })), "Choose at least one study day.");
check("planner: chosen days that never occur are rejected",
  validatePlannerInput(validInput({ examDate: "2026-10-23", studyDays: [1] })),
  "None of your chosen study days fall before the exam. Pick more days or a later exam date.");
check("planner: good input is valid", validatePlannerInput(validInput()), "");

// getStudyDates only keeps the chosen weekdays and stops before the exam
check("study dates stop the day before the exam", getStudyDates(PLAN_START, PLAN_EXAM, ALL_WEEKDAYS).length, 14);
check("study dates on Saturdays only", getStudyDates(PLAN_START, PLAN_EXAM, [6]), ["2026-10-24", "2026-10-31"]);

// allocateTopicDays
check("12 learning days split 4/4/4",
  allocateTopicDays(TOPICS, [], 12).map((b) => b.days), [4, 4, 4]);
check("weak topic gets the most days and goes first",
  allocateTopicDays(TOPICS, ["Management and governance"], 12)[0],
  { topic: "Management and governance", days: 6 });
check("allocated days always add up",
  allocateTopicDays(TOPICS, ["Cloud concepts"], 7).reduce((sum, b) => sum + b.days, 0), 7);
check("2 days only cover the 2 heaviest topics",
  allocateTopicDays(TOPICS, [], 2).map((b) => b.topic),
  ["Azure architecture and services", "Management and governance"]);

// generateStudyPlan: a normal two-week plan
const plan = generateStudyPlan(planInput());
check("plan has 14 study days", plan.studyDayCount, 14);
check("plan has 15 entries (study days + exam day)", plan.days.length, 15);
check("plan total hours is 28", plan.totalHours, 28);
check("last entry is the exam day", plan.days[plan.days.length - 1].type, "exam");
check("day before the exam is the final review", plan.days[plan.days.length - 2].type, "review");
check("two days before the exam is the mock exam", plan.days[plan.days.length - 3].type, "mock");
check("plan days are in date order", plan.days.map((d) => d.date).join() === [...plan.days.map((d) => d.date)].sort().join(), true);
check("no date appears twice", new Set(plan.days.map((d) => d.date)).size, plan.days.length);
check("every topic is studied", TOPICS.every((t) => topicDays(plan, t) > 0), true);
check("a normal plan has no warnings", plan.warnings, []);

// weak topics get extra time
const weakPlan = generateStudyPlan(planInput({ weakTopics: ["Management and governance"] }));
check("weak topic gets more days than the others",
  topicDays(weakPlan, "Management and governance") > topicDays(weakPlan, "Cloud concepts"), true);
check("weak topic days are flagged", weakPlan.days.filter((d) => d.weak).length,
  topicDays(weakPlan, "Management and governance"));
check("weak topic is studied first", weakPlan.days[0].topic, "Management and governance");
check("unknown weak topics are ignored",
  generateStudyPlan(planInput({ weakTopics: ["Not a topic"] })).days.length, plan.days.length);

// short hours: no mock exam, with a warning
const shortHours = generateStudyPlan(planInput({ hoursPerDay: 1 }));
check("1 hour a day has no mock exam", shortHours.days.some((d) => d.type === "mock"), false);
check("1 hour a day explains the missing mock exam", shortHours.warnings.length, 1);

// exam tomorrow: only a final review
const lastMinute = generateStudyPlan(planInput({ examDate: "2026-10-23" }));
check("exam tomorrow: review then exam day", lastMinute.days.map((d) => d.type), ["review", "exam"]);
check("exam tomorrow warns about uncovered topics",
  lastMinute.warnings.some((w) => w.includes("not enough study days")), true);

// only some weekdays
const weekends = generateStudyPlan(planInput({ studyDays: [6, 0] }));
check("weekend-only plan uses only Saturdays and Sundays",
  weekends.days.filter((d) => d.type !== "exam")
    .every((d) => [0, 6].includes(parseLocalDate(d.date).getDay())), true);

testSummary.textContent = `${passed} passed, ${failed} failed.`;
testSummary.className = failed ? "status status-error" : "status";