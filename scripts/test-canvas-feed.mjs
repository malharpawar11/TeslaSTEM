// Parser checks for insforge/functions/canvas-sync.ts (Node strips the types).
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// The function imports the InsForge SDK the Deno way; the parser doesn't need it.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("npm:"))
      return {
        url: "data:text/javascript,export const createClient=()=>{};export const createAdminClient=()=>{};",
        shortCircuit: true,
      };
    return next(specifier, context);
  },
});
// A computed path keeps the app's type check out of the Deno function.
const source = ["..", "insforge", "functions", "canvas-sync.ts"].join("/");
const { parseCanvasFeed } = await import(new URL(source, import.meta.url).href);

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>FBLA: Announcements</title>
  <entry>
    <title>Announcement: States registration closes Friday &amp; dues</title>
    <updated>2026-11-03T18:00:00Z</updated>
    <published>2026-11-03T17:30:00Z</published>
    <link rel="alternate" href="https://lwsd.instructure.com/courses/12345/discussion_topics/678?module_item_id=1"/>
    <id>tag:canvas.instructure.com,2026-11-03:/discussion_topics/discussion_topic_678</id>
    <content type="html">&lt;p&gt;Body stays in Canvas&lt;/p&gt;</content>
    <author><name>Ms. Rivera</name></author>
  </entry>
  <entry>
    <title><![CDATA[Practice round <Tuesday>]]></title>
    <updated>2026-11-01T12:00:00Z</updated>
    <link href="https://lwsd.instructure.com/groups/99/announcements/5"/>
    <id>tag:canvas.instructure.com,2026-11-01:/discussion_topics/discussion_topic_5</id>
  </entry>
  <entry>
    <title>Not a Canvas link</title>
    <link rel="alternate" href="https://example.com/courses/1/discussion_topics/2"/>
    <id>x</id>
  </entry>
  <entry>
    <title>No id</title>
    <link rel="alternate" href="https://lwsd.instructure.com/courses/1/discussion_topics/3"/>
  </entry>
</feed>`;

const posts = parseCanvasFeed(feed);
assert.equal(posts.length, 2);
assert.deepEqual(posts[0], {
  entryId: "tag:canvas.instructure.com,2026-11-03:/discussion_topics/discussion_topic_678",
  title: "States registration closes Friday & dues",
  link: "https://lwsd.instructure.com/courses/12345/discussion_topics/678",
  author: "Ms. Rivera",
  published: "2026-11-03T17:30:00.000Z",
});
assert.equal(posts[1].title, "Practice round <Tuesday>");
assert.equal(posts[1].link, "https://lwsd.instructure.com/groups/99/announcements/5");
assert.equal(posts[1].author, null);
assert.equal(posts[1].published, "2026-11-01T12:00:00.000Z");
assert.deepEqual(parseCanvasFeed("<html>not a feed</html>"), []);
console.log("Canvas feed parser passed: titles, links, authors, dates, CDATA, and non-Canvas links skipped.");
