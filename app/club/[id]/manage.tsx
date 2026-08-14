import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  EmptyState,
  Input,
  PressableScale,
  SkeletonRow,
  StatTile,
  Tag,
} from '@/components/ui';
import { AnnouncementCard, EventCard, FileRow, NoteCard } from '@/components/ClubContentCards';
import { SignInGate } from '@/components/SignInGate';
import { useClubs } from '@/context/ClubsContext';
import { useToast } from '@/context/ToastContext';
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  fetchClubAnnouncements,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  fetchClubEvents,
  createNote,
  updateNote,
  deleteNote,
  fetchClubNotes,
  fetchClubFiles,
  uploadClubFile,
  deleteClubFile,
  type EventInput,
  type NoteInput,
} from '@/data/contentRepo';
import {
  fetchClubAccess,
  fetchClubMembers,
  reviewBoardRequest,
  reviewJoinRequest,
  removeClubMember,
  setMemberPermissions,
} from '@/data/membershipRepo';
import { updateClubSettings, type ClubSettingsInput } from '@/data/clubsRepo';
import {
  BOARD_POSITIONS,
  CLUB_PERMISSIONS,
  EVENT_TYPES,
  NO_ACCESS,
  PERMISSION_LABELS,
  POSITION_PRESETS,
  type Announcement,
  type ClubAccess,
  type ClubEvent,
  type ClubFile,
  type ClubMemberRow,
  type ClubNote,
  type ClubPermission,
} from '@/types/domain';
import { brand } from '@/theme/tokens';

/**
 * The club admin dashboard.
 *
 * Tabs appear only for permissions the *database* granted this user — the
 * `permissions` array comes from `my_club_access()`, which is the same
 * `has_club_permission()` function the RLS policies call. A board member with
 * only "events" therefore sees the Events tab, and if they somehow issued an
 * announcement insert anyway, Postgres would reject it.
 */

type Section =
  | 'Overview'
  | 'Announcements'
  | 'Events'
  | 'Members'
  | 'Board'
  | 'Files'
  | 'Resources'
  | 'Settings';

const SECTION_PERMISSION: Record<Section, ClubPermission | null> = {
  Overview: null,
  Announcements: 'announcements',
  Events: 'events',
  Members: 'members',
  Board: 'board',
  Files: 'files',
  Resources: 'notes',
  Settings: 'settings',
};

function toLocalInput(iso: string): string {
  // "2026-08-20T15:30" — what the text fields below take.
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Parses "YYYY-MM-DDTHH:mm" in the device's timezone. Returns null if invalid. */
function fromLocalInput(value: string): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function SectionTabs({
  sections,
  value,
  onChange,
}: {
  sections: Section[];
  value: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {sections.map((s) => {
        const active = s === value;
        return (
          <PressableScale
            key={s}
            onPress={() => onChange(s)}
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
              {s}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function PermissionPicker({
  selected,
  onToggle,
}: {
  selected: ClubPermission[];
  onToggle: (p: ClubPermission) => void;
}) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {CLUB_PERMISSIONS.map((permission) => {
        const on = selected.includes(permission);
        return (
          <PressableScale
            key={permission}
            onPress={() => onToggle(permission)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={PERMISSION_LABELS[permission]}
            scaleTo={0.96}
            className={`h-8 flex-row items-center gap-1.5 rounded-full px-3 ${
              on ? 'bg-python-green' : 'border border-light-border dark:border-dark-border'
            }`}
          >
            <Ionicons
              name={on ? 'checkmark-circle' : 'ellipse-outline'}
              size={13}
              color={on ? '#FFFFFF' : '#9CA3AF'}
            />
            <Text
              className={`text-2xs font-bold ${
                on ? 'text-white' : 'text-light-secondary dark:text-dark-secondary'
              }`}
            >
              {PERMISSION_LABELS[permission]}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function ManageClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubId = String(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getClub, refresh: refreshClubs } = useClubs();
  const { toast, toastResult } = useToast();

  const club = getClub(clubId);

  const [access, setAccess] = useState<ClubAccess>(NO_ACCESS);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>('Overview');
  const [busy, setBusy] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [members, setMembers] = useState<ClubMemberRow[]>([]);
  const [files, setFiles] = useState<ClubFile[]>([]);
  const [notes, setNotes] = useState<ClubNote[]>([]);

  // Composers
  const [annOpen, setAnnOpen] = useState(false);
  const [annId, setAnnId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');

  const [eventOpen, setEventOpen] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventInput & { endsAtLocal: string; startsAtLocal: string }>({
    title: '',
    description: '',
    eventType: 'Meeting',
    startsAt: '',
    endsAt: null,
    location: '',
    organizer: '',
    startsAtLocal: '',
    endsAtLocal: '',
  });

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<NoteInput>({
    title: '',
    body: '',
    category: 'General',
    pinned: false,
  });

  const [fileFolder, setFileFolder] = useState('General');
  const [fileTitle, setFileTitle] = useState('');

  const [settings, setSettings] = useState<ClubSettingsInput | null>(null);

  // Board editing
  const [editingMember, setEditingMember] = useState<ClubMemberRow | null>(null);
  const [editPosition, setEditPosition] = useState('');
  const [editPermissions, setEditPermissions] = useState<ClubPermission[]>([]);

  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    const nextAccess = await fetchClubAccess(clubId);
    setAccess(nextAccess);
    const jobs: Promise<void>[] = [];
    if (nextAccess.permissions.includes('announcements') || nextAccess.canAdmin) {
      jobs.push(fetchClubAnnouncements(clubId).then(setAnnouncements));
    }
    if (nextAccess.permissions.includes('events') || nextAccess.canAdmin) {
      jobs.push(fetchClubEvents(clubId, true).then(setEvents));
    }
    if (nextAccess.permissions.includes('members') || nextAccess.permissions.includes('board')) {
      jobs.push(fetchClubMembers(clubId).then(setMembers));
    }
    if (nextAccess.permissions.includes('files')) {
      jobs.push(fetchClubFiles(clubId).then(setFiles));
    }
    if (nextAccess.permissions.includes('notes')) {
      jobs.push(fetchClubNotes(clubId).then(setNotes));
    }
    await Promise.all(jobs);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (club && !settings) {
      setSettings({
        description: club.description,
        meetingDay: club.day === 'TBD' ? '' : club.day,
        meetingTime: club.time === 'TBD' ? '' : club.time,
        location: club.location === 'TBD' ? '' : club.location,
        advisor: club.advisor === 'TBD' ? '' : club.advisor,
        contactEmail: club.contactEmail,
        instagram: club.instagram ?? '',
        website: club.website ?? '',
        joinPolicy: club.joinPolicy,
      });
    }
  }, [club, settings]);

  const sections = useMemo<Section[]>(() => {
    const all: Section[] = [
      'Overview',
      'Announcements',
      'Events',
      'Members',
      'Board',
      'Files',
      'Resources',
      'Settings',
    ];
    return all.filter((s) => {
      const permission = SECTION_PERMISSION[s];
      return permission === null || access.permissions.includes(permission);
    });
  }, [access.permissions]);

  useEffect(() => {
    if (!sections.includes(section)) setSection('Overview');
  }, [sections, section]);

  const pendingJoins = useMemo(() => members.filter((m) => m.status === 'pending'), [members]);
  const boardRequests = useMemo(
    () => members.filter((m) => m.boardStatus === 'pending'),
    [members],
  );
  const activeBoard = useMemo(
    () => members.filter((m) => m.role !== 'member' && m.status === 'active'),
    [members],
  );

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const submitAnnouncement = useCallback(async () => {
    if (!annTitle.trim() || !annBody.trim()) {
      toast('Add a title and a message.', 'error');
      return;
    }
    setBusy(true);
    const res = annId
      ? await updateAnnouncement(annId, annTitle, annBody)
      : await createAnnouncement(clubId, annTitle, annBody);
    setBusy(false);
    if (toastResult(res, annId ? 'Announcement updated.' : 'Announcement posted.')) {
      setAnnOpen(false);
      setAnnId(null);
      setAnnTitle('');
      setAnnBody('');
      setAnnouncements(await fetchClubAnnouncements(clubId));
    }
  }, [annId, annTitle, annBody, clubId, toast, toastResult]);

  const submitEvent = useCallback(async () => {
    const startsAt = fromLocalInput(eventForm.startsAtLocal);
    if (!eventForm.title.trim() || !startsAt) {
      toast('A title and a start time (YYYY-MM-DD HH:MM) are required.', 'error');
      return;
    }
    const endsAt = eventForm.endsAtLocal.trim() ? fromLocalInput(eventForm.endsAtLocal) : null;
    if (eventForm.endsAtLocal.trim() && !endsAt) {
      toast('End time must look like 2026-09-04 16:30.', 'error');
      return;
    }
    const payload: EventInput = {
      title: eventForm.title,
      description: eventForm.description,
      eventType: eventForm.eventType,
      startsAt,
      endsAt,
      location: eventForm.location,
      organizer: eventForm.organizer,
    };
    setBusy(true);
    const res = eventId ? await updateEvent(eventId, payload) : await createEvent(clubId, payload);
    setBusy(false);
    if (toastResult(res, eventId ? 'Event updated — members were notified.' : 'Event created.')) {
      setEventOpen(false);
      setEventId(null);
      setEvents(await fetchClubEvents(clubId, true));
    }
  }, [eventForm, eventId, clubId, toast, toastResult]);

  const submitNote = useCallback(async () => {
    if (!noteForm.title.trim() || !noteForm.body.trim()) {
      toast('Notes need a title and a body.', 'error');
      return;
    }
    setBusy(true);
    const res = noteId ? await updateNote(noteId, noteForm) : await createNote(clubId, noteForm);
    setBusy(false);
    if (toastResult(res, noteId ? 'Note updated.' : 'Note posted.')) {
      setNoteOpen(false);
      setNoteId(null);
      setNoteForm({ title: '', body: '', category: 'General', pinned: false });
      setNotes(await fetchClubNotes(clubId));
    }
  }, [noteForm, noteId, clubId, toast, toastResult]);

  const pickAndUpload = useCallback(async () => {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    setBusy(true);
    const res = await uploadClubFile(
      clubId,
      { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null },
      { title: fileTitle.trim() || asset.name, folder: fileFolder },
    );
    setBusy(false);
    if (toastResult(res, 'File uploaded — members were notified.')) {
      setFileTitle('');
      setFiles(await fetchClubFiles(clubId));
    }
  }, [clubId, fileFolder, fileTitle, toastResult]);

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    setBusy(true);
    const res = await updateClubSettings(clubId, settings);
    setBusy(false);
    if (toastResult(res, 'Club settings saved.')) {
      await refreshClubs();
    }
  }, [settings, clubId, toastResult, refreshClubs]);

  const decideBoardRequest = useCallback(
    async (member: ClubMemberRow, approve: boolean) => {
      setBusy(true);
      const permissions = approve
        ? (POSITION_PRESETS[member.position ?? 'Officer'] ?? ['announcements'])
        : [];
      const res = await reviewBoardRequest(
        clubId,
        member.userId,
        approve,
        member.position ?? 'Officer',
        permissions as ClubPermission[],
      );
      setBusy(false);
      if (
        toastResult(
          res,
          approve
            ? `${member.displayName ?? member.email} is now on the board.`
            : 'Board request declined.',
        )
      ) {
        setMembers(await fetchClubMembers(clubId));
      }
    },
    [clubId, toastResult],
  );

  const decideJoinRequest = useCallback(
    async (member: ClubMemberRow, approve: boolean) => {
      setBusy(true);
      const res = await reviewJoinRequest(clubId, member.userId, approve);
      setBusy(false);
      if (toastResult(res, approve ? 'Member approved.' : 'Request declined.')) {
        setMembers(await fetchClubMembers(clubId));
        await refreshClubs();
      }
    },
    [clubId, toastResult, refreshClubs],
  );

  const savePermissions = useCallback(async () => {
    if (!editingMember) return;
    setBusy(true);
    const res = await setMemberPermissions(
      clubId,
      editingMember.userId,
      editPosition,
      editPermissions,
    );
    setBusy(false);
    if (toastResult(res, 'Permissions updated.')) {
      setEditingMember(null);
      setMembers(await fetchClubMembers(clubId));
    }
  }, [editingMember, clubId, editPosition, editPermissions, toastResult]);

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

  if (loading) {
    return (
      <View className="flex-1 bg-light-bg px-5 dark:bg-dark-bg" style={{ paddingTop: insets.top + 40 }}>
        <SkeletonRow count={4} />
      </View>
    );
  }

  // The server decides: no permissions, no management area.
  if (access.permissions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-light-bg dark:bg-dark-bg">
        <EmptyState
          icon="lock-closed-outline"
          title="You don't manage this club"
          description="Ask the club president for board access, or the school admin to verify you as its president."
          actionLabel="Back to club"
          onAction={() => router.replace(`/club/${clubId}`)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <View className="flex-row items-start gap-3 px-5" style={{ paddingTop: insets.top + 8 }}>
          <PressableScale
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            scaleTo={0.9}
            className="mt-1 h-9 w-9 items-center justify-center rounded-full border border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2"
          >
            <Ionicons name="chevron-back" size={18} color={brand.green} />
          </PressableScale>
          <View className="flex-1">
            <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
              Manage club
            </Text>
            <Text
              className="mt-1 text-2xl font-extrabold tracking-tight text-light-text dark:text-dark-text"
              numberOfLines={2}
            >
              {club.name}
            </Text>
            <View className="mt-1.5 flex-row flex-wrap gap-1.5">
              <Tag
                label={access.memberRole === 'president' ? 'President' : access.position ?? 'Board'}
                tone={access.memberRole === 'president' ? 'brand' : 'info'}
              />
              <Tag label={`${access.permissions.length} permissions`} tone="neutral" />
            </View>
          </View>
        </View>

        <View className="px-5 pt-4">
          <SectionTabs sections={sections} value={section} onChange={setSection} />
        </View>

        <View className="px-5 pt-5">
          {/* ------------------------------------------------ Overview */}
          {section === 'Overview' ? (
            <Animated.View entering={FadeIn.duration(240)} className="gap-3">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <StatTile icon="people-outline" value={String(club.memberCount)} label="Members" />
                </View>
                <View className="flex-1">
                  <StatTile
                    icon="calendar-outline"
                    value={String(
                      events.filter(
                        (e) => e.status === 'scheduled' && new Date(e.startsAt) > new Date(),
                      ).length,
                    )}
                    label="Upcoming"
                    tone="info"
                  />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <StatTile
                    icon="megaphone-outline"
                    value={String(announcements.length)}
                    label="Announcements"
                  />
                </View>
                <View className="flex-1">
                  <StatTile
                    icon="person-add-outline"
                    value={String(pendingJoins.length + boardRequests.length)}
                    label="Pending requests"
                    tone="info"
                  />
                </View>
              </View>

              <Card elevation="ambient" className="mt-2 p-4">
                <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                  What you can do here
                </Text>
                <Text className="mt-1.5 text-xs leading-5 text-light-muted dark:text-dark-muted">
                  These are the permissions the database granted your account. Every action is
                  re-checked server-side when you use it.
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {access.permissions.map((permission) => (
                    <Tag key={permission} label={PERMISSION_LABELS[permission]} tone="brand" />
                  ))}
                </View>
              </Card>
            </Animated.View>
          ) : null}

          {/* ------------------------------------------- Announcements */}
          {section === 'Announcements' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {annOpen ? (
                <Card elevation="ambient" className="mb-4 p-4">
                  <Text className="mb-3 text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
                    {annId ? 'Edit announcement' : 'New announcement'}
                  </Text>
                  <View className="gap-3">
                    <Input label="Title" value={annTitle} onChangeText={setAnnTitle} placeholder="What's happening?" />
                    <Input
                      label="Message"
                      value={annBody}
                      onChangeText={setAnnBody}
                      multiline
                      placeholder="Share the details with members…"
                    />
                    <View className="flex-row gap-2.5">
                      <View className="flex-1">
                        <Button
                          label="Cancel"
                          variant="secondary"
                          size="md"
                          fullWidth
                          onPress={() => {
                            setAnnOpen(false);
                            setAnnId(null);
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label={annId ? 'Save' : 'Post'}
                          variant="primary"
                          size="md"
                          fullWidth
                          icon="megaphone"
                          loading={busy}
                          onPress={() => void submitAnnouncement()}
                        />
                      </View>
                    </View>
                  </View>
                </Card>
              ) : (
                <Button
                  label="Post an announcement"
                  variant="outline"
                  size="lg"
                  fullWidth
                  icon="megaphone-outline"
                  className="mb-4"
                  onPress={() => {
                    setAnnTitle('');
                    setAnnBody('');
                    setAnnId(null);
                    setAnnOpen(true);
                  }}
                />
              )}

              {announcements.length === 0 ? (
                <EmptyState
                  icon="megaphone-outline"
                  title="Nothing posted yet"
                  description="Meeting reminders, competition info, deadlines — members see them instantly."
                  tone="neutral"
                />
              ) : (
                <View className="gap-3">
                  {announcements.map((a) => (
                    <AnnouncementCard
                      key={a.id}
                      announcement={a}
                      onEdit={() => {
                        setAnnId(a.id);
                        setAnnTitle(a.title);
                        setAnnBody(a.body);
                        setAnnOpen(true);
                      }}
                      onDelete={() =>
                        setConfirm({
                          title: 'Delete announcement?',
                          message: `"${a.title}" will be removed for every member.`,
                          action: async () => {
                            const res = await deleteAnnouncement(a.id);
                            if (toastResult(res, 'Announcement deleted.')) {
                              setAnnouncements(await fetchClubAnnouncements(clubId));
                            }
                          },
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* -------------------------------------------------- Events */}
          {section === 'Events' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {eventOpen ? (
                <Card elevation="ambient" className="mb-4 p-4">
                  <Text className="mb-3 text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
                    {eventId ? 'Edit event' : 'New event'}
                  </Text>
                  <View className="gap-3">
                    <Input
                      label="Title"
                      value={eventForm.title}
                      onChangeText={(title) => setEventForm((f) => ({ ...f, title }))}
                      placeholder="Weekly meeting"
                    />
                    <View>
                      <Text className="mb-2 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                        Type
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {EVENT_TYPES.map((type) => (
                          <PressableScale
                            key={type}
                            onPress={() => setEventForm((f) => ({ ...f, eventType: type }))}
                            accessibilityRole="button"
                            accessibilityState={{ selected: eventForm.eventType === type }}
                            scaleTo={0.96}
                            className={`h-8 items-center justify-center rounded-full px-3 ${
                              eventForm.eventType === type
                                ? 'bg-python-green'
                                : 'border border-light-border dark:border-dark-border'
                            }`}
                          >
                            <Text
                              className={`text-2xs font-bold ${
                                eventForm.eventType === type
                                  ? 'text-white'
                                  : 'text-light-secondary dark:text-dark-secondary'
                              }`}
                            >
                              {type}
                            </Text>
                          </PressableScale>
                        ))}
                      </View>
                    </View>
                    <Input
                      label="Starts (YYYY-MM-DD HH:MM)"
                      value={eventForm.startsAtLocal}
                      onChangeText={(startsAtLocal) => setEventForm((f) => ({ ...f, startsAtLocal }))}
                      placeholder="2026-09-04 15:30"
                      autoCapitalize="none"
                    />
                    <Input
                      label="Ends (optional)"
                      value={eventForm.endsAtLocal}
                      onChangeText={(endsAtLocal) => setEventForm((f) => ({ ...f, endsAtLocal }))}
                      placeholder="2026-09-04 16:30"
                      autoCapitalize="none"
                    />
                    <Input
                      label="Location"
                      value={eventForm.location}
                      onChangeText={(location) => setEventForm((f) => ({ ...f, location }))}
                      placeholder="RM 121"
                    />
                    <Input
                      label="Organizer"
                      value={eventForm.organizer}
                      onChangeText={(organizer) => setEventForm((f) => ({ ...f, organizer }))}
                      placeholder="Who's running it"
                    />
                    <Input
                      label="Description"
                      value={eventForm.description}
                      onChangeText={(description) => setEventForm((f) => ({ ...f, description }))}
                      multiline
                      placeholder="Agenda, what to bring…"
                    />
                    <View className="flex-row gap-2.5">
                      <View className="flex-1">
                        <Button
                          label="Cancel"
                          variant="secondary"
                          size="md"
                          fullWidth
                          onPress={() => {
                            setEventOpen(false);
                            setEventId(null);
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label={eventId ? 'Save' : 'Create'}
                          variant="primary"
                          size="md"
                          fullWidth
                          icon="calendar"
                          loading={busy}
                          onPress={() => void submitEvent()}
                        />
                      </View>
                    </View>
                  </View>
                </Card>
              ) : (
                <Button
                  label="Create an event"
                  variant="outline"
                  size="lg"
                  fullWidth
                  icon="calendar-outline"
                  className="mb-4"
                  onPress={() => {
                    setEventId(null);
                    setEventForm({
                      title: '',
                      description: '',
                      eventType: 'Meeting',
                      startsAt: '',
                      endsAt: null,
                      location: '',
                      organizer: '',
                      startsAtLocal: '',
                      endsAtLocal: '',
                    });
                    setEventOpen(true);
                  }}
                />
              )}

              {events.length === 0 ? (
                <EmptyState
                  icon="calendar-outline"
                  title="No events yet"
                  description="Meetings, competitions, workshops, and deadlines all live here."
                  tone="neutral"
                />
              ) : (
                <View className="gap-3">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={{ ...event, clubName: club.name }}
                      onEdit={() => {
                        setEventId(event.id);
                        setEventForm({
                          title: event.title,
                          description: event.description ?? '',
                          eventType: event.eventType,
                          startsAt: event.startsAt,
                          endsAt: event.endsAt,
                          location: event.location ?? '',
                          organizer: event.organizer ?? '',
                          startsAtLocal: toLocalInput(event.startsAt),
                          endsAtLocal: event.endsAt ? toLocalInput(event.endsAt) : '',
                        });
                        setEventOpen(true);
                      }}
                      onCancel={() =>
                        setConfirm({
                          title: 'Cancel this event?',
                          message: `Members will be notified that "${event.title}" is cancelled.`,
                          action: async () => {
                            const res = await cancelEvent(event.id);
                            if (toastResult(res, 'Event cancelled — members notified.')) {
                              setEvents(await fetchClubEvents(clubId, true));
                            }
                          },
                        })
                      }
                      onDelete={() =>
                        setConfirm({
                          title: 'Delete this event?',
                          message: 'It disappears from every calendar. Cancelling instead keeps the record.',
                          action: async () => {
                            const res = await deleteEvent(event.id);
                            if (toastResult(res, 'Event deleted.')) {
                              setEvents(await fetchClubEvents(clubId, true));
                            }
                          },
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* ------------------------------------------------- Members */}
          {section === 'Members' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {pendingJoins.length > 0 ? (
                <View className="mb-5">
                  <Text className="mb-2 text-2xs font-bold uppercase tracking-widest text-warn">
                    Join requests ({pendingJoins.length})
                  </Text>
                  <View className="gap-2.5">
                    {pendingJoins.map((member) => (
                      <Card key={member.userId} elevation="ambient" className="p-4">
                        <View className="flex-row items-center gap-3">
                          <Avatar
                            size="md"
                            tone="info"
                            initials={(member.displayName ?? member.email).slice(0, 2).toUpperCase()}
                          />
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                              {member.displayName ?? member.email}
                            </Text>
                            <Text className="text-2xs text-light-muted dark:text-dark-muted">
                              {member.email}
                            </Text>
                          </View>
                        </View>
                        <View className="mt-3 flex-row gap-2.5">
                          <View className="flex-1">
                            <Button
                              label="Decline"
                              variant="secondary"
                              size="sm"
                              fullWidth
                              onPress={() => void decideJoinRequest(member, false)}
                            />
                          </View>
                          <View className="flex-1">
                            <Button
                              label="Approve"
                              variant="primary"
                              size="sm"
                              fullWidth
                              onPress={() => void decideJoinRequest(member, true)}
                            />
                          </View>
                        </View>
                      </Card>
                    ))}
                  </View>
                  <Divider variant="hairline" className="my-5" />
                </View>
              ) : null}

              {members.filter((m) => m.status === 'active').length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="No members yet"
                  description="Share the club page — students join straight from the directory."
                  tone="neutral"
                />
              ) : (
                <View className="gap-2.5">
                  {members
                    .filter((m) => m.status === 'active')
                    .map((member) => (
                      <Card
                        key={member.userId}
                        elevation="ambient"
                        className="flex-row items-center gap-3 p-3.5"
                      >
                        <Avatar
                          size="sm"
                          tone={member.role === 'president' ? 'brand' : 'neutral'}
                          initials={(member.displayName ?? member.email).slice(0, 2).toUpperCase()}
                        />
                        <View className="flex-1">
                          <Text
                            className="text-sm font-bold text-light-text dark:text-dark-text"
                            numberOfLines={1}
                          >
                            {member.displayName ?? member.email}
                          </Text>
                          <Text
                            className="text-2xs text-light-muted dark:text-dark-muted"
                            numberOfLines={1}
                          >
                            {member.email}
                          </Text>
                        </View>
                        <Tag
                          label={
                            member.role === 'president'
                              ? 'President'
                              : member.role === 'board'
                                ? member.position ?? 'Board'
                                : 'Member'
                          }
                          tone={
                            member.role === 'president'
                              ? 'brand'
                              : member.role === 'board'
                                ? 'info'
                                : 'neutral'
                          }
                        />
                        {member.role !== 'president' ? (
                          <PressableScale
                            onPress={() =>
                              setConfirm({
                                title: 'Remove member?',
                                message: `${member.displayName ?? member.email} will lose access to this club's files, notes, and updates.`,
                                action: async () => {
                                  const res = await removeClubMember(clubId, member.userId);
                                  if (toastResult(res, 'Member removed.')) {
                                    setMembers(await fetchClubMembers(clubId));
                                    await refreshClubs();
                                  }
                                },
                              })
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${member.displayName ?? member.email}`}
                            scaleTo={0.9}
                            className="h-8 w-8 items-center justify-center rounded-full bg-danger/12"
                          >
                            <Ionicons name="person-remove-outline" size={14} color="#E11D48" />
                          </PressableScale>
                        ) : null}
                      </Card>
                    ))}
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* --------------------------------------------------- Board */}
          {section === 'Board' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {boardRequests.length > 0 ? (
                <View className="mb-5">
                  <Text className="mb-2 text-2xs font-bold uppercase tracking-widest text-warn">
                    Board requests ({boardRequests.length})
                  </Text>
                  <View className="gap-2.5">
                    {boardRequests.map((member) => (
                      <Card key={member.userId} elevation="ambient" className="p-4">
                        <View className="flex-row items-center gap-3">
                          <Avatar
                            size="md"
                            tone="info"
                            initials={(member.displayName ?? member.email).slice(0, 2).toUpperCase()}
                          />
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                              {member.displayName ?? member.email}
                            </Text>
                            <Text className="text-2xs text-light-muted dark:text-dark-muted">
                              Claims to be: {member.position ?? 'Officer'}
                            </Text>
                          </View>
                        </View>
                        {member.boardMessage ? (
                          <Text className="mt-2.5 text-xs leading-5 text-light-secondary dark:text-dark-secondary">
                            “{member.boardMessage}”
                          </Text>
                        ) : null}
                        <Text className="mt-3 text-2xs text-light-subtle dark:text-dark-subtle">
                          Approving grants the default permissions for that position — you can adjust
                          them right after.
                        </Text>
                        <View className="mt-3 flex-row gap-2.5">
                          <View className="flex-1">
                            <Button
                              label="Reject"
                              variant="secondary"
                              size="sm"
                              fullWidth
                              onPress={() => void decideBoardRequest(member, false)}
                            />
                          </View>
                          <View className="flex-1">
                            <Button
                              label="Approve"
                              variant="primary"
                              size="sm"
                              fullWidth
                              loading={busy}
                              onPress={() => void decideBoardRequest(member, true)}
                            />
                          </View>
                        </View>
                      </Card>
                    ))}
                  </View>
                  <Divider variant="hairline" className="my-5" />
                </View>
              ) : null}

              {editingMember ? (
                <Card elevation="ambient" className="mb-4 p-4">
                  <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                    {editingMember.displayName ?? editingMember.email}
                  </Text>
                  <Text className="mt-1 text-2xs text-light-muted dark:text-dark-muted">
                    Position and exact permissions
                  </Text>
                  <View className="mt-3">
                    <Input label="Position" value={editPosition} onChangeText={setEditPosition} />
                  </View>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {BOARD_POSITIONS.map((position) => (
                      <PressableScale
                        key={position}
                        onPress={() => {
                          setEditPosition(position);
                          setEditPermissions((POSITION_PRESETS[position] ?? []) as ClubPermission[]);
                        }}
                        accessibilityRole="button"
                        scaleTo={0.96}
                        className="h-8 items-center justify-center rounded-full border border-light-border px-3 dark:border-dark-border"
                      >
                        <Text className="text-2xs font-bold text-light-secondary dark:text-dark-secondary">
                          {position}
                        </Text>
                      </PressableScale>
                    ))}
                  </View>
                  <PermissionPicker
                    selected={editPermissions}
                    onToggle={(permission) =>
                      setEditPermissions((prev) =>
                        prev.includes(permission)
                          ? prev.filter((p) => p !== permission)
                          : [...prev, permission],
                      )
                    }
                  />
                  <View className="mt-4 flex-row gap-2.5">
                    <View className="flex-1">
                      <Button
                        label="Cancel"
                        variant="secondary"
                        size="md"
                        fullWidth
                        onPress={() => setEditingMember(null)}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Save"
                        variant="primary"
                        size="md"
                        fullWidth
                        loading={busy}
                        onPress={() => void savePermissions()}
                      />
                    </View>
                  </View>
                </Card>
              ) : null}

              {activeBoard.length === 0 ? (
                <EmptyState
                  icon="ribbon-outline"
                  title="No board members yet"
                  description="When a student asks for board access, their request appears here for you to approve and assign a position."
                  tone="neutral"
                />
              ) : (
                <View className="gap-2.5">
                  {activeBoard.map((member) => (
                    <Card key={member.userId} elevation="ambient" className="p-3.5">
                      <View className="flex-row items-center gap-3">
                        <Avatar
                          size="sm"
                          tone={member.role === 'president' ? 'brand' : 'info'}
                          initials={(member.displayName ?? member.email).slice(0, 2).toUpperCase()}
                        />
                        <View className="flex-1">
                          <Text
                            className="text-sm font-bold text-light-text dark:text-dark-text"
                            numberOfLines={1}
                          >
                            {member.displayName ?? member.email}
                          </Text>
                          <Text className="text-2xs text-light-muted dark:text-dark-muted">
                            {member.position ?? (member.role === 'president' ? 'President' : 'Officer')}
                          </Text>
                        </View>
                        {member.role === 'board' ? (
                          <Button
                            label="Permissions"
                            variant="ghost"
                            size="sm"
                            onPress={() => {
                              setEditingMember(member);
                              setEditPosition(member.position ?? 'Officer');
                              setEditPermissions(member.permissions);
                            }}
                          />
                        ) : null}
                      </View>
                      {member.permissions.length > 0 ? (
                        <View className="mt-2.5 flex-row flex-wrap gap-1.5">
                          {member.permissions.map((permission) => (
                            <Tag
                              key={permission}
                              label={PERMISSION_LABELS[permission] ?? permission}
                              tone="neutral"
                            />
                          ))}
                        </View>
                      ) : null}
                    </Card>
                  ))}
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* --------------------------------------------------- Files */}
          {section === 'Files' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              <Card elevation="ambient" className="mb-4 p-4">
                <Text className="mb-3 text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
                  Upload a file
                </Text>
                <View className="gap-3">
                  <Input
                    label="Title (optional)"
                    value={fileTitle}
                    onChangeText={setFileTitle}
                    placeholder="Competition packet"
                  />
                  <Input
                    label="Folder"
                    value={fileFolder}
                    onChangeText={setFileFolder}
                    placeholder="General"
                  />
                  <Button
                    label={busy ? 'Uploading…' : 'Choose file & upload'}
                    variant="primary"
                    size="md"
                    icon="cloud-upload-outline"
                    fullWidth
                    loading={busy}
                    onPress={() => void pickAndUpload()}
                  />
                  <Text className="text-2xs leading-4 text-light-subtle dark:text-dark-subtle">
                    PDFs, docs, slides, images, and forms. Only club members can see the file list.
                  </Text>
                </View>
              </Card>

              {files.length === 0 ? (
                <EmptyState
                  icon="folder-open-outline"
                  title="No files yet"
                  description="Upload handouts, forms, slides, and competition materials for your members."
                  tone="neutral"
                />
              ) : (
                <View className="gap-2.5">
                  {files.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      onDelete={() =>
                        setConfirm({
                          title: 'Delete file?',
                          message: `"${file.title}" will be removed for every member.`,
                          action: async () => {
                            const res = await deleteClubFile(file);
                            if (toastResult(res, 'File deleted.')) {
                              setFiles(await fetchClubFiles(clubId));
                            }
                          },
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* ----------------------------------------------- Resources */}
          {section === 'Resources' ? (
            <Animated.View entering={FadeIn.duration(240)}>
              {noteOpen ? (
                <Card elevation="ambient" className="mb-4 p-4">
                  <Text className="mb-3 text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
                    {noteId ? 'Edit note' : 'New note'}
                  </Text>
                  <View className="gap-3">
                    <Input
                      label="Title"
                      value={noteForm.title}
                      onChangeText={(title) => setNoteForm((f) => ({ ...f, title }))}
                      placeholder="Meeting notes — Sept 4"
                    />
                    <Input
                      label="Category"
                      value={noteForm.category}
                      onChangeText={(category) => setNoteForm((f) => ({ ...f, category }))}
                      placeholder="Meeting notes, Links, Competition…"
                    />
                    <Input
                      label="Body"
                      value={noteForm.body}
                      onChangeText={(body) => setNoteForm((f) => ({ ...f, body }))}
                      multiline
                      placeholder="Notes, instructions, links…"
                    />
                    <PressableScale
                      onPress={() => setNoteForm((f) => ({ ...f, pinned: !f.pinned }))}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: noteForm.pinned }}
                      accessibilityLabel="Pin this note"
                      scaleTo={0.98}
                      className="flex-row items-center gap-2.5 py-1"
                    >
                      <Ionicons
                        name={noteForm.pinned ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={brand.green}
                      />
                      <Text className="text-sm text-light-text dark:text-dark-text">
                        Pin to the top
                      </Text>
                    </PressableScale>
                    <View className="flex-row gap-2.5">
                      <View className="flex-1">
                        <Button
                          label="Cancel"
                          variant="secondary"
                          size="md"
                          fullWidth
                          onPress={() => {
                            setNoteOpen(false);
                            setNoteId(null);
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label={noteId ? 'Save' : 'Post'}
                          variant="primary"
                          size="md"
                          fullWidth
                          loading={busy}
                          onPress={() => void submitNote()}
                        />
                      </View>
                    </View>
                  </View>
                </Card>
              ) : (
                <Button
                  label="Write a note"
                  variant="outline"
                  size="lg"
                  fullWidth
                  icon="create-outline"
                  className="mb-4"
                  onPress={() => {
                    setNoteId(null);
                    setNoteForm({ title: '', body: '', category: 'General', pinned: false });
                    setNoteOpen(true);
                  }}
                />
              )}

              {notes.length === 0 ? (
                <EmptyState
                  icon="reader-outline"
                  title="No notes yet"
                  description="Meeting notes, links, instructions, and study resources for your members."
                  tone="neutral"
                />
              ) : (
                <View className="gap-3">
                  {notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={() => {
                        setNoteId(note.id);
                        setNoteForm({
                          title: note.title,
                          body: note.body,
                          category: note.category,
                          pinned: note.pinned,
                        });
                        setNoteOpen(true);
                      }}
                      onDelete={() =>
                        setConfirm({
                          title: 'Delete note?',
                          message: `"${note.title}" will be removed for every member.`,
                          action: async () => {
                            const res = await deleteNote(note.id);
                            if (toastResult(res, 'Note deleted.')) {
                              setNotes(await fetchClubNotes(clubId));
                            }
                          },
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* ------------------------------------------------ Settings */}
          {section === 'Settings' && settings ? (
            <Animated.View entering={FadeIn.duration(240)} className="gap-3">
              <Input
                label="Description"
                value={settings.description}
                onChangeText={(description) => setSettings((s) => (s ? { ...s, description } : s))}
                multiline
              />
              <Input
                label="Meeting day"
                value={settings.meetingDay}
                onChangeText={(meetingDay) => setSettings((s) => (s ? { ...s, meetingDay } : s))}
                placeholder="Wednesday"
              />
              <Input
                label="Meeting time"
                value={settings.meetingTime}
                onChangeText={(meetingTime) => setSettings((s) => (s ? { ...s, meetingTime } : s))}
                placeholder="At Lunch"
              />
              <Input
                label="Location"
                value={settings.location}
                onChangeText={(location) => setSettings((s) => (s ? { ...s, location } : s))}
                placeholder="RM 121"
              />
              <Input
                label="Advisor"
                value={settings.advisor}
                onChangeText={(advisor) => setSettings((s) => (s ? { ...s, advisor } : s))}
              />
              <Input
                label="Contact email"
                value={settings.contactEmail}
                onChangeText={(contactEmail) => setSettings((s) => (s ? { ...s, contactEmail } : s))}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Input
                label="Instagram"
                value={settings.instagram}
                onChangeText={(instagram) => setSettings((s) => (s ? { ...s, instagram } : s))}
                autoCapitalize="none"
                placeholder="@teslastemclub"
              />
              <Input
                label="Website"
                value={settings.website}
                onChangeText={(website) => setSettings((s) => (s ? { ...s, website } : s))}
                autoCapitalize="none"
                placeholder="https://…"
              />

              <Card elevation="ambient" className="p-4">
                <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                  Who can join
                </Text>
                <View className="mt-3 flex-row gap-2">
                  {(['open', 'approval'] as const).map((policy) => (
                    <PressableScale
                      key={policy}
                      onPress={() => setSettings((s) => (s ? { ...s, joinPolicy: policy } : s))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: settings.joinPolicy === policy }}
                      scaleTo={0.97}
                      className={`h-9 flex-1 items-center justify-center rounded-full ${
                        settings.joinPolicy === policy
                          ? 'bg-python-green'
                          : 'border border-light-border dark:border-dark-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          settings.joinPolicy === policy
                            ? 'text-white'
                            : 'text-light-secondary dark:text-dark-secondary'
                        }`}
                      >
                        {policy === 'open' ? 'Anyone can join' : 'Approve each request'}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              </Card>

              <Button
                label="Save changes"
                variant="primary"
                size="lg"
                icon="save-outline"
                fullWidth
                loading={busy}
                onPress={() => void saveSettings()}
              />
              <Text className="text-2xs leading-4 text-light-subtle dark:text-dark-subtle">
                Club name, approval status, and ownership are managed by the school admin — those
                columns are locked in the database even for presidents.
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel="Confirm"
        destructive
        busy={busy}
        onConfirm={async () => {
          if (!confirm) return;
          setBusy(true);
          await confirm.action();
          setBusy(false);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

export default function ManageClubRoute() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate
        title="Sign in to manage your club"
        subtitle="Management tools are tied to your verified @lwsd.org account."
      >
        <ManageClubScreen />
      </SignInGate>
    </View>
  );
}
