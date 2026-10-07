import { useState, ReactNode } from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AccessibleText as Text } from "./AccessibleText";
import { Button, Card, Input, SkeletonRow } from "./ui";
import { useMessaging } from "@/context/MessagingContext";
export function MessagingGate({ children }: { children: ReactNode }) {
  const { secretKey, vault, loading, error, reload, unlock } = useMessaging();
  const [passphrase, setPassphrase] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<string | null>(null);
  const insets = useSafeAreaInsets(),
    router = useRouter();
  if (secretKey) return <>{children}</>;
  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <Button
        label="Back to profile"
        variant="ghost"
        onPress={() => router.push("/account")}
      />
      {loading ? (
        <SkeletonRow count={2} />
      ) : (
        <Card className="mt-5 gap-4 p-5">
          <Text className="text-xs font-bold text-python-green-dark dark:text-python-green-light">
            PRIVATE CONVERSATIONS
          </Text>
          <Text className="text-2xl font-bold text-light-text dark:text-dark-text">
            {vault ? "Unlock your messages" : "Set up encrypted messaging"}
          </Text>
          <Text className="text-sm leading-6 text-light-muted dark:text-dark-muted">
            {vault
              ? "Enter your separate messaging passphrase. Use the same passphrase on your phone and computer."
              : "Choose a unique passphrase of at least 16 characters. Keep it somewhere safe: we cannot recover it or your encrypted messages if you forget it. Both people must set up messaging before sending."}
          </Text>
          {error ? (
            <>
              <Text className="text-danger">{error}</Text>
              <Button label="Retry" onPress={() => void reload()} />
            </>
          ) : (
            <>
              <Input
                label="Messaging passphrase"
                value={passphrase}
                onChangeText={setPassphrase}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              {!vault ? (
                <Input
                  label="Confirm passphrase"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                />
              ) : null}
              {failure ? (
                <Text className="text-danger" accessibilityRole="alert">
                  {failure}
                </Text>
              ) : null}
              <Button
                label={vault ? "Unlock messages" : "Enable encrypted messaging"}
                iconRight="lock-closed-outline"
                loading={busy}
                disabled={
                  !passphrase ||
                  (!vault && (passphrase.length < 16 || passphrase !== confirm))
                }
                onPress={() => {
                  setBusy(true);
                  setFailure(null);
                  void unlock(passphrase)
                    .then(() => {
                      setPassphrase("");
                      setConfirm("");
                    })
                    .catch((e) => setFailure(e.message))
                    .finally(() => setBusy(false));
                }}
              />
            </>
          )}
          <Text className="text-xs leading-5 text-light-muted dark:text-dark-muted">
            New message text is encrypted on your device. Identities, club
            names, dates and read receipts remain visible to the platform. Older
            messages remain labeled as unencrypted.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}
