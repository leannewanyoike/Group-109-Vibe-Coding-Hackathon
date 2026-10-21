# CloudReady API Design

A REST API for a future version of CloudReady with learner accounts and an AI
tutor. **Version 1 of the app does not need it**: questions come from
`data/*.json` and progress is saved in `localStorage`. This design shows how the
app would grow, in the same format as the Day 5 Library API.

**Base URL:** `https://api.cloudready.example.com/v1`

All requests and responses use JSON (`Content-Type: application/json`).

## Production request path

In a scaled deployment, the static frontend is served through Azure Front Door
or a CDN. API requests go through Application Gateway or managed API ingress to
multiple stateless API replicas. The API uses a managed connection pool and
connects to one authoritative PostgreSQL writer with zone-redundant failover.
This load balances application requests; it does not distribute writes among
independent database primaries. See [database-design.md](database-design.md)
for write consistency, read-replica, retry, and recovery requirements.

The current project has no API server and uses local JSON plus `localStorage`,
so this is a target architecture rather than an active load balancer.

---

## Endpoints

### 1. List questions

- **Method:** `GET`
- **Path:** `/questions`
- **Description:** Returns all practice questions. Add `?topic=Cloud%20concepts` to filter by topic.
- **Request body:** None
- **Success status:** `200 OK`

---

### 2. Get a single question

- **Method:** `GET`
- **Path:** `/questions/:id`
- **Description:** Returns the question with the given ID.
- **Request body:** None
- **Success status:** `200 OK`
- **Error status:** `404 Not Found` if the ID does not exist

---

### 3. Save a quiz attempt

- **Method:** `POST`
- **Path:** `/learners/:learnerId/attempts`
- **Description:** Saves a completed quiz for a learner.
- **Example request body:**
  ```json
  {
    "quizTopic": "Management and governance",
    "answers": [
      { "questionId": 14, "selected": 0 },
      { "questionId": 15, "selected": 2 }
    ]
  }
  ```
- **Success status:** `201 Created`
- **Note:** the server marks each answer right or wrong itself. It never trusts a
  `correct` value sent by the browser.
- **Consistency:** create the attempt and its answers atomically in one
  transaction. Require an idempotency key so safe client retries cannot create
  duplicate attempts. Send the learner's immediate result/progress reads to the
  primary database.

---

### 4. Get a learner's progress

- **Method:** `GET`
- **Path:** `/learners/:learnerId/progress`
- **Description:** Returns topic mastery calculated from all of the learner's attempts.
- **Request body:** None
- **Success status:** `200 OK`
- **Example response:**
  ```json
  {
    "totalAnswered": 24,
    "topics": [
      { "topic": "Cloud concepts", "correct": 7, "total": 8, "percent": 88 },
      { "topic": "Azure architecture and services", "correct": 6, "total": 9, "percent": 67 },
      { "topic": "Management and governance", "correct": 4, "total": 7, "percent": 57 }
    ]
  }
  ```

---

### 5. Delete a learner's practice history

- **Method:** `DELETE`
- **Path:** `/learners/:learnerId/attempts`
- **Description:** Deletes every saved attempt for the learner ("Clear all").
- **Request body:** None
- **Success status:** `204 No Content`

---

### 6. Ask the Study Buddy (AI tutor)

- **Method:** `POST`
- **Path:** `/study-buddy`
- **Description:** Sends a learner's question about one approved concept to an AI
  model and returns a beginner-friendly explanation. The frontend calls this when
  `AI_ENDPOINT` in `js/config.js` is set.
- **Example request body:**
  ```json
  {
    "concept": "rbac",
    "question": "How is RBAC different from Azure Policy?"
  }
  ```
- **Success status:** `200 OK`
- **Example response:**
  ```json
  { "explanation": "Simple explanation: …" }
  ```
- **Error statuses:**
  - `400 Bad Request`: unknown concept, or question empty / over 300 characters
  - `429 Too Many Requests`: rate limit reached (for example 10 per minute)
  - `502 Bad Gateway`: the AI provider failed or timed out
  - `503 Service Unavailable`: AI not configured

**Security rules for this endpoint:**

1. The AI provider's API key lives only on the server, in an environment variable.
2. The server builds the system prompt; the browser only sends a concept id and a question.
3. The concept id must match an entry in `concepts.json`; its approved notes are added to the prompt.
4. The server must send CORS headers allowing only the app's own address
   (for example `http://127.0.0.1:5501` during development).

---

## Status codes used

| Code | Meaning |
| --- | --- |
| `200 OK` | Request succeeded |
| `201 Created` | A new attempt was saved |
| `204 No Content` | Deleted successfully |
| `400 Bad Request` | The request body is invalid |
| `404 Not Found` | The question or learner does not exist |
| `429 Too Many Requests` | Slow down |
| `502 Bad Gateway` | The AI provider failed |
| `503 Service Unavailable` | The AI tutor isn't configured |
