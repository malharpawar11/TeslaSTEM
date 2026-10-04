import { ScrollView, View, Switch } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { Button, Card, Chip } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useToast } from "@/context/ToastContext";

export default function Settings() {
  const router = useRouter(),
    insets = useSafeAreaInsets();
  const { session, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { highContrast, dyslexicFont, fontReady, fontError, update } =
    useAccessibility();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    try {
      await signOut();
      toast("Signed out of this device.");
    } catch {
      toast(
        "Local sign-out completed; the server could not be reached.",
        "info",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{
        padding: 20,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <Button
        label="Back to profile"
        variant="ghost"
        onPress={() => router.replace("/account")}
      />
      <Text
        accessibilityRole="header"
        className="mt-5 text-3xl font-bold text-light-text dark:text-dark-text"
      >
        Settings
      </Text>
      <Text className="mt-2 text-base text-light-muted dark:text-dark-muted">
        Account and reading preferences. Accessibility choices are saved on this
        device.
      </Text>
      <Card className="mt-6 gap-4 p-5">
        <Text
          accessibilityRole="header"
          className="text-xl font-bold text-light-text dark:text-dark-text"
        >
          Account
        </Text>
        <Text className="text-base text-light-secondary dark:text-dark-secondary">
          {session
            ? (profile?.display_name ?? session.user.email)
            : "You are signed out."}
        </Text>
        {session ? (
          <Button
            label="Sign out"
            loading={busy}
            onPress={() => void logout()}
            icon="log-out-outline"
          />
        ) : (
          <Button
            label="Sign in or create an account"
            onPress={() => router.push("/account")}
            icon="log-in-outline"
          />
        )}
        {session ? (
          <Button
            label="Edit interests and availability"
            variant="secondary"
            onPress={() => router.push("/onboarding")}
          />
        ) : null}
      </Card>
      <Card className="mt-5 gap-5 p-5">
        <Text
          accessibilityRole="header"
          className="text-xl font-bold text-light-text dark:text-dark-text"
        >
          Appearance and accessibility
        </Text>
        <View>
          <Text className="mb-3 text-base font-semibold text-light-text dark:text-dark-text">
            Color theme
          </Text>
          <View className="flex-row gap-3">
            {(["light", "dark"] as const).map((value) => (
              <Chip
                key={value}
                label={value === "light" ? "Light" : "Dark"}
                active={theme === value}
                onPress={() => setTheme(value)}
              />
            ))}
          </View>
        </View>
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">
              High contrast
            </Text>
            <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
              Stronger text, backgrounds, and borders.
            </Text>
          </View>
          <Switch
            accessibilityLabel="High contrast"
            value={highContrast}
            onValueChange={(value) => update({ highContrast: value })}
          />
        </View>
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">
              OpenDyslexic font
            </Text>
            <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
              An optional reading font. Choose whichever is most comfortable for
              you.
            </Text>
          </View>
          <Switch
            accessibilityLabel="OpenDyslexic font"
            value={dyslexicFont}
            disabled={!fontReady}
            onValueChange={(value) => update({ dyslexicFont: value })}
          />
        </View>
        {!fontReady ? (
          <Text className="text-sm text-light-muted dark:text-dark-muted">
            {fontError
              ? "Reading font unavailable. Restart the app to retry."
              : "Loading reading font…"}
          </Text>
        ) : null}
        <Text className="text-base leading-7 text-light-text dark:text-dark-text">
          Preview: Find your people, explore clubs, and keep your next deadline
          in view.
        </Text>
        <Text className="text-sm text-light-muted dark:text-dark-muted">
          Text also follows your device’s text-size settings. Screen readers can
          identify controls by their labels.
        </Text>
        <Button
          label="Reset reading options"
          variant="secondary"
          onPress={() => update({ highContrast: false, dyslexicFont: false })}
        />
      </Card>
    </ScrollView>
  );
}
