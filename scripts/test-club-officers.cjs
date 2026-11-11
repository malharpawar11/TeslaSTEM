const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const responses = {
  club_officer_directory: { data: [
    { name: "Alex Student", role: "President" },
    { name: "Jordan Student", role: "Co-President" },
    { name: "Taylor Student", role: "Treasurer" },
    { name: "Taylor Student", role: "Secretary" },
  ], error: null },
  club_members: { data: [
    { user_id: "existing-user", role: "president", position: null,
      profiles: { display_name: "Alex Student", email: null } },
  ], error: null },
};
const exportsObject = {};
const sdk = { database: { from(table) {
  const query = new Proxy({}, { get: (_, key) => key === "then"
    ? resolve => Promise.resolve(responses[table]).then(resolve)
    : () => query });
  return query;
} } };
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/data/clubsRepo.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsObject, require(name) {
  return {
    "@/lib/insforge": { insforge: sdk },
    "./result": {}, "@/types/domain": {}, "@/lib/discovery": {},
  }[name];
} });
(async () => {
  const result = await exportsObject.fetchClubOfficers("club");
  assert.equal(result.length, 4, "Deduplicate the registered president while preserving distinct roles");
  assert.equal(result[0].userId, "existing-user");
  assert.equal(result[1].role, "Co-President");
  assert.equal(result[1].userId, undefined, "Published names must not become app identities");
  responses.club_members.data = [];
  assert.equal((await exportsObject.fetchClubOfficers("club")).length, 4,
    "The school roster works without any registered members");
  responses.club_officer_directory = { data: null, error: { message: "Roster unavailable" } };
  await assert.rejects(exportsObject.fetchClubOfficers("club"), /Roster unavailable/);
  console.log("Club officer tests passed: published rosters, identity preservation, duplicate handling, multiple roles, and errors.");
})().catch(error => { console.error(error); process.exitCode = 1; });
