import { useCallback, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import {
  AccountLink,
  MembershipRow,
  PreferenceRow,
  SectionHeading,
  SignOutButton,
} from "@/components/profile/parts";
import {
  PROFILE_SPACE,
  PROFILE_TYPE,
  profileNameSize,
} from "@/components/profile/tokens";
import { SignInGate } from "@/components/SignInGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Display, Page, TextLink } from "@/components/system";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useToast } from "@/context/ToastContext";
import { meetingDays } from "@/lib/discovery";
import { registerForPush } from "@/lib/push";
import { useLayout } from "@/theme/layout";
import type { Club, Membership, NotificationPrefs } from "@/types/domain";

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

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function listOf(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function AccountDashboard() {
  const { isDesktop, contentWidth, gutter } = useLayout();
  const router = useRouter();
  const { profile, signOut, isSpecialAdmin } = useAuth();
  const { clubs } = useClubs();
  const {
    memberships,
    error: membershipError,
    refresh: refreshMemberships,
  } = useMemberships();
  const { prefsFor, savePrefs } = useNotifications();
  const { toast } = useToast();

  const [signingOut, setSigningOut] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const displayName = profile?.display_name ?? profile?.email ?? "Student";
  const globalPrefs = prefsFor(null);

  // Clubs you help run first, then memberships, then requests still waiting.
  const myClubs = useMemo(() => {
    const rank = (m: Membership) =>
      m.status === "pending" ? 2 : m.role !== "member" ? 0 : 1;
    return [...memberships.values()]
      .map((m) => ({
        membership: m,
        club: clubs.find((c) => c.id === m.clubId),
      }))
      .filter(
        (row): row is { membership: Membership; club: Club } => !!row.club,
      )
      .sort((a, b) => rank(a.membership) - rank(b.membership));
  }, [memberships, clubs]);

  const active = myClubs.filter((r) => r.membership.status === "active");
  const busyDays = WEEKDAYS.filter((d) =>
    active.some((r) => meetingDays(r.club.day).includes(d)),
  );
  const involvement = !active.length
    ? "Not in any clubs yet"
    : `In ${active.length} ${active.length === 1 ? "club" : "clubs"}${busyDays.length ? `, meeting ${listOf(busyDays)}` : ""}`;

  const toggleGlobal = useCallback(
    async (key: keyof NotificationPrefs) => {
      const next = { ...globalPrefs, [key]: !globalPrefs[key] };
      const res = await savePrefs(null, next);
      if (!res.ok)
        toast(res.error ?? "Could not save that preference.", "error");
      return res.ok;
    },
    [globalPrefs, savePrefs, toast],
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
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

  const parts = displayName.includes("@")
    ? [displayName.split("@")[0]]
    : displayName.trim().split(/\s+/);
  const first = parts[0];
  const rest = parts.slice(1).join(" ");
  const nameSpace = contentWidth - gutter * 2 - (isDesktop ? 0 : 56);
  const nameSize = profileNameSize(displayName, nameSpace);
  const wideRows = contentWidth >= PROFILE_SPACE.rowsFrom;
  const twoColumns = contentWidth >= PROFILE_SPACE.columnsFrom;

  return (
    <Page maxWidth={PROFILE_SPACE.pageMax}>
      <View>
        {!isDesktop ? (
          <View className="absolute right-0 top-0" style={{ zIndex: 1 }}>
            <ThemeToggle />
          </View>
        ) : null}
        <Display
          fontSize={nameSize}
          accessibilityRole="header"
          className="text-light-text dark:text-dark-text"
          style={{
            lineHeight: Math.round(nameSize * 1.02),
            letterSpacing: 0.5,
          }}
        >
          {first}
          {rest ? (
            <Display fontSize={nameSize} className="text-python-blue">
              {` ${rest}`}
            </Display>
          ) : null}
        </Display>
        <View className="mt-2 flex-row flex-wrap gap-x-6 gap-y-0.5">
          <Text
            className="text-light-text dark:text-dark-text"
            style={PROFILE_TYPE.identityStrong}
          >
            {ROLE_LABEL[profile?.role ?? "student"] ?? "Student"}
          </Text>
          <Text
            className="text-light-secondary dark:text-dark-secondary"
            style={PROFILE_TYPE.identity}
          >
            {profile?.email}
          </Text>
          <Text
            className="text-light-secondary dark:text-dark-secondary"
            style={PROFILE_TYPE.identity}
          >
            {involvement}
          </Text>
          {profile?.president_status === "pending" ? (
            <Text className="text-warn" style={PROFILE_TYPE.identityStrong}>
              Verification pending
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: PROFILE_SPACE.section }}>
        <SectionHeading>Your clubs</SectionHeading>
        <View className="mt-2 border-t-2 border-light-text dark:border-dark-text">
          {membershipError ? (
            <View className="items-start gap-3 py-4">
              <Text className="text-danger" style={PROFILE_TYPE.label}>
                {membershipError}
              </Text>
              <Button label="Retry" onPress={() => void refreshMemberships()} />
            </View>
          ) : myClubs.length === 0 ? (
            <View className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-light-border py-5 dark:border-dark-border">
              <Text
                className="flex-1 text-light-secondary dark:text-dark-secondary"
                style={[PROFILE_TYPE.label, { minWidth: 220 }]}
              >
                You haven't joined a club yet. Clubs you join will be listed
                here with their meeting times.
              </Text>
              <Button
                label="Browse clubs"
                onPress={() => router.push("/browse")}
              />
            </View>
          ) : (
            myClubs.map(({ membership, club }) => (
              <MembershipRow
                key={membership.clubId}
                membership={membership}
                club={club}
                wide={wideRows}
                onOpen={() => router.push(`/club/${membership.clubId}`)}
              />
            ))
          )}
        </View>
      </View>

      <View
        className={twoColumns ? "flex-row items-start" : ""}
        style={{
          marginTop: PROFILE_SPACE.section,
          gap: twoColumns ? PROFILE_SPACE.columnGap : PROFILE_SPACE.section,
        }}
      >
        <View className={twoColumns ? "flex-1" : ""} style={{ minWidth: 0 }}>
          <SectionHeading>Notification preferences</SectionHeading>
          <View className="mt-2 border-t border-light-border-strong dark:border-dark-border-strong">
            {PREF_ROWS.map((row) => (
              <PreferenceRow
                key={row.key}
                label={row.label}
                value={globalPrefs[row.key]}
                onToggle={() => toggleGlobal(row.key)}
              />
            ))}
          </View>
          <Text
            className="mt-2.5 text-light-muted dark:text-dark-muted"
            style={PROFILE_TYPE.detail}
          >
            Defaults for every club. Open a club to change just that one.
          </Text>
          {Platform.OS !== "web" ? (
            <TextLink
              label="Enable push on this device"
              icon="phone-portrait-outline"
              disabled={enablingPush}
              onPress={() => void handleEnablePush()}
            />
          ) : null}
        </View>

        <View className={twoColumns ? "flex-1" : ""} style={{ minWidth: 0 }}>
          <SectionHeading>Account</SectionHeading>
          <View className="mt-2 border-t border-light-border-strong dark:border-dark-border-strong">
            <AccountLink
              label="Interests and free time"
              onPress={() => router.push("/onboarding")}
            />
            <AccountLink
              label="Settings and accessibility"
              onPress={() => router.push("/settings")}
            />
            <AccountLink
              label="Submit a new club"
              onPress={() => router.push("/club/new")}
            />
            {isSpecialAdmin ? (
              <AccountLink
                label="School admin tools"
                onPress={() => router.push("/admin")}
              />
            ) : null}
            <AccountLink
              label="Privacy and policies"
              onPress={() => router.push("/policies")}
            />
          </View>
          <View className="mt-4">
            <SignOutButton
              busy={signingOut}
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
        subtitle="Your clubs, interests and alerts in one place. Use your @lwsd.org email."
        showSettings
        purpose="profile"
      >
        <AccountDashboard />
      </SignInGate>
    </View>
  );
}
