/**
 * Turn a raw load failure into one plain sentence a student can act on.
 *
 * Browsers report a request that never reached the server with a bare
 * "Failed to fetch" (Chrome), "Load failed" (Safari) or "NetworkError ..."
 * (Firefox). Those usually mean no connection, or an extension blocking the
 * club server, so the sentence says that instead of the browser's wording.
 * Any other message came from the server and is shown as it is.
 */
export function explainLoadError(raw: unknown): string {
  const message = (
    typeof raw === "string"
      ? raw
      : raw instanceof Error
        ? raw.message
        : raw && typeof raw === "object" && "message" in raw
          ? String((raw as { message: unknown }).message ?? "")
          : ""
  ).trim();

  if (!message) return "No reason was given.";
  if (/backend not configured/i.test(message)) {
    return "This copy of the site isn't connected to the club server.";
  }
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(message)) {
    return "Your browser couldn't reach the club server. Check your connection, or allow insforge.app in any ad or content blocker.";
  }
  if (/timed? ?out|timeout/i.test(message)) {
    return "The club server took too long to answer.";
  }
  return `The club server said: ${message}`;
}
