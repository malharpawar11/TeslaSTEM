const ts = require("typescript"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const out = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/calendar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  {
    exports: out,
    require: () => ({ Platform: { OS: "web" } }),
    URLSearchParams,
    Date,
  },
);
const event = {
  id: "flc",
  title: "Fall Leadership Conference (FLC)",
  clubName: "FBLA",
  dateOnly: true,
  startsAt: "2026-10-24T07:00:00Z",
  endsAt: null,
  status: "scheduled",
};
assert.equal(out.formatEventTime(event), "");
assert.equal(
  new URL(out.googleCalendarUrl(event)).searchParams.get("dates"),
  "20261024/20261025",
);
const ics = out.buildIcs([event]);
assert(ics.includes("DTSTART;VALUE=DATE:20261024"));
assert(ics.includes("DTEND;VALUE=DATE:20261025"));
assert(!ics.includes("DTSTART:"));
assert(out.formatEventTime({ ...event, dateOnly: false }));
console.log("Date-only FLC display and Google/ICS calendar export passed.");
