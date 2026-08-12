import { useMemo, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Club, ClubCategory } from '@/types/domain';
import { useClubs } from '@/context/ClubsContext';
import { useFollows } from '@/context/FollowContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips } from '@/components/FilterChips';
import { ClubCard } from '@/components/ClubCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { EmptyState, SkeletonRow, PressableScale } from '@/components/ui';
import { surface, brand } from '@/theme/tokens';

const FILTERS = [
  'All',
  'STEM',
  'Arts',
  'Service',
  'Sports',
  'Culture',
  'Academic',
  'Business',
  'Wellness',
];

// Scroll thresholds for the compressing header.
const HEADER_COLLAPSE_DISTANCE = 88;

export default function BrowseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const c = surface(isDark);
  const { isFollowing, toggleFollow, follows } = useFollows();
  const { clubs, loading, error, refresh } = useClubs();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [followingOnly, setFollowingOnly] = useState(false);

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
    return clubs.filter((club) => {
      if (followingOnly && !follows.has(club.id)) return false;
      if (filter !== 'All' && club.category !== (filter as ClubCategory)) return false;
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
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [clubs, query, filter, followingOnly, follows]);

  const clearFilters = useCallback(() => {
    setQuery('');
    setFilter('All');
    setFollowingOnly(false);
  }, []);

  // Measured height of the absolute sticky header — drives list paddingTop so
  // the first card is never hidden beneath it.
  const [headerHeight, setHeaderHeight] = useState(218);

  // Scroll-aware header: title shrinks, meta fades, SearchBar sticks.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const titleStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE],
      [1, 0.58],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE],
      [0, -6],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const metaStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE * 0.45],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const height = interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE],
      [20, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE],
      [0, -8],
      Extrapolation.CLAMP,
    );
    return { opacity, height, transform: [{ translateY }] };
  });

  const stickyBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_COLLAPSE_DISTANCE * 0.45, HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const stickyBorderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_COLLAPSE_DISTANCE * 0.6, HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const renderItem = useCallback(
    ({ item, index }: { item: Club; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index * 25, 220)).duration(380)}
      >
        <ClubCard
          club={item}
          followed={isFollowing(item.id)}
          onPress={() => router.push(`/club/${item.id}`)}
          onToggleFollow={() => toggleFollow(item.id)}
        />
      </Animated.View>
    ),
    [isFollowing, toggleFollow, router],
  );

  const filtersActive =
    !!query.trim() || filter !== 'All' || followingOnly;

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      {/* Sticky scroll-aware header (absolute over the list) */}
      <Animated.View
        pointerEvents="box-none"
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top,
        }}
      >
        {/* Filled background that appears once user scrolls */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: c.bg,
            },
            stickyBgStyle,
          ]}
        />

        <View className="px-5 pt-2.5">
          {/* Top row: title lockup + theme toggle */}
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Animated.Text
                style={[titleStyle, { transformOrigin: 'left center' as never }]}
                className="text-4xl font-extrabold tracking-tighter text-light-text dark:text-dark-text"
                numberOfLines={1}
              >
                Browse Clubs
              </Animated.Text>
              <Animated.View style={metaStyle} className="overflow-hidden">
                <Text
                  className="mt-1 text-sm font-medium text-light-muted dark:text-dark-muted"
                  numberOfLines={1}
                >
                  <Text className="font-semibold text-light-secondary dark:text-dark-secondary">
                    {clubs.length} clubs
                  </Text>
                  <Text className="text-light-subtle dark:text-dark-subtle">  ·  </Text>
                  Tesla STEM
                  <Text className="text-light-subtle dark:text-dark-subtle">  ·  </Text>
                  2026
                </Text>
              </Animated.View>
            </View>
            <View className="pt-1">
              <ThemeToggle />
            </View>
          </View>

          {/* SearchBar (becomes sticky as header collapses) */}
          <View className="mt-3.5">
            <SearchBar
              value={query}
              onChangeText={setQuery}
              resultCount={query.length === 0 ? undefined : data.length}
            />
          </View>
        </View>

        {/* Filter chips + Following heart toggle — single merged row */}
        <View className="mt-2 flex-row items-center pb-2">
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <FilterChips
              options={FILTERS}
              selected={filter}
              onSelect={setFilter}
              counts={counts}
            />
          </View>
          <View className="pr-4 pl-1">
            <PressableScale
              onPress={() => setFollowingOnly((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={followingOnly ? 'Show all clubs' : 'Show following only'}
              scaleTo={0.88}
              pressedOpacity={0.8}
              className={`h-9 w-9 items-center justify-center rounded-full ${
                followingOnly
                  ? 'bg-python-green'
                  : 'border border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2'
              }`}
            >
              <Ionicons
                name={followingOnly ? 'heart' : 'heart-outline'}
                size={17}
                color={followingOnly ? '#FFFFFF' : isDark ? '#8A8F99' : '#9CA3AF'}
              />
            </PressableScale>
          </View>
        </View>

        {/* Hairline that fades in when collapsed */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              height: 1,
              backgroundColor: isDark ? c.border : c.hairline,
            },
            stickyBorderStyle,
          ]}
        />
      </Animated.View>

      {/* Loading state */}
      {loading && clubs.length === 0 ? (
        <View
          style={{
            paddingTop: headerHeight + 8,
            paddingHorizontal: 20,
            paddingBottom: 120,
          }}
        >
          <SkeletonRow count={4} />
        </View>
      ) : error ? (
        // A failed load is reported as a failure — never as an empty directory,
        // and never by falling back to placeholder clubs.
        <View style={{ paddingTop: headerHeight + 8, paddingBottom: 120, flex: 1 }}>
          <EmptyState
            icon="cloud-offline"
            title="Couldn't load clubs"
            description={error}
            actionLabel="Retry"
            onAction={refresh}
          />
        </View>
      ) : data.length === 0 ? (
        // Empty state when no clubs match filters/search
        <View
          style={{
            paddingTop: headerHeight + 8,
            paddingBottom: 120,
            flex: 1,
          }}
        >
          <EmptyState
            icon={clubs.length === 0 ? 'people-outline' : 'search'}
            title={clubs.length === 0 ? 'No clubs yet' : 'No clubs match those filters'}
            description={
              clubs.length === 0
                ? 'Approved clubs appear here once an admin publishes them.'
                : 'Try clearing filters or your search.'
            }
            actionLabel={filtersActive ? 'Clear filters' : undefined}
            onAction={filtersActive ? clearFilters : undefined}
          />
        </View>
      ) : (
        <Animated.FlatList
          data={data}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          // The list is the only in-flow child of a flex-1 container, so it
          // must explicitly claim the space. react-native-web's ScrollView
          // grows by default; native ScrollView does not — without flex:1 the
          // list has no viewport and renders zero rows on iOS/Android.
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight + 8,
            paddingHorizontal: 20,
            paddingBottom: 120,
          }}
          // Web/native perf: only render what's needed. removeClippedSubviews
          // is intentionally omitted — it drops content on native when rows
          // are wrapped in entering-animated views, as they are here.
          initialNumToRender={8}
          windowSize={9}
        />
      )}

    </View>
  );
}
