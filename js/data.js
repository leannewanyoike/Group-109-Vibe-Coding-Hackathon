// ── Loading data with fetch ────────────────────────────────────────
// Same-URL requests share one promise for this page session. The browser's
// HTTP cache handles reuse across page loads according to server headers.
const jsonRequestCache = new Map();

function loadJSON(path) {
  if (!jsonRequestCache.has(path)) {
    const request = fetch(path).then((response) => {
      if (!response.ok) throw new Error(`Status ${response.status} loading ${path}`);
      return response.json();
    }).catch((error) => {
      jsonRequestCache.delete(path);
      throw error;
    });
    jsonRequestCache.set(path, request);
  }

  return jsonRequestCache.get(path);
}

// Returns { topics: [...], questions: [...] }
function loadQuestions() {
  return loadJSON("data/questions.json");
}

// Returns an array of concept notes
function loadConcepts() {
  return loadJSON("data/concepts.json");
}

// The message shown if data cannot load. The most common cause is
// opening index.html by double-clicking instead of using Live Server.
const LOAD_ERROR_MESSAGE =
  "Could not load the study data. Open the app with VS Code Live Server (right-click index.html → Open with Live Server), then refresh.";

const STUDY_GUIDE_URL =
  "https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-900";

// A Microsoft Learn search link for any concept title.
function learnSearchUrl(title) {
  return `https://learn.microsoft.com/search/?terms=${encodeURIComponent(title)}`;
}

// Builds the coloured topic class used in CSS, e.g. "topic-cloud-concepts".
function topicClass(topic) {
  return "topic-" + topic.toLowerCase().replace(/[^a-z]+/g, "-");
}
