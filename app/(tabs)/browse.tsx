import { useCallback, useMemo, useState, useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { ActiveFilters, ActiveFilter } from "@/components/clubs/ActiveFilters";
import { CategoryIndex } from "@/components/clubs/CategoryIndex";
import { ClubEntry } from "@/components/clubs/ClubEntry";
import { ClubSearch } from "@/components/clubs/ClubSearch";
import { FilterSection } from "@/components/clubs/FilterSection";
import { ViewSwitch } from "@/components/clubs/ViewSwitch";
import { WeekBoard } from "@/components/clubs/WeekBoard";
import { WeekGrid } from "@/components/clubs/WeekGrid";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Check,
  Display,
  Page,
  TextLink,
  TextTabs,
  useHover,
  webFade,
  webSticky,
} from "@/components/system";
import { Button, EmptyState, SkeletonRow } from "@/components/ui";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import {
  CAREERS,
  CLUB_SORTS,
  DAYS,
  filterClubs,
  meetingDays,
  recommendationReasons,
  type DiscoveryFilters,
} from "@/lib/discovery";
import { useLayout } from "@/theme/layout";
import type { Club } from "@/types/domain";

const FILTERS = [
  "All",
  "STEM",
  "Academic",
  "Service",
  "Arts",
  "Wellness",
  "Business",
  "Culture",
  "Sports",
];
const VIEWS = ["List", "Week"] as const;
type ViewMode = (typeof VIEWS)[number];

function CareerOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="radio"
      aria-checked={active}
      accessibilityLabel={label}
      className="min-h-10 flex-row items-center gap-2.5"
    >
      <View
        className={`h-4 w-4 rounded-full border-2 ${active ? "border-[5px] border-python-blue" : "border-light-border-strong dark:border-dark-border-strong"}`}
      />
      <Text
        className={`text-base ${active || hovered ? "font-bold text-light-text dark:text-dark-text" : "text-light-secondary dark:text-dark-secondary"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function periodShort(period: string) {
  return period === "At Lunch" ? "lunch" : period.toLowerCase();
}

export default function BrowseScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    day?: string;
    period?: string;
  }>();
  const { contentWidth, isDesktop, height, gutter } = useLayout();
  const router = useRouter();
  const screenFocused = useIsFocused();
  const reduced = useReducedMotion();
  const { isMember, membershipFor, memberships, join, leave } = useMemberships();
  const { toast } = useToast();
  const { clubs, loading, error, refresh } = useClubs();
  const { preferences } = usePreferences();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [joinedOnly, setJoinedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [career, setCareer] = useState("All careers");
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [day, setDay] = useState("Any day");
  const [period, setPeriod] = useState("Any time");
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState("Best fit");
  const [mode, setMode] = useState<ViewMode>("List");

  // Links from the home page land on a ready-made filter.
  useEffect(() => {
    if (params.category) setFilter(String(params.category));
    if (params.day) setDay(String(params.day));
    if (params.period) setPeriod(String(params.period));
  }, [params.category, params.day, params.period]);

  const active = useCallback(
    (id: string) => memberships.get(id)?.status === "active",
    [memberships],
  );
  const run = useCallback(
    (override: Partial<DiscoveryFilters>) =>
      filterClubs(
        clubs,
        {
          query,
          category: filter,
          joinedOnly,
          availableOnly,
          career,
          recommendedOnly,
          day,
          period,
          openOnly,
          sort,
          ...override,
        },
        preferences,
        active,
      ),
    [
      clubs,
      query,
      filter,
      joinedOnly,
      availableOnly,
      career,
      recommendedOnly,
      day,
      period,
      openOnly,
      sort,
      preferences,
      active,
    ],
  );

  const data = useMemo(() => run({}), [run]);
  // Each filter's counts reflect every other active filter, so a number is
  // always what you'd get by choosing it.
  const counts = useMemo<Record<string, number>>(() => {
    const pool = run({ category: "All" });
    const m: Record<string, number> = { All: pool.length };
    for (const club of pool) m[club.category] = (m[club.category] ?? 0) + 1;
    return m;
  }, [run]);
  const weekPool = useMemo(
    () => run({ day: "Any day", period: "Any time" }),
    [run],
  );
  const categories = useMemo(() => {
    const present = new Set(clubs.map((c) => c.category as string));
    return FILTERS.filter((f) => f === "All" || present.has(f));
  }, [clubs]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setFilter("All");
    setJoinedOnly(false);
    setAvailableOnly(false);
    setCareer("All careers");
    setRecommendedOnly(false);
    setDay("Any day");
    setPeriod("Any time");
    setOpenOnly(false);
    setSort("Best fit");
    if (params.category || params.day || params.period)
      router.setParams({ category: "", day: "", period: "" });
  }, [params.category, params.day, params.period, router]);

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

  const open = useCallback(
    (id: string) => router.push(`/club/${id}`),
    [router],
  );

  const toggleFit = () => {
    if (!preferences.availability.length) {
      router.push("/onboarding");
      return;
    }
    setAvailableOnly((v) => !v);
  };
  const toggleRecommended = () => {
    if (
      !preferences.interests.length &&
      !preferences.careers.length &&
      !preferences.availability.length
    ) {
      router.push("/onboarding");
      return;
    }
    setRecommendedOnly((v) => !v);
  };

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];
    if (query.trim())
      list.push({ key: "q", label: `"${query.trim()}"`, clear: () => setQuery("") });
    if (filter !== "All")
      list.push({ key: "cat", label: filter, clear: () => setFilter("All") });
    if (day !== "Any day" || period !== "Any time")
      list.push({
        key: "when",
        label:
          day !== "Any day" && period !== "Any time"
            ? `${day} ${periodShort(period)}`
            : day !== "Any day"
              ? day
              : periodShort(period).replace(/^./, (c) => c.toUpperCase()),
        clear: () => {
          setDay("Any day");
          setPeriod("Any time");
        },
      });
    if (career !== "All careers")
      list.push({
        key: "career",
        label: career,
        clear: () => setCareer("All careers"),
      });
    if (availableOnly)
      list.push({
        key: "fit",
        label: "Fits my schedule",
        clear: () => setAvailableOnly(false),
      });
    if (recommendedOnly)
      list.push({
        key: "rec",
        label: "Recommended",
        clear: () => setRecommendedOnly(false),
      });
    if (joinedOnly)
      list.push({
        key: "joined",
        label: "Clubs I joined",
        clear: () => setJoinedOnly(false),
      });
    if (openOnly)
      list.push({
        key: "open",
        label: "Join without approval",
        clear: () => setOpenOnly(false),
      });
    return list;
  }, [query, filter, day, period, career, availableOnly, recommendedOnly, joinedOnly, openOnly]);

  const reasons = useMemo(() => {
    const map = new Map<string, string[]>();
    if (sort === "Best fit" && preferences.completed)
      for (const club of data)
        map.set(club.id, recommendationReasons(club, preferences).slice(0, 2));
    return map;
  }, [data, sort, preferences]);

  // Group headings follow the sort: letters when it's alphabetical, matches
  // when it's personal, nothing when it's a ranking by size.
  const groups = useMemo(() => {
    const matched = (club: Club) => (reasons.get(club.id)?.length ?? 0) > 0;
    const personal = sort === "Best fit" && data.some(matched);
    if (personal)
      return [
        { title: "Matches for you", items: data.filter(matched) },
        { title: "More clubs", items: data.filter((c) => !matched(c)) },
      ].filter((g) => g.items.length > 0);
    if (sort === "Most members") return [{ title: "", items: data }];
    const letters = new Map<string, Club[]>();
    for (const club of data) {
      const first = club.name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      letters.set(key, [...(letters.get(key) ?? []), club]);
    }
    return [...letters.entries()].map(([title, items]) => ({ title, items }));
  }, [data, reasons, sort]);

  // Laptops keep the filter column; only tablets and phones fold it away.
  const sidebar = isDesktop && contentWidth >= 860;
  const sidebarWidth = contentWidth >= 1320 ? 348 : contentWidth >= 1000 ? 312 : 284;
  const resultsWidth = sidebar
    ? contentWidth - gutter * 2 - sidebarWidth - 56
    : contentWidth - gutter * 2;
  const wideEntry = resultsWidth >= 600;
  const narrowToolbar = resultsWidth < 620;
  const filtered = activeFilters.length > 0;

  const preferencesPanel = (
    <FilterSection title="For you">
      <Check label="Fits my schedule" checked={availableOnly} onToggle={toggleFit} />
      <Check label="Recommended" checked={recommendedOnly} onToggle={toggleRecommended} />
      <Check
        label="Clubs I joined"
        checked={joinedOnly}
        onToggle={() => setJoinedOnly((v) => !v)}
      />
      <Check
        label="Join without approval"
        checked={openOnly}
        onToggle={() => setOpenOnly((v) => !v)}
      />
      <TextLink
        label={
          preferences.completed
            ? "Edit interests and free time"
            : "Set interests and free time"
        }
        onPress={() => router.push("/onboarding")}
      />
      {availableOnly ? (
        <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
          Pacific time. Clubs without a published time are left out.
        </Text>
      ) : null}
    </FilterSection>
  );

  const weekPanel = (
    <FilterSection title="When it meets">
      <WeekGrid
        clubs={weekPool}
        day={day}
        period={period}
        onChange={(d, p) => {
          setDay(d);
          setPeriod(p);
        }}
      />
      {DAYS.slice(5).some((d) =>
        clubs.some((c) => meetingDays(c.day).includes(d)),
      ) ? (
        <View className="mt-2 flex-row gap-5">
          {DAYS.slice(5).map((d) => (
            <CareerOption
              key={d}
              label={d}
              active={day === d}
              onPress={() => setDay(day === d ? "Any day" : d)}
            />
          ))}
        </View>
      ) : null}
    </FilterSection>
  );

  const careerPanel = (
    <FilterSection
      title="Career goal"
      collapsible
      summary={career !== "All careers" ? career : undefined}
    >
      <View accessibilityRole="radiogroup" accessibilityLabel="Career goal">
        {["All careers", ...Object.keys(CAREERS)].map((option) => (
          <CareerOption
            key={option}
            label={option}
            active={career === option}
            onPress={() => setCareer(option)}
          />
        ))}
      </View>
    </FilterSection>
  );

  const sortTabs = (
    <TextTabs
      label="Sort clubs"
      options={CLUB_SORTS as string[]}
      value={sort}
      onChange={setSort}
    />
  );

  const body =
    loading && clubs.length === 0 ? (
      <View className="pt-4">
        <SkeletonRow count={5} />
      </View>
    ) : error ? (
      <EmptyState
        title="Couldn't load clubs"
        description={error}
        actionLabel="Retry"
        onAction={refresh}
      />
    ) : data.length === 0 ? (
      <EmptyState
        title={clubs.length === 0 ? "No clubs yet" : "Nothing matches that"}
        description={
          clubs.length === 0
            ? "Approved clubs appear here once an admin publishes them."
            : "Remove a filter or try a different search."
        }
        actionLabel={filtered ? "Clear filters" : "Submit a club"}
        onAction={filtered ? clearFilters : () => router.push("/club/new")}
      />
    ) : mode === "Week" ? (
      <View className="pt-4">
        <WeekBoard
          clubs={data}
          isJoined={(id) => memberships.get(id)?.status === "active"}
          onOpen={open}
        />
      </View>
    ) : (
      <LayoutAnimationConfig skipEntering>
        {groups.map((group) => (
          <View key={group.title || "all"}>
            {group.title ? (
              <Display
                fontSize={group.title.length === 1 ? 34 : 30}
                accessibilityRole="header"
                className="mt-7 text-python-blue dark:text-python-blue-light"
              >
                {group.title}
              </Display>
            ) : null}
            {group.items.map((club) => (
              <Animated.View
                key={club.id}
                entering={reduced ? undefined : FadeIn.duration(150)}
                layout={reduced ? undefined : LinearTransition.duration(200)}
              >
                <ClubEntry
                  club={club}
                  joined={isMember(club.id)}
                  pending={membershipFor(club.id)?.status === "pending"}
                  wide={wideEntry}
                  reasons={reasons.get(club.id) ?? []}
                  onOpen={open}
                  onToggle={toggleJoin}
                />
              </Animated.View>
            ))}
          </View>
        ))}
      </LayoutAnimationConfig>
    );

  const countLabel = filtered
    ? `${data.length} of ${clubs.length} clubs`
    : `${data.length} club${data.length === 1 ? "" : "s"}`;

  return (
    <Page
      onRefresh={() => void refresh()}
      refreshing={loading && clubs.length > 0}
      maxWidth={1720}
    >
      {/* Masthead: the title and the search share one line on wide screens. */}
      <View
        className={sidebar ? "flex-row items-end gap-14" : ""}
        style={{ zIndex: 30 }}
      >
        <View
          className="flex-row items-start justify-between"
          style={sidebar ? { width: sidebarWidth } : undefined}
        >
          <View className="flex-row items-start">
            <Display
              fontSize={contentWidth < 640 ? 88 : sidebarWidth < 300 ? 116 : 136}
              accessibilityRole="header"
            >
              Clubs
            </Display>
            <Text className="ml-1.5 mt-2 text-lg font-bold text-python-blue dark:text-python-blue-light">
              {clubs.length || ""}
            </Text>
          </View>
          {!isDesktop ? <ThemeToggle /> : null}
        </View>
        <View className={sidebar ? "flex-1" : "mt-2"} style={{ minWidth: 0 }}>
          <ClubSearch
            value={query}
            onChangeText={setQuery}
            clubs={clubs}
            focusedScreen={screenFocused}
            onOpen={open}
          />
        </View>
      </View>

      <View className={`mt-2 ${sidebar ? "flex-row items-start gap-14" : ""}`}>
        {sidebar ? (
          <View
            style={[
              {
                width: sidebarWidth,
                maxHeight: height,
                paddingTop: 22,
                paddingBottom: 24,
                overflow: "auto" as never,
              },
              webSticky(0),
            ]}
          >
            <CategoryIndex
              options={categories}
              value={filter}
              counts={counts}
              onChange={setFilter}
            />
            {weekPanel}
            {preferencesPanel}
            {careerPanel}
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 20 }}
            >
              {categories.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  accessibilityRole="radio"
                  aria-checked={filter === f}
                  accessibilityLabel={`${f}, ${counts[f] ?? 0} clubs`}
                  className="min-h-12 flex-row items-start"
                  style={[
                    {
                      borderBottomWidth: 4,
                      borderBottomColor:
                        filter === f ? "#3068F0" : "transparent",
                    },
                    webFade("border-bottom-color"),
                  ]}
                >
                  <Display fontSize={32}>{f}</Display>
                  <Text className="ml-0.5 mt-1 text-xs font-bold text-light-muted dark:text-dark-muted">
                    {counts[f] ?? 0}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View className="mt-3 flex-row items-center justify-between">
              <Button
                label={`More filters${activeFilters.filter((f) => f.key !== "cat" && f.key !== "q").length ? ` (${activeFilters.filter((f) => f.key !== "cat" && f.key !== "q").length})` : ""}`}
                variant="secondary"
                icon={showFilters ? "chevron-up" : "options-outline"}
                onPress={() => setShowFilters((v) => !v)}
              />
            </View>
            {showFilters ? (
              <Animated.View
                entering={FadeIn.duration(160)}
                exiting={FadeOut.duration(120)}
                className="border-b-2 border-light-text pb-6 dark:border-dark-text"
              >
                {weekPanel}
                {preferencesPanel}
                {careerPanel}
                <View className="mt-5">
                  <Button
                    label={`Show ${data.length} clubs`}
                    fullWidth
                    onPress={() => setShowFilters(false)}
                  />
                </View>
              </Animated.View>
            ) : null}
          </>
        )}

        <View className={sidebar ? "flex-1" : ""} style={{ minWidth: 0 }}>
          {/* Stays in view so count, sort and layout are always one reach away. */}
          <View
            className="border-b-2 border-light-text bg-light-bg pb-3 pt-5 dark:border-dark-text dark:bg-dark-bg"
            style={[{ zIndex: 20 }, webSticky(0)]}
          >
            <View className="flex-row items-center justify-between gap-6">
              <Display
                size="md"
                accessibilityLiveRegion="polite"
                numberOfLines={1}
                className="shrink text-light-text dark:text-dark-text"
              >
                {countLabel}
              </Display>
              <View className="flex-row items-center gap-8">
                {mode === "List" && !narrowToolbar ? sortTabs : null}
                <ViewSwitch options={VIEWS} value={mode} onChange={setMode} />
              </View>
            </View>
            {mode === "List" && narrowToolbar ? (
              <View className="mt-1">{sortTabs}</View>
            ) : null}
            {filtered ? (
              <View className="mt-3">
                <ActiveFilters filters={activeFilters} onClearAll={clearFilters} />
              </View>
            ) : null}
          </View>

          {sort === "Best fit" && !preferences.completed && mode === "List" ? (
            <Pressable
              onPress={() => router.push("/onboarding")}
              accessibilityRole="link"
              className="min-h-11 justify-center pt-3"
            >
              <Text className="text-base text-light-secondary underline dark:text-dark-secondary">
                Tell us your interests and free time to rank these for you
              </Text>
            </Pressable>
          ) : null}

          <Animated.View
            key={mode}
            entering={reduced ? undefined : FadeIn.duration(180)}
          >
            {body}
          </Animated.View>
        </View>
      </View>
    </Page>
  );
}
