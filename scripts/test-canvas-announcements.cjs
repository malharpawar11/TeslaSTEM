const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/canvasAnnouncements.ts","utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject });
const parse = exportsObject.canvasAnnouncementUrl;
const course = "https://lwsd.instructure.com/courses/123/discussion_topics/456";
const group = "https://lwsd.instructure.com/groups/12/announcements/34";
assert.equal(parse(course + "?module_item_id=9#entry-2"), course);
assert.equal(parse(group), group);
for (const value of [
  "https://lwsd.instructure.com.example.org/courses/123/discussion_topics/456",
  "https://lwsd.instructure.com@other.example/courses/123/discussion_topics/456",
  "http://lwsd.instructure.com/courses/123/discussion_topics/456",
  "https://lwsd.instructure.com/courses/123",
  "javascript:alert(1)",
  "An old inline announcement",
]) assert.equal(parse(value), null, value);
console.log("Canvas announcement permalink checks passed.");
