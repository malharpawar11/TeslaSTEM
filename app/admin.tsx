import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Input,
  SectionHeader,
  PressableScale,
  Skeleton,
  StatTile,
} from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignInGate } from '@/components/SignInGate';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { brand, semantic, surface, surfaces } from '@/theme/tokens';
import type { Club } from '@/types/domain';
import {
  fetchPendingClubs,
  fetchPendingPresidents,
  fetchClubAdmins,
  approveClub,
  rejectClub,
  verifyPresident,
  rejectPresident,
  assignClubAdmin,
  removeClubAdmin,
  type PendingClub,
  type PendingPresident,
  type ClubAdminRow,
} from '@/data/adminRepo';
import { fetchClubs } from '@/data/clubsRepo';
import {
  ClubClaimSection,
  SchoolAnnouncementSection,
  ClubLifecycleSection,
} from '@/components/SchoolAdminSections';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '.';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Inline error banner
// ---------------------------------------------------------------------------

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <View className="mt-3 flex-row items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 dark:bg-danger/20 p-3">
      <Ionicons name="alert-circle" size={15} color={semantic.danger} />
      <Text className="flex-1 text-xs font-semibold leading-5 text-danger">{message}</Text>
      {onDismiss ? (
        <Button
          label=""
          variant="ghost"
          size="sm"
          icon="close"
          onPress={onDismiss}
          accessibilityLabel="Dismiss error"
          className="h-auto px-0 py-0"
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Club approval queue
// ---------------------------------------------------------------------------

interface ClubRowProps {
  club: PendingClub;
  onRefresh: () => void;
  index: number;
}

function ClubQueueRow({ club, onRefresh, index }: ClubRowProps) {
  const { isDark } = useTheme();
  const s = surface(isDark);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = approving || rejecting;

  const handleApprove = async () => {
    setError(null);
    setApproving(true);
    const res = await approveClub(club.id);
    setApproving(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      onRefresh();
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }
    setError(null);
    setRejecting(true);
    const res = await rejectClub(club.id, rejectReason.trim());
    setRejecting(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      onRefresh();
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Card
        elevation="ambient"
        className="mb-3 p-4"
      >
        {/* Club header */}
        <View className="flex-row items-start gap-3">
          <Avatar size="md" tone="brand" initials={club.name.slice(0, 2).toUpperCase()} />
          <View className="flex-1">
            <Text
              className="text-base font-semibold text-light-text dark:text-dark-text"
              numberOfLines={1}
            >
              {club.name}
            </Text>
            <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
              <View className="rounded-md bg-python-blue/10 px-2 py-0.5 dark:bg-python-blue/20">
                <Text className="text-xs font-semibold text-light-muted dark:text-dark-muted">
                  {club.category}
                </Text>
              </View>
              <Text className="text-2xs text-light-subtle dark:text-dark-subtle">
                Submitted {formatDate(club.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <Text
          className="mt-3 text-sm leading-5 text-light-muted dark:text-dark-muted"
          numberOfLines={3}
        >
          {club.description}
        </Text>

        {/* Meta grid */}
        <View className="mt-3 gap-1.5">
          {club.meetingDay || club.meetingTime ? (
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={13} color={s.muted} />
              <Text className="text-xs text-light-muted dark:text-dark-muted">
                {[club.meetingDay, club.meetingTime].filter(Boolean).join(' · ')}
                {club.location ? `  ·  ${club.location}` : ''}
              </Text>
            </View>
          ) : null}
          {club.advisor ? (
            <View className="flex-row items-center gap-2">
              <Ionicons name="person-outline" size={13} color={s.muted} />
              <Text className="text-xs text-light-muted dark:text-dark-muted">
                Advisor: {club.advisor}
              </Text>
            </View>
          ) : null}
          {club.presidentEmail ? (
            <View className="flex-row items-center gap-2">
              <Ionicons name="mail-outline" size={13} color={s.muted} />
              <Text className="text-xs text-light-muted dark:text-dark-muted">
                President: {club.presidentEmail}
              </Text>
            </View>
          ) : null}
        </View>

        <Divider variant="hairline" className="my-3" />

        {/* Reject inline form */}
        {showRejectForm ? (
          <View className="mb-3">
            <Input
              label="Rejection reason"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Explain why this club is being rejected…"
              multiline
              icon="chatbubble-ellipses-outline"
            />
          </View>
        ) : null}

        {/* Error */}
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

        {/* Actions */}
        <View className="mt-3 flex-row gap-2">
          <Button
            label="Approve"
            variant="primary"
            size="sm"
            icon="checkmark-circle-outline"
            loading={approving}
            disabled={busy}
            onPress={handleApprove}
            className="flex-1"
          />
          {showRejectForm ? (
            <>
              <Button
                label="Confirm Reject"
                variant="destructive"
                size="sm"
                icon="close-circle-outline"
                loading={rejecting}
                disabled={busy}
                onPress={handleReject}
                className="flex-1"
              />
              <Button
                label="Cancel"
                variant="secondary"
                size="sm"
                disabled={busy}
                onPress={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                  setError(null);
                }}
              />
            </>
          ) : (
            <Button
              label="Reject"
              variant="outline"
              size="sm"
              icon="close-circle-outline"
              disabled={busy}
              onPress={() => setShowRejectForm(true)}
              className="flex-1"
            />
          )}
        </View>
      </Card>
    </Animated.View>
  );
}

interface ClubQueueSectionProps {
  pendingClubs: PendingClub[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function ClubQueueSection({ pendingClubs, loading, error, onRefresh }: ClubQueueSectionProps) {
  return (
    <View className="mt-7">
      <SectionHeader
        eyebrow="QUEUE"
        title="Club approval queue"
        size="md"
        trailing={
          pendingClubs.length > 0 ? (
            <Badge count={pendingClubs.length} tone="brand" />
          ) : undefined
        }
      />

      <View className="mt-4">
        {loading ? (
          <View className="gap-3">
            <Skeleton height={160} radius="xl" />
            <Skeleton height={160} radius="xl" />
          </View>
        ) : error ? (
          <Card elevation="ambient" className="p-4">
            <ErrorBanner message={error} />
            <View className="mt-3">
              <Button
                label="Retry"
                variant="tonal"
                size="sm"
                icon="refresh"
                onPress={onRefresh}
              />
            </View>
          </Card>
        ) : pendingClubs.length === 0 ? (
          <Card elevation="ambient">
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="No clubs awaiting review"
              description="All submitted clubs have been processed."
              tone="brand"
            />
          </Card>
        ) : (
          pendingClubs.map((club, i) => (
            <ClubQueueRow key={club.id} club={club} onRefresh={onRefresh} index={i} />
          ))
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// President verification queue
// ---------------------------------------------------------------------------

interface PresidentRowProps {
  president: PendingPresident;
  onRefresh: () => void;
  index: number;
}

function PresidentQueueRow({ president, onRefresh, index }: PresidentRowProps) {
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = verifying || rejecting;

  const handleVerify = async () => {
    setError(null);
    setVerifying(true);
    const res = await verifyPresident(president.id);
    setVerifying(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      onRefresh();
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }
    setError(null);
    setRejecting(true);
    const res = await rejectPresident(president.id, rejectReason.trim());
    setRejecting(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      onRefresh();
    }
  };

  const initials = president.displayName
    ? president.displayName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : president.email.slice(0, 2).toUpperCase();

  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <View className="py-3">
        <View className="flex-row items-center gap-3">
          <Avatar size="md" tone="neutral" initials={initials} />
          <View className="flex-1">
            {president.displayName ? (
              <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
                {president.displayName}
              </Text>
            ) : null}
            <Text
              className="text-xs text-light-muted dark:text-dark-muted"
              numberOfLines={1}
            >
              {president.email}
            </Text>
            <Text className="mt-0.5 text-2xs text-light-subtle dark:text-dark-subtle">
              Requested {formatDate(president.requestedAt)}
            </Text>
          </View>
        </View>

        {/* Reject reason form */}
        {showRejectForm ? (
          <View className="mt-3">
            <Input
              label="Rejection reason"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Explain why verification is denied…"
              multiline
              icon="chatbubble-ellipses-outline"
            />
          </View>
        ) : null}

        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

        <View className="mt-2.5 flex-row gap-2">
          <Button
            label="Verify"
            variant="primary"
            size="sm"
            icon="shield-checkmark-outline"
            loading={verifying}
            disabled={busy}
            onPress={handleVerify}
            className="flex-1"
          />
          {showRejectForm ? (
            <>
              <Button
                label="Confirm"
                variant="destructive"
                size="sm"
                loading={rejecting}
                disabled={busy}
                onPress={handleReject}
                className="flex-1"
              />
              <Button
                label="Cancel"
                variant="secondary"
                size="sm"
                disabled={busy}
                onPress={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                  setError(null);
                }}
              />
            </>
          ) : (
            <Button
              label="Reject"
              variant="outline"
              size="sm"
              disabled={busy}
              onPress={() => setShowRejectForm(true)}
              className="flex-1"
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

interface PresidentQueueSectionProps {
  pendingPresidents: PendingPresident[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function PresidentQueueSection({
  pendingPresidents,
  loading,
  error,
  onRefresh,
}: PresidentQueueSectionProps) {
  return (
    <View className="mt-7">
      <SectionHeader
        eyebrow="VERIFICATION"
        title="President verification queue"
        size="md"
        trailing={
          pendingPresidents.length > 0 ? (
            <Badge count={pendingPresidents.length} tone="brand" />
          ) : undefined
        }
      />

      <Card elevation="ambient" className="mt-4 px-4">
        {loading ? (
          <View className="py-4 gap-4">
            <Skeleton height={56} radius="lg" />
            <Skeleton height={56} radius="lg" />
          </View>
        ) : error ? (
          <View className="py-4">
            <ErrorBanner message={error} />
            <View className="mt-3">
              <Button
                label="Retry"
                variant="tonal"
                size="sm"
                icon="refresh"
                onPress={onRefresh}
              />
            </View>
          </View>
        ) : pendingPresidents.length === 0 ? (
          <EmptyState
            icon="people-circle-outline"
            title="No verification requests"
            description="No students have requested president verification."
            tone="brand"
          />
        ) : (
          pendingPresidents.map((p, i) => (
            <View key={p.id}>
              <PresidentQueueRow president={p} onRefresh={onRefresh} index={i} />
              {i < pendingPresidents.length - 1 ? <Divider variant="hairline" /> : null}
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Club admin management
// ---------------------------------------------------------------------------

interface ClubAdminSectionProps {
  approvedClubs: Club[];
  clubsLoading: boolean;
}

function ClubAdminSection({ approvedClubs, clubsLoading }: ClubAdminSectionProps) {
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [admins, setAdmins] = useState<ClubAdminRow[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const selectedClub = approvedClubs.find((c) => c.id === selectedClubId);

  const loadAdmins = useCallback(async (clubId: string) => {
    setAdminsLoading(true);
    setAdminsError(null);
    const rows = await fetchClubAdmins(clubId);
    setAdminsLoading(false);
    // fetchClubAdmins returns [] on error; tolerate gracefully
    setAdmins(rows);
  }, []);

  // Simple club picker: a scrollable horizontal chip strip
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelectClub = (id: string) => {
    setSelectedClubId(id);
    setPickerOpen(false);
    setAdmins([]);
    setAdminsError(null);
    void loadAdmins(id);
  };

  const handleAssign = async () => {
    if (!selectedClubId) {
      setAssignError('Select a club first.');
      return;
    }
    const email = adminEmail.trim().toLowerCase();
    if (!email.endsWith('@lwsd.org')) {
      setAssignError('Email must be an @lwsd.org address.');
      return;
    }
    setAssignError(null);
    setAssigning(true);
    const res = await assignClubAdmin(selectedClubId, email);
    setAssigning(false);
    if (!res.ok) {
      setAssignError(res.error);
    } else {
      setAdminEmail('');
      void loadAdmins(selectedClubId);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!selectedClubId) return;
    setRemovingId(userId);
    const res = await removeClubAdmin(selectedClubId, userId);
    setRemovingId(null);
    if (!res.ok) {
      setAdminsError(res.error);
    } else {
      void loadAdmins(selectedClubId);
    }
  };

  return (
    <View className="mt-7">
      <SectionHeader eyebrow="MANAGEMENT" title="Manage club admins" size="md" />

      <Card elevation="ambient" className="mt-4 p-4">
        {/* Club picker trigger */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-semibold tracking-wide text-light-secondary dark:text-dark-secondary">
            Club
          </Text>
          <View
            className="flex-row items-center justify-between rounded-2xl border border-light-border bg-light-surface px-3.5 py-3 dark:border-dark-border dark:bg-dark-surface-2"
          >
            {clubsLoading ? (
              <ActivityIndicator size="small" color={brand.blue} />
            ) : (
              <>
                <Text
                  className={`flex-1 text-base ${
                    selectedClub
                      ? 'text-light-text dark:text-dark-text'
                      : 'text-light-subtle dark:text-dark-subtle'
                  }`}
                  numberOfLines={1}
                >
                  {selectedClub ? selectedClub.name : 'Select a club…'}
                </Text>
                <Ionicons
                  name={pickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={surfaces.light.muted}
                  onPress={() => setPickerOpen((o) => !o)}
                />
              </>
            )}
          </View>
          {/* Inline dropdown when open */}
          {pickerOpen && !clubsLoading ? (
            <View className="mt-1 max-h-56 overflow-hidden rounded-2xl border border-light-border bg-light-surface shadow-ambient dark:border-dark-border dark:bg-dark-surface">
              <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {approvedClubs.map((club, i) => (
                  <View key={club.id}>
                    <Text
                      className="px-4 py-3 text-sm font-semibold text-light-text dark:text-dark-text"
                      onPress={() => handleSelectClub(club.id)}
                    >
                      {club.name}
                    </Text>
                    {i < approvedClubs.length - 1 ? <Divider variant="hairline" /> : null}
                  </View>
                ))}
                {approvedClubs.length === 0 ? (
                  <Text className="px-4 py-3 text-sm text-light-muted dark:text-dark-muted">
                    No approved clubs yet.
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Email input + assign button */}
        <View className="gap-3">
          <Input
            label="Admin email"
            value={adminEmail}
            onChangeText={setAdminEmail}
            placeholder="student@lwsd.org"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
            returnKeyType="done"
            onSubmitEditing={handleAssign}
          />
          {assignError ? (
            <ErrorBanner message={assignError} onDismiss={() => setAssignError(null)} />
          ) : null}
          <Button
            label="Add admin"
            variant="primary"
            size="md"
            icon="person-add-outline"
            loading={assigning}
            disabled={assigning || !selectedClubId}
            onPress={handleAssign}
            fullWidth
          />
        </View>

        {/* Current admins for selected club */}
        {selectedClubId ? (
          <View className="mt-5">
            <Divider variant="hairline" className="mb-4" />
            <Text className="mb-3 text-xs font-semibold text-light-muted dark:text-dark-muted">
              Current admins for {selectedClub?.name ?? '…'}
            </Text>
            {adminsLoading ? (
              <View className="gap-2">
                <Skeleton height={44} radius="lg" />
                <Skeleton height={44} radius="lg" />
              </View>
            ) : adminsError ? (
              <ErrorBanner message={adminsError} onDismiss={() => setAdminsError(null)} />
            ) : admins.length === 0 ? (
              <View className="items-center py-6">
                <Ionicons name="people-outline" size={28} color={surfaces.light.subtle} />
                <Text className="mt-2 text-sm text-light-muted dark:text-dark-muted">
                  No admins assigned yet.
                </Text>
              </View>
            ) : (
              admins.map((admin, i) => {
                const initials = admin.displayName
                  ? admin.displayName
                      .trim()
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : admin.email.slice(0, 2).toUpperCase();
                return (
                  <View key={admin.userId}>
                    <View className="flex-row items-center gap-3 py-2.5">
                      <Avatar size="sm" tone="neutral" initials={initials} />
                      <View className="flex-1">
                        {admin.displayName ? (
                          <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
                            {admin.displayName}
                          </Text>
                        ) : null}
                        <Text
                          className="text-xs text-light-muted dark:text-dark-muted"
                          numberOfLines={1}
                        >
                          {admin.email}
                        </Text>
                      </View>
                      <Button
                        label=""
                        variant="ghost"
                        size="sm"
                        icon="close-circle-outline"
                        loading={removingId === admin.userId}
                        disabled={removingId !== null}
                        onPress={() => handleRemove(admin.userId)}
                        accessibilityLabel={`Remove ${admin.email} as admin`}
                        className="h-auto px-1 py-1"
                      />
                    </View>
                    {i < admins.length - 1 ? <Divider variant="hairline" /> : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Not configured notice
// ---------------------------------------------------------------------------

function NotConfiguredNotice() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="h-14 w-14 items-center justify-center rounded-xl bg-warn/10 dark:bg-warn/20">
        <Ionicons name="cloud-offline-outline" size={32} color={semantic.warn} />
      </View>
      <Text className="mt-5 text-center text-lg font-semibold text-light-text dark:text-dark-text">
        Backend not configured
      </Text>
      <Text className="mt-2 max-w-xs text-center text-sm leading-5 text-light-muted dark:text-dark-muted">
        Admin tools require a live InsForge backend. Set{' '}
        <Text className="font-bold text-light-secondary dark:text-dark-secondary">
          EXPO_PUBLIC_INSFORGE_URL
        </Text>{' '}
        and{' '}
        <Text className="font-bold text-light-secondary dark:text-dark-secondary">
          EXPO_PUBLIC_INSFORGE_ANON_KEY
        </Text>{' '}
        in your environment, then reload.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Restricted notice (signed in but not special_admin)
// ---------------------------------------------------------------------------

function RestrictedNotice() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="h-14 w-14 items-center justify-center rounded-xl bg-danger/10 dark:bg-danger/20">
        <Ionicons name="lock-closed" size={32} color={semantic.danger} />
      </View>
      <Text className="mt-5 text-center text-lg font-semibold text-light-text dark:text-dark-text">
        Restricted
      </Text>
      <Text className="mt-2 max-w-xs text-center text-sm leading-5 text-light-muted dark:text-dark-muted">
        This dashboard is only accessible to the school's special admin. If you believe this is a
        mistake, contact your system administrator.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dashboard (special_admin only)
// ---------------------------------------------------------------------------

function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  // --- Pending clubs ---
  const [pendingClubs, setPendingClubs] = useState<PendingClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [clubsError, setClubsError] = useState<string | null>(null);

  const loadPendingClubs = useCallback(async () => {
    setClubsLoading(true);
    setClubsError(null);
    try {
      const data = await fetchPendingClubs();
      setPendingClubs(data);
    } catch {
      setClubsError('Failed to load pending clubs.');
    }
    setClubsLoading(false);
  }, []);

  // --- Pending presidents ---
  const [pendingPresidents, setPendingPresidents] = useState<PendingPresident[]>([]);
  const [presidentsLoading, setPresidentsLoading] = useState(true);
  const [presidentsError, setPresidentsError] = useState<string | null>(null);

  const loadPendingPresidents = useCallback(async () => {
    setPresidentsLoading(true);
    setPresidentsError(null);
    try {
      const data = await fetchPendingPresidents();
      setPendingPresidents(data);
    } catch {
      setPresidentsError('Failed to load pending presidents.');
    }
    setPresidentsLoading(false);
  }, []);

  // --- Approved clubs (for admin assignment picker) ---
  const [approvedClubs, setApprovedClubs] = useState<Club[]>([]);
  const [approvedClubsLoading, setApprovedClubsLoading] = useState(true);

  const loadApprovedClubs = useCallback(async () => {
    setApprovedClubsLoading(true);
    const { clubs } = await fetchClubs();
    setApprovedClubs(clubs);
    setApprovedClubsLoading(false);
  }, []);

  useEffect(() => {
    void loadPendingClubs();
    void loadPendingPresidents();
    void loadApprovedClubs();
  }, [loadPendingClubs, loadPendingPresidents, loadApprovedClubs]);

  const totalPending = pendingClubs.length + pendingPresidents.length;

  const displayName = profile?.display_name ?? profile?.email ?? 'Admin';

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-5 pb-8"
    >
      {/* Header */}
      <View
        className="flex-row items-start justify-between pb-1"
        style={{ paddingTop: insets.top + 8 }}
      >
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          scaleTo={0.9}
          className="mr-3 mt-1 h-9 w-9 items-center justify-center rounded-lg border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface"
        >
          <Ionicons name="chevron-back" size={18} color={brand.blue} />
        </PressableScale>
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-semibold tracking-tight text-light-text dark:text-dark-text">
            Admin dashboard
          </Text>
          <Text className="mt-1 text-sm leading-5 text-light-muted dark:text-dark-muted">
            Approve clubs, verify presidents, transfer ownership, and post school-wide.
          </Text>
        </View>
        <ThemeToggle />
      </View>

      {/* Profile chip */}
      <Card elevation="ambient" className="mt-5 flex-row items-center gap-3 rounded-2xl p-2.5 pr-4">
        <Avatar
          size="md"
          tone="brand"
          initials={displayName.slice(0, 2).toUpperCase()}
        />
        <View className="flex-1">
          <Text className="text-xs font-semibold text-light-muted dark:text-dark-muted">
            Signed in as
          </Text>
          <Text className="mt-0.5 text-sm font-semibold text-light-text dark:text-dark-text" numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <View className="flex-row items-center gap-2 rounded-full bg-success/10 dark:bg-success/20 px-2.5 py-1">
          <View className="h-2 w-2 rounded-full bg-python-green" />
          <Text className="text-xs font-semibold text-light-muted dark:text-dark-muted">
            Active
          </Text>
        </View>
      </Card>

      {/* Live stats row */}
      <View className="mt-4 flex-row gap-3">
        <StatTile
          icon="hourglass-outline"
          value={clubsLoading ? '…' : String(pendingClubs.length)}
          label="Clubs pending"
          tone="brand"
        />
        <StatTile
          icon="shield-half-outline"
          value={presidentsLoading ? '…' : String(pendingPresidents.length)}
          label="Presidents pending"
          tone="info"
        />
        <StatTile
          icon="albums-outline"
          value={approvedClubsLoading ? '…' : String(approvedClubs.length)}
          label="Approved clubs"
          tone="neutral"
        />
      </View>

      {/* Overall alert banner when there are items to review */}
      {totalPending > 0 && !clubsLoading && !presidentsLoading ? (
        <View className="mt-4 flex-row items-center gap-2 rounded-xl bg-warn/10 dark:bg-warn/20 px-3 py-2.5">
          <Ionicons name="alert-circle" size={15} color={semantic.warn} />
          <Text className="flex-1 text-xs font-semibold text-warn">
            {totalPending} item{totalPending === 1 ? '' : 's'} need your attention.
          </Text>
        </View>
      ) : null}

      {/* Section 1: Club approval queue */}
      <ClubQueueSection
        pendingClubs={pendingClubs}
        loading={clubsLoading}
        error={clubsError}
        onRefresh={loadPendingClubs}
      />

      {/* Section 2: President verification queue */}
      <PresidentQueueSection
        pendingPresidents={pendingPresidents}
        loading={presidentsLoading}
        error={presidentsError}
        onRefresh={loadPendingPresidents}
      />

      {/* Section 3: Club admin management */}
      <ClubAdminSection
        approvedClubs={approvedClubs}
        clubsLoading={approvedClubsLoading}
      />

      {/* Section 4: Presidents claiming clubs that already exist */}
      <ClubClaimSection />

      {/* Section 5: School-wide announcements */}
      <SchoolAnnouncementSection />

      {/* Section 6: Ownership transfer and archiving */}
      <ClubLifecycleSection clubs={approvedClubs} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Screen root
// ---------------------------------------------------------------------------

export default function AdminScreen() {
  const { configured, loading, profile } = useAuth();

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate
        title="Admin sign-in"
        subtitle="Special-admin access for Tesla STEM Clubs."
      >
        {/* Brief loading flash while session resolves */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={brand.blue} />
          </View>
        ) : !configured ? (
          <NotConfiguredNotice />
        ) : profile?.role !== 'special_admin' ? (
          <RestrictedNotice />
        ) : (
          <AdminDashboard />
        )}
      </SignInGate>
    </View>
  );
}
