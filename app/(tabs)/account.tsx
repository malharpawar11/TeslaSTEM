import { useCallback, useMemo, useState } from "react";
import { View, Platform, Pressable } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignInGate } from "@/components/SignInGate";
import { Display, Glyph, Page, Rule, TextLink } from "@/components/system";
import { useAuth } from "@/context/AuthContext";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useToast } from "@/context/ToastContext";
import { requestPresidentVerification } from "@/data/adminRepo";
import { registerForPush } from "@/lib/push";
import { useLayout } from "@/theme/layout";
import { roleLabel, type NotificationPrefs } from "@/types/domain";

const ROLE_LABEL: Record<string, string> = {
  special_admin: "School Admin",
  verified_president: "Verified President",
  club_admin: "Club Admin",
  student: "Student",
};

const PREF_ROWS: {
  key: keyof NotificationPrefs;
  label: string;
}[] = [
  { key: "events", label: "Events & changes" },
  { key: "files", label: "New files" },
  { key: "notes", label: "Notes & resources" },
  { key: "reminders", label: "Meeting reminders" },
];

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      className="min-h-12 flex-row items-center justify-between gap-3 border-b border-light-border py-2 dark:border-dark-border"
    >
      <Text className="text-base text-light-text dark:text-dark-text">
        {label}
      </Text>
      <View
        className={`h-6 w-11 justify-center rounded-full px-0.5 ${
          value ? "bg-python-green" : "bg-light-border-strong dark:bg-dark-border-strong"
        }`}
      >
        <View
          className={`h-5 w-5 rounded-full bg-white ${value ? "self-end" : "self-start"}`}
        />
      </View>
    </Pressable>
  );
}

function MoreLink({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="min-h-12 flex-row items-center gap-3 border-b border-light-border py-2 hover:opacity-70 dark:border-dark-border"
    >
      <Glyph name={icon} tone="secondary" />
      <Text className="flex-1 text-base text-light-text dark:text-dark-text">
        {label}
      </Text>
    </Pressable>
  );
}

function AccountDashboard() {
  const { isDesktop, isWide, contentWidth } = useLayout();
  const router = useRouter();
  const { profile, signOut, refreshProfile, isSpecialAdmin } = useAuth();
  const { clubs } = useClubs();
  const {
    memberships,
    error: membershipError,
    refresh: refreshMemberships,
  } = useMemberships();
  const { prefsFor, savePrefs } = useNotifications();
  const { toast } = useToast();

  const [signingOut, setSigningOut] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const displayName = profile?.display_name ?? profile?.email ?? "Student";
  const globalPrefs = prefsFor(null);

  const myClubs = useMemo(
    () =>
      [...memberships.values()]
        .map((m) => ({
          membership: m,
          club: clubs.find((c) => c.id === m.clubId),
        }))
        .filter((row) => !!row.club),
    [memberships, clubs],
  );

  const toggleGlobal = useCallback(
    async (key: keyof NotificationPrefs) => {
      const next = { ...globalPrefs, [key]: !globalPrefs[key] };
      const res = await savePrefs(null, next);
      if (!res.ok)
        toast(res.error ?? "Could not save that preference.", "error");
    },
    [globalPrefs, savePrefs, toast],
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  const handleRequestPresident = async () => {
    setRequesting(true);
    const res = await requestPresidentVerification();
    setRequesting(false);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    setRequested(true);
    toast("Request sent to the school admin.");
    await refreshProfile();
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const res = await registerForPush();
    setEnablingPush(false);
    toast(
      res.ok
        ? "Push notifications enabled on this device."
        : (res.error ?? "Could not enable push."),
      res.ok ? "success" : "error",
    );
  };

  const presidentStatus = profile?.president_status;
  const showPresidentCta =
    profile?.role === "student" &&
    (!presidentStatus || presidentStatus === "rejected");

  const nameSize = Math.max(
    56,
    Math.min(contentWidth * 0.11, 148) * Math.min(1, 16 / displayName.length),
  );
  return (
    <Page maxWidth={1400}>
      <View className="flex-row items-start justify-between gap-4">
        <Display fontSize={nameSize} accessibilityRole="header" className="flex-1 text-light-text dark:text-dark-text">
          {displayName}
        </Display>
        {!isDesktop ? <ThemeToggle /> : null}
      </View>
      <View className="mt-3 flex-row flex-wrap items-center gap-x-5">
        <Text className="text-base font-bold text-light-text dark:text-dark-text">
          {ROLE_LABEL[profile?.role ?? "student"] ?? "Student"}
        </Text>
        <Text className="text-base text-light-muted dark:text-dark-muted">
          {profile?.email}
        </Text>
        {presidentStatus === "pending" ? (
          <Text className="text-base font-bold text-warn">
            Verification pending
          </Text>
        ) : null}
      </View>

      <View className={`mt-12 gap-14 ${isWide ? "flex-row items-start" : ""}`}>
        <View className="flex-[3]" style={{ minWidth: 0 }}>
          <Rule title={`My clubs (${myClubs.length})`} />
          {membershipError ? (
            <View className="items-start gap-3 py-4">
              <Text className="text-danger">{membershipError}</Text>
              <Button label="Retry" onPress={() => void refreshMemberships()} />
            </View>
          ) : myClubs.length === 0 ? (
            <View className="items-start gap-3 py-5">
              <Text className="text-base text-light-muted dark:text-dark-muted">
                You haven't joined any clubs yet.
              </Text>
              <Button
                label="Browse clubs"
                variant="secondary"
                onPress={() => router.push("/browse")}
              />
            </View>
          ) : (
            myClubs.map(({ membership, club }) => (
              <Pressable
                key={membership.clubId}
                onPress={() => router.push(`/club/${membership.clubId}`)}
                accessibilityRole="link"
                accessibilityLabel={`Open ${club!.name}`}
                className="flex-row flex-wrap items-baseline justify-between gap-x-6 border-b border-light-border py-3 hover:opacity-70 dark:border-dark-border"
              >
                <Display size="md" className="shrink text-light-text dark:text-dark-text">
                  {club!.name}
                </Display>
                <Text
                  className={`text-base ${membership.status === "pending" ? "font-bold text-warn" : "text-light-muted dark:text-dark-muted"}`}
                >
                  {membership.status === "pending"
                    ? "Waiting for approval"
                    : roleLabel(membership.role, membership.position)}
                </Text>
              </Pressable>
            ))
          )}

          {showPresidentCta ? (
            <View className="mt-12 items-start">
              <Display size="md">Run a club?</Display>
              <Text className="mb-4 mt-2 max-w-lg text-base text-light-secondary dark:text-dark-secondary">
                Ask the school admin to verify you as a club president, or claim
                your club from its page.
              </Text>
              <Button
                label={
                  requested ? "Request sent" : "Request president verification"
                }
                variant={requested ? "tonal" : "secondary"}
                icon={requested ? "checkmark" : undefined}
                loading={requesting}
                disabled={requesting || requested}
                onPress={() => void handleRequestPresident()}
              />
            </View>
          ) : null}
        </View>

        <View className="flex-[2]" style={{ minWidth: 0 }}>
          <Rule title="Tell me about" />
          {PREF_ROWS.map((row) => (
            <ToggleRow
              key={row.key}
              label={row.label}
              value={globalPrefs[row.key]}
              onToggle={() => void toggleGlobal(row.key)}
            />
          ))}
          <Text className="mt-2 text-sm text-light-muted dark:text-dark-muted">
            These are your defaults. Open a club to change just that club.
          </Text>
          {Platform.OS !== "web" ? (
            <TextLink
              label="Enable push on this device"
              icon="phone-portrait-outline"
              disabled={enablingPush}
              onPress={() => void handleEnablePush()}
            />
          ) : null}

          <Rule title="More" className="mt-12" />
          <MoreLink
            label="Interests and free time"
            icon="options-outline"
            onPress={() => router.push("/onboarding")}
          />
          <MoreLink
            label="Settings and accessibility"
            icon="settings-outline"
            onPress={() => router.push("/settings")}
          />
          <MoreLink
            label="Submit a new club"
            icon="add"
            onPress={() => router.push("/club/new")}
          />
          {isSpecialAdmin ? (
            <MoreLink
              label="School admin tools"
              icon="shield-checkmark-outline"
              onPress={() => router.push("/admin")}
            />
          ) : null}
          <MoreLink
            label="Privacy and policies"
            icon="document-text-outline"
            onPress={() => router.push("/policies")}
          />
          <View className="mt-6 items-start">
            <Button
              label="Sign out"
              variant="secondary"
              loading={signingOut}
              onPress={() => void handleSignOut()}
            />
          </View>
        </View>
      </View>
    </Page>
  );
}

export default function AccountScreen() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate
        title="Sign in"
        subtitle="Your clubs, your interests and what you hear about, in one place. Use your Lake Washington School District email."
        showSettings
        purpose="profile"
      >
        <AccountDashboard />
      </SignInGate>
    </View>
  );
}
