// Run only against an isolated schema-only InsForge branch with email verification disabled.
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const assert = require("node:assert/strict");
const cli = (...args) => {
  const cliArgs = ["-y", "@insforge/cli", ...args, "--json"];
  const result =
    process.platform === "win32"
      ? execFileSync(
          process.execPath,
          [
            join(dirname(process.execPath), "node_modules/npm/bin/npx-cli.js"),
            ...cliArgs,
          ],
          { encoding: "utf8" },
        )
      : execFileSync("npx", cliArgs, { encoding: "utf8" });
  return JSON.parse(result);
};
async function main() {
  const { createClient } = await import("@insforge/sdk");
  const config = JSON.parse(readFileSync(".insforge/project.json", "utf8"));
  const baseUrl = config.oss_host;
  assert(
    baseUrl && baseUrl !== "https://p252r4ze.us-east.insforge.app",
    "Refusing to seed the production backend",
  );
  assert(
    config.appkey?.startsWith("p252r4ze-"),
    "This test only supports isolated branches of Tesla-STEM-Clubs",
  );
  const secret = cli("secrets", "get", "ANON_KEY");
  const anonKey = secret.value ?? secret.secret?.value ?? secret.data?.value;
  assert(anonKey, "Anon key missing");
  const client = () => createClient({ baseUrl, anonKey, isServerMode: true });
  const actors = [];
  const existingAdmin = cli(
    "db",
    "query",
    "select email from public.profiles where role='special_admin'",
  ).rows?.[0]?.email;
  for (const role of ["admin", "president", "member", "outsider"]) {
    const sdk = client();
    const email =
      role === "admin" && existingAdmin
        ? existingAdmin
        : `club-test-${role}-${Date.now()}@lwsd.org`;
    const signup =
      role === "admin" && existingAdmin
        ? await sdk.auth.signInWithPassword({
            email,
            password: "ClubTests12345!",
          })
        : await sdk.auth.signUp({ email, password: "ClubTests12345!" });
    assert.equal(
      signup.error,
      null,
      `signup ${role}: ${signup.error?.message}`,
    );
    assert(
      signup.data?.accessToken,
      "Disable email verification on the test branch only",
    );
    actors.push({ sdk, email, id: signup.data.user.id });
  }
  const [admin, president, member, outsider] = actors;
  if (!existingAdmin)
    cli(
      "db",
      "query",
      `select public.bootstrap_special_admin('${admin.email}')`,
    );
  const club = await president.sdk.database
    .from("clubs")
    .insert([
      {
        name: "Test Robotics",
        category: "STEM",
        description: "A robotics club for engineering and coding interests.",
        meeting_day: "Wednesday",
        meeting_time: "3:00 PM – 4:00 PM",
        location: "Room 100",
        status: "pending",
        created_by: president.id,
      },
    ])
    .select("id");
  assert.equal(club.error, null, club.error?.message);
  const clubId = club.data[0].id;
  const rpc = (actor, name, args = {}) => actor.sdk.database.rpc(name, args);
  const ok = async (actor, name, args) => {
    const result = await rpc(actor, name, args);
    assert.equal(result.error, null, `${name}: ${result.error?.message}`);
    return result.data;
  };
  const denied = async (actor, name, args) => {
    const result = await rpc(actor, name, args);
    assert(result.error, `${name} should reject ${actor.email}`);
  };
  await denied(member, "approve_club", { p_club_id: clubId });
  await ok(admin, "approve_club", { p_club_id: clubId });
  for (const patch of [{ president_id: member.id }, { member_count: 9999 }, { is_active: false }]) {
    const result = await president.sdk.database.from("clubs").update(patch).eq("id", clubId);
    assert(result.error, "Direct privileged club-field writes must fail");
  }
  const forgedClub = await member.sdk.database.from("clubs").insert([{
    name: "Forged ownership", category: "STEM", description: "Test",
    created_by: member.id, status: "pending", president_id: member.id,
  }]);
  assert(forgedClub.error, "Club submission must not set privileged ownership");
  await denied(member, "log_audit", { p_action: "approve_club", p_entity: "club", p_entity_id: clubId });
  for (const name of ["verify_president", "reject_president"]) {
    await denied(member, name, { p_user_id: member.id });
  }
  await denied(member, "assign_club_admin", { p_club_id: clubId, p_email: member.email });
  await denied(member, "transfer_club_ownership", { p_club_id: clubId, p_email: member.email });
  await denied(president, "leave_club", { p_club_id: clubId });
  await ok(member, "join_club", { p_club_id: clubId });
  const event = await president.sdk.database
    .from("club_events")
    .insert([
      {
        club_id: clubId,
        title: "Application deadline",
        event_type: "Deadline",
        starts_at: "2027-01-15T23:00:00Z",
        created_by: president.id,
      },
    ])
    .select("id");
  assert.equal(event.error, null, event.error?.message);
  assert.equal(
    (
      await client()
        .database.from("club_events")
        .select("id")
        .eq("id", event.data[0].id)
    ).data.length,
    1,
  );
  const forbiddenEvent = await member.sdk.database
    .from("club_events")
    .insert([
      {
        club_id: clubId,
        title: "Unauthorized",
        starts_at: "2027-01-15T23:00:00Z",
        created_by: member.id,
      },
    ]);
  assert(
    forbiddenEvent.error,
    "Members must not publish events without permission",
  );
  assert.equal(
    (
      await president.sdk.database
        .from("club_events")
        .update({ status: "cancelled" })
        .eq("id", event.data[0].id)
    ).error,
    null,
  );
  const announcement = await president.sdk.database
    .from("announcements")
    .insert([
      {
        club_id: clubId,
        title: "Meeting update",
        body: "New time for our meeting",
        created_by: president.id,
      },
    ])
    .select("id");
  assert.equal(announcement.error, null, announcement.error?.message);
  const spoofedAuthor = await president.sdk.database.from("announcements")
    .update({ created_by: member.id }).eq("id", announcement.data[0].id);
  assert(spoofedAuthor.error, "Content authorship must be immutable");
  const spoofedUpdater = await president.sdk.database.from("announcements")
    .update({ title: "Edited meeting update", updated_by: member.id })
    .eq("id", announcement.data[0].id).select("updated_by");
  assert.equal(spoofedUpdater.error, null);
  assert.equal(spoofedUpdater.data[0].updated_by, president.id);
  const auditEntry = await admin.sdk.database.from("audit_logs").select("actor,entity_id")
    .eq("entity_id", announcement.data[0].id).eq("action", "create_announcement");
  assert.equal(auditEntry.error, null);
  assert.equal(auditEntry.data.length, 1, "Server write must generate exactly one audit entry");
  assert.equal(auditEntry.data[0].actor, president.id);
  const note = await president.sdk.database
    .from("club_notes")
    .insert([
      {
        club_id: clubId,
        title: "Member resources",
        body: "Internal instructions",
        created_by: president.id,
      },
    ])
    .select("id");
  assert.equal(note.error, null, note.error?.message);
  assert.deepEqual(
    (
      await outsider.sdk.database
        .from("club_notes")
        .select("id")
        .eq("id", note.data[0].id)
    ).data,
    [],
  );
  const notificationRows = await member.sdk.database
    .from("notifications")
    .select("type")
    .eq("club_id", clubId);
  assert(notificationRows.data.some((row) => row.type === "event_created"));
  assert(notificationRows.data.some((row) => row.type === "event_cancelled"));
  assert(notificationRows.data.some((row) => row.type === "announcement"));
  const buckets = cli("storage", "buckets");
  if (!JSON.stringify(buckets).includes("club-files"))
    cli("storage", "create-bucket", "club-files");
  const upload = await president.sdk.storage
    .from("club-files")
    .upload(
      `clubs/${clubId}/test-resource.txt`,
      new Blob(["Club resource"], { type: "text/plain" }),
    );
  assert.equal(upload.error, null, upload.error?.message);
  const file = await president.sdk.database
    .from("club_files")
    .insert([
      {
        club_id: clubId,
        title: "Test resource",
        file_url: upload.data.url,
        file_key: upload.data.key,
        uploaded_by: president.id,
      },
    ])
    .select("id");
  assert.equal(file.error, null, file.error?.message);
  assert.deepEqual(
    (
      await outsider.sdk.database
        .from("club_files")
        .select("id")
        .eq("id", file.data[0].id)
    ).data,
    [],
  );
  const deniedUpload = await outsider.sdk.storage
    .from("club-files")
    .upload(`clubs/${clubId}/outsider.txt`, new Blob(["Unauthorized"]));
  assert(deniedUpload.error, "Unauthorized upload must fail");
  const search = await ok(member, "search_platform", {
    p_query: "resources",
    p_limit: 10,
  });
  assert(search.notes.some((item) => item.id === note.data[0].id));
  assert(
    !(
      await ok(outsider, "search_platform", {
        p_query: "resources",
        p_limit: 10,
      })
    ).notes.some((item) => item.id === note.data[0].id),
  );
  assert(
    (await ok(member, "dashboard_feed", { p_limit: 10 })).clubs.some(
      (item) => item.id === clubId,
    ),
  );
  await ok(member, "save_student_preferences", {
    p_interests: ["STEM"],
    p_careers: ["Engineering"],
    p_availability: [{ day: "Wednesday", start: "15:00", end: "16:00" }],
    p_completed: true,
  });
  const otherPrefs = await outsider.sdk.database
    .from("student_preferences")
    .select("user_id");
  assert.deepEqual(otherPrefs.data, [], "Preferences leaked");
  await denied(member, "save_student_preferences", {
    p_interests: [],
    p_careers: [],
    p_availability: [{ day: "Wednesday", start: "16:00", end: "15:00" }],
    p_completed: true,
  });
  await ok(member, "save_student_preferences", {
    p_interests: ["STEM"],
    p_careers: ["Engineering"],
    p_availability: [
      { day: "Wednesday", start: "", end: "", period: "At Lunch" },
    ],
    p_completed: true,
  });
  await denied(outsider, "save_club_review", {
    p_club_id: clubId,
    p_rating: 5,
    p_body: "Not a member",
  });
  await ok(member, "save_club_review", {
    p_club_id: clubId,
    p_rating: 4,
    p_body: "Great projects and helpful leadership.",
  });
  await ok(member, "save_club_review", {
    p_club_id: clubId,
    p_rating: 5,
    p_body: "Updated review with a higher rating.",
  });
  await denied(member, "save_club_review", {
    p_club_id: clubId,
    p_rating: 6,
    p_body: "Invalid rating must fail.",
  });
  const anon = { sdk: client() };
  const reviews = await ok(anon, "club_reviews_public", { p_club_id: clubId });
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].rating, 5);
  assert(!("email" in reviews[0]));
  const contacts = await ok(member, "message_contacts", { p_club_id: clubId });
  assert(contacts.some((contact) => contact.user_id === president.id));
  assert.deepEqual(
    await ok(outsider, "message_contacts", { p_club_id: clubId }),
    [],
  );
  await denied(outsider, "send_club_message", {
    p_club_id: clubId,
    p_recipient: president.id,
    p_body: "Should be blocked",
  });
  await ok(member, "send_club_message", {
    p_club_id: clubId,
    p_recipient: president.id,
    p_body: "When is our next meeting?",
  });
  await ok(president, "send_club_message", {
    p_club_id: clubId,
    p_recipient: member.id,
    p_body: "Wednesday at 3 PM.",
  });
  const history = await ok(member, "message_history", {
    p_club_id: clubId,
    p_peer: president.id,
  });
  assert.equal(history.length, 2);
  assert.deepEqual(
    await ok(outsider, "message_history", {
      p_club_id: clubId,
      p_peer: president.id,
    }),
    [],
  );
  assert.deepEqual(
    (await outsider.sdk.database.from("club_messages").select("id")).data,
    [],
  );
  const forged = await member.sdk.database.from("club_messages").insert([
    {
      club_id: clubId,
      sender_id: president.id,
      recipient_id: member.id,
      body: "Forged",
    },
  ]);
  assert(forged.error, "Forged direct insert must fail");
  const inbox = await ok(member, "message_threads");
  assert.equal(Number(inbox[0].unread), 1);
  await ok(member, "read_club_messages", {
    p_club_id: clubId,
    p_peer: president.id,
  });
  assert.equal(Number((await ok(member, "message_threads"))[0].unread), 0);
  await ok(member, "leave_club", { p_club_id: clubId });
  assert.deepEqual(
    await ok(anon, "club_reviews_public", { p_club_id: clubId }),
    [],
  );
  await denied(member, "send_club_message", {
    p_club_id: clubId,
    p_recipient: president.id,
    p_body: "No longer a member",
  });
  assert.equal(
    (
      await ok(member, "message_history", {
        p_club_id: clubId,
        p_peer: president.id,
      })
    ).length,
    2,
  );
  const settings = await president.sdk.database
    .from("clubs")
    .update({ join_policy: "approval" })
    .eq("id", clubId);
  assert.equal(settings.error, null);
  await ok(outsider, "request_board_role", {
    p_club_id: clubId,
    p_position: "Secretary",
    p_message: "Please review my request",
  });
  const pending = await outsider.sdk.database
    .from("club_members")
    .select("status,role")
    .eq("club_id", clubId)
    .eq("user_id", outsider.id);
  assert.equal(
    pending.data[0].status,
    "pending",
    "Board request bypassed membership approval",
  );
  await denied(anon, "approve_club", { p_club_id: clubId });
  await denied(outsider, "send_club_message", {
    p_club_id: clubId,
    p_recipient: president.id,
    p_body: "Pending membership",
  });
  await denied(president, "review_board_request", {
    p_club_id: clubId,
    p_user_id: president.id,
    p_approve: false,
  });
  console.log(
    "Backend integration passed: membership, preferences isolation, reviews, private messaging, read receipts, and authorization denials.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
