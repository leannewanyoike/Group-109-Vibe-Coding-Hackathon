// ── Study planner logic (new file) ─────────────────────────────────
// Needs js/logic.js loaded first (uses EXAM_TOPIC_WEIGHTS).

// ── Study planner ──────────────────────────────────────────────────
// Pure functions: dates go in as "YYYY-MM-DD" text and the plan comes out
// as plain objects, so tests.html can check them without the page.

const PLANNER_MIN_HOURS = 0.5;
const PLANNER_MAX_HOURS = 12;
const MOCK_EXAM_MIN_STUDY_DAYS = 4;  // a mock exam only fits in longer plans
const MOCK_EXAM_MIN_HOURS = 2;       // the timed exam takes 1 h 45 min

// "2026-11-05" → a local Date, or null if the text is not a real date.
function parseLocalDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  const real = date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
  return real ? date : null;
}

// A Date → "2026-11-05" (local time, not UTC).
function formatDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date, count) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

// Whole days from one "YYYY-MM-DD" date to another (negative if it is in the past).
function daysBetween(fromText, toText) {
  const from = parseLocalDate(fromText);
  const to = parseLocalDate(toText);
  const utc = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(to) - utc(from)) / 86400000);
}

// "1 hour", "1.5 hours" — rounded to the nearest quarter hour.
function formatHours(hours) {
  const rounded = Math.round(hours * 4) / 4;
  return `${rounded} ${rounded === 1 ? "hour" : "hours"}`;
}

// The study dates from startDate up to the day BEFORE the exam,
// keeping only the weekdays the learner chose (0 = Sunday … 6 = Saturday).
function getStudyDates(startDate, examDate, studyDays) {
  const start = parseLocalDate(startDate);
  const exam = parseLocalDate(examDate);
  const dates = [];
  if (!start || !exam) return dates;
  for (let day = start; day < exam; day = addDays(day, 1)) {
    if (studyDays.includes(day.getDay())) dates.push(formatDateKey(day));
  }
  return dates;
}

// Checks the planner form. Returns an error message, or "" if valid.
function validatePlannerInput({ examDate, today, hoursPerDay, studyDays }) {
  const exam = parseLocalDate(examDate);
  const start = parseLocalDate(today);
  if (!exam) return "Please choose your exam date.";
  if (!start || exam <= start) return "Your exam date must be after today.";
  if (!Number.isFinite(hoursPerDay) || hoursPerDay < PLANNER_MIN_HOURS || hoursPerDay > PLANNER_MAX_HOURS) {
    return `Enter between ${PLANNER_MIN_HOURS} and ${PLANNER_MAX_HOURS} study hours per day.`;
  }
  if (studyDays.length === 0) return "Choose at least one study day.";
  if (getStudyDates(today, examDate, studyDays).length === 0) {
    return "None of your chosen study days fall before the exam. Pick more days or a later exam date.";
  }
  return "";
}

// Shares learning days between topics. Weak topics count double, and every
// topic gets at least one day when there are enough days.
// Returns [{ topic, days }] with weak topics first.
function allocateTopicDays(topics, weakTopics, dayCount) {
  const isWeak = (topic) => weakTopics.includes(topic);
  const weights = topics.map((topic) =>
    (EXAM_TOPIC_WEIGHTS[topic] || 1 / topics.length) * (isWeak(topic) ? 2 : 1));
  const order = topics.map((topic, index) => index).sort((a, b) =>
    Number(isWeak(topics[b])) - Number(isWeak(topics[a])) || weights[b] - weights[a]);

  const counts = topics.map(() => 0);
  if (dayCount < topics.length) {
    order.slice(0, dayCount).forEach((index) => { counts[index] = 1; });
  } else {
    counts.fill(1);
    const spare = dayCount - topics.length;
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const exact = weights.map((weight) => (weight / totalWeight) * spare);
    exact.forEach((value, index) => { counts[index] += Math.floor(value); });
    const left = spare - exact.reduce((sum, value) => sum + Math.floor(value), 0);
    exact
      .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
      .sort((a, b) => b.remainder - a.remainder)
      .slice(0, left)
      .forEach(({ index }) => { counts[index] += 1; });
  }

  return order
    .filter((index) => counts[index] > 0)
    .map((index) => ({ topic: topics[index], days: counts[index] }));
}

// Builds a day-by-day plan.
// input: { examDate, startDate, hoursPerDay, studyDays, weakTopics, topics }
// Returns { days, studyDayCount, totalHours, warnings }. Each day is
// { date, type, topic, hours, tasks, weak } where type is one of
// "learn", "practice", "mock", "review" or "exam".
function generateStudyPlan({ examDate, startDate, hoursPerDay, studyDays, weakTopics = [], topics }) {
  const weak = weakTopics.filter((topic) => topics.includes(topic));
  const studyDates = getStudyDates(startDate, examDate, studyDays);
  const warnings = [];
  const days = [];

  if (studyDates.length === 0) {
    return { days: [], studyDayCount: 0, totalHours: 0, warnings: ["There are no study days before the exam."] };
  }

  // The last study day is a light final review. A mock exam goes the day before
  // it, but only if the plan is long enough and each day is long enough.
  const reviewDate = studyDates[studyDates.length - 1];
  const hasMock = studyDates.length >= MOCK_EXAM_MIN_STUDY_DAYS && hoursPerDay >= MOCK_EXAM_MIN_HOURS;
  const mockDate = hasMock ? studyDates[studyDates.length - 2] : null;
  const learningDates = studyDates.slice(0, studyDates.length - (hasMock ? 2 : 1));

  // Learning days, one topic block after another (weak topics first)
  const blocks = allocateTopicDays(topics, weak, learningDates.length);
  let position = 0;
  blocks.forEach(({ topic, days: blockDays }) => {
    for (let i = 0; i < blockDays; i++) {
      // About 60% reading, 40% practice, in tidy half-hour (or quarter-hour) steps
      const step = hoursPerDay >= 1 ? 2 : 4;
      const readHours = Math.max(0.25, Math.round(hoursPerDay * 0.6 * step) / step);
      const practiceHours = Math.max(0.25, hoursPerDay - readHours);
      const isWeak = weak.includes(topic);
      const first = i === 0;
      days.push({
        date: learningDates[position],
        type: first ? "learn" : "practice",
        topic: topic,
        hours: hoursPerDay,
        weak: isWeak,
        tasks: first
          ? [
              `Read the ${topic} skills on Microsoft Learn and open Study Buddy for anything unclear (about ${formatHours(readHours)}).`,
              `Do a ${topic} practice quiz and read every explanation (about ${formatHours(practiceHours)}).`
            ]
          : [
              `Redo ${topic} practice questions (about ${formatHours(readHours)}).`,
              `Review your missed answers in My progress and revise those concepts in Study Buddy (about ${formatHours(practiceHours)}).`
            ]
      });
      position += 1;
    }
  });

  if (mockDate) {
    days.push({
      date: mockDate, type: "mock", topic: null, hours: hoursPerDay, weak: false,
      tasks: [
        "Take the timed 50-question mock exam (1 hour 45 minutes) with no breaks.",
        "Review every wrong answer afterwards in My progress."
      ]
    });
  }

  days.push({
    date: reviewDate, type: "review", topic: null, hours: hoursPerDay, weak: false,
    tasks: [
      "Open My progress and revise your lowest topic.",
      "Re-read your missed concepts in Study Buddy. No new topics today.",
      "Rest well before the exam."
    ]
  });

  days.push({
    date: examDate, type: "exam", topic: null, hours: 0, weak: false,
    tasks: ["Exam day. Only skim your notes, then go and do your best."]
  });

  const covered = blocks.map((block) => block.topic);
  const uncovered = topics.filter((topic) => !covered.includes(topic));
  if (uncovered.length > 0) {
    warnings.push(`There are not enough study days to cover ${uncovered.join(" and ")}. Add more study days or choose a later exam date.`);
  }
  if (!hasMock) {
    warnings.push(`This plan has no mock exam. A mock fits when you have at least ${MOCK_EXAM_MIN_STUDY_DAYS} study days and ${MOCK_EXAM_MIN_HOURS} hours a day. Try one anyway if you can.`);
  }

  return {
    days: days.sort((a, b) => a.date.localeCompare(b.date)),
    studyDayCount: studyDates.length,
    totalHours: studyDates.length * hoursPerDay,
    warnings: warnings
  };
}