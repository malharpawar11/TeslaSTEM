import { View, Text, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, PressableScale, Tag } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { formatEventDate, formatEventTime, downloadIcs, openGoogleCalendar } from '@/lib/calendar';
import { roleLabel } from '@/types/domain';
import type {
  Announcement,
  ClubEvent,
  ClubFile,
  ClubMemberRole,
  ClubNote,
} from '@/types/domain';

/**
 * The cards that render club content wherever it appears — inside a club, on
 * the personal dashboard, in search results, and on the calendar. They take a
 * `clubName` so a dashboard row can always say which club an item came from.
 */

function relativeDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RoleBadge({
  role,
  position,
}: {
  role: ClubMemberRole;
  position?: string | null;
}) {
  if (role === 'member') return <Tag label="Member" tone="neutral" />;
  return <Tag label={roleLabel(role, position)} tone={role === 'president' ? 'brand' : 'info'} />;
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
  return (
    <Card elevation="ambient" className="p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
            {showClub && announcement.clubName ? announcement.clubName : 'Announcement'}
          </Text>
          <Text className="mt-1 text-base font-bold tracking-tight text-light-text dark:text-dark-text">
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
                className="h-8 w-8 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-2"
              >
                <Ionicons name="create-outline" size={15} color="#6B7280" />
              </PressableScale>
            ) : null}
            {onDelete ? (
              <PressableScale
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete announcement"
                scaleTo={0.9}
                className="h-8 w-8 items-center justify-center rounded-full bg-danger/12"
              >
                <Ionicons name="trash-outline" size={15} color="#E11D48" />
              </PressableScale>
            ) : null}
          </View>
        ) : null}
      </View>
      <Text className="mt-1.5 text-sm leading-6 text-light-secondary dark:text-dark-secondary">
        {announcement.body}
      </Text>
      <Text className="mt-2.5 text-2xs text-light-subtle dark:text-dark-subtle">
        {announcement.author ? `${announcement.author} · ` : ''}
        {relativeDate(announcement.date)}
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const EVENT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Meeting: 'people-outline',
  Competition: 'trophy-outline',
  Conference: 'business-outline',
  Workshop: 'construct-outline',
  Deadline: 'alarm-outline',
  Social: 'sparkles-outline',
};

export function EventCard({
  event,
  showClub = false,
  onEdit,
  onCancel,
  onDelete,
}: {
  event: ClubEvent;
  showClub?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const { isDark } = useTheme();
  const cancelled = event.status === 'cancelled';
  const icon = EVENT_ICON[event.eventType] ?? 'calendar-outline';

  return (
    <Card elevation="ambient" className="p-4">
      <View className="flex-row items-start gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-2xl ${
            cancelled ? 'bg-danger/12' : 'bg-python-blue/12'
          }`}
        >
          <Ionicons name={icon} size={18} color={cancelled ? '#E11D48' : '#1565C0'} />
        </View>
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Tag label={event.eventType} tone="info" />
            {cancelled ? <Tag label="Cancelled" tone="danger" /> : null}
            {showClub && event.clubName ? (
              <Text className="text-2xs font-semibold text-light-muted dark:text-dark-muted">
                {event.clubName}
              </Text>
            ) : null}
          </View>
          <Text
            className={`mt-1.5 text-base font-bold tracking-tight text-light-text dark:text-dark-text ${
              cancelled ? 'line-through' : ''
            }`}
          >
            {event.title}
          </Text>
          <View className="mt-1.5 gap-1">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={13} color={isDark ? '#8A8F99' : '#9CA3AF'} />
              <Text className="text-xs text-light-muted dark:text-dark-muted">
                {formatEventDate(event.startsAt)} · {formatEventTime(event)}
              </Text>
            </View>
            {event.location ? (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="location-outline" size={13} color={isDark ? '#8A8F99' : '#9CA3AF'} />
                <Text className="text-xs text-light-muted dark:text-dark-muted">
                  {event.location}
                </Text>
              </View>
            ) : null}
            {event.organizer ? (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="person-outline" size={13} color={isDark ? '#8A8F99' : '#9CA3AF'} />
                <Text className="text-xs text-light-muted dark:text-dark-muted">
                  {event.organizer}
                </Text>
              </View>
            ) : null}
          </View>
          {event.description ? (
            <Text className="mt-2 text-sm leading-6 text-light-secondary dark:text-dark-secondary">
              {event.description}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Add-to-calendar and management row */}
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        {!cancelled ? (
          <>
            <PressableScale
              onPress={() => void openGoogleCalendar(event)}
              accessibilityRole="button"
              accessibilityLabel="Add to Google Calendar"
              scaleTo={0.95}
              className="h-8 flex-row items-center gap-1.5 rounded-full bg-python-green/12 px-3"
            >
              <Ionicons name="logo-google" size={13} color="#4CAF50" />
              <Text className="text-2xs font-bold text-python-green-dark dark:text-python-green-light">
                Google Calendar
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => void downloadIcs([event], event.title)}
              accessibilityRole="button"
              accessibilityLabel="Add to Apple or device calendar"
              scaleTo={0.95}
              className="h-8 flex-row items-center gap-1.5 rounded-full border border-light-border px-3 dark:border-dark-border"
            >
              <Ionicons name="calendar-outline" size={13} color={isDark ? '#E5E7EB' : '#374151'} />
              <Text className="text-2xs font-bold text-light-secondary dark:text-dark-secondary">
                {Platform.OS === 'web' ? 'Download .ics' : 'Apple / other'}
              </Text>
            </PressableScale>
          </>
        ) : null}
        {onEdit ? (
          <PressableScale
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit event"
            scaleTo={0.95}
            className="h-8 flex-row items-center gap-1.5 rounded-full bg-light-surface-2 px-3 dark:bg-dark-surface-2"
          >
            <Ionicons name="create-outline" size={13} color="#6B7280" />
            <Text className="text-2xs font-bold text-light-secondary dark:text-dark-secondary">
              Edit
            </Text>
          </PressableScale>
        ) : null}
        {onCancel && !cancelled ? (
          <PressableScale
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel event"
            scaleTo={0.95}
            className="h-8 flex-row items-center gap-1.5 rounded-full bg-warn/14 px-3"
          >
            <Ionicons name="close-circle-outline" size={13} color="#D97706" />
            <Text className="text-2xs font-bold text-warn">Cancel</Text>
          </PressableScale>
        ) : null}
        {onDelete ? (
          <PressableScale
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete event"
            scaleTo={0.95}
            className="h-8 flex-row items-center gap-1.5 rounded-full bg-danger/12 px-3"
          >
            <Ionicons name="trash-outline" size={13} color="#E11D48" />
            <Text className="text-2xs font-bold text-danger">Delete</Text>
          </PressableScale>
        ) : null}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

function fileIcon(mime: string | null): keyof typeof Ionicons.glyphMap {
  if (!mime) return 'document-outline';
  if (mime.startsWith('image/')) return 'image-outline';
  if (mime.includes('pdf')) return 'document-text-outline';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'easel-outline';
  if (mime.includes('sheet') || mime.includes('excel')) return 'grid-outline';
  if (mime.includes('zip')) return 'archive-outline';
  return 'document-outline';
}

function fileSize(bytes: number | null): string {
  if (!bytes) return '';
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
    if (Platform.OS === 'web') window.open(file.fileUrl, '_blank', 'noopener');
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
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-python-blue/12">
          <Ionicons name={fileIcon(file.mimeType)} size={18} color="#1565C0" />
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-bold text-light-text dark:text-dark-text"
            numberOfLines={1}
          >
            {file.title}
          </Text>
          <Text className="mt-0.5 text-2xs text-light-muted dark:text-dark-muted" numberOfLines={1}>
            {[showClub ? file.clubName : file.folder, fileSize(file.sizeBytes), relativeDate(file.createdAt)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Ionicons name="open-outline" size={16} color={isDark ? '#8A8F99' : '#9CA3AF'} />
      </PressableScale>
      {onDelete ? (
        <PressableScale
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${file.title}`}
          scaleTo={0.9}
          className="h-8 w-8 items-center justify-center rounded-full bg-danger/12"
        >
          <Ionicons name="trash-outline" size={15} color="#E11D48" />
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
    <Card elevation="ambient" className="p-4">
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
                className="h-8 w-8 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-2"
              >
                <Ionicons name="create-outline" size={15} color="#6B7280" />
              </PressableScale>
            ) : null}
            {onDelete ? (
              <PressableScale
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
                scaleTo={0.9}
                className="h-8 w-8 items-center justify-center rounded-full bg-danger/12"
              >
                <Ionicons name="trash-outline" size={15} color="#E11D48" />
              </PressableScale>
            ) : null}
          </View>
        ) : null}
      </View>
      <Text className="mt-2 text-base font-bold tracking-tight text-light-text dark:text-dark-text">
        {note.title}
      </Text>
      <Text className="mt-1.5 text-sm leading-6 text-light-secondary dark:text-dark-secondary">
        {note.body}
      </Text>
      <Text className="mt-2.5 text-2xs text-light-subtle dark:text-dark-subtle">
        Updated {relativeDate(note.updatedAt)}
      </Text>
    </Card>
  );
}

export { relativeDate };
