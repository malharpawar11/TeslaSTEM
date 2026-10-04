import { useCallback, useState } from "react";
import { ScrollView, Text, View, RefreshControl } from "react-native";
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
        <Text className="text-2xl font-semibold text-light-text dark:text-dark-text">
          Messages
        </Text>
        {loading ? (
          <SkeletonRow count={3} />
        ) : error ? (
          <>
            <Text className="text-danger">{error}</Text>
            <Button label="Retry" onPress={() => void refresh()} />
          </>
        ) : !threads.length ? (
          <>
            <Text className="text-light-muted dark:text-dark-muted">
              No conversations yet. Open a joined club to message its board.
            </Text>
            <Button
              label="Browse clubs"
              onPress={() => router.push("/browse")}
            />
          </>
        ) : (
          threads.map((thread) => (
            <Card
              key={`${thread.club_id}-${thread.user_id}`}
              className="gap-2 p-4"
            >
              <Text className="font-semibold text-light-text dark:text-dark-text">
                {thread.name} · {thread.club_name}
                {Number(thread.unread) > 0 ? ` · ${thread.unread} unread` : ""}
              </Text>
              <Text
                numberOfLines={2}
                className="text-sm text-light-muted dark:text-dark-muted"
              >
                {thread.body}
              </Text>
              <Button
                label="Open conversation"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/club/[id]/messages",
                    params: { id: thread.club_id, peer: thread.user_id },
                  })
                }
              />
            </Card>
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
