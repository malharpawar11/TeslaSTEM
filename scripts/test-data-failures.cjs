const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const failure = { message: "Backend unavailable" };
let response = { data: null, error: failure, count: null };
const query = new Proxy(
  {},
  {
    get: (_, key) =>
      key === "then"
        ? (resolve) => Promise.resolve(response).then(resolve)
        : () => query,
  },
);
const sdk = { database: { from: () => query } };
function load(path, mocks) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        assert(name in mocks, `Unexpected dependency ${name}`);
        return mocks[name];
      },
    },
  );
  return exports;
}
async function main() {
  const base = {
    "@/lib/insforge": { insforge: sdk },
    "./result": {
      NOT_CONFIGURED: "Backend not configured.",
      callRpcValue: async () => ({ ok: false, error: failure.message }),
    },
    "@/types/domain": { DEFAULT_NOTIFICATION_PREFS: {}, NO_ACCESS: {} },
  };
  const inbox = load("src/data/notificationsRepo.ts", base);
  await assert.rejects(inbox.fetchNotifications(), /Backend unavailable/);
  await assert.rejects(
    inbox.fetchNotificationPrefs("user"),
    /Backend unavailable/,
  );
  await assert.rejects(inbox.fetchUnreadCount(), /Backend unavailable/);
  response = { data: null, error: null, count: 127 };
  assert.equal(
    await inbox.fetchUnreadCount(),
    127,
    "Unread totals must not be capped to the loaded page",
  );
  response = { data: null, error: failure, count: null };
  const feed = load("src/data/feedRepo.ts", base);
  await assert.rejects(feed.fetchDashboard(), /Backend unavailable/);
  await assert.rejects(feed.searchPlatform("robotics"), /Backend unavailable/);
  const members = load("src/data/membershipRepo.ts", base);
  await assert.rejects(
    members.fetchMyMemberships("user"),
    /Backend unavailable/,
  );
  await assert.rejects(members.fetchClubAccess("club"), /Backend unavailable/);
  const content = load("src/data/contentRepo.ts", base);
  for (const name of [
    "fetchClubAnnouncements",
    "fetchSchoolAnnouncements",
    "fetchClubEvents",
    "fetchClubFiles",
    "fetchClubNotes",
  ]) {
    await assert.rejects(content[name]("club"), /Backend unavailable/);
  }
  console.log(
    "Data regression tests passed: backend outages remain errors, and unread totals exceed the inbox page size.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
