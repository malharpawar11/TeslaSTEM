import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import {
  fetchCanvasFeed,
  removeCanvasFeed,
  saveCanvasFeed,
  syncCanvasFeed,
  type CanvasFeed,
} from "@/data/contentRepo";
import { canvasFeedUrl, CANVAS_FEED_ERROR } from "@/lib/canvasAnnouncements";

function ago(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/**
 * Connect the club's Canvas announcements once. After that every new Canvas
 * post shows up for members on the site, checked every 15 minutes.
 */
export function CanvasFeedSettings({
  clubId,
  onSynced,
}: {
  clubId: string;
  /** Called after a check adds posts, so the list below can refresh. */
  onSynced: () => void;
}) {
  const { toast } = useToast();
  const [feed, setFeed] = useState<CanvasFeed | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"save" | "sync" | "remove" | null>(null);

  const load = useCallback(async () => {
    try {
      setFeed(await fetchCanvasFeed(clubId));
    } catch {
      setFeed(null);
    } finally {
      setLoaded(true);
    }
  }, [clubId]);
  useEffect(() => {
    void load();
  }, [load]);

  const check = async (quiet = false) => {
    setBusy("sync");
    const res = await syncCanvasFeed(clubId);
    setBusy(null);
    await load();
    if (!res.ok) return toast(res.error, "error");
    if (res.added) onSynced();
    if (!quiet || res.added)
      toast(
        res.added
          ? `${res.added} new Canvas ${res.added === 1 ? "post" : "posts"} added.`
          : "Up to date with Canvas.",
        "success",
      );
  };

  const save = async () => {
    if (!canvasFeedUrl(draft)) return toast(CANVAS_FEED_ERROR, "error");
    setBusy("save");
    const res = await saveCanvasFeed(clubId, draft);
    setBusy(null);
    if (!res.ok) return toast(res.error, "error");
    setEditing(false);
    setDraft("");
    toast("Canvas connected. Checking for posts now.", "success");
    await check(true);
  };

  const disconnect = async () => {
    setBusy("remove");
    const res = await removeCanvasFeed(clubId);
    setBusy(null);
    if (!res.ok) return toast(res.error, "error");
    toast("Canvas disconnected. Posts already added stay on the site.", "success");
    await load();
  };

  if (!loaded) return null;

  const form = (
    <View className="mt-3 gap-3">
      <Input
        label="Canvas feed link"
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        maxLength={500}
        placeholder="https://lwsd.instructure.com/feeds/announcements/enrollment_….atom"
        helper="In the club's Canvas course or group, open Announcements and copy the RSS feed link."
      />
      <View className="flex-row flex-wrap gap-2.5">
        <Button
          label={feed ? "Save link" : "Connect Canvas"}
          size="md"
          loading={busy === "save"}
          onPress={() => void save()}
        />
        {feed ? (
          <Button
            label="Cancel"
            variant="secondary"
            size="md"
            onPress={() => {
              setEditing(false);
              setDraft("");
            }}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="mb-6 border-b border-light-border pb-6 dark:border-dark-border">
      <Text className="text-base font-bold text-light-text dark:text-dark-text">
        {feed ? "Connected to Canvas" : "Connect your Canvas announcements"}
      </Text>
      <Text className="mt-1 text-sm leading-5 text-light-secondary dark:text-dark-secondary">
        {feed
          ? "Every post in your club's Canvas announcements shows up here and for members, checked every 15 minutes. Post in Canvas as usual."
          : "Paste your club's Canvas feed link once. After that, everything you post in Canvas shows up for your members here automatically. No copying links."}
      </Text>

      {feed && !editing ? (
        <>
          <Text
            className={`mt-2 text-sm ${feed.lastError ? "text-danger" : "text-light-muted dark:text-dark-muted"}`}
          >
            {feed.lastError
              ? `Last check failed: ${feed.lastError}`
              : feed.lastSyncedAt
                ? `Last checked ${ago(feed.lastSyncedAt)}.`
                : "Not checked yet."}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2.5">
            <Button
              label="Check Canvas now"
              size="md"
              icon="refresh"
              loading={busy === "sync"}
              onPress={() => void check()}
            />
            <Button
              label="Change link"
              variant="secondary"
              size="md"
              onPress={() => {
                setDraft(feed.feedUrl);
                setEditing(true);
              }}
            />
            <Button
              label="Disconnect"
              variant="ghost"
              size="md"
              loading={busy === "remove"}
              onPress={() => void disconnect()}
            />
          </View>
        </>
      ) : (
        form
      )}
    </View>
  );
}
