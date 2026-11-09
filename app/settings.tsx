import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import {
  RowDivider,
  RowText,
  SettingRow,
  SettingsButton,
  SettingsSection,
  SwitchRow,
  ThemeSegments,
} from "@/components/settings/controls";
import {
  SETTINGS_RADIUS,
  SETTINGS_SPACE,
  SETTINGS_TYPE,
} from "@/components/settings/tokens";
import { Display, useHover, webFade } from "@/components/system";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { useLayout } from "@/theme/layout";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

function BackToProfile({ onPress }: { onPress: () => void }) {
  const { isDark } = useTheme();
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="link"
      className="min-h-11 flex-row items-center gap-1.5 self-start"
    >
      <View
        style={[
          { transform: [{ translateX: hovered ? -3 : 0 }] },
          webFade("transform"),
        ]}
      >
        <Ionicons
          name="arrow-back"
          size={16}
          color={isDark ? "#D4D4D4" : "#333333"}
        />
      </View>
      <Text
        className="text-light-secondary dark:text-dark-secondary"
        style={SETTINGS_TYPE.description}
      >
        Back to profile
      </Text>
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useLayout();
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

  const twoColumn = contentWidth >= SETTINGS_SPACE.twoColumnFrom;
  const gutter = contentWidth >= 640 ? 32 : 20;
  const name = profile?.display_name ?? session?.user.email;
  const showEmail =
    Boolean(profile?.display_name) && Boolean(session?.user.email);
  const fontNote = fontReady
    ? "An optional reading font. Choose whichever is most comfortable for you."
    : fontError
      ? "Reading font unavailable. Restart the app to retry."
      : "Loading reading font…";

  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <View
        className="w-full self-center"
        style={{
          maxWidth: SETTINGS_SPACE.pageMax + gutter * 2,
          paddingHorizontal: gutter,
          paddingTop: insets.top + 12,
        }}
      >
        <BackToProfile onPress={() => router.replace("/account")} />
        <Display
          fontSize={SETTINGS_TYPE.titleDisplay}
          accessibilityRole="header"
          className="mt-1 text-light-text dark:text-dark-text"
        >
          Settings
        </Display>
        <Text
          className="mb-6 mt-1 text-light-secondary dark:text-dark-secondary"
          style={SETTINGS_TYPE.intro}
        >
          Your account, and how this site looks and reads for you.
        </Text>

        <SettingsSection title="Account" twoColumn={twoColumn}>
          {session ? (
            <>
              <SettingRow>
                <View className="flex-1" style={{ minWidth: 180 }}>
                  <Text
                    className="text-light-text dark:text-dark-text"
                    style={SETTINGS_TYPE.name}
                  >
                    {name}
                  </Text>
                  {showEmail ? (
                    <Text
                      className="text-light-muted dark:text-dark-muted"
                      style={SETTINGS_TYPE.description}
                    >
                      {session.user.email}
                    </Text>
                  ) : null}
                </View>
                <SettingsButton
                  label="Sign out"
                  busy={busy}
                  busyLabel="Signing out"
                  onPress={() => void logout()}
                />
              </SettingRow>
              <RowDivider />
              <SettingRow>
                <RowText
                  label="Interests and availability"
                  description="What the Club Match Quiz uses to suggest clubs."
                />
                <SettingsButton
                  label="Edit"
                  accessibilityLabel="Edit interests and availability"
                  onPress={() => router.push("/onboarding")}
                />
              </SettingRow>
            </>
          ) : (
            <SettingRow>
              <RowText label="You are signed out." />
              <SettingsButton
                primary
                label="Sign in or create an account"
                onPress={() => router.push("/account")}
              />
            </SettingRow>
          )}
        </SettingsSection>

        <SettingsSection title="Appearance" twoColumn={twoColumn}>
          <SettingRow>
            <RowText label="Color theme" minWidth={90} />
            <ThemeSegments options={THEMES} value={theme} onChange={setTheme} />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          title="Accessibility"
          note="Saved on this device."
          twoColumn={twoColumn}
        >
          <SwitchRow
            label="High contrast"
            description="Stronger text, backgrounds, and borders."
            value={highContrast}
            onChange={(value) => update({ highContrast: value })}
          />
          <RowDivider />
          <SwitchRow
            label="OpenDyslexic font"
            description={fontNote}
            value={dyslexicFont}
            disabled={!fontReady}
            onChange={(value) => update({ dyslexicFont: value })}
          />
          <View
            className="my-2 bg-light-surface-2 px-4 py-3 dark:bg-dark-surface"
            style={{ borderRadius: SETTINGS_RADIUS }}
          >
            <Text
              className="text-light-muted dark:text-dark-muted"
              style={SETTINGS_TYPE.small}
            >
              Reading preview
            </Text>
            <Text
              className="mt-1 text-light-text dark:text-dark-text"
              style={SETTINGS_TYPE.preview}
            >
              Find your people, explore clubs, and keep your next deadline in
              view.
            </Text>
          </View>
          <SettingRow>
            <Text
              className="flex-1 text-light-muted dark:text-dark-muted"
              style={[SETTINGS_TYPE.small, { minWidth: 180 }]}
            >
              Text also follows your device's text-size settings. Screen readers
              can identify controls by their labels.
            </Text>
            <SettingsButton
              label="Reset reading options"
              onPress={() =>
                update({ highContrast: false, dyslexicFont: false })
              }
            />
          </SettingRow>
        </SettingsSection>
        <View className="h-px bg-light-border dark:bg-dark-border" />
      </View>
    </ScrollView>
  );
}
