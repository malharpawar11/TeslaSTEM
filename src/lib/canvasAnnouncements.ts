export const CANVAS_LINK_ERROR =
  "Paste an HTTPS Canvas announcement link from a course or group.";

const canvasAnnouncementPattern =
  /^https:\/\/[a-z0-9][a-z0-9-]*\.instructure\.com\/(courses|groups)\/[0-9]+\/(discussion_topics|announcements)\/[0-9]+\/?$/i;

/** Store a direct Canvas permalink, without session or tracking parameters. */
export function canvasAnnouncementUrl(input: string): string | null {
  const clean = input.trim().split(/[?#]/, 1)[0];
  return clean.length <= 500 && canvasAnnouncementPattern.test(clean) ? clean : null;
}

export const CANVAS_FEED_ERROR =
  "Paste the RSS feed link from your club's Canvas Announcements page. It ends in .atom.";

const canvasFeedPattern =
  /^https:\/\/[a-z0-9][a-z0-9-]*\.instructure\.com\/feeds\/announcements\/[a-z]+_[A-Za-z0-9]+\.atom$/i;

/** A club's Canvas announcements feed (Atom), the link Canvas shows as "RSS". */
export function canvasFeedUrl(input: string): string | null {
  const clean = input.trim().split(/[?#]/, 1)[0];
  return clean.length <= 500 && canvasFeedPattern.test(clean) ? clean : null;
}
