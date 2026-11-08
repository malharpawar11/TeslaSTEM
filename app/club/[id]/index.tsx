import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { View, Share, Platform, Linking, Pressable, ScrollView } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { ClubReviews } from "@/components/ClubReviews";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  MetaRow,
  PressableScale,
  SkeletonRow,
  Tag,
} from "@/components/ui";
import {
  AnnouncementCard,
  EventCard,
  FileRow,
  NoteCard,
} from "@/components/ClubContentCards";
import { Display, TextLink, TextTabs, Glyph } from "@/components/system";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLayout } from "@/theme/layout";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  fetchClubAnnouncements,
  fetchClubEvents,
  fetchClubFiles,
  fetchClubNotes,
} from "@/data/contentRepo";
import { fetchClubOfficers } from "@/data/clubsRepo";
import {
  fetchClubAccess,
  requestBoardRole,
  claimClub,
} from "@/data/membershipRepo";
import { downloadIcs } from "@/lib/calendar";
import {
  BOARD_POSITIONS,
  NO_ACCESS,
  type Announcement,
  type ClubAccess,
  type ClubEvent,
  type ClubFile,
  type ClubNote,
  type NotificationPrefs,
  type Officer,
} from "@/types/domain";
import { semantic } from "@/theme/tokens";
import { useCampusUpdates } from "@/context/CampusUpdatesContext";

/**
 * A club's public profile and, once a student joins, its member area.
 *
 * Which tabs appear is decided by `my_club_access`, the same SQL function the
 * RLS policies consult, so the UI can never offer something the database will
 * refuse. Files and notes are member-only in Postgres too: a non-member who
 * calls the API directly gets an empty result, not the data with a hidden UI.
 */

type Tab =
  | "About"
  | "Announcements"
  | "Events"
  | "Files"
  | "Notes"
  | "Leadership";

const PUBLIC_TABS: Tab[] = ["About", "Announcements", "Events", "Leadership"];
const MEMBER_TABS: Tab[] = [
  "About",
  "Announcements",
  "Events",
  "Files",
  "Notes",
  "Leadership",
];

/** Per-club notification switches, shown to members inside the club. */
function NotificationSwitches({ clubId }: { clubId: string }) {
  const { prefsFor, savePrefs } = useNotifications();
  const { toast } = useToast();
  const prefs = prefsFor(clubId);

  const toggle = async (key: keyof NotificationPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    const res = await savePrefs(clubId, next);
    if (!res.ok) toast(res.error ?? "Could not save that preference.", "error");
  };

  const ROWS: {
    key: keyof NotificationPrefs;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "events", label: "Events", icon: "calendar-outline" },
    { key: "files", label: "New files", icon: "document-outline" },
    { key: "notes", label: "Notes & resources", icon: "reader-outline" },
  ];

  return (
    <View className="mt-2">
      {ROWS.map((row, i) => (
        <PressableScale
          key={row.key}
          onPress={() => void toggle(row.key)}
          accessibilityRole="switch"
          aria-checked={prefs[row.key]}
          accessibilityLabel={`${row.label} notifications`}
          scaleTo={0.99}
          className={`flex-row items-center gap-3 py-3 ${
            i === ROWS.length - 1
              ? ""
              : "border-b border-light-hairline dark:border-dark-border"
          }`}
        >
          <Glyph name={row.icon} size={16} tone="secondary" />
          <Text className="flex-1 text-sm font-medium text-light-text dark:text-dark-text">
            {row.label}
          </Text>
          <View
            className={`h-6 w-10 justify-center rounded-full px-0.5 ${
              prefs[row.key]
                ? "bg-python-green"
                : "bg-light-border-strong dark:bg-dark-border-strong"
            }`}
          >
            <View
              className={`h-5 w-5 rounded-full bg-white ${
                prefs[row.key] ? "self-end" : "self-start"
              }`}
            />
          </View>
        </PressableScale>
      ))}
    </View>
  );
}

function Fact({
  label,
  value,
  onPress,
  half,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  /** Sit two to a row on phones so About isn't pushed off the first screen. */
  half?: boolean;
}) {
  const width = half ? ({ width: "50%" } as const) : undefined;
  const content = (
    <>
      <Text className="text-sm text-light-muted dark:text-dark-muted">
        {label}
      </Text>
      <Text
        className={`text-lg text-light-text dark:text-dark-text ${onPress ? "underline" : ""}`}
      >
        {value}
      </Text>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="link" className="w-full py-2">
      {content}
    </Pressable>
  ) : (
    <View className="py-2" style={width ?? { width: "100%" }}>{content}</View>
  );
}

export default function ClubProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubId = String(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getClub, refresh: refreshClubs } = useClubs();
  const {
    isMember,
    membershipFor,
    join,
    leave,
    refresh: refreshMemberships,
  } = useMemberships();
  const { isDark } = useTheme();
  const { isWide, isDesktop, contentWidth, gutter } = useLayout();
  const { session } = useAuth();
  const { toast, toastResult } = useToast();

  const [tab, setTab] = useState<Tab>("About");
  const [access, setAccess] = useState<ClubAccess>(NO_ACCESS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [files, setFiles] = useState<ClubFile[]>([]);
  const [notes, setNotes] = useState<ClubNote[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGeneration = useRef(0);
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Leadership request composer.
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestPosition, setRequestPosition] = useState<string>(
    BOARD_POSITIONS[0],
  );
  const [requestMessage, setRequestMessage] = useState("");

  const club = getClub(clubId);
  const membership = membershipFor(clubId);
  const joined = isMember(clubId);

  const load = useCallback(async () => {
    if (!clubId) return;
    const generation = ++loadGeneration.current;
    try {
      const [nextAccess, nextAnnouncements, nextEvents, nextOfficers] =
        await Promise.all([
          session ? fetchClubAccess(clubId) : Promise.resolve(NO_ACCESS),
          fetchClubAnnouncements(clubId),
          fetchClubEvents(clubId, true),
          fetchClubOfficers(clubId),
        ]);
      if (generation !== loadGeneration.current) return;
      setAccess(nextAccess);
      setAnnouncements(nextAnnouncements);
      setEvents(nextEvents);
      setOfficers(nextOfficers);
      // Member-only content is only requested once the server says we're a
      // member, so a visitor never fires a query that can only come back empty.
      if (nextAccess.isMember) {
        const [nextFiles, nextNotes] = await Promise.all([
          fetchClubFiles(clubId),
          fetchClubNotes(clubId),
        ]);
        if (generation !== loadGeneration.current) return;
        setFiles(nextFiles);
        setNotes(nextNotes);
      } else {
        setFiles([]);
        setNotes([]);
      }
      if (generation === loadGeneration.current) setLoadError(null);
    } catch (failure) {
      if (generation === loadGeneration.current)
        setLoadError(
          failure instanceof Error
            ? failure.message
            : "Could not load club details.",
        );
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [clubId, session]);

  useEffect(() => {
    ++loadGeneration.current;
    setAccess(NO_ACCESS);
    setFiles([]);
    setNotes([]);
    setLoading(true);
  }, [clubId, session?.user.id]);

  const { clubs: clubUpdates, reconnected } = useCampusUpdates();
  const contentVersion = clubUpdates[clubId] ?? 0;
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        ++loadGeneration.current;
      };
    }, [load, contentVersion, reconnected]),
  );

  const tabs = useMemo(
    () => (access.isMember ? MEMBER_TABS : PUBLIC_TABS),
    [access.isMember],
  );

  useEffect(() => {
    if (!tabs.includes(tab)) setTab("About");
  }, [tabs, tab]);

  const handleJoin = useCallback(async () => {
    setBusy(true);
    const res = await join(clubId);
    setBusy(false);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    toast(
      res.status === "pending"
        ? "Request sent: a club leader will review it."
        : `Joined ${club?.name ?? "the club"}`,
    );
    await Promise.all([load(), refreshClubs()]);
  }, [join, clubId, toast, club, load, refreshClubs]);

  const handleLeave = useCallback(async () => {
    setBusy(true);
    const res = await leave(clubId);
    setBusy(false);
    setLeaveOpen(false);
    if (!res.ok) {
      toast(res.error ?? "Could not leave the club.", "error");
      return;
    }
    toast(`Left ${club?.name ?? "the club"}`, "info");
    await Promise.all([load(), refreshClubs()]);
  }, [leave, clubId, toast, club, load, refreshClubs]);

  const submitBoardRequest = useCallback(async () => {
    setBusy(true);
    const res = await requestBoardRole(clubId, requestPosition, requestMessage);
    setBusy(false);
    if (toastResult(res, "Request sent to the club president.")) {
      setRequestOpen(false);
      setRequestMessage("");
      await Promise.all([load(), refreshMemberships()]);
    }
  }, [
    clubId,
    requestPosition,
    requestMessage,
    toastResult,
    load,
    refreshMemberships,
  ]);

  const submitClubClaim = useCallback(async () => {
    setBusy(true);
    const res = await claimClub(clubId, "President", requestMessage);
    setBusy(false);
    if (toastResult(res, "Claim submitted: the school admin will review it.")) {
      setRequestOpen(false);
      setRequestMessage("");
    }
  }, [clubId, requestMessage, toastResult]);

  if (!club) {
    return (
      <View className="flex-1 items-center justify-center bg-light-bg dark:bg-dark-bg">
        <EmptyState
          icon="alert-circle-outline"
          title="Club not found"
          description="This club may have moved or been removed."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const handleShare = async () => {
    try {
      if (Platform.OS === "web") return;
      await Share.share({
        message: `Check out ${club.name} at Tesla STEM: ${club.description}`,
        title: club.name,
      });
    } catch {
      // The user dismissed the share sheet.
    }
  };

  const upcoming = events.filter(
    (e) =>
      e.status === "scheduled" &&
      new Date(e.startsAt).getTime() > Date.now() - 2 * 3600 * 1000,
  );
  const past = events.filter((e) => !upcoming.includes(e));
  const folders = [...new Set(files.map((f) => f.folder))];

  const joinButton = (
    <>
      {!session ? (
        <Button
          size="xl"
          fullWidth
          icon="log-in-outline"
          label="Sign in to join"
          onPress={() => router.push("/account")}
        />
      ) : membership?.status === "pending" ? (
        <Button
          size="xl"
          fullWidth
          variant="secondary"
          icon="hourglass-outline"
          label="Waiting for approval"
          onPress={() => setLeaveOpen(true)}
        />
      ) : joined ? (
        <Button
          size="xl"
          fullWidth
          variant="outline"
          icon="checkmark"
          label="Joined"
          loading={busy}
          onPress={() => setLeaveOpen(true)}
          accessibilityLabel="Leave club"
        />
      ) : (
        <Button
          size="xl"
          fullWidth
          icon="add"
          label={club.joinPolicy === "approval" ? "Request to join" : "Join club"}
          loading={busy}
          onPress={() => void handleJoin()}
        />
      )}
    </>
  );

  const fg = isDark ? "#FFFFFF" : "#000000";
  const longest = Math.max(...club.name.split(" ").map((w) => w.length), 8);
  const fitted = (contentWidth - gutter * 2) / (longest * 0.5);
  const titleSize = Math.max(52, Math.min(fitted, contentWidth * 0.12, 168));
  const showShare = Platform.OS !== "web";
  const contacts = (
    <>
      {club.contactEmail ? (
        <Fact label="Email" value={club.contactEmail} onPress={() => Linking.openURL(`mailto:${club.contactEmail}`)} />
      ) : null}
      {club.instagram ? (
        <Fact
          label="Instagram"
          value={club.instagram}
          onPress={() => {
            const handle = club.instagram!.replace(/^@/, "");
            Linking.openURL(`https://instagram.com/${handle}`);
          }}
        />
      ) : null}
      {club.website ? (
        <Fact label="Website" value={club.website} onPress={() => Linking.openURL(club.website!)} />
      ) : null}
    </>
  );

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isWide ? 64 : insets.bottom + 112 }}
      >
        <View
          className="border-b-2 border-python-blue"
          style={{ paddingTop: insets.top + 16, paddingHorizontal: gutter, paddingBottom: 32 }}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/browse"))}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="min-h-11 flex-row items-center gap-1.5"
            >
              <Ionicons name="arrow-back" size={20} color={fg} />
              <Text className="text-base font-bold" style={{ color: fg }}>
                Clubs
              </Text>
            </Pressable>
            {!isDesktop ? <ThemeToggle /> : null}
          </View>
          <Text className="mt-8 text-lg font-bold text-python-blue dark:text-python-blue-light">
            {club.category}
          </Text>
          <Text
            accessibilityRole="header"
            className="font-display"
            style={{ color: fg, fontSize: titleSize, lineHeight: titleSize * 0.94 }}
          >
            {club.name}
          </Text>
        </View>

        {loadError ? (
          <View className="items-start gap-2 py-4" style={{ paddingHorizontal: gutter }}>
            <Text className="text-danger">{loadError}</Text>
            <Button label="Retry" onPress={() => void load()} />
          </View>
        ) : null}

        <View
          className={`w-full self-center pt-8 ${isWide ? "flex-row-reverse items-start gap-16" : ""}`}
          style={{ paddingHorizontal: gutter, maxWidth: 1500 }}
        >
          <View style={isWide ? { width: 320 } : undefined} className={isWide ? "" : "mb-8"}>
            <Text className="text-sm text-light-muted dark:text-dark-muted">Meets</Text>
            <Display size="lg">{club.day}</Display>
            <Text className="text-lg text-light-text dark:text-dark-text">{club.time}</Text>
            <View className="mt-3 flex-row flex-wrap border-t border-light-border pt-1 dark:border-dark-border">
              <Fact half={!isWide} label="Room" value={club.location === "TBD" ? "Not listed yet" : club.location} />
              <Fact half={!isWide} label="Advisor" value={club.advisor} />
              <Fact
                half={!isWide}
                label="Members"
                value={club.memberCount === 0 ? "None yet" : `${club.memberCount} member${club.memberCount === 1 ? "" : "s"}`}
              />
              <Fact
                half={!isWide}
                label="Joining"
                value={club.joinPolicy === "approval" ? "Leader approves" : "Open to all"}
              />
              {contacts}
            </View>
            {isWide ? <View className="mt-4">{joinButton}</View> : null}
            <View className="mt-2 flex-row flex-wrap items-center gap-x-4">
              {membership?.status === "pending" ? (
                <Tag label="Approval pending" tone="warn" />
              ) : null}
              {membership?.role === "president" ? (
                <Tag label="You're the president" tone="brand" />
              ) : null}
              {membership?.role === "board" ? (
                <Tag label={membership.position ?? "Board member"} tone="info" />
              ) : null}
              {membership?.boardStatus === "pending" ? (
                <Tag label="Board request pending" tone="warn" />
              ) : null}
              {access.permissions.length > 0 ? (
                <TextLink
                  label="Manage club"
                  icon="settings-outline"
                  onPress={() => router.push(`/club/${clubId}/manage`)}
                />
              ) : null}
            </View>
          </View>

          <View className="flex-1" style={{ minWidth: 0 }}>
            <View className="mb-6 border-b border-light-border dark:border-dark-border">
              <TextTabs label="Club sections" options={tabs} value={tab} onChange={setTab} />
            </View>
          {loading ? (
            <SkeletonRow count={3} />
          ) : tab === "About" ? (
            <Animated.View entering={FadeIn.duration(240)}>
              <Text
                className="max-w-3xl text-light-text dark:text-dark-text"
                style={{ fontSize: contentWidth < 640 ? 20 : 26, lineHeight: contentWidth < 640 ? 28 : 36 }}
              >
                {club.description}
              </Text>
              <ClubReviews clubId={clubId} isMember={joined} />

              {joined ? (
                <View className="mt-10 max-w-xl">
                  <Display size="sm">Tell me about</Display>
                  <NotificationSwitches clubId={clubId} />
                </View>
              ) : null}
            </Animated.View>
          ) : tab === "Announcements" ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {announcements.length === 0 ? (
                <EmptyState
                  icon="megaphone-outline"
                  title="No Canvas links yet"
                  description="Links to this club’s Canvas announcements will appear here."
                  tone="neutral"
                />
              ) : (
                <View>
                  {announcements.map((a, i) => (
                    <Animated.View key={a.id} entering={FadeIn.duration(180)}>
                      <AnnouncementCard announcement={a} />
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          ) : tab === "Events" ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {events.length === 0 ? (
                <EmptyState
                  icon="calendar-outline"
                  title="Nothing scheduled"
                  description="Meetings, competitions, and deadlines will show up here."
                  tone="neutral"
                />
              ) : (
                <View>
                  {upcoming.length > 0 ? (
                    <Button
                      label="Add all upcoming to calendar"
                      variant="secondary"
                      size="sm"
                      icon="download-outline"
                      fullWidth
                      onPress={() =>
                        void downloadIcs(
                          upcoming.map((e) => ({ ...e, clubName: club.name })),
                          `${club.name} events`,
                        )
                      }
                    />
                  ) : null}
                  {upcoming.map((event) => (
                    <EventCard
                      key={event.id}
                      event={{ ...event, clubName: club.name }}
                    />
                  ))}
                  {past.length > 0 ? (
                    <>
                      <Text className="mt-3 text-sm font-bold text-light-muted dark:text-dark-muted">
                        Past & cancelled
                      </Text>
                      {past.map((event) => (
                        <EventCard
                          key={event.id}
                          event={{ ...event, clubName: club.name }}
                        />
                      ))}
                    </>
                  ) : null}
                </View>
              )}
            </Animated.View>
          ) : tab === "Files" ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {files.length === 0 ? (
                <EmptyState
                  icon="folder-open-outline"
                  title="No files yet"
                  description="Handouts, forms, slides, and competition materials show up here."
                  tone="neutral"
                />
              ) : (
                <View className="gap-2.5">
                  {folders.map((folder) => (
                    <View key={folder} className="gap-2.5">
                      <Text className="mt-2 text-sm font-bold text-light-muted dark:text-dark-muted">
                        {folder}
                      </Text>
                      {files
                        .filter((f) => f.folder === folder)
                        .map((file) => (
                          <FileRow key={file.id} file={file} />
                        ))}
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          ) : tab === "Notes" ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {notes.length === 0 ? (
                <EmptyState
                  icon="reader-outline"
                  title="No notes yet"
                  description="Meeting notes, instructions, and useful links live here."
                  tone="neutral"
                />
              ) : (
                <View className="gap-3">
                  {notes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </View>
              )}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(240)}>
              {officers.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="No leadership listed"
                  description="Once a president claims this club, its board appears here."
                  tone="neutral"
                />
              ) : (
                <View>
                  {officers.map((o, i) => (
                    <View
                      key={`${o.userId ?? o.name}-${i}`}
                      className="flex-row flex-wrap items-baseline justify-between gap-x-6 border-b border-light-border py-3 dark:border-dark-border"
                    >
                      <Display size="md" className="shrink text-light-text dark:text-dark-text">
                        {o.name}
                      </Display>
                      <Text className="text-base text-light-muted dark:text-dark-muted">
                        {o.role}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* The two leadership entry points from the spec: claiming a club
                  you run, and asking its president for board access. */}
              {session ? (
                <View className="mt-5">
                  {requestOpen ? (
                    <Card elevation="ambient" className="p-4">
                      <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
                        {club.presidentId
                          ? "Request board access"
                          : "Claim this club"}
                      </Text>
                      {club.presidentId ? (
                        <>
                          <Text className="mt-1.5 text-xs text-light-muted dark:text-dark-muted">
                            Pick your position. The president decides what you
                            can manage.
                          </Text>
                          <View className="mt-3 flex-row flex-wrap gap-2">
                            {BOARD_POSITIONS.map((position) => (
                              <PressableScale
                                key={position}
                                onPress={() => setRequestPosition(position)}
                                accessibilityRole="button"
                                aria-pressed={requestPosition === position}
                                scaleTo={0.96}
                                className={`h-8 items-center justify-center rounded-full px-3 ${
                                  requestPosition === position
                                    ? "bg-python-blue"
                                    : "border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface"
                                }`}
                              >
                                <Text
                                  className={`text-2xs font-semibold ${
                                    requestPosition === position
                                      ? "text-white"
                                      : "text-light-secondary dark:text-dark-secondary"
                                  }`}
                                >
                                  {position}
                                </Text>
                              </PressableScale>
                            ))}
                          </View>
                        </>
                      ) : (
                        <Text className="mt-1.5 text-xs text-light-muted dark:text-dark-muted">
                          The school admin verifies club presidents before
                          granting access.
                        </Text>
                      )}
                      <View className="mt-3">
                        <Input
                          label="Message"
                          value={requestMessage}
                          onChangeText={setRequestMessage}
                          multiline
                          placeholder="Tell them who you are and what you do for the clubâ€¦"
                        />
                      </View>
                      <View className="mt-3 flex-row gap-2.5">
                        <View className="flex-1">
                          <Button
                            label="Cancel"
                            variant="secondary"
                            size="md"
                            fullWidth
                            onPress={() => setRequestOpen(false)}
                          />
                        </View>
                        <View className="flex-1">
                          <Button
                            label="Send request"
                            variant="primary"
                            size="md"
                            fullWidth
                            loading={busy}
                            onPress={() =>
                              void (club.presidentId
                                ? submitBoardRequest()
                                : submitClubClaim())
                            }
                          />
                        </View>
                      </View>
                    </Card>
                  ) : membership?.boardStatus === "pending" ? (
                    <Card
                      elevation="ambient"
                      className="flex-row items-center gap-2.5 p-4"
                    >
                      <Ionicons
                        name="hourglass-outline"
                        size={16}
                        color={semantic.warn}
                      />
                      <Text className="flex-1 text-xs text-light-muted dark:text-dark-muted">
                        Your board request is waiting for the president.
                      </Text>
                    </Card>
                  ) : membership?.role === "president" ? null : (
                    <Button
                      label={
                        club.presidentId
                          ? "I'm on the board"
                          : "I run this club"
                      }
                      variant="outline"
                      size="md"
                      icon="ribbon-outline"
                      fullWidth
                      onPress={() => setRequestOpen(true)}
                    />
                  )}
                </View>
              ) : null}
            </Animated.View>
          )}
          </View>
        </View>
      </ScrollView>

      {!isWide ? (
        <View
          pointerEvents="box-none"
          className="absolute bottom-0 left-0 right-0 flex-row items-center gap-3 border-t border-light-border bg-light-bg px-5 pt-3 dark:border-dark-border dark:bg-dark-bg"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-1">{joinButton}</View>
          {showShare ? (
            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share club"
              className="h-14 w-14 items-center justify-center"
            >
              <Glyph name="share-outline" size={22} tone="text" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ConfirmDialog
        visible={leaveOpen}
        title={`Leave ${club.name}?`}
        message="You'll stop receiving club alerts and lose access to member-only resources."
        confirmLabel="Leave club"
        destructive
        busy={busy}
        onConfirm={() => void handleLeave()}
        onCancel={() => setLeaveOpen(false)}
      />
    </View>
  );
}
