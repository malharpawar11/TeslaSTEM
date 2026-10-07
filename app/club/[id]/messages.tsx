import { useCallback, useRef, useState } from "react";
import {
  ScrollView,
  View,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  AppState,
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
  type DirectMessage,
  type MessageContact,
} from "@/data/discoveryRepo";
import { MessagingGate } from "@/components/MessagingGate";
import { MessageIdentity, usePeerIdentity } from "@/components/MessageIdentity";
import { useMessaging, secureRandom } from "@/context/MessagingContext";
import { encryptMessage, decryptMessage } from "@/lib/messageCrypto";
import { sendEncryptedMessage, fetchPeerKey } from "@/data/messageKeysRepo";

function Conversation() {
  const params = useLocalSearchParams<{ id: string; peer?: string }>();
  const clubId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter(),
    insets = useSafeAreaInsets(),
    { session } = useAuth(),
    { toast } = useToast();
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [peer, setPeer] = useState(
    Array.isArray(params.peer) ? params.peer[0] : (params.peer ?? ""),
  );
  const { secretKey, lock } = useMessaging();
  const identity = usePeerIdentity(clubId, peer);
  const [messages, setMessages] = useState<DirectMessage[]>([]),
    [body, setBody] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const request = useRef<number | null>(null);
  const scroller = useRef<ScrollView>(null),
    followLatest = useRef(true);
  const load = useCallback(
    async (silent = false) => {
      const version = generation.current;
      if (request.current === version) return;
      request.current = version;
      if (!silent) setLoading(true);
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
          setMessages((previous) =>
            silent
              ? Array.from(
                  new Map(
                    [...previous, ...history.value].map((m) => [m.id, m]),
                  ).values(),
                ).sort(
                  (a, b) =>
                    a.created_at.localeCompare(b.created_at) ||
                    a.id.localeCompare(b.id),
                )
              : [...history.value].reverse(),
          );
          if (!silent) setHasOlder(history.value.length === 50);
          if (
            secretKey &&
            session &&
            history.value.every((m) => {
              try {
                if (m.envelope)
                  decryptMessage(m.envelope, m, session.user.id, secretKey);
                return true;
              } catch {
                return false;
              }
            })
          ) {
            const read = await readMessages(clubId, peer);
            if (version !== generation.current) return;
            if (!read.ok) {
              setError(read.error);
              return;
            }
          }
        } else {
          setMessages([]);
          setHasOlder(false);
        }
        if (version === generation.current) setError(null);
      } catch {
        if (version === generation.current)
          setError("Could not load messages. Pull to retry.");
      } finally {
        if (request.current === version) request.current = null;
        if (version === generation.current) setLoading(false);
      }
    },
    [clubId, peer, secretKey, session?.user.id],
  );
  useFocusEffect(
    useCallback(() => {
      ++generation.current;
      followLatest.current = true;
      void load();
      const timer = setInterval(() => {
        if (AppState.currentState === "active") void load(true);
      }, 5000);
      return () => {
        clearInterval(timer);
        ++generation.current;
      };
    }, [load]),
  );
  const send = async () => {
    if (!body.trim() || busy || !secretKey || !identity.key || !session) return;
    setBusy(true);
    try {
      const currentKey = await fetchPeerKey(clubId, peer);
      if (!currentKey.ok) throw new Error(currentKey.error);
      if (currentKey.value[0]?.public_key !== identity.key)
        throw new Error(
          "Recipient encryption key is unavailable or changed. Sending was blocked.",
        );
      const envelope = encryptMessage(
        body,
        { club_id: clubId, sender_id: session.user.id, recipient_id: peer },
        secretKey,
        identity.key,
        secureRandom,
      );
      const result = await sendEncryptedMessage(clubId, peer, envelope);
      if (!result.ok) toast(result.error, "error");
      else {
        followLatest.current = true;
        setBody("");
        await load(true);
      }
    } catch (e) {
      toast(
        e instanceof Error
          ? e.message
          : "Message could not be sent. Try again.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const older = async () => {
    const version = generation.current;
    setBusy(true);
    followLatest.current = false;
    try {
      const result = await fetchMessages(
        clubId,
        peer,
        messages[0]?.created_at,
        messages[0]?.id,
      );
      if (version !== generation.current) return;
      if (!result.ok) toast(result.error, "error");
      else {
        setMessages((previous) =>
          Array.from(
            new Map(
              [...previous, ...result.value].map((m) => [m.id, m]),
            ).values(),
          ).sort(
            (a, b) =>
              a.created_at.localeCompare(b.created_at) ||
              a.id.localeCompare(b.id),
          ),
        );
        setHasOlder(result.value.length === 50);
      }
    } catch {
      toast("Could not load older messages.", "error");
    } finally {
      setBusy(false);
    }
  };
  const allowed = contacts.some((contact) => contact.user_id === peer);
  const messageText = (message: DirectMessage) => {
    if (!message.envelope) return message.body;
    try {
      if (!secretKey || !session || !identity.key)
        return "Encrypted message · Unlock and check identity to read.";
      const peerKey =
        message.sender_id === session.user.id
          ? message.envelope.recipient_key
          : message.envelope.sender_key;
      if (peerKey !== identity.key)
        return "Identity mismatch · Message blocked.";
      return decryptMessage(
        message.envelope,
        message,
        session.user.id,
        secretKey,
      );
    } catch {
      return "Could not authenticate this message. Its content is blocked.";
    }
  };
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
          Member and board conversations · Updates every 5 seconds while open.
        </Text>
        <Button
          label="Lock messages"
          size="sm"
          variant="ghost"
          onPress={lock}
        />
      </View>
      <ScrollView
        ref={scroller}
        scrollEventThrottle={100}
        onScroll={({ nativeEvent }) => {
          followLatest.current =
            nativeEvent.contentOffset.y +
              nativeEvent.layoutMeasurement.height >=
            nativeEvent.contentSize.height - 80;
        }}
        onContentSizeChange={() => {
          if (followLatest.current)
            scroller.current?.scrollToEnd({ animated: false });
        }}
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
              <MessageIdentity peer={peer} identity={identity} />
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
                      {messageText(message)}
                    </Text>
                    <Text
                      className={`mt-2 text-2xs ${message.sender_id === session?.user.id ? "text-white/70" : "text-light-muted dark:text-dark-muted"}`}
                    >
                      {new Date(message.created_at).toLocaleString()}
                      {!message.envelope
                        ? " · Older unencrypted message"
                        : " · Encrypted"}
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
                disabled={!body.trim() || !identity.key}
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
      <MessagingGate>
        <Conversation />
      </MessagingGate>
    </SignInGate>
  );
}
