// ── Shared UI helpers ──────────────────────────────────────────────
// Every element is built with createElement + textContent (never
// innerHTML with data), exactly like QuickNotes. Owned by Person 1.

// Creates an element with an optional class and text in one line.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A mastery bar: label, percentage, coloured fill and an 80% target line.
function createMasteryBar(label, correct, total) {
  const value = percent(correct, total);
  const status = value === null ? "none" : value >= TARGET_MASTERY ? "met" : "below";

  const wrapper = el("div", "mastery");

  const head = el("div", "mastery-head");
  head.appendChild(el("span", "mastery-label", label));
  head.appendChild(el("span", "mastery-value", value === null ? "–" : `${value}%`));

  const bar = el("div", `bar bar-${status}`);
  bar.setAttribute("role", "img");
  bar.setAttribute("aria-label",
    value === null ? `${label}: no answers yet` : `${label}: ${value}% mastery, target ${TARGET_MASTERY}%`);
  const fill = el("div", "bar-fill");
  fill.style.width = `${value ?? 0}%`;
  const target = el("div", "bar-target");
  target.style.left = `${TARGET_MASTERY}%`;
  bar.appendChild(fill);
  bar.appendChild(target);

  let evidence = "Not enough data";
  if (total > 0) {
    evidence = `${correct} of ${total} correct`;
    if (total < MIN_TOPIC_ANSWERS) evidence += " · not enough data yet";
  }

  wrapper.appendChild(head);
  wrapper.appendChild(bar);
  wrapper.appendChild(el("p", "mastery-evidence", evidence));
  return wrapper;
}

// Reads ?name=value from the page address, e.g. ?topic=Cloud%20concepts
function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
