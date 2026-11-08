import { canvasAnnouncementUrl } from "@/lib/canvasAnnouncements";
import { View, Linking, Platform } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, PressableScale, Tag } from "@/components/ui";
import { TextLink } from "@/components/system";
import { useTheme } from "@/context/ThemeContext";
import {
  formatEventDate,
  formatEventTime,
  downloadIcs,
  openGoogleCalendar,
} from "@/lib/calendar";
import { roleLabel } from "@/types/domain";
import type {
  Announcement,
  ClubEvent,
  ClubFile,
  ClubMemberRole,
  ClubNote,
} from "@/types/domain";
import { brand, semantic, surfaces } from "@/theme/tokens";

/**
 * The cards that render club content wherever it appears: inside a club, on
 * the personal dashboard, in search results, and on the calendar. They take a
 * `clubName` so a dashboard row can always say which club an item came from.
 */

function relativeDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RoleBadge({
  role,
  position,
}: {
  role: ClubMemberRole;
  position?: string | null;
}) {
  if (role === "member") return <Tag label="Member" tone="neutral" />;
  return (
    <Tag
      label={roleLabel(role, position)}
      tone={role === "president" ? "brand" : "info"}
    />
  );
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export function AnnouncementCard({
  announcement,
  showClub = false,
  onEdit,
  onDelete,
}: {
  announcement: Announcement;
  showClub?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const url = canvasAnnouncementUrl(announcement.body);
  if (!url) return null;
  return (
    <View className="border-b border-light-border py-4 dark:border-dark-border">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs font-medium text-light-muted dark:text-dark-muted">
            {showClub && announcement.clubName
              ? announcement.clubName
              : "Announcement"}
          </Text>
          <Text className="mt-1 text-lg font-bold text-light-text dark:text-dark-text">
            {announcement.title}
          </Text>
        </View>
        {onEdit || onDelete ? (
          <View className="flex-row gap-1">
            {onEdit ? (
              <PressableScale
                onPress={onEdit}
                accessibilityRole="button"
                accessibilityLabel="Edit announcement"
                scaleTo={0.9}
                className="h-10 w-10 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-2"
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={surfaces.light.muted}
                />
              </PressableScale>
            ) : null}
            {onDelete ? (
              <PressableScale
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete announcement"
                scaleTo={0.9}
                className="h-10 w-10 items-center justify-center rounded-full bg-danger/10 dark:bg-danger/20"
              >
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={semantic.danger}
                />
              </PressableScale>
            ) : null}
          </View>
        ) : null}
      </View>
      <Button className="mt-3 self-start" label="Open in Canvas" icon="open-outline" variant="secondary" size="sm" onPress={() => void Linking.openURL(url)} />
      <Text className="mt-2.5 text-2xs text-light-subtle dark:text-dark-subtle">
        {announcement.author ? `${announcement.author} · ` : ""}
        {relativeDate(announcement.date)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const EVENT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Meeting: "people-outline",
  Competition: "trophy-outline",
  Conference: "business-outline",
  Workshop: "construct-outline",
  Deadline: "alarm-outline",
  Social: "sparkles-outline",
};

export function EventCard({
  event,
  showClub = false,
  hideDate = false,
  onEdit,
  onCancel,
  onDelete,
}: {
  event: ClubEvent;
  showClub?: boolean;
  /** The list is already grouped under this date. */
  hideDate?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const cancelled = event.status === "cancelled";
  const deadline = event.eventType === "Deadline";
  const start = new Date(event.startsAt);
  const zone = { timeZone: "America/Los_Angeles" } as const;
  const when = event.dateOnly ? "All day" : formatEventTime(event);
  const meta = [when, event.location, event.organizer].filter(Boolean);

  return (
    <View className="flex-row gap-5 border-b border-light-border py-4 dark:border-dark-border">
      {!hideDate ? (
        <View className="w-12 items-start">
          <Text className="text-xs text-light-muted dark:text-dark-muted">
            {start.toLocaleDateString("en-US", { month: "short", ...zone })}
          </Text>
          <Text
            className="font-display text-light-text dark:text-dark-text"
            style={{ fontSize: 34, lineHeight: 34 }}
          >
            {start.toLocaleDateString("en-US", { day: "numeric", ...zone })}
          </Text>
        </View>
      ) : null}
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-x-2">
          {deadline ? (
            <View className="rounded-sm bg-python-blue px-1.5 py-0.5">
              <Text className="text-2xs font-bold text-white">Deadline</Text>
            </View>
          ) : (
            <Text className="text-xs text-light-muted dark:text-dark-muted">
              {event.eventType}
            </Text>
          )}
          {cancelled ? (
            <Text className="text-xs font-bold text-danger">Cancelled</Text>
          ) : null}
          {showClub && event.clubName ? (
            <Text className="text-xs font-bold text-light-secondary dark:text-dark-secondary">
              {event.clubName}
            </Text>
          ) : null}
        </View>
        <Text
          className={`mt-0.5 font-display text-light-text dark:text-dark-text ${cancelled ? "line-through opacity-60" : ""}`}
          style={{ fontSize: 26, lineHeight: 28 }}
        >
          {event.title}
        </Text>
        <Text className="mt-1 text-sm text-light-secondary dark:text-dark-secondary">
          {meta.join(", ")}
        </Text>
        {event.description ? (
          <Text className="mt-2 max-w-2xl text-sm leading-5 text-light-muted dark:text-dark-muted">
            {event.description}
          </Text>
        ) : null}
        <View className="mt-1 flex-row flex-wrap items-center gap-x-5">
          {!cancelled ? (
            <>
              <TextLink
                label="Add to Google Calendar"
                onPress={() => void openGoogleCalendar(event)}
              />
              <TextLink
                label={Platform.OS === "web" ? "Download .ics" : "Apple or other"}
                accessibilityLabel="Add to Apple or device calendar"
                onPress={() => void downloadIcs([event], event.title)}
              />
            </>
          ) : null}
          {onEdit ? (
            <TextLink label="Edit" accessibilityLabel="Edit event" onPress={onEdit} />
          ) : null}
          {onCancel && !cancelled ? (
            <TextLink label="Cancel event" onPress={onCancel} />
          ) : null}
          {onDelete ? (
            <TextLink label="Delete" accessibilityLabel="Delete event" onPress={onDelete} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

function fileIcon(mime: string | null): keyof typeof Ionicons.glyphMap {
  if (!mime) return "document-outline";
  if (mime.startsWith("image/")) return "image-outline";
  if (mime.includes("pdf")) return "document-text-outline";
  if (mime.includes("presentation") || mime.includes("powerpoint"))
    return "easel-outline";
  if (mime.includes("sheet") || mime.includes("excel")) return "grid-outline";
  if (mime.includes("zip")) return "archive-outline";
  return "document-outline";
}

function fileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileRow({
  file,
  showClub = false,
  onDelete,
}: {
  file: ClubFile;
  showClub?: boolean;
  onDelete?: () => void;
}) {
  const { isDark } = useTheme();
  const open = () => {
    if (Platform.OS === "web") window.open(file.fileUrl, "_blank", "noopener");
    else void Linking.openURL(file.fileUrl);
  };

  return (
    <Card elevation="ambient" className="flex-row items-center gap-3 p-3.5">
      <PressableScale
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Open ${file.title}`}
        scaleTo={0.98}
        className="flex-1 flex-row items-center gap-3"
      >
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-python-blue/10 dark:bg-python-blue/20">
          <Ionicons
            name={fileIcon(file.mimeType)}
            size={18}
            color={brand.blue}
          />
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-semibold text-light-text dark:text-dark-text"
            numberOfLines={1}
          >
            {file.title}
          </Text>
          <Text
            className="mt-0.5 text-2xs text-light-muted dark:text-dark-muted"
            numberOfLines={1}
          >
            {[
              showClub ? file.clubName : file.folder,
              fileSize(file.sizeBytes),
              relativeDate(file.createdAt),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <Ionicons
          name="open-outline"
          size={16}
          color={isDark ? surfaces.dark.muted : surfaces.light.subtle}
        />
      </PressableScale>
      {onDelete ? (
        <PressableScale
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${file.title}`}
          scaleTo={0.9}
          className="h-10 w-10 items-center justify-center rounded-full bg-danger/10 dark:bg-danger/20"
        >
          <Ionicons name="trash-outline" size={15} color={semantic.danger} />
        </PressableScale>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function NoteCard({
  note,
  showClub = false,
  onEdit,
  onDelete,
}: {
  note: ClubNote;
  showClub?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card elevation="ambient" className="p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
          <Tag label={note.category} tone="brand" />
          {note.pinned ? <Tag label="Pinned" tone="warn" /> : null}
          {showClub && note.clubName ? (
            <Text className="text-2xs font-semibold text-light-muted dark:text-dark-muted">
              {note.clubName}
            </Text>
          ) : null}
        </View>
        {onEdit || onDelete ? (
          <View className="flex-row gap-1">
            {onEdit ? (
              <PressableScale
                onPress={onEdit}
                accessibilityRole="button"
                accessibilityLabel="Edit note"
                scaleTo={0.9}
                className="h-10 w-10 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-2"
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={surfaces.light.muted}
                />
              </PressableScale>
            ) : null}
            {onDelete ? (
              <PressableScale
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
                scaleTo={0.9}
                className="h-10 w-10 items-center justify-center rounded-full bg-danger/10 dark:bg-danger/20"
              >
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={semantic.danger}
                />
              </PressableScale>
            ) : null}
          </View>
        ) : null}
      </View>
      <Text className="mt-2 text-lg font-bold text-light-text dark:text-dark-text">
        {note.title}
      </Text>
      <Text className="mt-1.5 text-sm leading-5 text-light-secondary dark:text-dark-secondary">
        {note.body}
      </Text>
      <Text className="mt-2.5 text-2xs text-light-subtle dark:text-dark-subtle">
        Updated {relativeDate(note.updatedAt)}
      </Text>
    </Card>
  );
}

export { relativeDate };
