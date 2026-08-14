import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignInGate } from '@/components/SignInGate';
import { Button, Card, Chip, EmptyState, PressableScale, SkeletonRow } from '@/components/ui';
import { relativeDate } from '@/components/ClubContentCards';
import { useNotifications } from '@/context/NotificationsContext';
import { useClubs } from '@/context/ClubsContext';
import { brand } from '@/theme/tokens';
import type { AppNotification, NotificationType } from '@/types/domain';

/**
 * The notification centre. Rows are read-only records written by database
 * triggers; the one action a student has is marking them read, plus tapping
 * through to whatever the notification is about.
 */

const META: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string }> = {
  announcement: { icon: 'megaphone-outline', tint: '#4CAF50', bg: 'bg-python-green/12' },
  school_announcement: { icon: 'school-outline', tint: '#1565C0', bg: 'bg-python-blue/12' },
  event_created: { icon: 'calendar-outline', tint: '#1565C0', bg: 'bg-python-blue/12' },
  event_updated: { icon: 'refresh-outline', tint: '#1565C0', bg: 'bg-python-blue/12' },
  event_cancelled: { icon: 'close-circle-outline', tint: '#E11D48', bg: 'bg-danger/12' },
  event_reminder: { icon: 'alarm-outline', tint: '#D97706', bg: 'bg-warn/14' },
  file_uploaded: { icon: 'document-outline', tint: '#1565C0', bg: 'bg-python-blue/12' },
  note_posted: { icon: 'reader-outline', tint: '#4CAF50', bg: 'bg-python-green/12' },
  join_request: { icon: 'person-add-outline', tint: '#D97706', bg: 'bg-warn/14' },
  board_request: { icon: 'ribbon-outline', tint: '#D97706', bg: 'bg-warn/14' },
  membership_approved: { icon: 'checkmark-circle-outline', tint: '#4CAF50', bg: 'bg-python-green/12' },
  board_approved: { icon: 'shield-checkmark-outline', tint: '#4CAF50', bg: 'bg-python-green/12' },
  board_rejected: { icon: 'close-circle-outline', tint: '#E11D48', bg: 'bg-danger/12' },
  club_approved: { icon: 'trophy-outline', tint: '#4CAF50', bg: 'bg-python-green/12' },
  club_rejected: { icon: 'alert-circle-outline', tint: '#E11D48', bg: 'bg-danger/12' },
};

/** Requests need the manager's attention; the rest are informational. */
const ACTIONABLE: NotificationType[] = ['join_request', 'board_request'];

function NotificationRow({
  notification,
  clubName,
  onPress,
}: {
  notification: AppNotification;
  clubName?: string;
  onPress: () => void;
}) {
  const meta = META[notification.type] ?? META.announcement;
  const unread = !notification.readAt;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      scaleTo={0.98}
    >
      <Card
        elevation="ambient"
        className={`flex-row items-start gap-3 p-4 ${unread ? 'border border-python-green/40' : ''}`}
      >
        <View className={`h-10 w-10 items-center justify-center rounded-2xl ${meta.bg}`}>
          <Ionicons name={meta.icon} size={18} color={meta.tint} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="flex-1 text-sm font-bold text-light-text dark:text-dark-text"
              numberOfLines={2}
            >
              {notification.title}
            </Text>
            {unread ? <View className="h-2 w-2 rounded-full bg-python-green" /> : null}
          </View>
          {notification.body ? (
            <Text
              className="mt-1 text-xs leading-5 text-light-muted dark:text-dark-muted"
              numberOfLines={3}
            >
              {notification.body}
            </Text>
          ) : null}
          <Text className="mt-1.5 text-2xs text-light-subtle dark:text-dark-subtle">
            {[clubName, relativeDate(notification.createdAt)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
}

type Filter = 'All' | 'Unread' | 'Requests';

function NotificationsInbox() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, unreadCount, loading, markRead, refresh } = useNotifications();
  const { clubs } = useClubs();
  const [filter, setFilter] = useState<Filter>('All');
  const [refreshing, setRefreshing] = useState(false);

  const clubNames = useMemo(() => new Map(clubs.map((c) => [c.id, c.name])), [clubs]);

  const visible = useMemo(() => {
    if (filter === 'Unread') return notifications.filter((n) => !n.readAt);
    if (filter === 'Requests') return notifications.filter((n) => ACTIONABLE.includes(n.type));
    return notifications;
  }, [notifications, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const openNotification = useCallback(
    (n: AppNotification) => {
      if (!n.readAt) void markRead([n.id]);
      if (!n.clubId) return;
      // Requests are handled in the club's management area; everything else
      // belongs on the club page itself.
      if (ACTIONABLE.includes(n.type)) router.push(`/club/${n.clubId}/manage`);
      else router.push(`/club/${n.clubId}`);
    },
    [markRead, router],
  );

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
            Notifications
          </Text>
          <Text className="mt-1.5 text-3xl font-extrabold tracking-tighter text-light-text dark:text-dark-text">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        <View className="pt-1">
          <ThemeToggle />
        </View>
      </View>

      <View className="mt-4 flex-row items-center gap-2 px-5">
        {(['All', 'Unread', 'Requests'] as Filter[]).map((option) => (
          <Chip
            key={option}
            label={option}
            active={filter === option}
            onPress={() => setFilter(option)}
            size="sm"
          />
        ))}
        <View className="flex-1" />
        {unreadCount > 0 ? (
          <Button
            label="Mark all read"
            variant="ghost"
            size="sm"
            onPress={() => void markRead()}
          />
        ) : null}
      </View>

      {loading && notifications.length === 0 ? (
        <View className="px-5 pt-6">
          <SkeletonRow count={4} />
        </View>
      ) : visible.length === 0 ? (
        <View className="pt-10">
          <EmptyState
            icon="notifications-off-outline"
            title={filter === 'All' ? 'Nothing yet' : `No ${filter.toLowerCase()} notifications`}
            description="Announcements, event changes, new files, and membership decisions from your clubs show up here."
            tone="neutral"
          />
        </View>
      ) : (
        <View className="gap-2.5 px-5 pt-5">
          {visible.map((n, index) => (
            <Animated.View
              key={n.id}
              entering={FadeInDown.delay(Math.min(index * 35, 240)).duration(320)}
            >
              <NotificationRow
                notification={n}
                clubName={n.clubId ? clubNames.get(n.clubId) : 'Tesla STEM'}
                onPress={() => openNotification(n)}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate
        title="Sign in for notifications"
        subtitle="Your club updates are tied to your @lwsd.org account."
      >
        <NotificationsInbox />
      </SignInGate>
    </View>
  );
}
