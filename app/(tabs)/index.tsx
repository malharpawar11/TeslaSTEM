import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Image, ScrollView, RefreshControl } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useIsFocused } from "@react-navigation/native";
import { CampusVisual, PageIntro } from "@/components/CampusVisual";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Gradient, BRAND_COLORS_RICH } from "@/components/Gradient";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Button,
  Card,
  EmptyState,
  PressableScale,
  SectionHeader,
  SkeletonRow,
  Tag,
} from "@/components/ui";
import {
  AnnouncementCard,
  EventCard,
  FileRow,
  RoleBadge,
} from "@/components/ClubContentCards";
import { useAuth } from "@/context/AuthContext";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useNotifications } from "@/context/NotificationsContext";
import {
  fetchDashboard,
  EMPTY_DASHBOARD,
  type Dashboard,
} from "@/data/feedRepo";
import { clubInitials } from "@/types/domain";
import { duration } from "@/theme/motion";
import { brand, surfaces } from "@/theme/tokens";

/* ----------------------------------------------------------------------------
 * Signed-out hero: the public front door of the directory.
 * -------------------------------------------------------------------------- */
function Hero() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { clubs, loading } = useClubs();
  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Gradient
        colors={["#10285D", "#104A51"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 20, overflow: "hidden" }}
      >
        <CampusVisual active={focused} />
        <View className="px-7 pb-10">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Image
                source={require("../../assets/teslastemlogo.png")}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
                accessibilityLabel="Tesla STEM Pythons logo"
              />
              <Text className="text-base font-bold text-white">
                Tesla STEM Clubs
              </Text>
            </View>
            <ThemeToggle variant="translucent" />
          </View>
          <View className="mt-12 self-start rounded-full border border-white/20 bg-white/10 px-3 py-2">
            <Text className="text-2xs font-bold tracking-widest text-white/80">
              YOUR CAMPUS. YOUR COMMUNITY.
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            className="mt-6 max-w-xl text-5xl font-bold tracking-tight text-white"
          >
            Find your people.{"\n"}Build your future.
          </Text>
          <Text className="mt-4 max-w-md text-base leading-6 text-white/75">
            Explore the clubs that match your curiosity. Make connections,
            discover opportunities, and keep every deadline in view.
          </Text>
          <View className="mt-7 self-start">
            <Button
              label="Explore clubs"
              iconRight="arrow-forward"
              size="xl"
              variant="success"
              onPress={() => router.push("/browse")}
            />
          </View>
          {!loading && clubs.length > 0 ? (
            <View className="mt-7 flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-python-green-light" />
              <Text className="text-sm text-white/75">
                {clubs.length} clubs. A place for every interest.
              </Text>
            </View>
          ) : null}
        </View>
      </Gradient>
      <View className="gap-5 px-6 pt-7">
        <SectionHeader
          eyebrow="MADE FOR STUDENTS"
          title="Your next chapter starts here"
          size="lg"
        />
        {(
          [
            {
              icon: "compass-outline",
              title: "Discover your fit",
              body: "Filter by interests, career goals, and when you are free.",
              route: "/browse",
            },
            {
              icon: "calendar-outline",
              title: "Stay one step ahead",
              body: "Meetings and deadlines from all your clubs in one calendar.",
              route: "/calendar",
            },
            {
              icon: "chatbubbles-outline",
              title: "Start a conversation",
              body: "Reach your club board directly. No email hunting.",
              route: "/messages",
            },
          ] as const
        ).map((item) => (
          <PressableScale
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => router.push(item.route)}
            className="flex-row items-center gap-4 rounded-2xl border border-light-border bg-light-surface p-5 dark:border-dark-border dark:bg-dark-surface"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-python-blue/10">
              <Ionicons name={item.icon} size={24} color={brand.blue} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-light-text dark:text-dark-text">
                {item.title}
              </Text>
              <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
                {item.body}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={brand.blue} />
          </PressableScale>
        ))}
        <Button
          label="Sign in with your @lwsd.org account"
          variant="outline"
          size="lg"
          fullWidth
          onPress={() => router.push("/account")}
        />
        <Text className="text-center text-xs text-light-muted dark:text-dark-muted">
          Explore freely. Sign in to join clubs and personalize your campus.
        </Text>
      </View>
    </ScrollView>
  );
}

/* ----------------------------------------------------------------------------
 * Signed-in dashboard: everything from every club the student joined.
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
        onAction={() => router.push("/browse")}
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
          className="w-[240px] rounded-2xl border border-light-border bg-light-surface p-5 dark:border-dark-border dark:bg-dark-surface"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-python-blue/10 dark:bg-python-blue/20">
              <Text className="text-2xs font-semibold text-python-blue-dark dark:text-python-blue-light">
                {clubInitials(club.name)}
              </Text>
            </View>
            <Text
              className="flex-1 text-sm font-semibold text-light-text dark:text-dark-text"
              numberOfLines={2}
            >
              {club.name}
            </Text>
          </View>
          <View className="mt-2.5 flex-row items-center gap-1.5">
            {club.status === "pending" ? (
              <Tag label="Pending" tone="warn" />
            ) : (
              <RoleBadge role={club.role} position={club.position} />
            )}
          </View>
          <Text className="mt-1.5 text-xs text-light-muted dark:text-dark-muted">
            {club.memberCount} member{club.memberCount === 1 ? "" : "s"}
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchDashboard(8);
      setDashboard(data);
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not load your dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Returning to Home after joining a club should show the change without a
  // manual pull: one request, only when the screen is actually visible.
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
    const name =
      profile?.display_name ?? profile?.email?.split("@")[0] ?? "there";
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
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={brand.blue}
        />
      }
    >
      <View
        className="flex-row items-start justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-semibold tracking-tight text-light-text dark:text-dark-text">
            Hi, {firstName}
          </Text>
          <Text className="mt-0.5 text-sm text-light-muted dark:text-dark-muted">
            Updates from your clubs
          </Text>
          {error ? (
            <>
              <Text className="mt-2 text-danger">{error}</Text>
              <Button label="Retry" onPress={() => void load()} />
            </>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2 pt-1">
          <PressableScale
            onPress={() => router.push("/search")}
            accessibilityRole="button"
            accessibilityLabel="Search clubs, announcements, files, and events"
            scaleTo={0.92}
            className="h-9 w-9 items-center justify-center rounded-lg border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface"
          >
            <Ionicons name="search" size={17} color={brand.blue} />
          </PressableScale>
          <ThemeToggle />
        </View>
      </View>

      <View className="px-5 pt-5">
        <PageIntro
          eyebrow="YOUR CAMPUS / TODAY"
          title="Make room for what matters."
          description="Your clubs, conversations, and next opportunities. All connected."
        >
          <Button
            label="Discover something new"
            variant="success"
            size="md"
            iconRight="arrow-forward"
            onPress={() => router.push("/browse")}
          />
        </PageIntro>
      </View>

      {loading ? (
        <View className="px-5 pt-6">
          <SkeletonRow count={3} />
        </View>
      ) : (
        <>
          <View className="px-5 pt-5">
            <SectionHeader title="Your clubs" size="sm" />
            <View className="mt-3">
              <MyClubsRow dashboard={dashboard} />
            </View>
          </View>

          {unreadCount > 0 ? (
            <Animated.View
              entering={FadeIn.duration(180)}
              className="px-5 pt-5"
            >
              <PressableScale
                onPress={() => router.push("/notifications")}
                accessibilityRole="button"
                accessibilityLabel={`${unreadCount} unread notifications`}
                scaleTo={0.98}
              >
                <Card
                  elevation="ambient"
                  className="flex-row items-center gap-3 p-3.5"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-python-blue/10 dark:bg-python-blue/20">
                    <Ionicons
                      name="notifications-outline"
                      size={17}
                      color={brand.blue}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
                      {unreadCount} new update{unreadCount === 1 ? "" : "s"}
                    </Text>
                    <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted">
                      Open your notifications
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={surfaces.light.subtle}
                  />
                </Card>
              </PressableScale>
            </Animated.View>
          ) : null}

          {dashboard.events.length > 0 ? (
            <View className="px-5 pt-6">
              <SectionHeader
                title="Upcoming"
                size="sm"
                trailing={
                  <Button
                    label="Calendar"
                    variant="ghost"
                    size="sm"
                    iconRight="chevron-forward"
                    onPress={() => router.push("/calendar")}
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
              <SectionHeader title="Announcements" size="sm" />
              <View className="mt-3 gap-3">
                {dashboard.announcements.slice(0, 4).map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    showClub
                  />
                ))}
              </View>
            </View>
          ) : null}

          {dashboard.files.length > 0 ? (
            <View className="px-5 pt-6">
              <SectionHeader title="Files" size="sm" />
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
