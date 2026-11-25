// Checks and cleans Academy content before it's saved. Shared by api/academy.js and the tests.
export const SLUGS = ["mindset", "quality", "valuation", "falling-markets", "behaviour", "annual-review"];
export const SIM_IDS = ["activity", "recovery", "roic", "engine", "pe", "fv", "sizing", "rules", "decline", "sell", "tradelog", "review"];

const str = (v) => typeof v === "string";
// Admin-written HTML is trusted, but scripts and inline handlers never belong in a lesson.
export function cleanHtml(html) {
  return String(html || "")
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

function checkQ(q, where, errs) {
  if (!q || !str(q.q) || !q.q.trim()) errs.push(where + ": the question is empty");
  if (!Array.isArray(q?.options) || q.options.filter((o) => str(o) && o.trim()).length < 2) errs.push(where + ": needs at least two answers");
  else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) errs.push(where + ": mark which answer is correct");
  if (!str(q?.why) || !q.why.trim()) errs.push(where + ": the explanation is empty");
}

// Returns { errors: [...], value } with value cleaned and ready to save.
export function validateModule(m, slug) {
  const errs = [];
  if (!m || typeof m !== "object") return { errors: ["No content"] };
  if (m.slug !== slug || !SLUGS.includes(slug)) errs.push("Unknown module");
  for (const k of ["title", "heading", "summary"]) if (!str(m[k]) || !m[k].trim()) errs.push(`The ${k} is empty`);
  if (!Number.isFinite(+m.minutes) || +m.minutes <= 0) errs.push("Minutes must be a number");
  if (!Array.isArray(m.lessons) || !m.lessons.length) errs.push("At least one lesson");
  (m.lessons || []).forEach((l, i) => { if (!str(l.title) || !l.title.trim()) errs.push(`Lesson ${i + 1}: the title is empty`); if (!str(l.html) || l.html.replace(/<[^>]+>/g, "").trim().length < 20) errs.push(`Lesson ${i + 1}: the text is too short`); });
  (m.exercises || []).forEach((x, i) => { if (!SIM_IDS.includes(x.sim)) errs.push(`Exercise ${i + 1}: unknown simulation`); checkQ(x.task, `Exercise ${i + 1}`, errs); });
  if (!Array.isArray(m.test) || m.test.length < 5) errs.push("The test needs at least 5 questions (10 or more is best)");
  (m.test || []).forEach((q, i) => checkQ(q, `Test question ${i + 1}`, errs));
  if (!m.assignment || !Array.isArray(m.assignment.fields) || !m.assignment.fields.length) errs.push("The assignment needs at least one question");
  if (errs.length) return { errors: errs };
  const value = {
    ...m,
    minutes: +m.minutes,
    objectives: (m.objectives || []).filter((o) => str(o) && o.trim()),
    lessons: m.lessons.map((l) => ({ title: l.title.trim(), html: cleanHtml(l.html) })),
    tools: (m.tools || []).filter((t) => t.href && t.label),
    reading: (m.reading || []).filter((t) => t.href && t.label),
  };
  return { errors: [], value };
}

export function validateCourse(c) {
  const errs = [];
  if (!c || !Array.isArray(c.order) || c.order.join() !== SLUGS.join()) errs.push("The module order can't be changed here");
  for (const k of ["intro", "outro", "certificate", "certNote"]) if (!str(c?.[k]) || !c[k].trim()) errs.push(`The ${k} text is empty`);
  if (!c?.exam || !Array.isArray(c.exam.cases)) errs.push("Exam cases are missing");
  (c?.exam?.cases || []).forEach((q, i) => checkQ(q, `Exam case ${i + 1}`, errs));
  if (errs.length) return { errors: errs };
  return { errors: [], value: { ...c, intro: cleanHtml(c.intro), outro: cleanHtml(c.outro), certificate: cleanHtml(c.certificate) } };
}
