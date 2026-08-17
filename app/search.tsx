import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '@/components/SearchBar';
import { Card, Chip, EmptyState, PressableScale, SkeletonRow, Tag } from '@/components/ui';
import { AnnouncementCard, EventCard, FileRow, NoteCard } from '@/components/ClubContentCards';
import { searchPlatform, searchResultCount, EMPTY_SEARCH, type SearchResults } from '@/data/feedRepo';
import { clubInitials } from '@/types/domain';
import { brand } from '@/theme/tokens';

/**
 * Search across clubs, announcements, events, files, and notes.
 *
 * The query runs as one SQL function that applies the same visibility rules as
 * the rest of the app — files and notes only match inside clubs the searcher
 * belongs to, and unapproved clubs never surface.
 */

type Kind = 'All' | 'Clubs' | 'Announcements' | 'Events' | 'Files' | 'Notes';
const KINDS: Kind[] = ['All', 'Clubs', 'Announcements', 'Events', 'Files', 'Notes'];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('All');
  const [results, setResults] = useState<SearchResults>(EMPTY_SEARCH);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(EMPTY_SEARCH);
      setLoading(false);
      return;
    }
    setLoading(true);
    setResults(await searchPlatform(q, 10));
    setLoading(false);
  }, []);

  // Debounced: one request per pause in typing rather than one per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => void run(query), 280);
    return () => clearTimeout(handle);
  }, [query, run]);

  const total = useMemo(() => searchResultCount(results), [results]);
  const show = (k: Kind) => kind === 'All' || kind === k;

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <View className="px-5" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-3">
          <PressableScale
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            scaleTo={0.9}
            className="h-9 w-9 items-center justify-center rounded-lg border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface"
          >
            <Ionicons name="chevron-back" size={18} color={brand.blue} />
          </PressableScale>
          <Text className="flex-1 text-xl font-semibold tracking-tight text-light-text dark:text-dark-text">
            Search
          </Text>
        </View>

        <View className="mt-3">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            resultCount={query.trim().length < 2 ? undefined : total}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 10 }}
        >
          {KINDS.map((k) => (
            <Chip key={k} label={k} active={kind === k} onPress={() => setKind(k)} size="sm" />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 60 }}
      >
        {query.trim().length < 2 ? (
          <View className="pt-10">
            <EmptyState
              icon="search-outline"
              title="Search everything"
              description="Clubs, announcements, events, files, and notes — filtered to what you're allowed to see."
              tone="neutral"
            />
          </View>
        ) : loading ? (
          <View className="pt-4">
            <SkeletonRow count={3} />
          </View>
        ) : total === 0 ? (
          <View className="pt-10">
            <EmptyState
              icon="search"
              title="No matches"
              description="Try a shorter query, or a club name."
              tone="neutral"
            />
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(220)} className="gap-5 pt-2">
            {show('Clubs') && results.clubs.length > 0 ? (
              <View>
                <Text className="mb-2 text-xs font-medium text-light-muted dark:text-dark-muted">
                  Clubs
                </Text>
                <View className="gap-2.5">
                  {results.clubs.map((club) => (
                    <PressableScale
                      key={club.id}
                      onPress={() => router.push(`/club/${club.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${club.name}`}
                      scaleTo={0.98}
                    >
                      <Card elevation="ambient" className="flex-row items-center gap-3 p-3.5">
                        <View className="h-10 w-10 items-center justify-center rounded-lg bg-python-blue/10 dark:bg-python-blue/20">
                          <Text className="text-2xs font-semibold text-python-blue-dark dark:text-python-blue-light">
                            {clubInitials(club.name)}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-sm font-semibold text-light-text dark:text-dark-text"
                            numberOfLines={1}
                          >
                            {club.name}
                          </Text>
                          <Text
                            className="mt-0.5 text-2xs text-light-muted dark:text-dark-muted"
                            numberOfLines={1}
                          >
                            {club.description}
                          </Text>
                        </View>
                        <Tag label={club.category} tone="info" />
                      </Card>
                    </PressableScale>
                  ))}
                </View>
              </View>
            ) : null}

            {show('Announcements') && results.announcements.length > 0 ? (
              <View>
                <Text className="mb-2 text-xs font-medium text-light-muted dark:text-dark-muted">
                  Announcements
                </Text>
                <View className="gap-3">
                  {results.announcements.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} showClub />
                  ))}
                </View>
              </View>
            ) : null}

            {show('Events') && results.events.length > 0 ? (
              <View>
                <Text className="mb-2 text-xs font-medium text-light-muted dark:text-dark-muted">
                  Events
                </Text>
                <View className="gap-3">
                  {results.events.map((event) => (
                    <EventCard key={event.id} event={event} showClub />
                  ))}
                </View>
              </View>
            ) : null}

            {show('Files') && results.files.length > 0 ? (
              <View>
                <Text className="mb-2 text-xs font-medium text-light-muted dark:text-dark-muted">
                  Files
                </Text>
                <View className="gap-2.5">
                  {results.files.map((file) => (
                    <FileRow key={file.id} file={file} showClub />
                  ))}
                </View>
              </View>
            ) : null}

            {show('Notes') && results.notes.length > 0 ? (
              <View>
                <Text className="mb-2 text-xs font-medium text-light-muted dark:text-dark-muted">
                  Notes & resources
                </Text>
                <View className="gap-3">
                  {results.notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={{
                        id: note.id,
                        clubId: note.clubId,
                        clubName: note.clubName,
                        title: note.title,
                        body: note.body,
                        category: note.category,
                        pinned: false,
                        updatedAt: note.updatedAt,
                        createdAt: note.updatedAt,
                      }}
                      showClub
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
