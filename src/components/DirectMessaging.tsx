import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccessibleText as Text } from "./AccessibleText";
import { Button, Card, Input } from "./ui";
import { SignInGate } from "./SignInGate";
import { useAuth } from "@/context/AuthContext";
import { insforge } from "@/lib/insforge";
import {
  fetchMessageContacts,
  fetchMessageThreads,
  type MessageThread,
} from "@/data/discoveryRepo";
import {
  blockContact,
  fetchChat,
  fetchContact,
  fetchInbox,
  markChatRead,
  searchStudents,
  sendChat,
  type ChatMessage,
  type ChatThread,
  type StudentContact,
} from "@/data/directMessagesRepo";

function Messaging({ peer, clubId }: { peer?: string; clubId?: string }) {
  const { session } = useAuth(),
    uid = session!.user.id,
    router = useRouter(),
    insets = useSafeAreaInsets();
  const [query, setQuery] = useState(""),
    [people, setPeople] = useState<StudentContact[]>([]),
    [threads, setThreads] = useState<ChatThread[]>([]);
  const [contact, setContact] = useState<StudentContact | null>(null),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null),
    [searchError, setSearchError] = useState<string | null>(null),
    [searching, setSearching] = useState(false),
    [busy, setBusy] = useState(false),
    [older, setOlder] = useState(false),
    [loading, setLoading] = useState(true),
    [live, setLive] = useState(false);
  const [board, setBoard] = useState<StudentContact[]>([]);
  const [archives, setArchives] = useState<MessageThread[]>([]);
  useEffect(() => {
    let active = true;
    void fetchMessageThreads().then((r) => {
      if (active && r.ok) setArchives(r.value);
    });
    return () => {
      active = false;
    };
  }, [uid]);
  const epoch = useRef(0),
    inFlight = useRef(false),
    initialPage = useRef(true),
    scroll = useRef<ScrollView>(null),
    follow = useRef(true);
  const open = (id: string) =>
    router.push({ pathname: "/direct/[id]", params: { id } });
  useEffect(() => {
    let active = true;
    setPeople([]);
    setSearchError(null);
    setSearching(query.trim().length >= 2);
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      void searchStudents(query.trim()).then((r) => {
        if (!active) return;
        if (r.ok) setPeople(r.value.filter((p) => p.user_id !== uid));
        else setSearchError(r.error);
        setSearching(false);
      });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, uid]);
  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const version = epoch.current;
    try {
      if (peer) {
        const [c, m] = await Promise.all([fetchContact(peer), fetchChat(peer)]);
        if (version !== epoch.current) return;
        if (!c.ok) throw Error(c.error);
        if (!m.ok) throw Error(m.error);
        setContact(c.value[0] ?? null);
        setMessages((previous) =>
          Array.from(
            new Map([...previous, ...m.value].map((v) => [v.id, v])).values(),
          ).sort(
            (a, b) =>
              a.created_at.localeCompare(b.created_at) ||
              a.id.localeCompare(b.id),
          ),
        );
        if (initialPage.current) {
          setOlder(m.value.length === 50);
          initialPage.current = false;
        }
        if (m.value.some((v) => v.recipient_id === uid && !v.read_at)) {
          const r = await markChatRead(
            peer,
            m.value
              .filter((v) => v.recipient_id === uid && !v.read_at)
              .map((v) => v.id),
          );
          if (!r.ok) throw Error(r.error);
        }
      } else {
        const r = await fetchInbox();
        if (version !== epoch.current) return;
        if (!r.ok) throw Error(r.error);
        setThreads(r.value);
      }
      if (version === epoch.current) setError(null);
    } catch (e) {
      if (version === epoch.current)
        setError(e instanceof Error ? e.message : "Messages unavailable");
    } finally {
      inFlight.current = false;
      if (version === epoch.current) setLoading(false);
    }
  }, [peer, uid]);
  useFocusEffect(
    useCallback(() => {
      ++epoch.current;
      setMessages([]);
      setContact(null);
      setOlder(false);
      initialPage.current = true;
      setLoading(true);
      follow.current = true;
      void load();
      let active = true;
      const sdk = insforge!;
      const channel = `student-inbox:${uid}`;
      const changed = () => {
        if (active && AppState.currentState === "active") void load();
      };
      sdk.realtime.on("direct_message_changed", changed);
      void (async () => {
        try {
          await sdk.realtime.connect();
          if (!active) return;
          const result = await sdk.realtime.subscribe(channel);
          if (active) setLive(result.ok);
        } catch {
          if (active) setLive(false);
        }
      })();
      const timer = setInterval(changed, 5000);
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") changed();
      });
      return () => {
        active = false;
        ++epoch.current;
        clearInterval(timer);
        sub.remove();
        sdk.realtime.off("direct_message_changed", changed);
        sdk.realtime.unsubscribe(channel);
        setLive(false);
      };
    }, [uid, load]),
  );
  useEffect(() => {
    let active = true;
    if (!clubId) return;
    void fetchMessageContacts(clubId).then((r) => {
      if (active && r.ok)
        setBoard(
          r.value.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            grade: null,
            handle: p.member_position,
          })),
        );
      else if (active && !r.ok) setError(r.error);
    });
    return () => {
      active = false;
    };
  }, [clubId]);
  const send = async () => {
    if (!peer || busy || !body.trim()) return;
    const text = body.trim();
    setBusy(true);
    try {
      const r = await sendChat(peer, text);
      if (!r.ok) setError(r.error);
      else {
        setBody("");
        follow.current = true;
        await load();
      }
    } finally {
      setBusy(false);
    }
  };
  const more = async () => {
    if (!peer || !messages[0] || busy) return;
    setBusy(true);
    const version = epoch.current;
    try {
      const r = await fetchChat(peer, messages[0]);
      if (version !== epoch.current) return;
      if (!r.ok) setError(r.error);
      else {
        setMessages((previous) =>
          Array.from(
            new Map([...r.value, ...previous].map((m) => [m.id, m])).values(),
          ).sort(
            (a, b) =>
              a.created_at.localeCompare(b.created_at) ||
              a.id.localeCompare(b.id),
          ),
        );
        setOlder(r.value.length === 50);
      }
    } finally {
      setBusy(false);
    }
  };
  const person = (p: StudentContact) => (
    <Card key={p.user_id} className="gap-2 p-4">
      <Text className="font-bold text-light-text dark:text-dark-text">
        {p.name}
      </Text>
      <Text className="text-light-muted dark:text-dark-muted">
        {p.grade ? `Grade ${p.grade} · ` : ""}@{p.handle}
      </Text>
      <Button label={`Message ${p.name}`} onPress={() => open(p.user_id)} />
    </Card>
  );
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{ padding: 20, paddingTop: insets.top + 16 }}
        className="gap-2"
      >
        {peer || clubId ? (
          <Button
            label="Back to messages"
            variant="ghost"
            onPress={() => router.replace("/messages")}
          />
        ) : null}
        <Text className="text-2xl font-bold text-light-text dark:text-dark-text">
          {peer ? (contact?.name ?? "Conversation") : "Messages"}
        </Text>
        <Text className="text-xs text-light-muted dark:text-dark-muted">
          {peer && contact
            ? `${contact.grade ? `Grade ${contact.grade} · ` : ""}@${contact.handle} · `
            : ""}
          {live
            ? "Live updates connected"
            : "Automatic updates every few seconds"}
        </Text>
        {error ? (
          <Text accessibilityRole="alert" className="text-danger">
            {error}
          </Text>
        ) : null}
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingTop: 0,
          paddingBottom: 24,
          gap: 12,
        }}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } =
            e.nativeEvent;
          follow.current =
            contentOffset.y + layoutMeasurement.height >=
            contentSize.height - 100;
        }}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          if (peer && follow.current)
            scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        {loading ? (
          <Text className="text-light-muted dark:text-dark-muted">
            Loading…
          </Text>
        ) : null}
        {peer ? (
          <>
            {contact ? (
              <Button
                label={
                  contact.blocked ? "Unblock this person" : "Block this person"
                }
                variant="ghost"
                onPress={async () => {
                  const r = await blockContact(peer, !contact.blocked);
                  if (!r.ok) setError(r.error);
                  else await load();
                }}
              />
            ) : null}
            {older ? (
              <Button
                label="Load older messages"
                variant="ghost"
                onPress={() => void more()}
                disabled={busy}
              />
            ) : null}
            {!loading && !messages.length ? (
              <Text className="text-light-muted dark:text-dark-muted">
                Start the conversation. Messages are visible only to
                participants through the app. They are not end-to-end encrypted.
              </Text>
            ) : null}
            {messages.map((m) => (
              <View
                key={m.id}
                style={{
                  alignSelf: m.sender_id === uid ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                }}
                className={`rounded-2xl p-4 ${m.sender_id === uid ? "bg-python-blue" : "bg-light-surface dark:bg-dark-surface"}`}
              >
                <Text
                  selectable
                  className={
                    m.sender_id === uid
                      ? "text-white"
                      : "text-light-text dark:text-dark-text"
                  }
                >
                  {m.body}
                </Text>
                <Text
                  className={
                    m.sender_id === uid
                      ? "mt-2 text-xs text-white"
                      : "mt-2 text-xs text-light-muted dark:text-dark-muted"
                  }
                >
                  {new Date(m.created_at).toLocaleString()}
                  {m.sender_id === uid
                    ? m.read_at
                      ? " · Read"
                      : " · Sent"
                    : ""}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <>
            {board.length ? (
              <>
                <Text className="font-bold text-light-text dark:text-dark-text">
                  Club contacts
                </Text>
                {board.filter((p) => p.user_id !== uid).map(person)}
              </>
            ) : null}
            <Input
              label="Find a student"
              placeholder="Name, handle, or exact school email"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              maxLength={100}
            />
            <Text className="text-xs text-light-muted dark:text-dark-muted">
              Search verified accounts. Names and grades are self-reported;
              check the unique handle before messaging.
            </Text>
            {searchError ? (
              <Text className="text-danger">{searchError}</Text>
            ) : null}
            {people.map(person)}
            {searching ? <Text className="text-light-muted dark:text-dark-muted">Searching…</Text> : null}
            {query.trim().length >= 2 && !people.length && !searchError && !searching ? (
              <Text className="text-light-muted dark:text-dark-muted">
                No matching student profiles yet.
              </Text>
            ) : null}
            <Button
              label="Edit my name, grade and handle"
              variant="ghost"
              onPress={() => router.push("/student-profile")}
            />
            <Text className="text-lg font-bold text-light-text dark:text-dark-text">
              Conversations
            </Text>
            {threads.map((t) => (
              <Card key={t.user_id} className="gap-2 p-4">
                <Text className="font-bold text-light-text dark:text-dark-text">
                  {t.name}
                  {Number(t.unread) > 0 ? ` · ${t.unread} unread` : ""}
                </Text>
                <Text className="text-light-muted dark:text-dark-muted">
                  {t.grade ? `Grade ${t.grade} · ` : ""}@{t.handle}
                </Text>
                <Text
                  numberOfLines={2}
                  className="text-light-text dark:text-dark-text"
                >
                  {t.body}
                </Text>
                <Button
                  label={`Open conversation with ${t.name}`}
                  onPress={() => open(t.user_id)}
                />
              </Card>
            ))}
            {!loading && !threads.length ? (
              <Text className="text-light-muted dark:text-dark-muted">
                Search for a classmate above to send your first message.
              </Text>
            ) : null}
            {archives.length && !peer ? (
              <>
                <Text className="font-bold text-light-text dark:text-dark-text">
                  Previous encrypted conversations
                </Text>
                {archives.map((t) => (
                  <Button
                    key={`${t.club_id}-${t.user_id}`}
                    label={`${t.name} · ${t.club_name} archive`}
                    variant="ghost"
                    onPress={() =>
                      router.push({
                        pathname: "/club/[id]/encrypted-history",
                        params: { id: t.club_id, peer: t.user_id },
                      })
                    }
                  />
                ))}
              </>
            ) : null}
            {clubId ? (
              <Button
                label="View older encrypted history"
                variant="ghost"
                onPress={() =>
                  router.push({
                    pathname: "/club/[id]/encrypted-history",
                    params: { id: clubId },
                  })
                }
              />
            ) : null}
          </>
        )}
      </ScrollView>
      {peer ? (
        <View
          style={{ padding: 16, paddingBottom: Math.max(16, insets.bottom) }}
          className="gap-2 border-t border-light-border dark:border-dark-border"
        >
          <Input
            label="Message"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
            editable={!busy && !contact?.blocked}
          />
          <Button
            label={busy ? "Sending…" : "Send message"}
            onPress={() => void send()}
            disabled={busy || !body.trim() || !contact || !!contact.blocked}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
export function DirectMessaging(props: { peer?: string; clubId?: string }) {
  return (
    <SignInGate>
      <Messaging {...props} />
    </SignInGate>
  );
}
