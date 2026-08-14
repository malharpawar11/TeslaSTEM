import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  PressableScale,
  SectionHeader,
  Tag,
} from '@/components/ui';
import { AnnouncementCard } from '@/components/ClubContentCards';
import { useToast } from '@/context/ToastContext';
import {
  fetchClubClaims,
  reviewClubClaim,
  transferClubOwnership,
  setClubActive,
  type ClubClaim,
} from '@/data/adminRepo';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchSchoolAnnouncements,
} from '@/data/contentRepo';
import type { Announcement, Club } from '@/types/domain';
import { brand } from '@/theme/tokens';

/**
 * The school-wide sections of the admin dashboard: president claims on
 * existing clubs, school-wide announcements, and club lifecycle (ownership
 * transfer, archiving). Every action behind these controls is a SECURITY
 * DEFINER RPC that re-checks `is_special_admin()` in the database.
 */

// ---------------------------------------------------------------------------
// Claims on existing clubs
// ---------------------------------------------------------------------------

export function ClubClaimSection() {
  const { toastResult } = useToast();
  const [claims, setClaims] = useState<ClubClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setClaims(await fetchClubClaims());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = useCallback(
    async (claim: ClubClaim, approve: boolean) => {
      setBusy(true);
      const res = await reviewClubClaim(claim.id, approve);
      setBusy(false);
      if (
        toastResult(
          res,
          approve
            ? `${claim.displayName ?? claim.email} now manages ${claim.clubName}.`
            : 'Claim declined.',
        )
      ) {
        await load();
      }
    },
    [toastResult, load],
  );

  return (
    <View className="mt-8">
      <SectionHeader
        eyebrow="LEADERSHIP"
        title="Club claims"
        description="Students asking for administrative access to a club that already exists."
        size="md"
      />
      <View className="mt-4">
        {loading ? (
          <Text className="text-xs text-light-muted dark:text-dark-muted">Loading claims…</Text>
        ) : claims.length === 0 ? (
          <EmptyState
            icon="ribbon-outline"
            title="No pending claims"
            description="When a president claims their club, the request lands here for verification."
            tone="neutral"
          />
        ) : (
          <View className="gap-3">
            {claims.map((claim) => (
              <Card key={claim.id} elevation="ambient" className="p-4">
                <View className="flex-row items-center gap-3">
                  <Avatar
                    size="md"
                    tone="info"
                    initials={(claim.displayName ?? claim.email).slice(0, 2).toUpperCase()}
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                      {claim.displayName ?? claim.email}
                    </Text>
                    <Text className="text-2xs text-light-muted dark:text-dark-muted">
                      {claim.email}
                    </Text>
                  </View>
                  <Tag label={claim.position} tone="brand" />
                </View>
                <Text className="mt-3 text-xs text-light-secondary dark:text-dark-secondary">
                  Claiming: <Text className="font-bold">{claim.clubName}</Text>
                </Text>
                {claim.message ? (
                  <Text className="mt-2 text-xs leading-5 text-light-muted dark:text-dark-muted">
                    “{claim.message}”
                  </Text>
                ) : null}
                <View className="mt-3 flex-row gap-2.5">
                  <View className="flex-1">
                    <Button
                      label="Decline"
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onPress={() => void decide(claim, false)}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Grant access"
                      variant="primary"
                      size="sm"
                      fullWidth
                      loading={busy}
                      onPress={() => void decide(claim, true)}
                    />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// School-wide announcements (club_id null)
// ---------------------------------------------------------------------------

export function SchoolAnnouncementSection() {
  const { toast, toastResult } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    setAnnouncements(await fetchSchoolAnnouncements());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const post = useCallback(async () => {
    if (!title.trim() || !body.trim()) {
      toast('Add a title and a message.', 'error');
      return;
    }
    setBusy(true);
    const res = await createAnnouncement(null, title, body);
    setBusy(false);
    if (toastResult(res, 'Posted to the whole school.')) {
      setTitle('');
      setBody('');
      setOpen(false);
      await load();
    }
  }, [title, body, toast, toastResult, load]);

  return (
    <View className="mt-8">
      <SectionHeader
        eyebrow="SCHOOL-WIDE"
        title="School announcements"
        description="Goes to every student with an account, not just one club."
        size="md"
      />
      <View className="mt-4">
        {open ? (
          <Card elevation="ambient" className="mb-3 p-4">
            <View className="gap-3">
              <Input label="Title" value={title} onChangeText={setTitle} placeholder="Club fair Friday" />
              <Input
                label="Message"
                value={body}
                onChangeText={setBody}
                multiline
                placeholder="Details every student should see…"
              />
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Button
                    label="Cancel"
                    variant="secondary"
                    size="md"
                    fullWidth
                    onPress={() => setOpen(false)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Post"
                    variant="primary"
                    size="md"
                    fullWidth
                    icon="megaphone"
                    loading={busy}
                    onPress={() => void post()}
                  />
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <Button
            label="Post a school-wide announcement"
            variant="outline"
            size="md"
            icon="megaphone-outline"
            fullWidth
            className="mb-3"
            onPress={() => setOpen(true)}
          />
        )}

        {announcements.length === 0 ? (
          <EmptyState
            icon="school-outline"
            title="Nothing posted yet"
            description="Use this for club fairs, deadlines, and anything that affects every club."
            tone="neutral"
          />
        ) : (
          <View className="gap-3">
            {announcements.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={{ ...a, clubName: 'Tesla STEM' }}
                showClub
                onDelete={() => setPendingDelete(a)}
              />
            ))}
          </View>
        )}
      </View>

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete announcement?"
        message={`"${pendingDelete?.title ?? ''}" will be removed for every student.`}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setBusy(true);
          const res = await deleteAnnouncement(pendingDelete.id);
          setBusy(false);
          setPendingDelete(null);
          if (toastResult(res, 'Announcement deleted.')) await load();
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ownership transfer and archiving
// ---------------------------------------------------------------------------

export function ClubLifecycleSection({ clubs }: { clubs: Club[] }) {
  const { toast, toastResult } = useToast();
  const [selectedId, setSelectedId] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Club | null>(null);

  const selected = clubs.find((c) => c.id === selectedId);

  const transfer = useCallback(async () => {
    if (!selected) {
      toast('Pick a club first.', 'error');
      return;
    }
    if (!/@lwsd\.org$/i.test(email.trim())) {
      toast('Enter the new president\'s @lwsd.org email.', 'error');
      return;
    }
    setBusy(true);
    const res = await transferClubOwnership(selected.id, email.trim());
    setBusy(false);
    if (toastResult(res, `${selected.name} transferred to ${email.trim()}.`)) {
      setEmail('');
    }
  }, [selected, email, toast, toastResult]);

  return (
    <View className="mt-8">
      <SectionHeader
        eyebrow="LIFECYCLE"
        title="Ownership & archiving"
        description="Transfer a club to a new president, or archive one that is no longer active."
        size="md"
      />

      <Card elevation="ambient" className="mt-4 p-4">
        <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
          Club
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {clubs.slice(0, 60).map((club) => (
            <PressableScale
              key={club.id}
              onPress={() => setSelectedId(club.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedId === club.id }}
              scaleTo={0.96}
              className={`h-8 items-center justify-center rounded-full px-3 ${
                selectedId === club.id
                  ? 'bg-python-green'
                  : 'border border-light-border dark:border-dark-border'
              }`}
            >
              <Text
                className={`text-2xs font-bold ${
                  selectedId === club.id
                    ? 'text-white'
                    : 'text-light-secondary dark:text-dark-secondary'
                }`}
                numberOfLines={1}
              >
                {club.name}
              </Text>
            </PressableScale>
          ))}
        </View>

        {selected ? (
          <View className="mt-4 gap-3">
            <Input
              label="New president's email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="president@lwsd.org"
            />
            <Button
              label="Transfer ownership"
              variant="primary"
              size="md"
              icon="swap-horizontal-outline"
              fullWidth
              loading={busy}
              onPress={() => void transfer()}
            />
            <Button
              label="Archive this club"
              variant="secondary"
              size="md"
              icon="archive-outline"
              fullWidth
              onPress={() => setArchiveTarget(selected)}
            />
            <View className="flex-row items-start gap-2">
              <Ionicons name="information-circle-outline" size={13} color={brand.blue} />
              <Text className="flex-1 text-2xs leading-4 text-light-subtle dark:text-dark-subtle">
                Archiving removes the club from the directory and the calendar. Its history and
                audit trail are kept.
              </Text>
            </View>
          </View>
        ) : null}
      </Card>

      <ConfirmDialog
        visible={!!archiveTarget}
        title={`Archive ${archiveTarget?.name ?? ''}?`}
        message="Students will no longer see it in the directory, and it stops accepting new members. You can restore it from the database if needed."
        confirmLabel="Archive"
        destructive
        busy={busy}
        onConfirm={async () => {
          if (!archiveTarget) return;
          setBusy(true);
          const res = await setClubActive(archiveTarget.id, false);
          setBusy(false);
          setArchiveTarget(null);
          toastResult(res, `${archiveTarget.name} archived.`);
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </View>
  );
}
