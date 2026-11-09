import { useMemo, useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { relativeDate } from "@/components/ClubContentCards";
import { TextLink, useHover, webFade } from "@/components/system";
import { ClubHeading } from "./ClubHeading";
import { Button, Input } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { canvasAnnouncementUrl } from "@/lib/canvasAnnouncements";
import {
  downloadIcs,
  formatEventTime,
  openGoogleCalendar,
  schoolDayKey,
} from "@/lib/calendar";
import {
  BOARD_POSITIONS,
  type Announcement,
  type ClubEvent,
  type ClubFile,
  type ClubNote,
  type Membership,
  type Officer,
} from "@/types/domain";
import { surfaces } from "@/theme/tokens";
import { CLUB, ENTRY } from "./tokens";

/**
 * What goes inside each club tab. Every tab gets a shape that suits its
 * content: a feed, an agenda, an index, a set of notes, a masthead. The
 * shared cards in ClubContentCards keep serving the other pages.
 */

const PACIFIC = { timeZone: "America/Los_Angeles" } as const;

function useMutedInk() {
  const { isDark } = useTheme();
  return isDark ? surfaces.dark.muted : surfaces.light.muted;
}

export function ClubEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="py-3">
      <ClubHeading
        fontSize={ENTRY.standard}
        className="text-light-text dark:text-dark-text"
      >
        {title}
      </ClubHeading>
      <Text
        className="mt-1 text-base text-light-muted dark:text-dark-muted"
        style={{ maxWidth: CLUB.readingWidth }}
      >
        {description}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Announcements: a feed where the newest item carries the weight
// ---------------------------------------------------------------------------

export function usableAnnouncements(list: Announcement[]) {
  return list
    .filter((a) => canvasAnnouncementUrl(a.body))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

function AnnouncementEntry({
  item,
  latest,
  narrow,
}: {
  item: Announcement;
  latest: boolean;
  narrow: boolean;
}) {
  const { hovered, hoverProps } = useHover();
  const muted = useMutedInk();
  const url = canvasAnnouncementUrl(item.body)!;
  const date = (
    <Text
      className={`text-sm ${latest ? "font-bold text-python-blue dark:text-python-blue-light" : "text-light-muted dark:text-dark-muted"}`}
      style={
        narrow ? undefined : { width: CLUB.dateColumn + 24, paddingTop: 4 }
      }
    >
      {relativeDate(item.date)}
    </Text>
  );
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`${item.title}. Open in Canvas`}
      className={`border-b border-light-border py-4 dark:border-dark-border ${narrow ? "" : "flex-row"}`}
    >
      {date}
      <View
        className="flex-1 flex-row items-start gap-4"
        style={{ minWidth: 0 }}
      >
        <View className="flex-1" style={{ minWidth: 0 }}>
          <ClubHeading
            fontSize={latest ? ENTRY.lead : ENTRY.small}
            className={
              hovered
                ? "text-python-blue"
                : "text-light-text dark:text-dark-text"
            }
            style={webFade("color")}
          >
            {item.title}
          </ClubHeading>
          <Text className="mt-0.5 text-sm text-light-muted dark:text-dark-muted">
            {item.author ? `${item.author}, on Canvas` : "On Canvas"}
          </Text>
        </View>
        <View
          className="pt-1.5"
          style={[
            { transform: [{ translateX: hovered ? 3 : 0 }] },
            webFade("transform"),
          ]}
        >
          <Ionicons name="open-outline" size={17} color={muted} />
        </View>
      </View>
    </Pressable>
  );
}

export function ClubAnnouncements({
  items,
  narrow,
}: {
  items: Announcement[];
  narrow: boolean;
}) {
  if (items.length === 0)
    return (
      <ClubEmpty
        title="No Canvas links yet"
        description="Links to this club's Canvas announcements will appear here."
      />
    );
  return (
    <View>
      {items.map((item, index) => (
        <AnnouncementEntry
          key={item.id}
          item={item}
          latest={index === 0}
          narrow={narrow}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Events: an agenda by month, with the next one set apart
// ---------------------------------------------------------------------------

function untilLabel(event: ClubEvent) {
  const at = (key: string) => Date.parse(`${key}T12:00:00Z`);
  const days = Math.round(
    (at(schoolDayKey(event.startsAt)) -
      at(schoolDayKey(new Date().toISOString()))) /
      86400000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function AgendaRow({
  event,
  next,
  faded,
  sameDay,
  clubName,
}: {
  event: ClubEvent;
  next?: boolean;
  faded?: boolean;
  /** The row above already shows this date. */
  sameDay?: boolean;
  clubName: string;
}) {
  const [picking, setPicking] = useState(false);
  const cancelled = event.status === "cancelled";
  const start = new Date(event.startsAt);
  const when = event.dateOnly ? "All day" : formatEventTime(event);
  const withClub = { ...event, clubName };
  return (
    <View className="flex-row gap-4 border-b border-light-border py-4 dark:border-dark-border">
      <View style={{ width: CLUB.dateColumn }}>
        {sameDay ? null : (
          <>
            <ClubHeading
              fontSize={next ? 26 : 22}
              className={
                next
                  ? "text-python-blue"
                  : faded
                    ? "text-light-muted dark:text-dark-muted"
                    : "text-light-text dark:text-dark-text"
              }
            >
              {start.toLocaleDateString("en-US", {
                day: "numeric",
                ...PACIFIC,
              })}
            </ClubHeading>
            <Text className="text-sm font-bold text-light-muted dark:text-dark-muted">
              {start.toLocaleDateString("en-US", {
                weekday: "short",
                ...PACIFIC,
              })}
            </Text>
          </>
        )}
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <View className="flex-row flex-wrap items-center gap-x-2.5">
          {next ? (
            <Text className="text-sm font-bold text-python-blue dark:text-python-blue-light">
              {untilLabel(event)}
            </Text>
          ) : null}
          <Text
            className={`text-sm ${event.eventType === "Deadline" ? "font-bold text-light-text dark:text-dark-text" : "text-light-muted dark:text-dark-muted"}`}
          >
            {event.eventType}
          </Text>
          {cancelled ? (
            <Text className="text-sm font-bold text-danger">Cancelled</Text>
          ) : null}
        </View>
        <ClubHeading
          fontSize={next ? ENTRY.lead : ENTRY.standard}
          className={`${faded ? "text-light-muted dark:text-dark-muted" : "text-light-text dark:text-dark-text"} ${cancelled ? "line-through" : ""}`}
        >
          {event.title}
        </ClubHeading>
        <Text className="mt-0.5 text-base text-light-secondary dark:text-dark-secondary">
          {[when, event.location, event.organizer].filter(Boolean).join(", ")}
        </Text>
        {event.description ? (
          <Text
            className="mt-1.5 text-base leading-6 text-light-muted dark:text-dark-muted"
            style={{ maxWidth: CLUB.readingWidth }}
          >
            {event.description}
          </Text>
        ) : null}
        {!cancelled && !faded && !next && !picking ? (
          <View className="items-start">
            <TextLink
              label="Add to calendar"
              onPress={() => setPicking(true)}
            />
          </View>
        ) : null}
        {!cancelled && !faded && (next || picking) ? (
          <View className="flex-row flex-wrap items-center gap-x-5">
            <TextLink
              label="Add to Google Calendar"
              onPress={() => void openGoogleCalendar(withClub)}
            />
            <TextLink
              label={Platform.OS === "web" ? "Download .ics" : "Apple or other"}
              accessibilityLabel="Add to Apple or device calendar"
              onPress={() => void downloadIcs([withClub], event.title)}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const MonthHeading = ({ children }: { children: ReactNode }) => (
  <Text
    accessibilityRole="header"
    className="mt-5 border-b border-light-border-strong pb-1.5 text-sm font-bold text-light-text dark:border-dark-border-strong dark:text-dark-text"
  >
    {children}
  </Text>
);

export function ClubEvents({
  events,
  clubName,
}: {
  events: ClubEvent[];
  clubName: string;
}) {
  const [showPast, setShowPast] = useState(false);
  const { upcoming, past } = useMemo(() => {
    const isUpcoming = (e: ClubEvent) =>
      e.status === "scheduled" &&
      new Date(e.startsAt).getTime() > Date.now() - 2 * 3600 * 1000;
    return {
      upcoming: events
        .filter(isUpcoming)
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
      past: events
        .filter((e) => !isUpcoming(e))
        .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)),
    };
  }, [events]);

  if (events.length === 0)
    return (
      <ClubEmpty
        title="Nothing scheduled"
        description="Meetings, competitions, and deadlines will show up here."
      />
    );

  const months: { label: string; items: ClubEvent[] }[] = [];
  for (const event of upcoming) {
    const label = new Date(event.startsAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      ...PACIFIC,
    });
    const last = months[months.length - 1];
    if (last?.label === label) last.items.push(event);
    else months.push({ label, items: [event] });
  }

  return (
    <View>
      {upcoming.length > 0 ? (
        <View className="items-end" style={{ marginBottom: -16 }}>
          <TextLink
            label="Add all upcoming to calendar"
            onPress={() =>
              void downloadIcs(
                upcoming.map((e) => ({ ...e, clubName })),
                `${clubName} events`,
              )
            }
          />
        </View>
      ) : (
        <Text className="py-2 text-base text-light-muted dark:text-dark-muted">
          Nothing coming up right now.
        </Text>
      )}
      {months.map((month) => (
        <View key={month.label}>
          <MonthHeading>{month.label}</MonthHeading>
          {month.items.map((event, index) => (
            <AgendaRow
              key={event.id}
              event={event}
              next={event.id === upcoming[0].id}
              sameDay={
                index > 0 &&
                schoolDayKey(month.items[index - 1].startsAt) ===
                  schoolDayKey(event.startsAt)
              }
              clubName={clubName}
            />
          ))}
        </View>
      ))}
      {past.length > 0 ? (
        <View className="mt-4 items-start">
          <TextLink
            label={`${showPast ? "Hide" : "Show"} past and cancelled (${past.length})`}
            onPress={() => setShowPast((v) => !v)}
          />
        </View>
      ) : null}
      {showPast
        ? past.map((event) => (
            <AgendaRow key={event.id} event={event} faded clubName={clubName} />
          ))
        : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Files: an index, read by name and kind
// ---------------------------------------------------------------------------

function fileKind(file: ClubFile) {
  const mime = file.mimeType ?? "";
  if (mime.startsWith("image/")) return "Image";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("presentation") || mime.includes("powerpoint"))
    return "Slides";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return "Sheet";
  if (mime.includes("zip")) return "Archive";
  if (mime.includes("word") || mime.includes("document")) return "Doc";
  return "File";
}

function fileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileEntry({ file, narrow }: { file: ClubFile; narrow: boolean }) {
  const { hovered, hoverProps } = useHover();
  const muted = useMutedInk();
  const open = () => {
    if (Platform.OS === "web") window.open(file.fileUrl, "_blank", "noopener");
    else void Linking.openURL(file.fileUrl);
  };
  const size = fileSize(file.sizeBytes);
  const added = relativeDate(file.createdAt);
  return (
    <Pressable
      onPress={open}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`Open ${file.title}`}
      className="min-h-14 flex-row items-center gap-4 border-b border-light-hairline py-2.5 dark:border-dark-hairline"
    >
      <Text
        className="text-sm font-bold text-light-muted dark:text-dark-muted"
        style={{ width: 52 }}
      >
        {fileKind(file)}
      </Text>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text
          numberOfLines={1}
          className={`text-base font-bold ${hovered ? "text-python-blue dark:text-python-blue-light" : "text-light-text dark:text-dark-text"}`}
          style={webFade("color")}
        >
          {file.title}
        </Text>
        {file.description ? (
          <Text
            numberOfLines={1}
            className="text-sm text-light-muted dark:text-dark-muted"
          >
            {file.description}
          </Text>
        ) : null}
        {narrow ? (
          <Text className="text-sm text-light-muted dark:text-dark-muted">
            {[size, added].filter(Boolean).join(", ")}
          </Text>
        ) : null}
      </View>
      {!narrow ? (
        <>
          <Text
            className="text-right text-sm text-light-muted dark:text-dark-muted"
            style={{ width: 72 }}
          >
            {size}
          </Text>
          <Text
            className="text-right text-sm text-light-muted dark:text-dark-muted"
            style={{ width: 96 }}
          >
            {added}
          </Text>
        </>
      ) : null}
      <View
        style={[
          { transform: [{ translateX: hovered ? 3 : 0 }] },
          webFade("transform"),
        ]}
      >
        <Ionicons name="open-outline" size={16} color={muted} />
      </View>
    </Pressable>
  );
}

export function ClubFiles({
  files,
  narrow,
}: {
  files: ClubFile[];
  narrow: boolean;
}) {
  if (files.length === 0)
    return (
      <ClubEmpty
        title="No files yet"
        description="Handouts, forms, slides, and competition materials show up here."
      />
    );
  const folders = [...new Set(files.map((f) => f.folder))];
  return (
    <View>
      {folders.map((folder) => {
        const inFolder = files.filter((f) => f.folder === folder);
        return (
          <View key={folder} className="mb-6">
            <View className="flex-row items-baseline justify-between border-b border-light-border-strong pb-1 dark:border-dark-border-strong">
              <ClubHeading
                fontSize={ENTRY.small}
                accessibilityRole="header"
                className="text-light-text dark:text-dark-text"
              >
                {folder}
              </ClubHeading>
              <Text className="text-sm text-light-muted dark:text-dark-muted">
                {inFolder.length} {inFolder.length === 1 ? "file" : "files"}
              </Text>
            </View>
            {inFolder.map((file) => (
              <FileEntry key={file.id} file={file} narrow={narrow} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notes: readable text with its category in the margin
// ---------------------------------------------------------------------------

const LONG_NOTE = 420;

function NoteEntry({ note, narrow }: { note: ClubNote; narrow: boolean }) {
  const [open, setOpen] = useState(false);
  const long = note.body.length > LONG_NOTE;
  return (
    <View
      className={`border-b border-light-border py-5 dark:border-dark-border ${narrow ? "" : "flex-row gap-4"}`}
    >
      <View
        style={narrow ? { marginBottom: 4 } : { width: CLUB.dateColumn + 28 }}
      >
        {note.pinned ? (
          <Text className="text-sm font-bold text-python-blue dark:text-python-blue-light">
            Pinned
          </Text>
        ) : null}
        <Text className="text-sm text-light-muted dark:text-dark-muted">
          {note.category}
        </Text>
      </View>
      <View
        className="flex-1"
        style={{ minWidth: 0, maxWidth: CLUB.readingWidth }}
      >
        <ClubHeading
          fontSize={ENTRY.standard}
          className="text-light-text dark:text-dark-text"
        >
          {note.title}
        </ClubHeading>
        <Text
          numberOfLines={long && !open ? 6 : undefined}
          className="mt-1 text-base leading-[25px] text-light-secondary dark:text-dark-secondary"
        >
          {note.body}
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-4">
          <Text className="py-2 text-sm text-light-muted dark:text-dark-muted">
            Updated {relativeDate(note.updatedAt)}
          </Text>
          {long ? (
            <TextLink
              label={open ? "Show less" : "Read all"}
              onPress={() => setOpen((v) => !v)}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function ClubNotes({
  notes,
  narrow,
}: {
  notes: ClubNote[];
  narrow: boolean;
}) {
  if (notes.length === 0)
    return (
      <ClubEmpty
        title="No notes yet"
        description="Meeting notes, instructions, and useful links live here."
      />
    );
  const ordered = [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned),
  );
  return (
    <View>
      {ordered.map((note) => (
        <NoteEntry key={note.id} note={note} narrow={narrow} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Leadership: the president first, the board beneath
// ---------------------------------------------------------------------------

function Officers({
  officers,
  narrow,
}: {
  officers: Officer[];
  narrow: boolean;
}) {
  const leadIndex = Math.max(
    officers.findIndex(
      (o) => /president/i.test(o.role) && !/vice/i.test(o.role),
    ),
    0,
  );
  const lead = officers[leadIndex];
  const board = officers.filter((_, index) => index !== leadIndex);
  return (
    <View>
      <View className="border-b border-light-border-strong pb-4 dark:border-dark-border-strong">
        <Text className="text-sm font-bold text-python-blue dark:text-python-blue-light">
          {lead.role}
        </Text>
        <ClubHeading
          fontSize={24}
          className="text-light-text dark:text-dark-text"
        >
          {lead.name}
        </ClubHeading>
      </View>
      <View className="flex-row flex-wrap">
        {board.map((officer, index) => (
          <View
            key={`${officer.userId ?? officer.name}-${index}`}
            className="border-b border-light-border py-3 pr-4 dark:border-dark-border"
            style={{ width: narrow ? "100%" : "50%" }}
          >
            <Text className="text-sm text-light-muted dark:text-dark-muted">
              {officer.role}
            </Text>
            <ClubHeading
              fontSize={ENTRY.standard}
              className="text-light-text dark:text-dark-text"
            >
              {officer.name}
            </ClubHeading>
          </View>
        ))}
      </View>
    </View>
  );
}

function PositionOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      aria-pressed={selected}
      className={`h-10 justify-center rounded-[3px] border px-3 ${
        selected
          ? "border-python-blue bg-python-blue"
          : hovered
            ? "border-light-text dark:border-dark-border-strong"
            : "border-light-border dark:border-dark-border"
      }`}
      style={webFade("background-color, border-color")}
    >
      <Text
        className={`text-sm font-bold ${selected ? "text-white" : "text-light-secondary dark:text-dark-secondary"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ClubLeadership({
  officers,
  narrow,
  signedIn,
  hasPresident,
  membership,
  busy,
  onRequestBoard,
  onClaim,
}: {
  officers: Officer[];
  narrow: boolean;
  signedIn: boolean;
  hasPresident: boolean;
  membership?: Membership | null;
  busy: boolean;
  onRequestBoard: (position: string, message: string) => Promise<boolean>;
  onClaim: (message: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<string>(BOARD_POSITIONS[0]);
  const [message, setMessage] = useState("");

  const submit = async () => {
    const sent = hasPresident
      ? await onRequestBoard(position, message)
      : await onClaim(message);
    if (sent) {
      setOpen(false);
      setMessage("");
    }
  };

  let request: ReactNode = null;
  if (signedIn) {
    if (open) {
      request = (
        <View style={{ maxWidth: CLUB.readingWidth }}>
          <ClubHeading fontSize={ENTRY.standard} accessibilityRole="header">
            {hasPresident ? "Request board access" : "Claim this club"}
          </ClubHeading>
          <Text className="mt-1 text-base text-light-muted dark:text-dark-muted">
            {hasPresident
              ? "Pick your position. The president decides what you can manage."
              : "The school admin verifies club presidents before granting access."}
          </Text>
          {hasPresident ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {BOARD_POSITIONS.map((option) => (
                <PositionOption
                  key={option}
                  label={option}
                  selected={position === option}
                  onPress={() => setPosition(option)}
                />
              ))}
            </View>
          ) : null}
          <View className="mt-3">
            <Input
              label="Message"
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Tell them who you are and what you do for the club"
            />
          </View>
          <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
            <Button
              label="Send request"
              loading={busy}
              onPress={() => void submit()}
            />
            <TextLink
              label="Cancel"
              onPress={() => setOpen(false)}
              disabled={busy}
            />
          </View>
        </View>
      );
    } else if (membership?.boardStatus === "pending") {
      request = (
        <Text className="text-base font-bold text-warn">
          Your board request is waiting for the president.
        </Text>
      );
    } else if (membership?.role !== "president") {
      request = (
        <View className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Text
            className="flex-1 text-base text-light-secondary dark:text-dark-secondary"
            style={{ minWidth: 220 }}
          >
            {hasPresident
              ? "On this club's board? Ask the president for access to its tools."
              : "Nobody has claimed this club yet. If you run it, tell the school admin."}
          </Text>
          <Button
            label={hasPresident ? "I'm on the board" : "I run this club"}
            variant="outline"
            onPress={() => setOpen(true)}
          />
        </View>
      );
    }
  }

  return (
    <View>
      {officers.length === 0 ? (
        <ClubEmpty
          title="No leadership listed"
          description="Once a president claims this club, its board appears here."
        />
      ) : (
        <Officers officers={officers} narrow={narrow} />
      )}
      {request ? <View className="mt-8">{request}</View> : null}
    </View>
  );
}
