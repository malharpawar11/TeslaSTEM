// Uses saved isolated demo accounts. Validation posts are removed afterward.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { execFileSync } = require("node:child_process"),
  { dirname, join } = require("node:path");
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
  const config = JSON.parse(fs.readFileSync(".insforge/project.json", "utf8")),
    saved = JSON.parse(
      fs.readFileSync(".insforge/fbla-demo-logins.json", "utf8"),
    );
  assert(
    config.appkey?.startsWith("p252r4ze-") &&
      config.oss_host === saved.backendUrl,
    "Refusing production or an unrelated project",
  );
  const { createClient } = await import("@insforge/sdk");
  const secret = cli("secrets", "get", "ANON_KEY"),
    anonKey = secret.value ?? secret.secret?.value;
  const actors = {};
  for (const a of saved.accounts) {
    const sdk = createClient({
      baseUrl: config.oss_host,
      anonKey,
      isServerMode: true,
    });
    const r = await sdk.auth.signInWithPassword({
      email: a.email,
      password: a.password,
    });
    assert.equal(r.error, null, r.error?.message);
    actors[a.role] = { ...a, sdk };
  }
  const { president, member, member2 } = actors,
    club = saved.clubId;
  // Exercise the actual repository query: club_members has both user/reviewer FKs.
  const ts=require('typescript'),vm=require('node:vm'),repo={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/data/clubsRepo.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:repo,require:name=>name==='@/lib/insforge'?{insforge:member.sdk,isInsforgeConfigured:true}:name==='@/types/domain'?{CATEGORIES:['Business']}:{}});
  const officers=await repo.fetchClubOfficers(club);
  assert(officers.some(o=>o.userId===president.id&&o.role==='President'),'Member club leadership query failed');
  const loadRepo=(path,deps)=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>{if(!(name in deps))throw Error('Unexpected dependency '+name);return deps[name];}});return exports;};
  const result=loadRepo('src/data/result.ts',{'@/lib/insforge':{insforge:president.sdk}});
  assert.equal(await result.currentUserId(),president.id,'Actual app identity helper failed');
  const content=loadRepo('src/data/contentRepo.ts',{'@/lib/insforge':{insforge:president.sdk},'./result':result,'@/lib/calendar':{},'@/lib/canvasAnnouncements':loadRepo('src/lib/canvasAnnouncements.ts',{})});
  const guest = createClient({ baseUrl: config.oss_host, anonKey, isServerMode: true });
  const publicSearch = await guest.database.rpc("search_platform", {
    p_query: "FBLA",
  });
  assert.equal(publicSearch.error, null, publicSearch.error?.message);
  assert(publicSearch.data.clubs.some((row) => row.id === club));
  assert.deepEqual(publicSearch.data.files, []);
  assert.deepEqual(publicSearch.data.notes, []);
  for (const name of ["my_app_role", "is_special_admin", "can_admin_club", "is_club_member", "has_club_permission"]) {
    const args = name === "has_club_permission" ? { c: club, perm: "members" } :
      ["can_admin_club", "is_club_member"].includes(name) ? { c: club } : {};
    assert((await guest.database.rpc(name, args)).error, `Guest can call ${name}`);
  }
  for (const actor of [president, member]) {
    const result = await actor.sdk.database.rpc("my_club_access", { p_club_id: club });
    assert.equal(result.error, null, result.error?.message);
    assert.equal(result.data.is_member, true);
    assert.equal(result.data.can_admin, actor === president);
  }
  const claims = await actors.admin.sdk.database.rpc("list_club_claims");
  assert.equal(claims.error, null, claims.error?.message);
  const otherClaims = await member.sdk.database.rpc("list_club_claims");
  assert.equal(otherClaims.error, null, otherClaims.error?.message);
  assert.deepEqual(otherClaims.data, []);
  assert((await member.sdk.database.rpc("approve_club", { p_club_id: club })).error);
  assert((await member.sdk.database.from("club_members").update({ role: "president" }).eq("user_id", member.id).eq("club_id", club)).error);
  for (const table of ["club_messages", "direct_messages", "message_identity_keys", "message_blocks", "student_directory"]) {
    assert((await member.sdk.database.from(table).select("*").limit(1)).error, `Archived ${table} is readable`);
  }
  const ownPrefs = await member.sdk.database.from("student_preferences").select("interests,careers,availability,completed").eq("user_id", member.id).single();
  assert.equal(ownPrefs.error, null, ownPrefs.error?.message);
  const samePrefs = await member.sdk.database.rpc("save_student_preferences", {
    p_interests: ownPrefs.data.interests, p_careers: ownPrefs.data.careers,
    p_availability: ownPrefs.data.availability, p_completed: ownPrefs.data.completed,
  });
  assert.equal(samePrefs.error, null, samePrefs.error?.message);
  const badPrefs = await member.sdk.database.from("student_preferences").update({ availability: [{ day: "Not a weekday" }] }).eq("user_id", member.id);
  assert.match(badPrefs.error?.message ?? "", /Invalid weekday/);
  const foreignPrefs = await member.sdk.database.from("student_preferences").select("user_id").eq("user_id", member2.id);
  assert.deepEqual(foreignPrefs.data, []);
  const forgedReview = await member.sdk.database.from("club_reviews").insert([
    { club_id: club, user_id: member2.id, rating: 5, body: "Forged authorization test" },
  ]);
  assert(forgedReview.error, "Member can impersonate another reviewer");
  const ownReview = await member.sdk.database.from("club_reviews").select("rating,body").eq("club_id", club).eq("user_id", member.id).maybeSingle();
  assert.equal(ownReview.error, null, ownReview.error?.message);
  try {
    const savedReview = await member.sdk.database.rpc("save_club_review", {
      p_club_id: club, p_rating: ownReview.data?.rating ?? 5,
      p_body: ownReview.data?.body ?? "Temporary authorization test review",
    });
    assert.equal(savedReview.error, null, savedReview.error?.message);
    const reviews = await guest.database.rpc("club_reviews_public", { p_club_id: club });
    assert.equal(reviews.error, null, reviews.error?.message);
    assert(reviews.data.some((row) => row.user_id === member.id));
    assert(reviews.data.every((row) => !("email" in row)));
  } finally {
    if (!ownReview.data) await member.sdk.database.from("club_reviews").delete().eq("club_id", club).eq("user_id", member.id);
  }
  let announcementId, eventId;
  const waitFor = (actor, area) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        actor.sdk.realtime.off("club_content_changed", onEvent);
        reject(Error(`Missing live ${area} for ${actor.role}`));
      }, 20000);
      const onEvent = (p) => {
        if (p.club_id === club && p.area === area) {
          clearTimeout(timer);
          actor.sdk.realtime.off("club_content_changed", onEvent);
          assert(!("body" in p));
          resolve(p);
        }
      };
      actor.sdk.realtime.on("club_content_changed", onEvent);
    });
  try {
    for (const a of [member, member2]) {
      await a.sdk.realtime.connect();
      assert((await a.sdk.realtime.subscribe(`member-content:${a.id}`)).ok);
    }
    assert(
      !(await member2.sdk.realtime.subscribe(`member-content:${member.id}`)).ok,
      "Cannot subscribe to another student",
    );
    const anon = createClient({
      baseUrl: config.oss_host,
      anonKey,
      isServerMode: true,
    });
    await anon.realtime.connect();
    assert(!(await anon.realtime.subscribe(`member-content:${member.id}`)).ok);
    anon.realtime.disconnect();
    const announcementUpdates = [
      waitFor(member, "announcements"),
      waitFor(member2, "announcements"),
    ];
    const posted=await content.createAnnouncement(club,'Recording validation announcement','https://example.instructure.com/courses/123/discussion_topics/456');
    assert.equal(posted.ok,true,posted.error);
    const announcement=await president.sdk.database.from('announcements').select('id').eq('club_id',club).eq('title','Recording validation announcement').single();
    assert.equal(announcement.error,null,announcement.error?.message);
    announcementId=announcement.data.id;
    await Promise.all(announcementUpdates);
    for (const a of [member, member2]) {
      const r = await a.sdk.database
        .from("announcements")
        .select("id,body")
        .eq("id", announcementId);
      assert.equal(r.data?.[0]?.body, "https://example.instructure.com/courses/123/discussion_topics/456");
      const notice = await a.sdk.database
        .from("notifications")
        .select("id")
        .eq("entity_id", announcementId);
      assert.equal(notice.data?.length, 0, "Canvas owns announcement notifications");
    }
    const eventUpdates = [
      waitFor(member, "events"),
      waitFor(member2, "events"),
    ];
    const created=await content.createEvent(club,{title:'Recording validation event',description:'Test',eventType:'Meeting',startsAt:'2026-11-19T19:15:00Z',endsAt:'2026-11-19T19:45:00Z',location:"Wrenchey's Room",organizer:'FBLA'});
    assert.equal(created.ok,true,created.error);
    const event=await president.sdk.database.from('club_events').select('id').eq('club_id',club).eq('title','Recording validation event').single();
    assert.equal(event.error,null,event.error?.message);
    eventId=event.data.id;
    await Promise.all(eventUpdates);
    for (const a of [member, member2]) {
      const r = await a.sdk.database
        .from("club_events")
        .select("id,starts_at")
        .eq("club_id", club)
        .eq("status", "scheduled")
        .eq("id", eventId);
      assert.equal(r.data?.[0]?.id, eventId);
      const dashboard = await a.sdk.database.rpc("dashboard_feed", {
        p_limit: 50,
      });
      assert.equal(dashboard.error, null, dashboard.error?.message);
      assert(
        dashboard.data.events.some((e) => e.id === eventId),
        "Personal dashboard calendar is missing event",
      );
      const n = await a.sdk.database
        .from("notifications")
        .select("id")
        .eq("entity_id", eventId);
      assert(n.data?.length, "Event notification missing");
    }
    const inbox = await member.sdk.database.from("notifications").select("id").eq("entity_id", eventId).single();
    assert.equal(inbox.error, null, inbox.error?.message);
    assert((await member.sdk.database.from("notifications").update({ title: "Forged" }).eq("id", inbox.data.id)).error);
    const otherRead = await member2.sdk.database.rpc("mark_notifications_read", { p_ids: [inbox.data.id] });
    assert.equal(otherRead.error, null, otherRead.error?.message);
    const stillUnread = await member.sdk.database.from("notifications").select("read_at").eq("id", inbox.data.id).single();
    assert.equal(stillUnread.data?.read_at, null);
    const marked = await member.sdk.database.rpc("mark_notifications_read", { p_ids: [inbox.data.id] });
    assert.equal(marked.error, null, marked.error?.message);
    const nowRead = await member.sdk.database.from("notifications").select("read_at").eq("id", inbox.data.id).single();
    assert(nowRead.data?.read_at, "Owner could not mark their notification read");
    const edits = [waitFor(member, "events"), waitFor(member2, "events")];
    const edited = await president.sdk.database
      .from("club_events")
      .update({ location: "Demo Room 200" })
      .eq("id", eventId);
    assert.equal(edited.error, null);
    await Promise.all(edits);
    assert.equal(
      (
        await member.sdk.database
          .from("club_events")
          .select("location")
          .eq("id", eventId)
      ).data[0].location,
      "Demo Room 200",
    );
    const cancelled = [waitFor(member, "events"), waitFor(member2, "events")];
    assert.equal(
      (
        await president.sdk.database
          .from("club_events")
          .update({ status: "cancelled" })
          .eq("id", eventId)
      ).error,
      null,
    );
    await Promise.all(cancelled);
    assert.equal(
      (
        await member.sdk.database
          .from("club_events")
          .select("id")
          .eq("id", eventId)
          .eq("status", "scheduled")
      ).data.length,
      0,
    );
    assert(
      (
        await member.sdk.database
          .from("announcements")
          .insert([
            {
              club_id: club,
              title: "Unauthorized",
              body: "Member cannot publish",
              created_by: member.id,
            },
          ])
      ).error,
      "Member must not publish announcements",
    );
    assert(
      (
        await member.sdk.database
          .from("club_events")
          .insert([
            {
              club_id: club,
              title: "Unauthorized",
              starts_at: "2026-11-19T19:15:00Z",
              created_by: member.id,
            },
          ])
      ).error,
      "Member must not publish events",
    );
    const publishDenied = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Missing forged-publish rejection")),
        10000,
      );
      member.sdk.realtime.once("error", (error) => {
        clearTimeout(timer);
        resolve(error);
      });
    });
    await member.sdk.realtime.publish(
      `member-content:${member.id}`,
      "club_content_changed",
      { club_id: club, area: "events" },
    );
    const rejection = await publishDenied;
    assert(rejection, "Clients cannot forge broadcasts");
    console.log(
      "FBLA demo passed: president announcement/event publishing, both members live delivery, club feed, personal calendars, notifications, edits/cancellations, and denied member publishing, private-channel access, archived messaging, privilege escalation, and cross-user notification updates.",
    );
  } finally {
    if (announcementId)
      await president.sdk.database
        .from("announcements")
        .delete()
        .eq("id", announcementId);
    if (eventId)
      await president.sdk.database
        .from("club_events")
        .delete()
        .eq("id", eventId);
    const ids = [announcementId, eventId].filter(Boolean);
    if (ids.length)
      cli(
        "db",
        "query",
        `delete from public.notifications where entity_id in (${ids.map((id) => `'${id}'`).join(",")})`,
      );
    Object.values(actors).forEach((a) => a.sdk.realtime.disconnect());
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
