import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Chip, EmptyState, SkeletonRow } from '@/components/ui';
import { EventCard } from '@/components/ClubContentCards';
import { useMemberships } from '@/context/MembershipContext';
import { useToast } from '@/context/ToastContext';
import { fetchUpcomingEvents } from '@/data/contentRepo';
import { dayLabel, downloadIcs } from '@/lib/calendar';
import { scheduleEventReminder } from '@/lib/push';
import { brand } from '@/theme/tokens';
import type { ClubEvent } from '@/types/domain';

type Scope = 'My clubs' | 'All clubs';

/**
 * One calendar for every club event the student can see, grouped by day.
 *
 * "Export" writes an .ics containing whatever is currently listed, so a
 * student can drop the whole term into Apple Calendar in one step, and each
 * card still offers a single-event Google/ICS add.
 */
export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast } = useToast();
  const { memberships } = useMemberships();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<Scope>('My clubs');

  const load = useCallback(async () => {
    const rows = await fetchUpcomingEvents(150);
    setEvents(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visible = useMemo(() => {
    if (scope === 'All clubs') return events;
    return events.filter((e) => memberships.get(e.clubId)?.status === 'active');
  }, [events, scope, memberships]);

  // Group by calendar day so the list reads like a schedule, not a feed.
  const groups = useMemo(() => {
    const map = new Map<string, ClubEvent[]>();
    for (const event of visible) {
      const key = event.startsAt.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  const exportAll = useCallback(async () => {
    if (visible.length === 0) {
      toast('No events to export yet.', 'info');
      return;
    }
    await downloadIcs(visible, scope === 'My clubs' ? 'My club events' : 'Tesla STEM club events');
  }, [visible, scope, toast]);

  /** Sets a local reminder an hour before each listed event. */
  const remindAll = useCallback(async () => {
    const ids = await Promise.all(visible.slice(0, 30).map((e) => scheduleEventReminder(e)));
    const count = ids.filter(Boolean).length;
    toast(
      count > 0
        ? `Reminders set for ${count} event${count === 1 ? '' : 's'}.`
        : 'No reminders set — enable notifications in your profile first.',
      count > 0 ? 'success' : 'info',
    );
  }, [visible, toast]);

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.blue} />
        }
      >
        <View
          className="flex-row items-start justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-semibold tracking-tight text-light-text dark:text-dark-text">
              Calendar
            </Text>
            <Text className="mt-0.5 text-sm text-light-muted dark:text-dark-muted">
              Meetings and events from your clubs
            </Text>
          </View>
          <View className="pt-1">
            <ThemeToggle />
          </View>
        </View>

        <View className="mt-4 flex-row items-center gap-2 px-5">
          {(['My clubs', 'All clubs'] as Scope[]).map((option) => (
            <Chip
              key={option}
              label={option}
              active={scope === option}
              onPress={() => setScope(option)}
            />
          ))}
        </View>

        <View className="mt-3 flex-row gap-2 px-5">
          <View className="flex-1">
            <Button
              label="Export .ics"
              variant="secondary"
              size="sm"
              icon="download-outline"
              fullWidth
              onPress={() => void exportAll()}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Remind me"
              variant="secondary"
              size="sm"
              icon="alarm-outline"
              fullWidth
              onPress={() => void remindAll()}
            />
          </View>
        </View>

        {loading ? (
          <View className="px-5 pt-6">
            <SkeletonRow count={4} />
          </View>
        ) : groups.length === 0 ? (
          <View className="pt-10">
            <EmptyState
              icon="calendar-outline"
              title={scope === 'My clubs' ? 'No events from your clubs' : 'No upcoming events'}
              description={
                scope === 'My clubs'
                  ? 'Join a club — or switch to All clubs to see everything happening at Tesla STEM.'
                  : 'Club leaders schedule meetings, competitions, and deadlines here.'
              }
              actionLabel={scope === 'My clubs' ? 'Browse clubs' : undefined}
              onAction={scope === 'My clubs' ? () => router.push('/browse') : undefined}
            />
          </View>
        ) : (
          groups.map(([day, dayEvents], groupIndex) => (
            <Animated.View
              key={day}
              entering={FadeIn.duration(180)}
              className="px-5 pt-6"
            >
              <Text className="mb-3 text-xs font-semibold text-light-muted dark:text-dark-muted">
                {dayLabel(dayEvents[0].startsAt)}
              </Text>
              <View className="gap-3">
                {dayEvents.map((event) => (
                  <EventCard key={event.id} event={event} showClub />
                ))}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
