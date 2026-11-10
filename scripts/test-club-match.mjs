// Club Match engine checks, using the real club listings in the seed migration.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const m = await import(new URL(["..", "src", "lib", "clubMatch.ts"].join("/"), import.meta.url).href);

const sql = readFileSync(new URL("../migrations/20260801112458_seed-club-directory.sql", import.meta.url), "utf8");
const field = "'((?:[^']|'')*)'";
const row = new RegExp(`\\(\\s*${Array(7).fill(field).join("\\s*,\\s*")}`, "g");
const clubs = [...sql.matchAll(row)].map((r, i) => ({
  id: `c${i}`,
  name: r[1].replace(/''/g, "'"),
  category: r[2],
  description: r[3].replace(/''/g, "'"),
  day: r[4],
  time: r[5],
  location: r[6],
  memberCount: 10,
}));
assert.ok(clubs.length >= 40, "seed clubs parsed");
const byName = (name) => clubs.find((c) => c.name === name);

const fits = (club, windows) =>
  windows.some((w) => m.scheduleDays(club.day).includes(w.day) && w.period && m.schedulePeriods(club.time).includes(w.period));
const free = (days, period) => days.map((day) => ({ day, start: "", end: "", period }));
const answers = (a) => ({ ...m.EMPTY_ANSWERS, ...a, followUps: a.followUps ?? {} });
const names = (list) => list.map((x) => x.club.name);

// A competitive coder and a biology student get different, specific results.
const coder = m.recommend(clubs, answers({ activities: ["code", "puzzle", "compete"], topics: ["programming"], followUps: { coding: ["contest"] }, experience: "lots" }), free(["Monday"], "After School"), fits);
assert.equal(coder.best[0].club.name, "Competitive Programming Club");
assert.match(coder.best[0].reasons.join(" "), /USACO/);
const bio = m.recommend(clubs, answers({ activities: ["experiment"], topics: ["bio"], followUps: { science: ["bio"] } }), free(["Tuesday", "Thursday"], "After School"), fits);
assert.ok(names(bio.best).includes("Biology Club"));
assert.ok(!names(bio.best).includes("Competitive Programming Club"));

// Picking a broad area alone never lifts every club in that category.
const stemOnly = m.recommend(clubs, answers({ topics: ["programming"] }), [], fits);
assert.ok(!names([...stemOnly.best, ...stemOnly.more]).includes("Biology Club"));

// Beginners are never ranked lower than with any other experience answer.
for (const club of clubs) {
  const base = { activities: ["code", "build", "visual"], topics: ["programming", "art"] };
  const newcomer = m.scoreClub(club, answers({ ...base, experience: "new" }), [], fits).score;
  for (const other of ["little", "some", "lots", "any", null])
    assert.ok(newcomer >= m.scoreClub(club, answers({ ...base, experience: other }), [], fits).score - (other === "lots" ? m.WEIGHTS.experiencedCompetitive : 0), `${club.name} beginner score`);
}

// A club meeting only when the student is busy is never a best match; it is
// listed separately instead.
const busyCoder = m.recommend(clubs, answers({ activities: ["code", "compete"], topics: ["programming"], followUps: { coding: ["contest"] } }), free(["Friday"], "At Lunch"), fits);
assert.ok(!names(busyCoder.best).includes("Competitive Programming Club"));
assert.ok(names(busyCoder.busy).includes("Competitive Programming Club"));

// Member counts never change the ranking.
const popular = clubs.map((c) => ({ ...c, memberCount: c.name === "Yearbook Club" ? 999 : 1 }));
const art = answers({ activities: ["visual"], topics: ["art"] });
assert.deepEqual(names(m.recommend(popular, art, [], fits).best), names(m.recommend(clubs, art, [], fits).best));

// Topics and follow-ups only appear when real clubs back them.
const topics = m.availableTopics(clubs).map((t) => t.id);
assert.ok(topics.includes("programming") && topics.includes("bio"));
assert.equal(m.availableTopics(clubs.filter((c) => !/dance/i.test(c.name))).some((t) => t.id === "dance"), false);
assert.equal(m.followUpsFor(answers({}), clubs).length, 0);
assert.deepEqual(m.followUpsFor(answers({ activities: ["code"] }), clubs).map((f) => f.id), ["coding"]);
assert.ok(m.followUpsFor(answers({ activities: ["code", "build", "experiment", "visual", "volunteer"] }), clubs).length <= 3);

// Reasons quote the club's own words, never invented ones.
const newcomer = m.recommend(clubs, answers({ activities: ["code"], topics: ["ai"], experience: "new" }), [], fits);
const ml = [...newcomer.best, ...newcomer.more].find((x) => x.club.name === "Machine Learning Club");
assert.ok(ml && ml.reasons.some((r) => r.includes("“No experience needed”")));
assert.ok(byName("STEM Reach") && !m.beginnerStatement(m.profileClub(byName("STEM Reach"))));

// Saved answers survive a round trip and junk is ignored.
assert.deepEqual(m.readAnswers(JSON.parse(JSON.stringify(answers({ activities: ["code"], lunch: "B" })))).lunch, "B");
assert.equal(m.readAnswers({ version: 1 }), null);

console.log("Club Match engine passed: specific results, beginner fairness, schedule handling, no popularity bias, adaptive follow-ups, sourced reasons.");
