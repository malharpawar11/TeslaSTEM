import { PageIntro } from "@/components/CampusVisual";
import { Avatar, PressableCard, EmptyState } from "@/components/ui";
import { clubInitials } from "@/types/domain";
import { useCallback, useState } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, SkeletonRow } from "@/components/ui";
import { SignInGate } from "@/components/SignInGate";
import { fetchMessageThreads, type MessageThread } from "@/data/discoveryRepo";

function Inbox() {
  const router = useRouter(),
    insets = useSafeAreaInsets();
  const [threads, setThreads] = useState<MessageThread[]>([]),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void fetchMessageThreads()
        .then((result) => {
          if (!active) return;
          if (result.ok) {
            setThreads(result.value);
            setError(null);
          } else setError(result.error);
        })
        .catch(() => {
          if (active) setError("Could not load your inbox.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );
  const refresh = async () => {
    setLoading(true);
    try {
      const result = await fetchMessageThreads();
      if (result.ok) {
        setThreads(result.value);
        setError(null);
      } else setError(result.error);
    } catch {
      setError("Could not load your inbox.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{
        padding: 20,
        paddingTop: insets.top + 16,
        paddingBottom: 32,
      }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-3">
        <PageIntro
          eyebrow="CONVERSATIONS / CONNECTIONS"
          title="Keep the conversation going."
          description="Your club board is a message away. Find your conversations here."
        />
        {loading ? (
          <SkeletonRow count={3} />
        ) : error ? (
          <>
            <Text className="text-danger">{error}</Text>
            <Button label="Retry" onPress={() => void refresh()} />
          </>
        ) : !threads.length ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="Say hello to your club."
            description="Open a club you have joined to message its board. Your conversations will appear here."
            actionLabel="Browse clubs"
            onAction={() => router.push("/browse")}
          />
        ) : (
          threads.map((thread) => (
            <PressableCard
              key={`${thread.club_id}-${thread.user_id}`}
              className="p-5"
              onPress={() =>
                router.push({
                  pathname: "/club/[id]/messages",
                  params: { id: thread.club_id, peer: thread.user_id },
                })
              }
              accessibilityLabel={`Open conversation with ${thread.name} from ${thread.club_name}`}
            >
              <View className="flex-row items-center gap-3">
                <Avatar
                  initials={clubInitials(thread.name)}
                  size="lg"
                  rounded="circle"
                />
                <View className="flex-1">
                  <Text className="text-base font-bold text-light-text dark:text-dark-text">
                    {thread.name}
                  </Text>
                  <Text className="mt-1 text-xs text-python-blue-dark dark:text-python-blue-light">
                    {thread.club_name}
                  </Text>
                  <Text
                    numberOfLines={2}
                    className="mt-2 text-sm text-light-muted dark:text-dark-muted"
                  >
                    {thread.body}
                  </Text>
                </View>
                {Number(thread.unread) > 0 ? (
                  <View className="min-w-6 items-center rounded-full bg-python-green px-2 py-1">
                    <Text className="text-xs font-bold text-white">
                      {thread.unread}
                    </Text>
                  </View>
                ) : null}
              </View>
            </PressableCard>
          ))
        )}
      </View>
    </ScrollView>
  );
}
export default function MessageInbox() {
  return (
    <SignInGate>
      <Inbox />
    </SignInGate>
  );
}
