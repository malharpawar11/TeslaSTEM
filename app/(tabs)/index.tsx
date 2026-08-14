import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Gradient, BRAND_COLORS_RICH } from '@/components/Gradient';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Button,
  Card,
  EmptyState,
  PressableScale,
  SectionHeader,
  SkeletonRow,
  Tag,
} from '@/components/ui';
import { AnnouncementCard, EventCard, FileRow, RoleBadge } from '@/components/ClubContentCards';
import { useAuth } from '@/context/AuthContext';
import { useClubs } from '@/context/ClubsContext';
import { useMemberships } from '@/context/MembershipContext';
import { useNotifications } from '@/context/NotificationsContext';
import { fetchDashboard, EMPTY_DASHBOARD, type Dashboard } from '@/data/feedRepo';
import { clubInitials } from '@/types/domain';
import { duration } from '@/theme/motion';
import { brand } from '@/theme/tokens';

/* ----------------------------------------------------------------------------
 * Signed-out hero — the public front door of the directory.
 * -------------------------------------------------------------------------- */
function Hero() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clubs, loading } = useClubs();

  return (
    <Gradient
      colors={BRAND_COLORS_RICH as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      locations={[0, 0.5, 1] as unknown as readonly [number, number, ...number[]]}
      className="flex-1"
    >
      <View
        pointerEvents="none"
        className="absolute inset-0 bg-python-blue-900/20 dark:bg-black/35"
      />

      <View
        className="flex-row items-center justify-between px-6"
        style={{ paddingTop: insets.top + 2 }}
      >
        <Animated.View
          entering={FadeIn.duration(duration.lg)}
          className="flex-row items-center gap-2"
        >
          <Image
            source={require('../../assets/teslastemlogo.png')}
            style={{ width: 20, height: 20 }}
            resizeMode="contain"
            accessibilityLabel="Tesla STEM Pythons logo"
          />
          <Text className="text-2xs font-semibold uppercase tracking-widest text-white/85">
            Tesla STEM Pythons
          </Text>
        </Animated.View>
        <ThemeToggle variant="translucent" />
      </View>

      <View className="flex-1 justify-center px-7" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="max-w-[520px]">
          {/* Live proof — the real club count, or nothing while it loads. */}
          {!loading && clubs.length > 0 ? (
            <Animated.Text
              entering={FadeInDown.duration(duration.lg)}
              className="text-2xs font-bold uppercase tracking-widest text-white/70"
            >
              {clubs.length} clubs · one hub
            </Animated.Text>
          ) : null}

          <Animated.Text
            entering={FadeInDown.delay(120).duration(duration.xl)}
            className="mt-4 text-5xl font-extrabold tracking-tightest text-white"
          >
            Every club.{'\n'}
            <Text className="text-white/70">One place.</Text>
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(220).duration(duration.xl)}
            className="mt-3 max-w-[420px] text-base leading-6 text-white/75"
          >
            Join clubs, get their announcements, files, and events, and keep every meeting on one
            calendar — instead of five group chats.
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(340).duration(duration.xl)} className="mt-7">
            <Button
              label="Explore the directory"
              onPress={() => router.push('/browse')}
              variant="primary"
              size="xl"
              fullWidth
              className="h-[60px] bg-white shadow-floating"
            >
              <Text className="flex-1 text-center text-lg font-bold tracking-tight text-python-blue-700">
                Explore the directory
              </Text>
              <Ionicons name="arrow-forward" size={22} color="#0F4C92" />
            </Button>
            <Button
              label="Sign in with your @lwsd.org account"
              onPress={() => router.push('/account')}
              variant="ghost"
              size="lg"
              fullWidth
              className="mt-3"
            >
              <Text className="text-center text-sm font-semibold text-white">
                Sign in with your @lwsd.org account
              </Text>
            </Button>
          </Animated.View>
        </View>
      </View>
    </Gradient>
  );
}

/* ----------------------------------------------------------------------------
 * Signed-in dashboard — everything from every club the student joined.
 * -------------------------------------------------------------------------- */
function MyClubsRow({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  if (dashboard.clubs.length === 0) {
    return (
      <EmptyState
        icon="people-outline"
        title="You haven't joined any clubs yet"
        description="Browse the directory and join a club to see its announcements, files, and events here."
        actionLabel="Browse clubs"
        onAction={() => router.push('/browse')}
        tone="brand"
      />
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10 }}
    >
      {dashboard.clubs.map((club) => (
        <PressableScale
          key={club.id}
          onPress={() => router.push(`/club/${club.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${club.name}`}
          scaleTo={0.96}
          className="w-[196px] rounded-3xl border border-light-border bg-light-surface p-3.5 dark:border-dark-border dark:bg-dark-surface"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-2xl bg-python-green/14">
              <Text className="text-2xs font-extrabold text-python-green-dark dark:text-python-green-light">
                {clubInitials(club.name)}
              </Text>
            </View>
            <Text
              className="flex-1 text-sm font-bold text-light-text dark:text-dark-text"
              numberOfLines={2}
            >
              {club.name}
            </Text>
          </View>
          <View className="mt-2.5 flex-row items-center gap-1.5">
            {club.status === 'pending' ? (
              <Tag label="Pending approval" tone="warn" />
            ) : (
              <RoleBadge role={club.role} position={club.position} />
            )}
          </View>
          <Text className="mt-1.5 text-2xs text-light-muted dark:text-dark-muted">
            {club.memberCount} member{club.memberCount === 1 ? '' : 's'}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { refresh: refreshMemberships } = useMemberships();
  const { unreadCount, refresh: refreshNotifications } = useNotifications();
  const [dashboard, setDashboard] = useState<Dashboard>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchDashboard(8);
    setDashboard(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Returning to Home after joining a club should show the change without a
  // manual pull — one request, only when the screen is actually visible.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshMemberships(), refreshNotifications()]);
    setRefreshing(false);
  }, [load, refreshMemberships, refreshNotifications]);

  const firstName = useMemo(() => {
    const name = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'there';
    return name.split(/[\s.]/)[0];
  }, [profile]);

  const nothingNew =
    dashboard.clubs.length > 0 &&
    dashboard.events.length === 0 &&
    dashboard.announcements.length === 0 &&
    dashboard.files.length === 0;

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.green} />
      }
    >
      <View
        className="flex-row items-start justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-1 pr-3">
          <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
            Dashboard
          </Text>
          <Text className="mt-1.5 text-3xl font-extrabold tracking-tighter text-light-text dark:text-dark-text">
            Hey {firstName}
          </Text>
        </View>
        <View className="flex-row items-center gap-2 pt-1">
          <PressableScale
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel="Search clubs, announcements, files, and events"
            scaleTo={0.92}
            className="h-9 w-9 items-center justify-center rounded-full border border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2"
          >
            <Ionicons name="search" size={17} color={brand.green} />
          </PressableScale>
          <ThemeToggle />
        </View>
      </View>

      {loading ? (
        <View className="px-5 pt-6">
          <SkeletonRow count={3} />
        </View>
      ) : (
        <>
          <View className="px-5 pt-5">
            <SectionHeader eyebrow="MY CLUBS" title="Your clubs" size="sm" />
            <View className="mt-3">
              <MyClubsRow dashboard={dashboard} />
            </View>
          </View>

          {unreadCount > 0 ? (
            <Animated.View entering={FadeInDown.duration(300)} className="px-5 pt-5">
              <PressableScale
                onPress={() => router.push('/notifications')}
                accessibilityRole="button"
                accessibilityLabel={`${unreadCount} unread notifications`}
                scaleTo={0.98}
              >
                <Card elevation="ambient" className="flex-row items-center gap-3 p-4">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-danger/12">
                    <Ionicons name="notifications" size={18} color="#E11D48" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                      {unreadCount} new update{unreadCount === 1 ? '' : 's'}
                    </Text>
                    <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted">
                      Tap to open your notifications
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </Card>
              </PressableScale>
            </Animated.View>
          ) : null}

          {dashboard.events.length > 0 ? (
            <View className="px-5 pt-6">
              <SectionHeader
                eyebrow="UPCOMING"
                title="Next up"
                size="sm"
                trailing={
                  <Button
                    label="Calendar"
                    variant="ghost"
                    size="sm"
                    iconRight="chevron-forward"
                    onPress={() => router.push('/calendar')}
                  />
                }
              />
              <View className="mt-3 gap-3">
                {dashboard.events.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} showClub />
                ))}
              </View>
            </View>
          ) : null}

          {dashboard.announcements.length > 0 ? (
            <View className="px-5 pt-6">
              <SectionHeader eyebrow="ANNOUNCEMENTS" title="Recent posts" size="sm" />
              <View className="mt-3 gap-3">
                {dashboard.announcements.slice(0, 4).map((announcement) => (
                  <AnnouncementCard key={announcement.id} announcement={announcement} showClub />
                ))}
              </View>
            </View>
          ) : null}

          {dashboard.files.length > 0 ? (
            <View className="px-5 pt-6">
              <SectionHeader eyebrow="RESOURCES" title="New files" size="sm" />
              <View className="mt-3 gap-2.5">
                {dashboard.files.slice(0, 4).map((file) => (
                  <FileRow key={file.id} file={file} showClub />
                ))}
              </View>
            </View>
          ) : null}

          {nothingNew ? (
            <View className="px-5 pt-8">
              <EmptyState
                icon="sparkles-outline"
                title="All caught up"
                description="Nothing new from your clubs yet. Announcements, files, and events land here as soon as they're posted."
                tone="neutral"
              />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { session, configured } = useAuth();

  if (!configured || !session) {
    return <Hero />;
  }
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <DashboardScreen />
    </View>
  );
}
