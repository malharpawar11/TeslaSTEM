// Disposable schema-only branch only. Never create test identities on production.
const { execFileSync } = require("node:child_process"),
  { readFileSync } = require("node:fs"),
  { join, dirname } = require("node:path"),
  assert = require("node:assert/strict");
const cli = (...args) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        join(dirname(process.execPath), "node_modules/npm/bin/npx-cli.js"),
        "-y",
        "@insforge/cli",
        ...args,
        "--json",
      ],
      { encoding: "utf8" },
    ),
  );
async function main() {
  const { createClient } = await import("@insforge/sdk");
  const config = JSON.parse(readFileSync(".insforge/project.json", "utf8"));
  assert(config.appkey?.startsWith("p252r4ze-"), "Refusing production test");
  const secret = cli("secrets", "get", "ANON_KEY");
  const anonKey = secret.value ?? secret.secret?.value;
  const make = () =>
    createClient({ baseUrl: config.oss_host, anonKey, isServerMode: true });
  const actors = [];
  for (let i = 0; i < 4; i++) {
    const sdk = make(),
      email = `dm-test-${i}-${Date.now()}@lwsd.org`;
    const r = await sdk.auth.signUp({
      email,
      password: "DisposableTest12345!",
    });
    assert.equal(r.error, null);
    assert(r.data?.accessToken, "Test branch verification must be disabled");
    actors.push({ sdk, email, id: r.data.user.id });
  }
  const [a, b, c, d] = actors;
  cli(
    "db",
    "query",
    `update auth.users set email_verified=true where id in (${actors.map((x) => `'${x.id}'`).join(",")})`,
  );
  const rpc = async (actor, fn, args = {}) => actor.sdk.database.rpc(fn, args);
  for (const [actor, handle] of [
    [a, "student_one"],
    [b, "student_two"],
    [c, "outsider"],
  ]) {
    const r = await rpc(actor, "save_directory_profile", {
      p_name: actor === c ? "Other Student" : "Same Name",
      p_grade: 10,
      p_handle: handle,
    });
    assert.equal(r.error, null, r.error?.message);
  }
  assert(
    (
      await rpc(b, "save_directory_profile", {
        p_name: "Same Name",
        p_grade: 10,
        p_handle: "student_one",
      })
    ).error,
    "duplicate handles rejected",
  );
  const found = await rpc(a, "search_students", { p_query: "Same Name" });
  assert.equal(found.data.length, 2);
  assert.notEqual(found.data[0].handle, found.data[1].handle);
  assert(!("email" in found.data[0]));
  assert.equal(
    (await rpc(a, "search_students", { p_query: d.email })).data[0].user_id,
    d.id,
    "existing email works before directory setup",
  );
  const anon = make();
  assert(
    (await anon.database.rpc("search_students", { p_query: "Same Name" }))
      .error,
  );
  await Promise.all(actors.slice(0, 3).map((x) => x.sdk.realtime.connect()));
  assert((await b.sdk.realtime.subscribe(`student-inbox:${b.id}`)).ok);
  assert(
    !(await c.sdk.realtime.subscribe(`student-inbox:${b.id}`)).ok,
    "outsider cannot subscribe",
  );
  const delivered = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Realtime event missing")),
      20000,
    );
    b.sdk.realtime.once("direct_message_changed", (payload) => {
      clearTimeout(timer);
      assert(!("body" in payload));
      resolve(payload);
    });
  });
  const sent = await rpc(a, "send_direct_message", {
    p_peer: b.id,
    p_body: "Actual direct delivery",
  });
  assert.equal(sent.error, null, sent.error?.message);
  await delivered;
  const history = await rpc(b, "direct_history", { p_peer: a.id });
  assert.equal(history.data[0].body, "Actual direct delivery");
  assert.equal(
    (await rpc(c, "direct_history", { p_peer: a.id })).data.length,
    0,
  );
  assert.equal(
    (await c.sdk.database.from("direct_messages").select("*")).data.length,
    0,
  );
  assert(
    (
      await c.sdk.database
        .from("direct_messages")
        .insert([{ sender_id: a.id, recipient_id: b.id, body: "forged" }])
    ).error,
  );
  assert((await anon.database.from("direct_messages").select("*")).error);
  assert.equal(
    (await rpc(b, "read_direct_messages", { p_peer: a.id })).error,
    null,
  );
  assert((await rpc(a, "direct_history", { p_peer: b.id })).data[0].read_at);
  assert.equal(
    (
      await rpc(b, "send_direct_message", {
        p_peer: a.id,
        p_body: "Actual reply",
      })
    ).error,
    null,
  );
  assert.equal((await rpc(a, "direct_inbox")).data[0].body, "Actual reply");
  assert.equal(
    (await rpc(b, "block_message_user", { p_peer: a.id, p_block: true })).error,
    null,
  );
  assert(
    (await rpc(a, "send_direct_message", { p_peer: b.id, p_body: "blocked" }))
      .error,
  );
  assert(
    (
      await rpc(b, "send_direct_message", {
        p_peer: a.id,
        p_body: "blocked either direction",
      })
    ).error,
  );
  assert.equal(
    (await rpc(b, "block_message_user", { p_peer: a.id, p_block: false }))
      .error,
    null,
  );
  assert.equal(
    (await rpc(a, "send_direct_message", { p_peer: b.id, p_body: "unblocked" }))
      .error,
    null,
  );
  assert(
    (await rpc(a, "send_direct_message", { p_peer: a.id, p_body: "self" }))
      .error,
  );
  assert(
    (await rpc(a, "send_direct_message", { p_peer: b.id, p_body: " " })).error,
  );
  assert(
    (
      await rpc(a, "send_direct_message", {
        p_peer: b.id,
        p_body: "x".repeat(2001),
      })
    ).error,
  );
  assert.equal(
    (
      await rpc(a, "send_direct_message", {
        p_peer: d.id,
        p_body: "recipient has no directory profile yet",
      })
    ).error,
    null,
  );
  cli(
    "db",
    "query",
    `update auth.users set email_verified=false where id='${c.id}'`,
  );
  assert.equal(
    (await rpc(c, "search_students", { p_query: "Same Name" })).data.length,
    0,
  );
  assert(
    (
      await rpc(c, "send_direct_message", {
        p_peer: a.id,
        p_body: "unverified",
      })
    ).error,
  );
  actors.forEach((x) => x.sdk.realtime.disconnect());
  console.log(
    "Direct messaging passed: real delivery/reply, private realtime events, search, duplicate-name handles, existing-email contact, reads, blocking, validation, and outsider/anonymous/unverified denials.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
