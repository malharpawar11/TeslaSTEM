export const CANVAS_LINK_ERROR =
  "Paste an HTTPS Canvas announcement link from a course or group.";

const canvasAnnouncementPattern =
  /^https:\/\/[a-z0-9][a-z0-9-]*\.instructure\.com\/(courses|groups)\/[0-9]+\/(discussion_topics|announcements)\/[0-9]+\/?$/i;

/** Store a direct Canvas permalink, without session or tracking parameters. */
export function canvasAnnouncementUrl(input: string): string | null {
  const clean = input.trim().split(/[?#]/, 1)[0];
  return clean.length <= 500 && canvasAnnouncementPattern.test(clean) ? clean : null;
}
