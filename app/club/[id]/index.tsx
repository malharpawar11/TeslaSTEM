import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Share,
  Platform,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { ClubReviews } from "@/components/club/ClubReviews";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  ConfirmDialog,
  EmptyState,
  SkeletonRow,
  Button,
} from "@/components/ui";
import { useReducedMotion } from "@/components/CampusVisual";
import {
  ClubAnnouncements,
  ClubEvents,
  ClubFiles,
  ClubLeadership,
  ClubNotes,
  usableAnnouncements,
} from "@/components/club/ClubContent";
import {
  ClubAlertPrefs,
  ClubLedger,
  ClubSchedule,
} from "@/components/club/ClubFactSheet";
import { ClubTabs, clubPanelId, clubTabId } from "@/components/club/ClubTabs";
import {
  MembershipButton,
  type MembershipState,
} from "@/components/club/MembershipButton";
import {
  CLUB,
  CLUB_PANE_PADDING,
  clubPaneWidth,
  PANEL_SPACE,
  clubNameSize,
  splitLead,
} from "@/components/club/tokens";
import {
  Display,
  Glyph,
  TextLink,
  useHover,
  webFade,
  webSticky,
} from "@/components/system";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLayout } from "@/theme/layout";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
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
import {
  NO_ACCESS,
  type Announcement,
  type ClubAccess,
  type ClubEvent,
  type ClubFile,
  type ClubNote,
  type Officer,
} from "@/types/domain";
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

function BackToClubs({ onPress }: { onPress: () => void }) {
  const { isDark } = useTheme();
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="min-h-11 flex-row items-center gap-1.5"
    >
      <View
        style={[
          { transform: [{ translateX: hovered ? -3 : 0 }] },
          webFade("transform"),
        ]}
      >
        <Ionicons
          name="arrow-back"
          size={18}
          color={isDark ? "#FFFFFF" : "#000000"}
        />
      </View>
      <Text className="text-base font-bold text-light-text dark:text-dark-text">
        Clubs
      </Text>
    </Pressable>
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
  const { isWide, isDesktop, contentWidth, gutter, height } = useLayout();
  const reduced = useReducedMotion();
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
  const [requesting, setRequesting] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [paneHeight, setPaneHeight] = useState(0);

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

  const wasPending = membership?.status === "pending";
  const handleLeave = useCallback(async () => {
    setBusy(true);
    const res = await leave(clubId);
    setBusy(false);
    setLeaveOpen(false);
    if (!res.ok) {
      toast(res.error ?? "Could not leave the club.", "error");
      return;
    }
    toast(
      wasPending ? "Request withdrawn" : `Left ${club?.name ?? "the club"}`,
      "info",
    );
    await Promise.all([load(), refreshClubs()]);
  }, [leave, clubId, toast, club, load, refreshClubs, wasPending]);

  const submitBoardRequest = useCallback(
    async (position: string, message: string) => {
      setRequesting(true);
      const res = await requestBoardRole(clubId, position, message);
      setRequesting(false);
      if (!toastResult(res, "Request sent to the club president."))
        return false;
      await Promise.all([load(), refreshMemberships()]);
      return true;
    },
    [clubId, toastResult, load, refreshMemberships],
  );

  const submitClubClaim = useCallback(
    async (message: string) => {
      setRequesting(true);
      const res = await claimClub(clubId, "President", message);
      setRequesting(false);
      return Boolean(
        toastResult(res, "Claim submitted: the school admin will review it."),
      );
    },
    [clubId, toastResult],
  );

  const validAnnouncements = useMemo(
    () => usableAnnouncements(announcements),
    [announcements],
  );

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

  const membershipState: MembershipState = !session
    ? "signedOut"
    : membership?.status === "pending"
      ? "pending"
      : joined
        ? "joined"
        : club.joinPolicy === "approval"
          ? "approval"
          : "open";
  const joinButton = (
    <MembershipButton
      state={membershipState}
      busy={busy}
      onPress={() =>
        membershipState === "signedOut"
          ? router.push("/account")
          : membershipState === "pending" || membershipState === "joined"
            ? setLeaveOpen(true)
            : void handleJoin()
      }
    />
  );

  const phone = contentWidth < 640;
  const showShare = Platform.OS !== "web";
  const [lead, rest] = splitLead(club.description);
  const counts: Partial<Record<Tab, number>> = loading
    ? {}
    : {
        Announcements: validAnnouncements.length,
        Events: events.filter(
          (e) =>
            e.status === "scheduled" &&
            new Date(e.startsAt).getTime() > Date.now() - 2 * 3600 * 1000,
        ).length,
        Files: files.length,
        Notes: notes.length,
      };
  const standing = [
    membership?.status === "pending"
      ? { text: "Approval pending", warn: true }
      : null,
    membership?.role === "president" ? { text: "You're the president" } : null,
    membership?.role === "board"
      ? { text: membership.position ?? "Board member" }
      : null,
    membership?.boardStatus === "pending"
      ? { text: "Board request pending", warn: true }
      : null,
  ].filter(Boolean) as { text: string; warn?: boolean }[];

  const about = (
    <>
      <Text
        className="text-light-text dark:text-dark-text"
        style={{
          fontSize: phone ? 18 : 20,
          lineHeight: phone ? 27 : 31,
          maxWidth: CLUB.readingWidth,
        }}
      >
        {lead}
      </Text>
      {rest ? (
        <Text
          className="mt-3 text-base leading-6 text-light-secondary dark:text-dark-secondary"
          style={{ maxWidth: CLUB.readingWidth }}
        >
          {rest}
        </Text>
      ) : null}
      {!isWide ? (
        <View className="mt-6 gap-5 border-t border-light-border pt-5 dark:border-dark-border">
          <ClubSchedule club={club} />
          <ClubLedger club={club} />
          {joined ? <ClubAlertPrefs clubId={clubId} /> : null}
        </View>
      ) : null}
      <ClubReviews clubId={clubId} isMember={joined} />
    </>
  );

  const panels: Record<Tab, JSX.Element> = {
    About: about,
    Announcements: (
      <ClubAnnouncements items={validAnnouncements} narrow={phone} />
    ),
    Events: <ClubEvents events={events} clubName={club.name} />,
    Files: <ClubFiles files={files} narrow={phone} />,
    Notes: <ClubNotes notes={notes} narrow={phone} />,
    Leadership: (
      <ClubLeadership
        officers={officers}
        narrow={phone}
        signedIn={Boolean(session)}
        hasPresident={Boolean(club.presidentId)}
        membership={membership}
        busy={requesting}
        onRequestBoard={submitBoardRequest}
        onClaim={submitClubClaim}
      />
    ),
  };

  const column = (
    <View style={{ paddingHorizontal: gutter }}>
      <View
        className="flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 12 }}
      >
        <BackToClubs
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/browse")
          }
        />
        <View className="flex-row items-center gap-4">
          {access.permissions.length > 0 ? (
            <TextLink
              label="Manage club"
              icon="settings-outline"
              onPress={() => router.push(`/club/${clubId}/manage`)}
            />
          ) : null}
          {!isDesktop ? <ThemeToggle /> : null}
        </View>
      </View>

      <View className="flex-row items-end gap-4 pb-5 pt-6">
        {club.logoUrl ? (
          <Image
            source={{ uri: club.logoUrl }}
            accessibilityIgnoresInvertColors
            alt=""
            className="rounded-[3px]"
            style={{ width: phone ? 52 : 68, height: phone ? 52 : 68 }}
          />
        ) : null}
        <View className="flex-1" style={{ minWidth: 0 }}>
          <Text className="text-base font-bold text-python-blue dark:text-python-blue-light">
            {club.foundingYear
              ? `${club.category}, since ${club.foundingYear}`
              : club.category}
          </Text>
          <Display
            fontSize={clubNameSize(club.name, phone)}
            accessibilityRole="header"
            className="text-light-text dark:text-dark-text"
          >
            {club.name}
          </Display>
        </View>
      </View>
      {standing.length ? (
        <View className="-mt-3 flex-row flex-wrap gap-x-4 pb-4">
          {standing.map((item) => (
            <Text
              key={item.text}
              className={`text-sm font-bold ${item.warn ? "text-warn" : "text-python-green dark:text-python-green-light"}`}
            >
              {item.text}
            </Text>
          ))}
        </View>
      ) : null}

      <View
        className="border-b border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-bg"
        style={[
          // The rule meets the panel's divider, tying the two columns together.
          {
            zIndex: 5,
            marginRight: isWide ? -gutter : 0,
            paddingRight: isWide ? gutter : 0,
          },
          webSticky(0),
        ]}
      >
        <ClubTabs tabs={tabs} value={tab} onChange={setTab} counts={counts} />
      </View>

      {loadError ? (
        <View className="items-start gap-2 pt-5">
          <Text className="text-danger">{loadError}</Text>
          <Button label="Retry" onPress={() => void load()} />
        </View>
      ) : null}

      <View
        className="pt-6"
        style={{ maxWidth: CLUB.contentMax }}
        nativeID={clubPanelId(tab)}
        role="tabpanel"
        aria-labelledby={clubTabId(tab)}
      >
        {loading ? (
          <SkeletonRow count={3} />
        ) : (
          <Animated.View
            key={tab}
            entering={reduced ? undefined : FadeIn.duration(CLUB.panelMs)}
          >
            {panels[tab]}
          </Animated.View>
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className={`flex-1 ${isWide ? "flex-row" : ""}`}>
          <View
            className="flex-1"
            style={{
              minWidth: 0,
              paddingBottom: isWide ? 64 : insets.bottom + 112,
            }}
          >
            {column}
          </View>

          {isWide ? (
            <View
              className="border-l border-light-border dark:border-dark-border"
              style={{ width: clubPaneWidth(contentWidth), flexShrink: 0 }}
            >
              <View
                onLayout={(event) =>
                  setPaneHeight(event.nativeEvent.layout.height)
                }
                style={[
                  {
                    paddingHorizontal: CLUB_PANE_PADDING,
                    paddingTop: insets.top + 20,
                    paddingBottom: CLUB_PANE_PADDING,
                  },
                  paneHeight > 0 && paneHeight <= height ? webSticky(0) : null,
                ]}
              >
                <ClubSchedule club={club} />
                <View style={{ marginVertical: PANEL_SPACE.aroundButton }}>
                  {joinButton}
                </View>
                <ClubLedger club={club} />
                {joined ? (
                  <View style={{ marginTop: PANEL_SPACE.section }}>
                    <ClubAlertPrefs clubId={clubId} />
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
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
        title={
          wasPending
            ? `Withdraw your request to join ${club.name}?`
            : `Leave ${club.name}?`
        }
        message={
          wasPending
            ? "A club leader will no longer see your request. You can ask again later."
            : "You'll stop receiving club alerts and lose access to member-only resources."
        }
        confirmLabel={wasPending ? "Withdraw request" : "Leave club"}
        destructive
        busy={busy}
        onConfirm={() => void handleLeave()}
        onCancel={() => setLeaveOpen(false)}
      />
    </View>
  );
}
