const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
function load(path, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (!(name in mocks)) throw Error(`Unexpected dependency ${name}`);
      return mocks[name];
    },
    URLSearchParams,
    Date,
    Intl,
    Blob,
    setTimeout,
  });
  return exports;
}
const discovery = load("src/lib/discovery.ts");
const calendar = load("src/lib/calendar.ts", {
  "react-native": { Platform: { OS: "web" } },
});
const domain = load("src/types/domain.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(discovery.meetingRange("3-4 PM")), [900, 960]);
assert.deepEqual(
  plain(discovery.meetingRange("12:00 PM – 1:00 PM")),
  [720, 780],
);
assert.deepEqual(plain(discovery.meetingRange("15:30 to 16:30")), [930, 990]);
for (const value of [
  "At Lunch",
  "After School",
  "3 PM",
  "16:00-15:00",
  "3:75 PM - 4 PM",
])
  assert.equal(discovery.meetingRange(value), null);
const club = {
  name: "Robotics",
  description: "Build robots and learn coding",
  category: "STEM",
  day: "Wednesday",
  time: "3:00 PM – 4:00 PM",
};
assert.equal(
  discovery.fitsAvailability(club, [
    { day: "Wednesday", start: "15:00", end: "16:00" },
  ]),
  true,
);
assert.equal(
  discovery.fitsAvailability(club, [
    { day: "Wednesday", start: "15:30", end: "16:30" },
  ]),
  false,
);
assert.equal(
  discovery.fitsAvailability(club, [
    { day: "Thursday", start: "14:00", end: "17:00" },
  ]),
  false,
);
assert.equal(
  discovery.fitsAvailability({ ...club, time: "TBD" }, [
    { day: "Wednesday", start: "00:00", end: "23:59" },
  ]),
  false,
);
assert.equal(
  discovery.fitsAvailability({ ...club, time: "At Lunch" }, [
    { day: "Wednesday", start: "", end: "", period: "At Lunch" },
  ]),
  true,
);
assert.equal(
  discovery.fitsAvailability({ ...club, time: "At Lunch" }, [
    { day: "Wednesday", start: "", end: "", period: "After School" },
  ]),
  false,
);
assert.deepEqual(plain(discovery.meetingDays("Tuesdays and Thursdays")), [
  "Tuesday",
  "Thursday",
]);
assert.equal(discovery.careerMatches(club, "Engineering"), true);
assert.equal(discovery.careerMatches(club, "Medicine"), false);
assert.equal(
  discovery.careerMatches(
    {
      ...club,
      name: "Tea Club",
      description: "Enjoy tea together",
      category: "Wellness",
    },
    "Medicine",
  ),
  false,
);
assert.equal(
  discovery.careerMatches({ ...club, careerTags: ["Medicine"] }, "Medicine"),
  true,
);
assert.equal(
  discovery.recommendationReasons(club, {
    interests: ["STEM"],
    careers: ["Engineering"],
    availability: [{ day: "Wednesday", start: "15:00", end: "16:00" }],
  }).length,
  3,
);
assert.equal(
  discovery.validateMeeting("Wednesday", club.time, "Room 100"),
  null,
);
assert(discovery.validateMeeting("TBD", club.time, "Room 100"));
assert.equal(calendar.schoolDayKey("2026-10-05T01:00:00Z"), "2026-10-04");
assert.equal(calendar.schoolDayKey("2026-01-05T07:00:00Z"), "2026-01-04");
assert.equal(
  calendar.fromSchoolInput("2026-10-05 15:00"),
  "2026-10-05T22:00:00.000Z",
);
assert.equal(
  calendar.fromSchoolInput("2026-01-05 15:00"),
  "2026-01-05T23:00:00.000Z",
);
assert.equal(calendar.fromSchoolInput("2026-02-30 15:00"), null);
assert.equal(calendar.fromSchoolInput("2026-03-08 02:30"), null);
assert.equal(domain.clubInitials(""), "CL");
assert.equal(domain.clubInitials("🤖"), "CL");
console.log(
  "Discovery tests passed: time parsing, full-window matching, unknown schedules, weekday aliases, career matches, recommendations, Pacific calendar grouping, empty initials.",
);
