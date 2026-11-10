const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/loadErrors.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: exportsObject, Error },
);
const explain = exportsObject.explainLoadError;
const blocked = /couldn't reach the club server/;
// Each browser's wording for a request that never reached the server.
assert.match(explain("Failed to fetch"), blocked);
assert.match(explain(new TypeError("Failed to fetch")), blocked);
assert.match(explain("Load failed"), blocked);
assert.match(explain("NetworkError when attempting to fetch resource."), blocked);
assert.match(explain({ message: "Network request failed" }), blocked);
assert.match(
  explain("Backend not configured. Set EXPO_PUBLIC_INSFORGE_URL and EXPO_PUBLIC_INSFORGE_ANON_KEY."),
  /isn't connected to the club server/,
);
assert.match(explain("Request timed out"), /took too long/);
// A server message is passed through, not replaced by a guess.
assert.equal(
  explain("permission denied for table clubs"),
  "The club server said: permission denied for table clubs",
);
// Never an empty line under the error.
assert.equal(explain(""), "No reason was given.");
assert.equal(explain(undefined), "No reason was given.");
assert.equal(explain({}), "No reason was given.");
console.log("Load-error tests passed: every failure shows a plain reason.");
