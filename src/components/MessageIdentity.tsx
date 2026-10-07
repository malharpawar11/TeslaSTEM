import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card, Button } from "./ui";
import { AccessibleText as Text } from "./AccessibleText";
import { fetchPeerKey } from "@/data/messageKeysRepo";
import { safetyNumber } from "@/lib/messageCrypto";
import { useAuth } from "@/context/AuthContext";
import { useMessaging } from "@/context/MessagingContext";

export function usePeerIdentity(clubId: string, peer: string) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [state, setState] = useState<{
    peer: string;
    key: string | null;
    verified: boolean;
    error: string | null;
  }>({ peer: "", key: null, verified: false, error: null });
  const storageKey = `tsc.message-identity.v1.${uid}.${peer}`;
  const reload = useCallback(async () => {
    if (!peer || !uid) return;
    const result = await fetchPeerKey(clubId, peer);
    if (!result.ok) throw new Error(result.error);
    const key = result.value[0]?.public_key ?? null;
    if (!key)
      return {
        peer,
        key: null,
        verified: false,
        error:
          "This person has not enabled encrypted messaging yet. Ask them to open Messages and set it up.",
      };
    const pinned = await AsyncStorage.getItem(storageKey);
    if (pinned) {
      const prior = JSON.parse(pinned);
      if (prior.key !== key)
        return {
          peer,
          key: null,
          verified: false,
          error:
            "This person's encryption key changed. Sending is blocked. Verify their identity using a trusted channel before continuing; contact support if this was unexpected.",
        };
      return { peer, key, verified: prior.verified === true, error: null };
    }
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ key, verified: false }),
    );
    return { peer, key, verified: false, error: null };
  }, [clubId, peer, uid]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setState({ peer, key: null, verified: false, error: null });
      void reload()
        .then((value) => {
          if (active && value) setState(value);
        })
        .catch((e) => {
          if (active)
            setState({ peer, key: null, verified: false, error: e.message });
        });
      return () => {
        active = false;
      };
    }, [reload]),
  );
  return {
    key: state.peer === peer ? state.key : null,
    verified: state.peer === peer && state.verified,
    error: state.peer === peer ? state.error : null,
    reload: async () => {
      const value = await reload();
      if (value) setState(value);
    },
    verify: async () => {
      if (!state.key || state.peer !== peer) return;
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ key: state.key, verified: true }),
      );
      setState({ ...state, verified: true });
    },
  };
}
export function MessageIdentity({
  peer,
  identity,
}: {
  peer: string;
  identity: ReturnType<typeof usePeerIdentity>;
}) {
  const { session } = useAuth(),
    { vault } = useMessaging();
  const [expanded, setExpanded] = useState(false),
    [failure, setFailure] = useState<string | null>(null);
  return (
    <Card className="gap-2 p-4">
      <Text className="font-semibold text-python-green-dark dark:text-python-green-light">
        {identity.verified
          ? "End-to-end encrypted · Identity verified"
          : identity.key
            ? "End-to-end encrypted · Verify identity"
            : "Checking encrypted messaging"}
      </Text>
      {identity.error ? (
        <>
          <Text className="text-danger">{identity.error}</Text>
          <Button
            label="Check again"
            variant="secondary"
            onPress={() =>
              void identity.reload().catch((e) => setFailure(e.message))
            }
          />
        </>
      ) : identity.key && vault && session ? (
        <>
          <Text className="text-xs leading-5 text-light-muted dark:text-dark-muted">
            {identity.verified
              ? "You marked this person's safety number as matched."
              : "Compare the safety number with this person in person or by another trusted channel. An unverified key could belong to someone else."}
          </Text>
          <Button
            label={expanded ? "Hide safety number" : "Show safety number"}
            size="sm"
            variant="ghost"
            onPress={() => setExpanded((v) => !v)}
          />
          {expanded ? (
            <>
              <Text
                selectable
                className="text-sm leading-6 text-light-text dark:text-dark-text"
              >
                {safetyNumber(
                  session.user.id,
                  vault.public_key,
                  peer,
                  identity.key,
                )}
              </Text>
              <Button
                label="We compared: numbers match"
                variant="secondary"
                disabled={identity.verified}
                onPress={() =>
                  void identity.verify().catch((e) => setFailure(e.message))
                }
              />
            </>
          ) : null}
        </>
      ) : (
        <Text className="text-xs text-light-muted dark:text-dark-muted">
          Checking encryption identity…
        </Text>
      )}
      {failure ? <Text className="text-danger">{failure}</Text> : null}
    </Card>
  );
}
