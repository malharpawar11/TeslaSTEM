import { PageIntro } from '@/components/CampusVisual';
import { useMemo, useState, useCallback } from "react";
import { View, Text, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Club, ClubCategory } from "@/types/domain";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useToast } from "@/context/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { SearchBar } from "@/components/SearchBar";
import { FilterChips } from "@/components/FilterChips";
import { ClubCard } from "@/components/ClubCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Button,
  Chip,
  EmptyState,
  SkeletonRow,
  PressableScale,
} from "@/components/ui";
import { usePreferences } from "@/context/PreferencesContext";
import {
  CAREERS,
  fitsAvailability,
  careerMatches,
  recommendationReasons,
} from "@/lib/discovery";
import { brand } from "@/theme/tokens";

const FILTERS = [
  "All",
  "STEM",
  "Arts",
  "Service",
  "Sports",
  "Culture",
  "Academic",
  "Business",
  "Wellness",
];

export default function BrowseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isMember, membershipFor, memberships, join, leave } =
    useMemberships();
  const { toast } = useToast();
  const { clubs, loading, error, refresh } = useClubs();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [joinedOnly, setJoinedOnly] = useState(false);
  const { preferences } = usePreferences();
  const [availableOnly, setAvailableOnly] = useState(false);
  const [career, setCareer] = useState("All careers");
  const [recommendedOnly, setRecommendedOnly] = useState(false);

  // Per-category counts, including 'All'. Computed once per clubs change.
  const counts = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = { All: clubs.length };
    for (const club of clubs) {
      m[club.category] = (m[club.category] ?? 0) + 1;
    }
    return m;
  }, [clubs]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs
      .filter((club) => {
        if (joinedOnly && memberships.get(club.id)?.status !== "active")
          return false;
        if (availableOnly && !fitsAvailability(club, preferences.availability))
          return false;
        if (career !== "All careers" && !careerMatches(club, career))
          return false;
        if (recommendedOnly && !recommendationReasons(club, preferences).length)
          return false;
        if (filter !== "All" && club.category !== (filter as ClubCategory))
          return false;
        if (!q) return true;
        return [
          club.name,
          club.advisor,
          club.day,
          club.time,
          club.category,
          club.description,
          club.location,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) =>
        recommendedOnly
          ? recommendationReasons(b, preferences).length -
            recommendationReasons(a, preferences).length
          : 0,
      );
  }, [
    clubs,
    query,
    filter,
    joinedOnly,
    memberships,
    availableOnly,
    career,
    recommendedOnly,
    preferences,
  ]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setFilter("All");
    setJoinedOnly(false);
    setAvailableOnly(false);
    setCareer("All careers");
    setRecommendedOnly(false);
  }, []);

  // Joining is a server action, so the card reports what actually happened:
  // including the "waiting for approval" case at clubs that vet their members.
  const toggleJoin = useCallback(
    async (club: Club) => {
      if (isMember(club.id)) {
        const res = await leave(club.id);
        toast(
          res.ok
            ? `Left ${club.name}`
            : (res.error ?? "Could not leave the club."),
          res.ok ? "info" : "error",
        );
        return;
      }
      const res = await join(club.id);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(
        res.status === "pending"
          ? `Requested to join ${club.name}: a club leader will review it.`
          : `Joined ${club.name}`,
      );
    },
    [isMember, join, leave, toast],
  );

  const renderItem = useCallback(
    ({ item }: { item: Club }) => (
      <View className="px-5"><ClubCard
        club={item}
        joined={isMember(item.id)}
        pending={membershipFor(item.id)?.status === "pending"}
        onPress={() => router.push(`/club/${item.id}`)}
        onToggleJoin={() => void toggleJoin(item)}
      /></View>
    ),
    [isMember, membershipFor, toggleJoin, router],
  );

  const filtersActive =
    !!query.trim() ||
    filter !== "All" ||
    joinedOnly ||
    availableOnly ||
    career !== "All careers" ||
    recommendedOnly;

  const body =
    loading && clubs.length === 0 ? (
      <View className="px-5 pt-4">
        <SkeletonRow count={4} />
      </View>
    ) : error ? (
      // A failed load is reported as a failure, never as an empty directory,
      // and never by falling back to placeholder clubs.
      <EmptyState
        icon="cloud-offline-outline"
        title="Couldn't load clubs"
        description={error}
        actionLabel="Retry"
        onAction={refresh}
      />
    ) : data.length === 0 ? (
      <EmptyState
        icon={clubs.length === 0 ? "people-outline" : "search-outline"}
        title={
          clubs.length === 0 ? "No clubs yet" : "No clubs match those filters"
        }
        description={
          clubs.length === 0
            ? "Approved clubs appear here once an admin publishes them."
            : "Try clearing your filters or search."
        }
        actionLabel={filtersActive ? "Clear filters" : "Submit a club"}
        onAction={filtersActive ? clearFilters : () => router.push("/club/new")}
      />
    ) : null;

  const header = (
      <View
        className="px-5 pb-3"
        style={{ paddingTop: insets.top + 10 }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-3xl font-bold tracking-tight text-light-text dark:text-dark-text">
              Discover clubs
            </Text>
            <Text className="mt-0.5 text-sm text-light-muted dark:text-dark-muted">
              {clubs.length} club{clubs.length === 1 ? "" : "s"} at Tesla STEM
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <PressableScale
              onPress={() => setJoinedOnly((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ selected: joinedOnly }}
              accessibilityLabel={
                joinedOnly ? "Show all clubs" : "Show only clubs I joined"
              }
              scaleTo={0.94}
              pressedOpacity={0.7}
              className={`h-9 flex-row items-center gap-1.5 rounded-lg border px-2.5 ${
                joinedOnly
                  ? "border-python-green/40 bg-python-green/10 dark:bg-python-green/20"
                  : "border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface"
              }`}
            >
              <Ionicons
                name={
                  joinedOnly ? "checkmark-circle" : "checkmark-circle-outline"
                }
                size={15}
                color={joinedOnly ? brand.green : brand.blue}
              />
              <Text
                className={`text-xs font-medium ${
                  joinedOnly
                    ? "text-python-green-dark dark:text-python-green-light"
                    : "text-light-secondary dark:text-dark-secondary"
                }`}
              >
                Joined
              </Text>
            </PressableScale>
            <ThemeToggle />
          </View>
        </View>

        <View className="mt-5"><PageIntro eyebrow="EXPLORE / CONNECT / GROW" title="A club for your curiosity." description="Find a community that fits your goals and your week." /></View>
        <View className="mt-3">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            resultCount={query.length === 0 ? undefined : data.length}
          />
        </View>

        <View className="-mx-5 mt-2">
          <FilterChips
            options={FILTERS}
            selected={filter}
            onSelect={setFilter}
            counts={counts}
          />
        </View>
        <View className="flex-row flex-wrap gap-2 py-2">
          <Chip
            label="Fits my schedule"
            active={availableOnly}
            onPress={() => {
              if (!preferences.availability.length) {
                router.push("/onboarding");
                return;
              }
              setAvailableOnly((v) => !v);
            }}
          />
          <Chip
            label="Recommended"
            active={recommendedOnly}
            onPress={() => {
              if (
                !preferences.interests.length &&
                !preferences.careers.length &&
                !preferences.availability.length
              ) {
                router.push("/onboarding");
                return;
              }
              setRecommendedOnly((v) => !v);
            }}
          />
          <Button
            label="Edit preferences"
            variant="ghost"
            size="sm"
            onPress={() => router.push("/onboarding")}
          />
        </View>
        <View className="-mx-5">
          <FilterChips
            options={["All careers", ...Object.keys(CAREERS)]}
            selected={career}
            onSelect={setCareer}
          />
        </View>
        {availableOnly ? (
          <Text className="pb-2 text-xs text-light-muted dark:text-dark-muted">
            Pacific time · Unknown meeting times are excluded.
          </Text>
        ) : null}
      </View>

  );

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      {body ? <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>{header}{body}</ScrollView> : (
        <FlatList
          ListHeaderComponent={header}
          data={data}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          // The list is the only in-flow child of a flex-1 container, so it
          // must explicitly claim the space. react-native-web's ScrollView
          // grows by default; native ScrollView does not: without flex:1 the
          // list has no viewport and renders zero rows on iOS/Android.
          style={{ flex: 1 }}
          refreshing={loading}
          onRefresh={() => void refresh()}
          contentContainerStyle={{
            paddingTop: 12,
            paddingHorizontal: 0,
            paddingBottom: 32,
          }}
          initialNumToRender={8}
          windowSize={9}
        />
      )}
    </View>
  );
}
