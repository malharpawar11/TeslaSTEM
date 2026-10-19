const ts = require("typescript"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const source = ts.transpileModule(
  fs.readFileSync("src/lib/recordingDemo.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
function enabled(url, flag) {
  const out = {};
  vm.runInNewContext(source, {
    exports: out,
    process: {
      env: { EXPO_PUBLIC_INSFORGE_URL: url, EXPO_PUBLIC_RECORDING_DEMO: flag },
    },
  });
  return out.isRecordingDemo;
}
assert.equal(
  enabled("https://p252r4ze.us-east.insforge.app", "true"),
  false,
  "Production must never enable demo hints",
);
assert.equal(
  enabled("https://p252r4ze-5va.us-east.insforge.app", "true"),
  true,
);
assert.equal(
  enabled("https://p252r4ze-5va.us-east.insforge.app", "false"),
  false,
);
assert.equal(enabled("https://56wue5mw.us-west.insforge.app", "true"), false);
console.log(
  "Recording-demo guard passed: demo presentation is disabled on production and unrelated projects.",
);
