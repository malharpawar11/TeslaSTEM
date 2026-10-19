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
  const content=loadRepo('src/data/contentRepo.ts',{'@/lib/insforge':{insforge:president.sdk},'./result':result,'@/lib/calendar':{}});
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
    const posted=await content.createAnnouncement(club,'Recording validation announcement','Two demo members must receive this.');
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
      assert.equal(r.data?.[0]?.body, "Two demo members must receive this.");
      const notice = await a.sdk.database
        .from("notifications")
        .select("id")
        .eq("entity_id", announcementId);
      assert(notice.data?.length, "Member announcement notification missing");
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
      "FBLA demo passed: president announcement/event publishing, both members live delivery, club feed, personal calendars, notifications, edits/cancellations, and denied member publishing/private-channel access.",
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
