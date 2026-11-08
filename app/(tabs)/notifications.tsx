import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useRouter } from "expo-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignInGate } from "@/components/SignInGate";
import { Display, Page, TextLink, TextTabs, useHover } from "@/components/system";
import { Button, EmptyState, SkeletonRow } from "@/components/ui";
import { relativeDate } from "@/components/ClubContentCards";
import { useNotifications } from "@/context/NotificationsContext";
import { useClubs } from "@/context/ClubsContext";
import { useLayout } from "@/theme/layout";
import type { AppNotification, NotificationType } from "@/types/domain";

/**
 * The notification centre. Rows are read-only records written by database
 * triggers; the one action a student has is marking them read, plus tapping
 * through to whatever the notification is about.
 *
 * Alerts are sorted into what they ask of the student rather than listed by
 * time alone, and each kind is set at a weight that matches its importance.
 */

const ACTIONABLE: NotificationType[] = ["join_request", "board_request"];

type Group = {
  key: string;
  title: string;
  types: NotificationType[];
  weight: "urgent" | "notice" | "row";
};

const GROUPS: Group[] = [
  {
    key: "needs",
    title: "Waiting on you",
    types: ["join_request", "board_request"],
    weight: "urgent",
  },
  {
    key: "school",
    title: "From the school",
    types: ["school_announcement"],
    weight: "notice",
  },
  {
    key: "schedule",
    title: "Meetings and deadlines",
    types: ["event_reminder", "event_cancelled", "event_updated", "event_created"],
    weight: "row",
  },
  {
    key: "clubs",
    title: "Club updates",
    types: ["announcement", "file_uploaded", "note_posted"],
    weight: "row",
  },
  {
    key: "membership",
    title: "Your memberships",
    types: [
      "membership_approved",
      "board_approved",
      "board_rejected",
      "club_approved",
      "club_rejected",
    ],
    weight: "row",
  },
];

const VERB: Partial<Record<NotificationType, string>> = {
  event_created: "New event",
  event_updated: "Changed",
  event_cancelled: "Cancelled",
  event_reminder: "Reminder",
  file_uploaded: "New file",
  note_posted: "New note",
  announcement: "Canvas link",
  join_request: "Join request",
  board_request: "Board request",
  membership_approved: "Approved",
  board_approved: "Approved",
  board_rejected: "Declined",
  club_approved: "Approved",
  club_rejected: "Declined",
};

function Alert({
  notification,
  clubName,
  weight,
  onPress,
}: {
  notification: AppNotification;
  clubName?: string;
  weight: Group["weight"];
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const unread = !notification.readAt;
  const bad =
    notification.type === "event_cancelled" ||
    notification.type.endsWith("rejected");
  const urgent = weight === "urgent";
  const meta = [VERB[notification.type], clubName, relativeDate(notification.createdAt)]
    .filter(Boolean)
    .join(", ");
  const titleTone = urgent
    ? "text-white"
    : unread
      ? "text-light-text dark:text-dark-text"
      : "text-light-muted dark:text-dark-muted";
  const soft = urgent
    ? "text-white"
    : "text-light-muted dark:text-dark-muted";
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Unread: " : ""}${notification.title}`}
      className={
        urgent
          ? `mb-2 rounded-md bg-python-blue px-5 py-4 ${hovered ? "opacity-90" : ""}`
          : `flex-row gap-3 border-b border-light-border py-3 dark:border-dark-border ${hovered ? "opacity-70" : ""}`
      }
    >
      {!urgent ? (
        <View
          className={`mt-2 h-2.5 w-2.5 rounded-full ${unread ? "bg-python-blue" : ""}`}
        />
      ) : null}
      <View className="flex-1">
        {weight === "row" ? (
          <Text
            className={`text-lg ${unread ? "font-bold" : ""} ${bad && unread ? "text-danger" : titleTone}`}
          >
            {notification.title}
          </Text>
        ) : (
          <Display size={weight === "notice" ? "md" : "sm"} className={titleTone}>
            {notification.title}
          </Display>
        )}
        {notification.body ? (
          <Text
            numberOfLines={3}
            className={`mt-0.5 max-w-3xl text-base ${urgent ? "text-white" : "text-light-secondary dark:text-dark-secondary"}`}
          >
            {notification.body}
          </Text>
        ) : null}
        <Text className={`mt-1 text-sm ${soft}`}>{meta}</Text>
      </View>
    </Pressable>
  );
}

type Filter = "All" | "Unread" | "Requests";

function NotificationsInbox() {
  const { isDesktop, isWide } = useLayout();
  const router = useRouter();
  const { notifications, unreadCount, loading, error, markRead, refresh } =
    useNotifications();
  const { clubs } = useClubs();
  const [filter, setFilter] = useState<Filter>("All");
  const [refreshing, setRefreshing] = useState(false);

  const clubNames = useMemo(
    () => new Map(clubs.map((c) => [c.id, c.name])),
    [clubs],
  );

  const visible = useMemo(() => {
    if (filter === "Unread") return notifications.filter((n) => !n.readAt);
    if (filter === "Requests")
      return notifications.filter((n) => ACTIONABLE.includes(n.type));
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

  const groups = GROUPS.map((group) => ({
    ...group,
    items: visible.filter((n) => group.types.includes(n.type)),
  })).filter((group) => group.items.length > 0);
  const name = (n: AppNotification) =>
    n.clubId ? clubNames.get(n.clubId) : "Tesla STEM";

  return (
    <Page onRefresh={() => void onRefresh()} refreshing={refreshing} maxWidth={1400}>
      <View className={isWide ? "flex-row items-start gap-16" : ""}>
        <View style={isWide ? { width: 280 } : undefined}>
          <View className="flex-row items-start justify-between">
            <View>
              <Display
                fontSize={unreadCount > 0 ? 148 : 96}
                accessibilityRole="header"
                accessibilityLabel={
                  unreadCount > 0 ? `${unreadCount} unread alerts` : "Alerts"
                }
              >
                {unreadCount > 0 ? unreadCount : "Alerts"}
              </Display>
              <Text className="text-lg text-light-secondary dark:text-dark-secondary">
                {error
                  ? "Updates are unavailable right now."
                  : unreadCount > 0
                    ? `unread ${unreadCount === 1 ? "alert" : "alerts"}`
                    : "You've read everything."}
              </Text>
            </View>
            {!isDesktop ? <ThemeToggle /> : null}
          </View>
          <View className="mt-5">
            <TextTabs
              label="Filter alerts"
              options={["All", "Unread", "Requests"] as Filter[]}
              value={filter}
              onChange={setFilter}
            />
            {unreadCount > 0 ? (
              <TextLink label="Mark all read" onPress={() => void markRead()} />
            ) : null}
          </View>
        </View>

        <View className="flex-1" style={{ minWidth: 0 }}>
          {error ? (
            <View className="items-start gap-3 pt-6">
              <Text className="text-danger">{error}</Text>
              <Button label="Retry" onPress={() => void refresh()} />
            </View>
          ) : loading && notifications.length === 0 ? (
            <View className="pt-6">
              <SkeletonRow count={4} />
            </View>
          ) : groups.length === 0 ? (
            <EmptyState
              title={
                filter === "All"
                  ? "Nothing yet"
                  : `No ${filter.toLowerCase()} alerts`
              }
              description="Event changes, new files and membership decisions from your clubs show up here."
            />
          ) : (
            groups.map((group) => (
              <View key={group.key} className="mb-10">
                <Display
                  size="sm"
                  className={`mb-2 text-light-text dark:text-dark-text ${group.weight === "urgent" ? "" : "border-b-2 border-light-text pb-1 dark:border-dark-text"}`}
                >
                  {group.title}
                </Display>
                {group.items.map((n) => (
                  <Alert
                    key={n.id}
                    notification={n}
                    clubName={name(n)}
                    weight={group.weight}
                    onPress={() => openNotification(n)}
                  />
                ))}
              </View>
            ))
          )}
        </View>
      </View>
    </Page>
  );
}

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate
        title="Sign in for alerts"
        subtitle="See event changes, new files and membership decisions from the clubs you've joined. Alerts are tied to your @lwsd.org account."
        purpose="alerts"
      >
        <NotificationsInbox />
      </SignInGate>
    </View>
  );
}
