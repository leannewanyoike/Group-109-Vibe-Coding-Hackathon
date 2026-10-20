// ── localStorage helpers ───────────────────────────────────────────
// Same pattern as QuickNotes: keep data as an array of objects and
// save it with JSON.stringify / load it with JSON.parse. Owned by Person 3.

const STORAGE_KEY = "cloudready_attempts";

function getAttempts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error loading attempts from localStorage:", err);
    return [];
  }
}

function saveAttempt(attempt) {
  const attempts = getAttempts();
  attempts.push({ ...attempt, id: Date.now(), date: new Date().toISOString() });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch (err) {
    console.error("Error saving attempt to localStorage:", err);
  }
}

function clearAttempts() {
  localStorage.removeItem(STORAGE_KEY);
}
