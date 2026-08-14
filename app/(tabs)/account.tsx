import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, Divider, PressableScale, Tag } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignInGate } from '@/components/SignInGate';
import { useAuth } from '@/context/AuthContext';
import { useClubs } from '@/context/ClubsContext';
import { useMemberships } from '@/context/MembershipContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useToast } from '@/context/ToastContext';
import { requestPresidentVerification } from '@/data/adminRepo';
import { registerForPush } from '@/lib/push';
import { roleLabel, type NotificationPrefs } from '@/types/domain';
import { brand } from '@/theme/tokens';

const ROLE_LABEL: Record<string, string> = {
  special_admin: 'School Admin',
  verified_president: 'Verified President',
  club_admin: 'Club Admin',
  student: 'Student',
};

const PREF_ROWS: {
  key: keyof NotificationPrefs;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'announcements', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'events', label: 'Events & changes', icon: 'calendar-outline' },
  { key: 'files', label: 'New files', icon: 'document-outline' },
  { key: 'notes', label: 'Notes & resources', icon: 'reader-outline' },
  { key: 'reminders', label: 'Meeting reminders', icon: 'alarm-outline' },
];

function ToggleRow({
  label,
  icon,
  value,
  onToggle,
  last = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  return (
    <PressableScale
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      scaleTo={0.99}
      className={`flex-row items-center gap-3 py-3 ${
        last ? '' : 'border-b border-light-hairline dark:border-dark-border'
      }`}
    >
      <Ionicons name={icon} size={16} color={brand.green} />
      <Text className="flex-1 text-sm font-medium text-light-text dark:text-dark-text">{label}</Text>
      <View
        className={`h-6 w-10 justify-center rounded-full px-0.5 ${
          value ? 'bg-python-green' : 'bg-light-border dark:bg-dark-border'
        }`}
      >
        <View className={`h-5 w-5 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`} />
      </View>
    </PressableScale>
  );
}

function AccountDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, signOut, refreshProfile, isSpecialAdmin } = useAuth();
  const { clubs } = useClubs();
  const { memberships } = useMemberships();
  const { prefsFor, savePrefs } = useNotifications();
  const { toast } = useToast();

  const [signingOut, setSigningOut] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const displayName = profile?.display_name ?? profile?.email ?? 'Student';
  const initials = displayName.slice(0, 2).toUpperCase();
  const globalPrefs = prefsFor(null);

  const myClubs = useMemo(
    () =>
      [...memberships.values()]
        .map((m) => ({ membership: m, club: clubs.find((c) => c.id === m.clubId) }))
        .filter((row) => !!row.club),
    [memberships, clubs],
  );

  const toggleGlobal = useCallback(
    async (key: keyof NotificationPrefs) => {
      const next = { ...globalPrefs, [key]: !globalPrefs[key] };
      const res = await savePrefs(null, next);
      if (!res.ok) toast(res.error ?? 'Could not save that preference.', 'error');
    },
    [globalPrefs, savePrefs, toast],
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  const handleRequestPresident = async () => {
    setRequesting(true);
    const res = await requestPresidentVerification();
    setRequesting(false);
    if (!res.ok) {
      toast(res.error, 'error');
      return;
    }
    setRequested(true);
    toast('Request sent to the school admin.');
    await refreshProfile();
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const res = await registerForPush();
    setEnablingPush(false);
    toast(
      res.ok ? 'Push notifications enabled on this device.' : res.error ?? 'Could not enable push.',
      res.ok ? 'success' : 'error',
    );
  };

  const presidentStatus = profile?.president_status;
  const showPresidentCta =
    profile?.role === 'student' && (!presidentStatus || presidentStatus === 'rejected');

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-5 pb-36"
    >
      <View
        className="flex-row items-start justify-between pb-1"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-1 pr-3">
          <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
            PROFILE
          </Text>
          <Text className="mt-1.5 text-3xl font-extrabold tracking-tighter text-light-text dark:text-dark-text">
            My account
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <Animated.View entering={FadeInDown.duration(340)}>
        <Card elevation="ambient" className="mt-5 flex-row items-center gap-3 rounded-2xl p-4">
          <Avatar size="lg" tone="brand" initials={initials} />
          <View className="flex-1">
            <Text
              className="text-base font-bold text-light-text dark:text-dark-text"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              className="mt-0.5 text-xs text-light-muted dark:text-dark-muted"
              numberOfLines={1}
            >
              {profile?.email}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
              <Tag label={ROLE_LABEL[profile?.role ?? 'student'] ?? 'Student'} tone="brand" />
              {presidentStatus === 'pending' ? (
                <Tag label="Verification pending" tone="warn" />
              ) : null}
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* My clubs */}
      <Animated.View entering={FadeInDown.delay(60).duration(340)}>
        <Text className="mb-2 mt-6 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
          My clubs ({myClubs.length})
        </Text>
        {myClubs.length === 0 ? (
          <Card elevation="ambient" className="p-4">
            <Text className="text-xs leading-5 text-light-muted dark:text-dark-muted">
              You haven't joined any clubs yet.
            </Text>
            <Button
              label="Browse clubs"
              variant="tonal"
              size="sm"
              className="mt-3"
              onPress={() => router.push('/browse')}
            />
          </Card>
        ) : (
          <View className="gap-2.5">
            {myClubs.map(({ membership, club }) => (
              <PressableScale
                key={membership.clubId}
                onPress={() => router.push(`/club/${membership.clubId}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${club!.name}`}
                scaleTo={0.98}
              >
                <Card elevation="ambient" className="flex-row items-center gap-3 p-3.5">
                  <View className="flex-1">
                    <Text
                      className="text-sm font-bold text-light-text dark:text-dark-text"
                      numberOfLines={1}
                    >
                      {club!.name}
                    </Text>
                    <Text className="mt-0.5 text-2xs text-light-muted dark:text-dark-muted">
                      {membership.status === 'pending'
                        ? 'Waiting for approval'
                        : roleLabel(membership.role, membership.position)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Card>
              </PressableScale>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Notification preferences — the account-wide defaults. Each club can
          override these from its own page. */}
      <Animated.View entering={FadeInDown.delay(120).duration(340)}>
        <Text className="mb-2 mt-6 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
          Notifications
        </Text>
        <Card elevation="ambient" className="px-4 py-1">
          {PREF_ROWS.map((row, i) => (
            <ToggleRow
              key={row.key}
              label={row.label}
              icon={row.icon}
              value={globalPrefs[row.key]}
              onToggle={() => void toggleGlobal(row.key)}
              last={i === PREF_ROWS.length - 1}
            />
          ))}
        </Card>
        <Text className="mt-2 text-2xs leading-4 text-light-subtle dark:text-dark-subtle">
          These are your defaults. Open a club and use its notification switches to change just that
          club.
        </Text>
        {Platform.OS !== 'web' ? (
          <Button
            label="Enable push on this device"
            variant="secondary"
            size="sm"
            icon="phone-portrait-outline"
            className="mt-3"
            loading={enablingPush}
            onPress={() => void handleEnablePush()}
          />
        ) : null}
      </Animated.View>

      {/* Leadership */}
      {showPresidentCta ? (
        <Animated.View entering={FadeInDown.delay(180).duration(340)}>
          <Card elevation="ambient" className="mt-6 p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="shield-checkmark-outline" size={16} color={brand.green} />
              <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                Run a club?
              </Text>
            </View>
            <Text className="mt-1.5 text-xs leading-5 text-light-muted dark:text-dark-muted">
              Ask the school admin to verify you as a club president, or claim your club directly
              from its page.
            </Text>
            <Button
              label={requested ? 'Request sent' : 'Request president verification'}
              variant={requested ? 'tonal' : 'primary'}
              size="sm"
              icon={requested ? 'checkmark' : 'paper-plane-outline'}
              loading={requesting}
              disabled={requesting || requested}
              onPress={() => void handleRequestPresident()}
              className="mt-3"
            />
          </Card>
        </Animated.View>
      ) : null}

      {/* Links */}
      <Animated.View entering={FadeInDown.delay(240).duration(340)}>
        <Text className="mb-2 mt-6 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
          More
        </Text>
        <Card elevation="ambient" className="px-4 py-1">
          <PressableScale
            onPress={() => router.push('/club/new')}
            accessibilityRole="button"
            accessibilityLabel="Submit a new club"
            scaleTo={0.99}
            className="flex-row items-center gap-3 border-b border-light-hairline py-3 dark:border-dark-border"
          >
            <Ionicons name="add-circle-outline" size={16} color={brand.green} />
            <Text className="flex-1 text-sm font-medium text-light-text dark:text-dark-text">
              Submit a new club
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </PressableScale>
          {isSpecialAdmin ? (
            <PressableScale
              onPress={() => router.push('/admin')}
              accessibilityRole="button"
              accessibilityLabel="School admin tools"
              scaleTo={0.99}
              className="flex-row items-center gap-3 border-b border-light-hairline py-3 dark:border-dark-border"
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={brand.green} />
              <Text className="flex-1 text-sm font-medium text-light-text dark:text-dark-text">
                School admin tools
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </PressableScale>
          ) : null}
          <PressableScale
            onPress={() => router.push('/policies')}
            accessibilityRole="button"
            accessibilityLabel="Policies"
            scaleTo={0.99}
            className="flex-row items-center gap-3 py-3"
          >
            <Ionicons name="document-text-outline" size={16} color={brand.green} />
            <Text className="flex-1 text-sm font-medium text-light-text dark:text-dark-text">
              Privacy & policies
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </PressableScale>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(340)}>
        <Divider variant="hairline" className="my-5" />
        <Button
          label="Sign out"
          variant="outline"
          size="md"
          icon="log-out-outline"
          loading={signingOut}
          onPress={() => void handleSignOut()}
          fullWidth
        />
      </Animated.View>
    </ScrollView>
  );
}

export default function AccountScreen() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate title="Sign in or sign up" subtitle="Access your Tesla STEM Clubs account.">
        <AccountDashboard />
      </SignInGate>
    </View>
  );
}
