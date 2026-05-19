import { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Club } from '@/types/domain';
import { useClubs } from '@/context/ClubsContext';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips } from '@/components/FilterChips';
import { ClubCard } from '@/components/ClubCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useFollows } from '@/context/FollowContext';

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

export default function BrowseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFollowing, toggleFollow } = useFollows();
  const { clubs } = useClubs();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) => {
      const matchesFilter = filter === 'All' || c.category === filter;
      const matchesQuery =
        !q ||
        [c.name, c.advisor, c.day, c.time, c.category, c.description, c.location]
          .join(' ')
          .toLowerCase()
          .includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [clubs, query, filter]);

  const renderItem = useCallback(
    ({ item, index }: { item: Club; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 350)).duration(420)}>
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

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <View className="px-5 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-light-text dark:text-dark-text">
              Browse Clubs
            </Text>
            <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
              {clubs.length} clubs at Tesla STEM
            </Text>
          </View>
          <ThemeToggle />
        </View>
        <View className="mt-4">
          <SearchBar value={query} onChangeText={setQuery} />
        </View>
      </View>

      <View className="pb-1">
        <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pt-3 pb-36"
        ListEmptyComponent={
          <View className="mt-24 items-center px-8">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-python-blue/15">
              <Ionicons name="search" size={28} color="#1565C0" />
            </View>
            <Text className="mt-4 text-lg font-bold text-light-text dark:text-dark-text">
              No clubs found
            </Text>
            <Text className="mt-1 text-center text-sm text-light-muted dark:text-dark-muted">
              Try a different search term or filter.
            </Text>
          </View>
        }
      />
    </View>
  );
}
