/**
 * canvas-sync: copies each club's Canvas announcements onto the site.
 *
 * A club's officers save the Canvas announcements feed link (Announcements page
 * in their Canvas course or group, then the RSS feed icon). This function reads
 * that Atom feed and adds every post it hasn't seen as a Canvas-link
 * announcement, with Canvas's own title, author and date. Members then see it
 * on their dashboard and the club page. Nothing but the title and link is kept;
 * the post itself stays in Canvas.
 *
 * Called two ways:
 * - by the schedule, with `Authorization: Bearer <CANVAS_SYNC_TOKEN>`: every club;
 * - by a signed-in officer, with their own token and `{ "club_id": ... }`: that
 *   club only, and only if they can see its feed link (database rules decide).
 *
 * Deploy: npx -y @insforge/cli functions deploy canvas-sync --file insforge/functions/canvas-sync.ts
 */

import { createAdminClient, createClient } from "npm:@insforge/sdk";

const CANVAS_POST =
  /^https:\/\/[a-z0-9][a-z0-9-]*\.instructure\.com\/(courses|groups)\/[0-9]+\/(discussion_topics|announcements)\/[0-9]+\/?$/i;
const CANVAS_FEED =
  /^https:\/\/[a-z0-9][a-z0-9-]*\.instructure\.com\/feeds\/announcements\/[a-z]+_[A-Za-z0-9]+\.atom$/i;
const MAX_FEED_BYTES = 2_000_000;

export interface FeedPost {
  entryId: string;
  title: string;
  link: string;
  author: string | null;
  published: string | null;
}

function decode(text: string) {
  return text
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]) : null;
}

/** Posts in a Canvas announcements Atom feed, keeping only real Canvas post links. */
export function parseCanvasFeed(xml: string): FeedPost[] {
  const posts: FeedPost[] = [];
  for (const entry of xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []) {
    const links = [...entry.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
    const alternate =
      links.find((attrs) => /rel=["']alternate["']/i.test(attrs)) ??
      links.find((attrs) => !/rel=/i.test(attrs));
    const href = alternate?.match(/href=["']([^"']+)["']/i)?.[1];
    const link = href ? decode(href).split(/[?#]/, 1)[0] : null;
    const entryId = tag(entry, "id");
    const title = tag(entry, "title")?.replace(/^Announcement:\s*/i, "");
    if (!link || !CANVAS_POST.test(link) || !entryId || !title) continue;
    const author = entry.match(/<author[\s\S]*?<\/author>/i)?.[0];
    const published = tag(entry, "published") ?? tag(entry, "updated");
    posts.push({
      entryId: entryId.slice(0, 300),
      title: title.slice(0, 200),
      link,
      author: author ? tag(author, "name") : null,
      published: published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : null,
    });
  }
  return posts;
}

async function readFeed(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/atom+xml, application/xml;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!/\.instructure\.com$/i.test(new URL(res.url || url).hostname))
    throw new Error("The feed link redirected away from Canvas.");
  if (res.status === 401 || res.status === 403 || res.status === 404)
    throw new Error("Canvas didn't accept this feed link. Copy it again from the club's Canvas Announcements page.");
  if (!res.ok) throw new Error(`Canvas answered ${res.status}. The next check will try again.`);
  const text = await res.text();
  if (text.length > MAX_FEED_BYTES) throw new Error("The Canvas feed is too large to read.");
  if (!/<feed[\s>]/i.test(text)) throw new Error("That link isn't a Canvas announcements feed.");
  return text;
}

// deno-lint-ignore no-explicit-any
type Db = any;

interface FeedRow {
  club_id: string;
  feed_url: string;
  dismissed_entries: string[] | null;
}

async function syncClub(db: Db, feed: FeedRow) {
  try {
    if (!CANVAS_FEED.test(feed.feed_url)) throw new Error("That isn't a Canvas announcements feed link.");
    const posts = parseCanvasFeed(await readFeed(feed.feed_url));
    const dismissed = new Set(feed.dismissed_entries ?? []);
    const ids = posts.map((p) => p.entryId);
    const { data: existing, error: readError } = ids.length
      ? await db.database
          .from("announcements")
          .select("id, title, canvas_entry_id")
          .eq("club_id", feed.club_id)
          .in("canvas_entry_id", ids)
      : { data: [], error: null };
    if (readError) throw new Error(readError.message);
    const known = new Map<string, { id: string; title: string }>(
      (existing ?? []).map((row: { id: string; title: string; canvas_entry_id: string }) => [row.canvas_entry_id, row]),
    );

    const fresh = posts.filter((p) => !known.has(p.entryId) && !dismissed.has(p.entryId));
    if (fresh.length) {
      const { error } = await db.database.from("announcements").insert(
        fresh.map((p) => ({
          club_id: feed.club_id,
          title: p.title,
          body: p.link,
          canvas_entry_id: p.entryId,
          canvas_author: p.author,
          ...(p.published ? { created_at: p.published } : {}),
        })),
      );
      if (error) throw new Error(error.message);
    }
    // Titles edited in Canvas follow along.
    for (const post of posts) {
      const row = known.get(post.entryId);
      if (row && row.title !== post.title)
        await db.database.from("announcements").update({ title: post.title }).eq("id", row.id);
    }
    await db.database
      .from("club_canvas_feeds")
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq("club_id", feed.club_id);
    return { club_id: feed.club_id, added: fresh.length, seen: posts.length };
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : "Couldn't read the Canvas feed.";
    await db.database
      .from("club_canvas_feeds")
      .update({ last_synced_at: new Date().toISOString(), last_error: message.slice(0, 300) })
      .eq("club_id", feed.club_id);
    return { club_id: feed.club_id, added: 0, error: message };
  }
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);

  const env = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno.env;
  const baseUrl = env.get("INSFORGE_BASE_URL")!;
  const admin = createAdminClient({ baseUrl, apiKey: env.get("API_KEY")! });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const body = (await req.json().catch(() => ({}))) as { club_id?: unknown };
  const scheduleToken = env.get("CANVAS_SYNC_TOKEN");

  let feeds: FeedRow[] = [];
  if (scheduleToken && token === scheduleToken) {
    const { data, error } = await admin.database
      .from("club_canvas_feeds")
      .select("club_id, feed_url, dismissed_entries");
    if (error) return reply({ error: error.message }, 500);
    feeds = data ?? [];
  } else if (token && typeof body.club_id === "string") {
    // The officer's own access decides: if they can't read the club's feed
    // link under the database rules, they can't sync it either.
    const user = createClient({ baseUrl, anonKey: env.get("ANON_KEY"), accessToken: token } as never);
    const { data: allowed } = await user.database
      .from("club_canvas_feeds")
      .select("club_id")
      .eq("club_id", body.club_id)
      .maybeSingle();
    if (!allowed) return reply({ error: "You can't check Canvas for this club." }, 403);
    const { data, error } = await admin.database
      .from("club_canvas_feeds")
      .select("club_id, feed_url, dismissed_entries")
      .eq("club_id", body.club_id);
    if (error) return reply({ error: error.message }, 500);
    feeds = data ?? [];
  } else {
    return reply({ error: "Not allowed." }, 401);
  }

  const results = [];
  for (const feed of feeds) results.push(await syncClub(admin, feed));
  return reply({ results });
}
