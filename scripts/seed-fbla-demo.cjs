// Only run against a fresh, schema-only recording branch. No production users are copied.
const { execFileSync } = require("node:child_process"),
  fs = require("node:fs"),
  { join, dirname } = require("node:path"),
  { randomBytes } = require("node:crypto"),
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
  const config = JSON.parse(fs.readFileSync(".insforge/project.json", "utf8"));
  assert(
    config.appkey?.startsWith("p252r4ze-") &&
      config.oss_host !== "https://p252r4ze.us-east.insforge.app",
    "Refusing production demo seeding",
  );
  const branch = cli("branch", "list").data.find(
    (b) => b.appkey === config.appkey,
  );
  assert.equal(
    branch?.name,
    "fbla-recording-demo",
    "This script is restricted to the named recording branch",
  );
  const existing = cli(
    "db",
    "query",
    "select count(*)::int as n from auth.users",
  ).rows[0].n;
  assert.equal(
    existing,
    0,
    "Refusing to overwrite existing demo users; use the saved demo logins instead",
  );
  const secret = cli("secrets", "get", "ANON_KEY"),
    anonKey = secret.value ?? secret.secret?.value;
  const { createClient } = await import("@insforge/sdk");
  const definitions = [
    ["admin", "fbla.demo.admin@lwsd.org", "Demo Administrator", 12],
    ["president", "fbla.demo.president@lwsd.org", "FBLA President", 12],
    ["member", "fbla.demo.member@lwsd.org", "FBLA Member", 11],
    ["member2", "fbla.demo.member2@lwsd.org", "Second FBLA Member", 10],
  ];
  const saved = {
    backendUrl: config.oss_host,
    branchId: branch.id,
    accounts: [],
    clubId: null,
  };
  const actors = [];
  for (const [role, email, name, grade] of definitions) {
    const password = `Fbla-${randomBytes(12).toString("base64url")}!`;
    const sdk = createClient({
      baseUrl: config.oss_host,
      anonKey,
      isServerMode: true,
    });
    const r = await sdk.auth.signUp({ email, password, name });
    assert.equal(r.error, null, r.error?.message);
    assert(
      r.data?.accessToken,
      "Disable verification on the isolated branch while seeding",
    );
    const actor = {
      role,
      email,
      name,
      grade,
      password,
      id: r.data.user.id,
      sdk,
    };
    actors.push(actor);
    saved.accounts.push({ role, email, name, password, id: actor.id });
    fs.writeFileSync(
      ".insforge/fbla-demo-logins.json",
      JSON.stringify(saved, null, 2),
    );
  }
  const [admin, president, member, member2] = actors;
  cli(
    "db",
    "query",
    `update auth.users set email_verified=true where id in (${actors.map((a) => `'${a.id}'`).join(",")})`,
  );
  cli("db", "query", `select public.bootstrap_special_admin('${admin.email}')`);
  const ok = async (actor, name, args = {}) => {
    const r = await actor.sdk.database.rpc(name, args);
    assert.equal(r.error, null, `${name}: ${r.error?.message}`);
    return r.data;
  };
  for (const actor of actors) {
    await ok(actor, "save_directory_profile", {
      p_name: actor.name,
      p_grade: actor.grade,
      p_handle: `fbla_demo_${actor.role}`,
    });
    await ok(actor, "save_student_preferences", {
      p_interests: ["Business"],
      p_careers: ["Business"],
      p_availability: [],
      p_completed: true,
    });
  }
  const created = await president.sdk.database
    .from("clubs")
    .insert([
      {
        name: "FBLA",
        category: "Business",
        description:
          "Future Business Leaders of America — leadership, business skills and competitions. Recording demo with isolated accounts.",
        meeting_day: "Tuesday",
        meeting_time: "A lunch: 11:15–11:45 AM; B lunch: 12:15–12:45 PM",
        location: "Wrenchey's Room",
        advisor: "Wrenchey",
        created_by: president.id,
        status: "pending",
      },
    ])
    .select("id");
  assert.equal(created.error, null, created.error?.message);
  const clubId = created.data[0].id;
  saved.clubId = clubId;
  fs.writeFileSync(
    ".insforge/fbla-demo-logins.json",
    JSON.stringify(saved, null, 2),
  );
  await ok(admin, "approve_club", { p_club_id: clubId });
  await ok(member, "join_club", { p_club_id: clubId });
  await ok(member2, "join_club", { p_club_id: clubId });
  const welcome = await president.sdk.database.from("announcements").insert([
    {
      club_id: clubId,
      title: "Welcome to FBLA",
      body: "Our club meets every Tuesday during A lunch (11:15–11:45) and B lunch (12:15–12:45) in Wrenchey’s Room. Watch this space for updates from your president.",
      created_by: president.id,
    },
  ]);
  assert.equal(welcome.error, null, welcome.error?.message);
  const events = [];
  for (const date of ["2026-10-20", "2026-10-27"])
    for (const [label, start, end] of [
      ["A lunch", "18:15", "18:45"],
      ["B lunch", "19:15", "19:45"],
    ])
      events.push({
        club_id: clubId,
        title: `FBLA Meeting - ${label}`,
        event_type: "Meeting",
        date_only: false,
        starts_at: `${date}T${start}:00Z`,
        ends_at: `${date}T${end}:00Z`,
        location: "Wrenchey's Room",
        organizer: "FBLA",
        created_by: president.id,
      });
  events.push({
    club_id: clubId,
    title: "Fall Leadership Conference (FLC)",
    description: "October 24, 2026.",
    event_type: "Conference",
    starts_at: "2026-10-24T07:00:00Z",
    date_only: true,
    organizer: "FBLA",
    created_by: president.id,
  });
  const inserted = await president.sdk.database
    .from("club_events")
    .insert(events);
  assert.equal(inserted.error, null, inserted.error?.message);
  const access = await ok(president, "my_club_access", { p_club_id: clubId });
  assert(access.can_admin && access.is_member, "President permissions missing");
  for (const actor of [member, member2]) {
    const a = await ok(actor, "my_club_access", { p_club_id: clubId });
    assert(a.is_member && !a.can_admin, "Member permissions incorrect");
  }
  console.log(
    JSON.stringify({
      seeded: true,
      clubId,
      accounts: actors.map(({ role, email }) => ({ role, email })),
      credentialsFile: ".insforge/fbla-demo-logins.json",
    }),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
