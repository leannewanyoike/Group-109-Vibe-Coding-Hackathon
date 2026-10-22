// ── Study plan storage ─────────────────────────────────────────────
// The plan is saved as its inputs (not the day list), plus the days the
// learner has ticked off. generateStudyPlan() rebuilds the same plan from them.

const PLAN_KEY = "cloudready_plan";

function getSavedPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_KEY));
    const valid = saved &&
      typeof saved.examDate === "string" &&
      typeof saved.startDate === "string" &&
      Number.isFinite(saved.hoursPerDay) &&
      Array.isArray(saved.studyDays);
    if (!valid) return null;
    return {
      ...saved,
      weakTopics: Array.isArray(saved.weakTopics) ? saved.weakTopics : [],
      completed: Array.isArray(saved.completed) ? saved.completed : []
    };
  } catch (err) {
    console.error("Error loading study plan from localStorage:", err);
    return null;
  }
}

function savePlan(plan) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch (err) {
    console.error("Error saving study plan to localStorage:", err);
  }
}

function clearPlan() {
  localStorage.removeItem(PLAN_KEY);
}