import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BrandHeader } from '@/components/BrandHeader';
import { ClubCard } from '@/components/ClubCard';
import { describeDbError, fetchApprovedClubs } from '@/lib/db';
import { colors, radius } from '@/theme/tokens';
import type { Club } from '@/types/domain';

function searchIndex(club: Club) {
  return [club.name, club.category, club.advisor, club.meeting_day, club.location, club.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function BrowseScreen({ navigation }: any) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    // Only the very first read shows the full-screen spinner; refocusing the tab
    // refreshes in place so the list does not flash on every navigation.
    if (mode === 'refresh') setRefreshing(true);
    else if (!loadedOnce.current) setLoading(true);
    try {
      setClubs(await fetchApprovedClubs());
      loadedOnce.current = true;
      setError(null);
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-reads on focus so a club approved from the Admin tab shows up immediately.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clubs;
    return clubs.filter((club) => searchIndex(club).includes(needle));
  }, [clubs, query]);

  return (
    <View style={styles.container}>
      <BrandHeader />
      <TextInput
        placeholder="Search by club, category, day, advisor, or room"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        style={styles.search}
      />
      <Pressable style={styles.submit} onPress={() => navigation.navigate('SubmitClub')}>
        <Text style={styles.submitText}>+ Submit a club for approval</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={results}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ClubCard
              club={item}
              onPress={() => navigation.navigate('ClubProfile', { clubId: item.id })}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error
                ? error
                : query
                  ? 'No clubs match that search.'
                  : 'No approved clubs yet. Submitted clubs appear here once an admin approves them.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: 16,
    marginTop: 0,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submit: { paddingHorizontal: 16, paddingBottom: 12 },
  submitText: { color: colors.primary, fontWeight: '800' },
  spinner: { marginTop: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, lineHeight: 22 },
});
