const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/authErrors.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: exportsObject },
);
const check = exportsObject.requiresEmailVerification;
assert.equal(
  check({
    error: "FORBIDDEN",
    statusCode: 403,
    message: "Email verification required",
  }),
  true,
);
assert.equal(check({ error: "AUTH_NEED_VERIFICATION" }), true);
assert.equal(
  check({ error: "FORBIDDEN", statusCode: 403, message: "Account disabled" }),
  false,
);
assert.equal(check({ statusCode: 401, message: "Invalid credentials" }), false);
assert.equal(
  check({ statusCode: 500, message: "Email verification required" }),
  false,
);
console.log(
  "Auth regression tests passed: verification failures open the code step; unrelated failures do not.",
);
