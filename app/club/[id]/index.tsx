import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Share, Platform, Linking, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
} from '@/components/ui';
import { AnnouncementCard, EventCard, FileRow, NoteCard } from '@/components/ClubContentCards';
import { ClubProfileHeader } from '@/components/ClubProfileHeader';
import { useClubs } from '@/context/ClubsContext';
import { useMemberships } from '@/context/MembershipContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  fetchClubAnnouncements,
  fetchClubEvents,
  fetchClubFiles,
  fetchClubNotes,
} from '@/data/contentRepo';
import { fetchClubOfficers } from '@/data/clubsRepo';
import { fetchClubAccess, requestBoardRole, claimClub } from '@/data/membershipRepo';
import { downloadIcs } from '@/lib/calendar';
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
} from '@/types/domain';
import { brand, palette } from '@/theme/tokens';

/**
 * A club's public profile and — once a student joins — its member area.
 *
 * Which tabs appear is decided by `my_club_access`, the same SQL function the
 * RLS policies consult, so the UI can never offer something the database will
 * refuse. Files and notes are member-only in Postgres too: a non-member who
 * calls the API directly gets an empty result, not the data with a hidden UI.
 */

type Tab = 'About' | 'Announcements' | 'Events' | 'Files' | 'Notes' | 'Leadership';

const PUBLIC_TABS: Tab[] = ['About', 'Announcements', 'Events', 'Leadership'];
const MEMBER_TABS: Tab[] = ['About', 'Announcements', 'Events', 'Files', 'Notes', 'Leadership'];

function SegmentedTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab[];
  value: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {tabs.map((t) => {
        const active = t === value;
        return (
          <PressableScale
            key={t}
            onPress={() => onChange(t)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            scaleTo={0.97}
            className={`h-9 items-center justify-center rounded-full px-4 ${
              active
                ? 'bg-python-green'
                : 'border border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                active ? 'text-white' : 'text-light-muted dark:text-dark-muted'
              }`}
            >
              {t}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Per-club notification switches, shown to members inside the club. */
function NotificationSwitches({ clubId }: { clubId: string }) {
  const { prefsFor, savePrefs } = useNotifications();
  const { toast } = useToast();
  const prefs = prefsFor(clubId);

  const toggle = async (key: keyof NotificationPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    const res = await savePrefs(clubId, next);
    if (!res.ok) toast(res.error ?? 'Could not save that preference.', 'error');
  };

  const ROWS: {
    key: keyof NotificationPrefs;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: 'announcements', label: 'Announcements', icon: 'megaphone-outline' },
    { key: 'events', label: 'Events', icon: 'calendar-outline' },
    { key: 'files', label: 'New files', icon: 'document-outline' },
    { key: 'notes', label: 'Notes & resources', icon: 'reader-outline' },
  ];

  return (
    <Card elevation="ambient" className="mt-4 px-4 py-1">
      {ROWS.map((row, i) => (
        <PressableScale
          key={row.key}
          onPress={() => void toggle(row.key)}
          accessibilityRole="switch"
          accessibilityState={{ checked: prefs[row.key] }}
          accessibilityLabel={`${row.label} notifications`}
          scaleTo={0.99}
          className={`flex-row items-center gap-3 py-3 ${
            i === ROWS.length - 1 ? '' : 'border-b border-light-hairline dark:border-dark-border'
          }`}
        >
          <Ionicons name={row.icon} size={16} color={brand.green} />
          <Text className="flex-1 text-sm font-medium text-light-text dark:text-dark-text">
            {row.label}
          </Text>
          <View
            className={`h-6 w-10 justify-center rounded-full px-0.5 ${
              prefs[row.key] ? 'bg-python-green' : 'bg-light-border dark:bg-dark-border'
            }`}
          >
            <View
              className={`h-5 w-5 rounded-full bg-white ${
                prefs[row.key] ? 'self-end' : 'self-start'
              }`}
            />
          </View>
        </PressableScale>
      ))}
    </Card>
  );
}

export default function ClubProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubId = String(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getClub, refresh: refreshClubs } = useClubs();
  const { isMember, membershipFor, join, leave, refresh: refreshMemberships } = useMemberships();
  const { isDark } = useTheme();
  const { session } = useAuth();
  const { toast, toastResult } = useToast();

  const [tab, setTab] = useState<Tab>('About');
  const [access, setAccess] = useState<ClubAccess>(NO_ACCESS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [files, setFiles] = useState<ClubFile[]>([]);
  const [notes, setNotes] = useState<ClubNote[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Leadership request composer.
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestPosition, setRequestPosition] = useState<string>(BOARD_POSITIONS[0]);
  const [requestMessage, setRequestMessage] = useState('');

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const club = getClub(clubId);
  const membership = membershipFor(clubId);
  const joined = isMember(clubId);

  const load = useCallback(async () => {
    if (!clubId) return;
    const [nextAccess, nextAnnouncements, nextEvents, nextOfficers] = await Promise.all([
      session ? fetchClubAccess(clubId) : Promise.resolve(NO_ACCESS),
      fetchClubAnnouncements(clubId),
      fetchClubEvents(clubId, true),
      fetchClubOfficers(clubId),
    ]);
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
      setFiles(nextFiles);
      setNotes(nextNotes);
    } else {
      setFiles([]);
      setNotes([]);
    }
    setLoading(false);
  }, [clubId, session]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tabs = useMemo(() => (access.isMember ? MEMBER_TABS : PUBLIC_TABS), [access.isMember]);

  useEffect(() => {
    if (!tabs.includes(tab)) setTab('About');
  }, [tabs, tab]);

  const handleJoin = useCallback(async () => {
    setBusy(true);
    const res = await join(clubId);
    setBusy(false);
    if (!res.ok) {
      toast(res.error, 'error');
      return;
    }
    toast(
      res.status === 'pending'
        ? 'Request sent — a club leader will review it.'
        : `Joined ${club?.name ?? 'the club'}`,
    );
    await Promise.all([load(), refreshClubs()]);
  }, [join, clubId, toast, club, load, refreshClubs]);

  const handleLeave = useCallback(async () => {
    setBusy(true);
    const res = await leave(clubId);
    setBusy(false);
    setLeaveOpen(false);
    if (!res.ok) {
      toast(res.error ?? 'Could not leave the club.', 'error');
      return;
    }
    toast(`Left ${club?.name ?? 'the club'}`, 'info');
    await Promise.all([load(), refreshClubs()]);
  }, [leave, clubId, toast, club, load, refreshClubs]);

  const submitBoardRequest = useCallback(async () => {
    setBusy(true);
    const res = await requestBoardRole(clubId, requestPosition, requestMessage);
    setBusy(false);
    if (toastResult(res, 'Request sent to the club president.')) {
      setRequestOpen(false);
      setRequestMessage('');
      await Promise.all([load(), refreshMemberships()]);
    }
  }, [clubId, requestPosition, requestMessage, toastResult, load, refreshMemberships]);

  const submitClubClaim = useCallback(async () => {
    setBusy(true);
    const res = await claimClub(clubId, 'President', requestMessage);
    setBusy(false);
    if (toastResult(res, 'Claim submitted — the school admin will review it.')) {
      setRequestOpen(false);
      setRequestMessage('');
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
      if (Platform.OS === 'web') return;
      await Share.share({
        message: `Check out ${club.name} at Tesla STEM — ${club.description}`,
        title: club.name,
      });
    } catch {
      // The user dismissed the share sheet.
    }
  };

  const upcoming = events.filter(
    (e) => e.status === 'scheduled' && new Date(e.startsAt).getTime() > Date.now() - 2 * 3600 * 1000,
  );
  const past = events.filter((e) => !upcoming.includes(e));
  const folders = [...new Set(files.map((f) => f.folder))];

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
      >
        <ClubProfileHeader
          club={club}
          onBack={() => router.back()}
          onShare={handleShare}
          scrollY={scrollY}
        />

        {/* Role badges + the entry point to the management area */}
        <View className="flex-row flex-wrap items-center gap-2 px-5 pt-4">
          {membership?.status === 'pending' ? <Tag label="Approval pending" tone="warn" /> : null}
          {membership?.role === 'president' ? (
            <Tag label="You're the president" tone="brand" />
          ) : null}
          {membership?.role === 'board' ? (
            <Tag label={membership.position ?? 'Board member'} tone="info" />
          ) : null}
          {membership?.boardStatus === 'pending' ? (
            <Tag label="Board request pending" tone="warn" />
          ) : null}
          {access.permissions.length > 0 ? (
            <Button
              label="Manage club"
              variant="tonal"
              size="sm"
              icon="settings-outline"
              onPress={() => router.push(`/club/${clubId}/manage`)}
            />
          ) : null}
        </View>

        <View className="px-5 pt-4">
          <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />
        </View>

        <View className="px-5 pt-5">
          {loading ? (
            <SkeletonRow count={3} />
          ) : tab === 'About' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              <Text className="text-base leading-7 text-light-secondary dark:text-dark-secondary">
                {club.description}
              </Text>

              <View className="mt-6">
                <Text className="mb-2 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                  Meeting info
                </Text>
                <Card elevation="ambient" className="px-4">
                  <MetaRow
                    icon="calendar-outline"
                    label="Meeting"
                    value={`${club.day} · ${club.time}`}
                    iconTone="brand"
                  />
                  <MetaRow
                    icon="location-outline"
                    label="Location"
                    value={club.location}
                    iconTone="info"
                  />
                  <MetaRow
                    icon="person-outline"
                    label="Advisor"
                    value={club.advisor}
                    iconTone="brand"
                  />
                  <MetaRow
                    icon="people-outline"
                    label="Members"
                    value={`${club.memberCount} member${club.memberCount === 1 ? '' : 's'}`}
                    iconTone="info"
                  />
                  <MetaRow
                    icon={club.joinPolicy === 'approval' ? 'lock-closed-outline' : 'lock-open-outline'}
                    label="Joining"
                    value={
                      club.joinPolicy === 'approval'
                        ? 'A club leader approves new members'
                        : 'Open to every student'
                    }
                    iconTone="brand"
                    divider={false}
                  />
                </Card>
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                  Connect
                </Text>
                <Card elevation="ambient" className="px-4">
                  {club.contactEmail ? (
                    <MetaRow
                      icon="mail-outline"
                      label="Contact"
                      value={club.contactEmail}
                      iconTone="info"
                      divider={!!club.instagram || !!club.website}
                      onPress={() => Linking.openURL(`mailto:${club.contactEmail}`)}
                    />
                  ) : null}
                  {club.instagram ? (
                    <MetaRow
                      icon="logo-instagram"
                      label="Instagram"
                      value={club.instagram}
                      iconTone="info"
                      divider={!!club.website}
                      onPress={() => {
                        const handle = club.instagram!.replace(/^@/, '');
                        Linking.openURL(`https://instagram.com/${handle}`);
                      }}
                    />
                  ) : null}
                  {club.website ? (
                    <MetaRow
                      icon="globe-outline"
                      label="Website"
                      value={club.website}
                      iconTone="brand"
                      divider={false}
                      onPress={() => Linking.openURL(club.website!)}
                    />
                  ) : null}
                  {!club.contactEmail && !club.instagram && !club.website ? (
                    <MetaRow
                      icon="information-circle-outline"
                      label="Contact"
                      value="Not shared yet"
                      iconTone="muted"
                      divider={false}
                    />
                  ) : null}
                </Card>
              </View>

              {joined ? <NotificationSwitches clubId={clubId} /> : null}
            </Animated.View>
          ) : tab === 'Announcements' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {announcements.length === 0 ? (
                <EmptyState
                  icon="megaphone-outline"
                  title="No announcements yet"
                  description="When this club shares updates, they'll appear here."
                  tone="neutral"
                />
              ) : (
                <View className="gap-3">
                  {announcements.map((a, i) => (
                    <Animated.View key={a.id} entering={FadeInDown.duration(320).delay(i * 50)}>
                      <AnnouncementCard announcement={a} />
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          ) : tab === 'Events' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {events.length === 0 ? (
                <EmptyState
                  icon="calendar-outline"
                  title="Nothing scheduled"
                  description="Meetings, competitions, and deadlines will show up here."
                  tone="neutral"
                />
              ) : (
                <View className="gap-3">
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
                    <EventCard key={event.id} event={{ ...event, clubName: club.name }} />
                  ))}
                  {past.length > 0 ? (
                    <>
                      <Text className="mt-3 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                        Past & cancelled
                      </Text>
                      {past.map((event) => (
                        <EventCard key={event.id} event={{ ...event, clubName: club.name }} />
                      ))}
                    </>
                  ) : null}
                </View>
              )}
            </Animated.View>
          ) : tab === 'Files' ? (
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
                      <Text className="mt-2 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
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
          ) : tab === 'Notes' ? (
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
                <View className="gap-3">
                  {officers.map((o, i) => (
                    <Card
                      key={`${o.userId ?? o.name}-${i}`}
                      elevation="ambient"
                      className="flex-row items-center gap-4 p-4"
                    >
                      <Avatar
                        size="md"
                        tone={i === 0 ? 'brand' : 'info'}
                        initials={o.name.slice(0, 2).toUpperCase()}
                      />
                      <View className="flex-1">
                        <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                          {o.role}
                        </Text>
                        <Text className="mt-0.5 text-base font-bold tracking-tight text-light-text dark:text-dark-text">
                          {o.name}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {/* The two leadership entry points from the spec: claiming a club
                  you run, and asking its president for board access. */}
              {session ? (
                <View className="mt-5">
                  {requestOpen ? (
                    <Card elevation="ambient" className="p-4">
                      <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                        {club.presidentId ? 'Request board access' : 'Claim this club'}
                      </Text>
                      {club.presidentId ? (
                        <>
                          <Text className="mt-1.5 text-xs text-light-muted dark:text-dark-muted">
                            Pick your position. The president decides what you can manage.
                          </Text>
                          <View className="mt-3 flex-row flex-wrap gap-2">
                            {BOARD_POSITIONS.map((position) => (
                              <PressableScale
                                key={position}
                                onPress={() => setRequestPosition(position)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: requestPosition === position }}
                                scaleTo={0.96}
                                className={`h-8 items-center justify-center rounded-full px-3 ${
                                  requestPosition === position
                                    ? 'bg-python-green'
                                    : 'border border-light-border dark:border-dark-border'
                                }`}
                              >
                                <Text
                                  className={`text-2xs font-bold ${
                                    requestPosition === position
                                      ? 'text-white'
                                      : 'text-light-secondary dark:text-dark-secondary'
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
                          The school admin verifies club presidents before granting access.
                        </Text>
                      )}
                      <View className="mt-3">
                        <Input
                          label="Message"
                          value={requestMessage}
                          onChangeText={setRequestMessage}
                          multiline
                          placeholder="Tell them who you are and what you do for the club…"
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
                              void (club.presidentId ? submitBoardRequest() : submitClubClaim())
                            }
                          />
                        </View>
                      </View>
                    </Card>
                  ) : membership?.boardStatus === 'pending' ? (
                    <Card elevation="ambient" className="flex-row items-center gap-2.5 p-4">
                      <Ionicons name="hourglass-outline" size={16} color="#D97706" />
                      <Text className="flex-1 text-xs text-light-muted dark:text-dark-muted">
                        Your board request is waiting for the president.
                      </Text>
                    </Card>
                  ) : membership?.role === 'president' ? null : (
                    <Button
                      label={club.presidentId ? "I'm on the board" : 'I run this club'}
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
      </Animated.ScrollView>

      {/* Sticky join / leave bar */}
      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0">
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(30,33,40,0.7)' : 'rgba(238,240,243,0.9)',
          }}
        >
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              {!session ? (
                <Button
                  size="xl"
                  fullWidth
                  variant="primary"
                  icon="log-in-outline"
                  label="Sign in to join"
                  onPress={() => router.push('/account')}
                />
              ) : membership?.status === 'pending' ? (
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
                  icon="checkmark-circle"
                  label="Joined"
                  loading={busy}
                  onPress={() => setLeaveOpen(true)}
                  accessibilityLabel="Leave club"
                />
              ) : (
                <Button
                  size="xl"
                  fullWidth
                  variant="primary"
                  icon="add-circle-outline"
                  label={club.joinPolicy === 'approval' ? 'Request to join' : 'Join club'}
                  loading={busy}
                  onPress={() => void handleJoin()}
                />
              )}
            </View>
            <PressableScale
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share club"
              scaleTo={0.94}
              className="h-14 w-14 items-center justify-center rounded-2xl border border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2"
            >
              <Ionicons
                name="share-outline"
                size={22}
                color={isDark ? palette.white : brand.greenDeep}
              />
            </PressableScale>
          </View>
        </BlurView>
      </View>

      <ConfirmDialog
        visible={leaveOpen}
        title={`Leave ${club.name}?`}
        message="You'll stop receiving its announcements, files, and events, and lose access to member-only resources."
        confirmLabel="Leave club"
        destructive
        busy={busy}
        onConfirm={() => void handleLeave()}
        onCancel={() => setLeaveOpen(false)}
      />
    </View>
  );
}
