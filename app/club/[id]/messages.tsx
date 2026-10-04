import { useCallback, useRef, useState } from "react";
import {
  ScrollView,
  View,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Input, SkeletonRow } from "@/components/ui";
import { SignInGate } from "@/components/SignInGate";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  fetchMessageContacts,
  fetchMessages,
  readMessages,
  sendMessage,
  type DirectMessage,
  type MessageContact,
} from "@/data/discoveryRepo";

function Conversation() {
  const params = useLocalSearchParams<{ id: string; peer?: string }>();
  const clubId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter(),
    insets = useSafeAreaInsets(),
    { session } = useAuth(),
    { toast } = useToast();
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [peer, setPeer] = useState(params.peer ?? "");
  const [messages, setMessages] = useState<DirectMessage[]>([]),
    [body, setBody] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMessageContacts(clubId);
      if (version !== generation.current) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContacts(result.value);
      if (peer) {
        const history = await fetchMessages(clubId, peer);
        if (version !== generation.current) return;
        if (!history.ok) {
          setError(history.error);
          return;
        }
        setMessages([...history.value].reverse());
        setHasOlder(history.value.length === 50);
        await readMessages(clubId, peer);
      } else {
        setMessages([]);
        setHasOlder(false);
      }
    } catch {
      if (version === generation.current)
        setError("Could not load messages. Pull to retry.");
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [clubId, peer]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        ++generation.current;
      };
    }, [load]),
  );
  const send = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const result = await sendMessage(clubId, peer, body);
      if (!result.ok) toast(result.error, "error");
      else {
        setBody("");
        await load();
      }
    } catch {
      toast("Message could not be sent. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };
  const older = async () => {
    const version = generation.current;
    setBusy(true);
    try {
      const result = await fetchMessages(clubId, peer, messages[0]?.created_at);
      if (version !== generation.current) return;
      if (!result.ok) toast(result.error, "error");
      else {
        setMessages((previous) => [...result.value].reverse().concat(previous));
        setHasOlder(result.value.length === 50);
      }
    } catch {
      toast("Could not load older messages.", "error");
    } finally {
      setBusy(false);
    }
  };
  const allowed = contacts.some((contact) => contact.user_id === peer);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      style={{ paddingTop: insets.top }}
    >
      <View className="gap-2 border-b border-light-border bg-light-surface px-5 py-4 dark:border-dark-border dark:bg-dark-surface">
        <Button
          label={peer ? "Back to contacts" : "Back to club"}
          variant="ghost"
          onPress={() => (peer ? setPeer("") : router.back())}
        />
        <Text className="text-2xl font-bold text-light-text dark:text-dark-text">
          {peer
            ? (contacts.find((contact) => contact.user_id === peer)?.name ??
              "Conversation")
            : "Message club leadership"}
        </Text>
        <Text className="text-xs text-light-muted dark:text-dark-muted">
          Private messages between active members and the board. Pull to
          refresh.
        </Text>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} />
        }
      >
        <View className="gap-3">
          {loading ? (
            <SkeletonRow count={3} />
          ) : error ? (
            <>
              <Text className="text-danger">{error}</Text>
              <Button label="Retry" onPress={() => void load()} />
            </>
          ) : !peer ? (
            contacts.length ? (
              contacts.map((contact) => (
                <Card key={contact.user_id} className="gap-2 p-4">
                  <Text className="font-semibold text-light-text dark:text-dark-text">
                    {contact.name} · {contact.member_position}
                  </Text>
                  <Button
                    label="Message"
                    variant="secondary"
                    onPress={() => {
                      setBody("");
                      setPeer(contact.user_id);
                    }}
                  />
                </Card>
              ))
            ) : (
              <Text className="text-light-muted dark:text-dark-muted">
                Join this club to contact its board. A board member or president
                must be verified and active.
              </Text>
            )
          ) : (
            <>
              {hasOlder ? (
                <Button
                  label="Load older messages"
                  variant="secondary"
                  loading={busy}
                  onPress={() => void older()}
                />
              ) : null}
              {!messages.length ? (
                <Text className="text-light-muted dark:text-dark-muted">
                  Start a conversation.
                </Text>
              ) : (
                messages.map((message) => (
                  <Card
                    key={message.id}
                    className={`max-w-[85%] border-0 p-4 ${message.sender_id === session?.user.id ? "self-end rounded-br-md bg-python-blue dark:bg-python-blue" : "self-start rounded-bl-md"}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${message.sender_id === session?.user.id ? "text-white/75" : "text-python-blue-dark dark:text-python-blue-light"}`}
                    >
                      {message.sender_id === session?.user.id
                        ? "You"
                        : "Member"}
                    </Text>
                    <Text
                      className={`mt-1 text-base leading-6 ${message.sender_id === session?.user.id ? "text-white" : "text-light-text dark:text-dark-text"}`}
                    >
                      {message.body}
                    </Text>
                    <Text
                      className={`mt-2 text-2xs ${message.sender_id === session?.user.id ? "text-white/70" : "text-light-muted dark:text-dark-muted"}`}
                    >
                      {new Date(message.created_at).toLocaleString()}
                      {message.sender_id === session?.user.id && message.read_at
                        ? " · Read"
                        : ""}
                    </Text>
                  </Card>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
      {peer && !loading && !error ? (
        <View
          className="gap-3 border-t border-light-border bg-light-surface px-5 pt-4 dark:border-dark-border dark:bg-dark-surface"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {allowed ? (
            <>
              <Input
                label="Message"
                value={body}
                onChangeText={setBody}
                maxLength={2000}
                multiline
                editable={!busy}
              />
              <Button
                label="Send message"
                iconRight="send"
                loading={busy}
                disabled={!body.trim()}
                onPress={() => void send()}
              />
            </>
          ) : (
            <Text className="text-light-muted dark:text-dark-muted">
              You can read past messages. Sending requires both members to be
              active and one to be on the board.
            </Text>
          )}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
export default function MessagesScreen() {
  return (
    <SignInGate>
      <Conversation />
    </SignInGate>
  );
}
