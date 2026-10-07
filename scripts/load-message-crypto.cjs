const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/messageCrypto.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText,
  { exports: exportsObject, require, Uint8Array, setTimeout },
);
module.exports = exportsObject;
