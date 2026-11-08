import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { WeekMarks } from "@/components/clubs/ClubEntry";
import { SignInGate } from "@/components/SignInGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Display,
  Page,
  TextLink,
  useHover,
  webFade,
} from "@/components/system";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useToast } from "@/context/ToastContext";
import { requestPresidentVerification } from "@/data/adminRepo";
import { meetingDays } from "@/lib/discovery";
import { registerForPush } from "@/lib/push";
import { useLayout } from "@/theme/layout";
import { easing } from "@/theme/motion";
import {
  roleLabel,
  type Club,
  type Membership,
  type NotificationPrefs,
} from "@/types/domain";

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

function PrefToggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  const reduced = useReducedMotion();
  const { hovered, hoverProps } = useHover();
  // The switch answers at once; a failed save puts it back.
  const [shown, setShown] = useState(value);
  useEffect(() => setShown(value), [value]);
  const x = useSharedValue(value ? 22 : 0);
  useEffect(() => {
    x.value = reduced
      ? shown
        ? 22
        : 0
      : withTiming(shown ? 22 : 0, {
          duration: 160,
          easing: easing.emphasized,
        });
  }, [shown, reduced, x]);
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return (
    <Pressable
      onPress={() => {
        setShown((v) => !v);
        onToggle();
      }}
      {...hoverProps}
      accessibilityRole="switch"
      aria-checked={shown}
      accessibilityLabel={label}
      className="min-h-11 flex-row items-center justify-between gap-4"
    >
      <Text
        className={`text-base ${shown ? "font-bold text-light-text dark:text-dark-text" : "text-light-muted dark:text-dark-muted"}`}
      >
        {label}
      </Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-xs font-bold text-light-muted dark:text-dark-muted">
          {shown ? "On" : "Off"}
        </Text>
        <View
          className={`h-5 justify-center rounded-sm px-0.5 ${shown ? "bg-python-green" : "bg-light-border-strong dark:bg-dark-border-strong"}`}
          style={[
            { width: 42, opacity: hovered ? 0.85 : 1 },
            webFade("background-color, opacity"),
          ]}
        >
          <Animated.View className="h-4 w-4 rounded-sm bg-white" style={knob} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * One membership, set as type. Leaders print larger and in blue; a request
 * still waiting on approval is outlined, not yet filled in.
 */
function RosterClub({
  membership,
  club,
  compact,
  onOpen,
}: {
  membership: Membership;
  club: Club;
  compact: boolean;
  onOpen: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const pending = membership.status === "pending";
  const leads = membership.role !== "member" && !pending;
  const size = compact ? (leads ? 50 : 42) : leads ? 84 : 62;
  const role = pending
    ? "Waiting for approval"
    : roleLabel(membership.role, membership.position);
  const outline =
    pending && Platform.OS === "web"
      ? ({
          color: "transparent",
          WebkitTextStroke: "1.5px var(--outline, #808080)",
        } as object)
      : null;
  return (
    <Pressable
      onPress={onOpen}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`Open ${club.name}. ${role}. Meets ${club.day}, ${club.time}.`}
      className="py-2"
    >
      <View
        style={[
          { transform: [{ translateX: hovered ? 8 : 0 }] },
          webFade("transform"),
        ]}
      >
        <Display
          fontSize={size}
          className={
            pending
              ? "text-light-muted dark:text-dark-muted"
              : hovered || leads
                ? "text-python-blue"
                : "text-light-text dark:text-dark-text"
          }
          style={[outline, webFade("color")]}
        >
          {club.name}
        </Display>
      </View>
      <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <Text
          className={`text-sm font-bold ${pending ? "text-warn" : "text-light-secondary dark:text-dark-secondary"}`}
        >
          {role}
        </Text>
        <WeekMarks club={club} />
        <Text className="text-sm text-light-muted dark:text-dark-muted">
          {[club.time, club.location === "TBD" ? null : club.location]
            .filter(Boolean)
            .join(", ")}
        </Text>
      </View>
    </Pressable>
  );
}

function QuietLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="min-h-11 justify-center"
    >
      <Text
        className={`text-base ${hovered ? "text-python-blue underline dark:text-python-blue-light" : "text-light-secondary dark:text-dark-secondary"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function AccountDashboard() {
  const { isDesktop, contentWidth, gutter } = useLayout();
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
        .filter(
          (row): row is { membership: Membership; club: Club } => !!row.club,
        ),
    [memberships, clubs],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof myClubs>();
    for (const row of myClubs)
      map.set(row.club.category, [...(map.get(row.club.category) ?? []), row]);
    const rank = (rows: typeof myClubs) =>
      rows.some((r) => r.membership.role !== "member") ? 0 : 1;
    return [...map.entries()].sort(
      (a, b) => rank(a[1]) - rank(b[1]) || b[1].length - a[1].length,
    );
  }, [myClubs]);

  const active = myClubs.filter((r) => r.membership.status === "active");
  const busyDays = WEEKDAYS.filter((d) =>
    active.some((r) => meetingDays(r.club.day).includes(d)),
  );
  const involvement = active.length
    ? `${active.length} ${active.length === 1 ? "club" : "clubs"}, ${busyDays.length} ${busyDays.length === 1 ? "day" : "days"} a week`
    : "No clubs yet";

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

  // Name set across two lines, the second pushed right: a signature, not a label.
  const parts = displayName.includes("@")
    ? [displayName.split("@")[0]]
    : displayName.trim().split(/\s+/);
  const first = parts[0];
  const rest = parts.slice(1).join(" ");
  const twoColumn = contentWidth >= 980;
  const indentRatio = rest ? (twoColumn ? 0.7 : 0.4) : 0;
  const widest = Math.max(
    first.length * 0.43,
    rest.length * 0.43 + indentRatio,
    2,
  );
  const nameSpace = (contentWidth - gutter * 2) * (twoColumn ? 0.66 : 1);
  const nameSize = Math.min(nameSpace / widest, twoColumn ? 210 : 150);
  const indent = nameSize * indentRatio;
  const compact = contentWidth < 640;

  return (
    <Page maxWidth={1500} bottomInset={0}>
      <View
        className={twoColumn ? "flex-row items-end justify-between gap-12" : ""}
      >
        <View style={{ flexShrink: 1 }}>
          <Display
            fontSize={nameSize}
            accessibilityRole="header"
            numberOfLines={1}
            className="text-light-text dark:text-dark-text"
          >
            {first}
          </Display>
          {rest ? (
            <Display
              fontSize={nameSize}
              numberOfLines={1}
              className="text-python-blue"
              style={{ marginLeft: indent }}
            >
              {rest}
            </Display>
          ) : null}
        </View>
        <View
          className={twoColumn ? "pb-3" : "mt-5"}
          style={twoColumn ? { width: 300 } : undefined}
        >
          {!isDesktop ? (
            <View className="absolute right-0 top-0">
              <ThemeToggle />
            </View>
          ) : null}
          <Text className="text-lg font-bold text-light-text dark:text-dark-text">
            {ROLE_LABEL[profile?.role ?? "student"] ?? "Student"}
          </Text>
          <Text className="text-base text-light-secondary dark:text-dark-secondary">
            {profile?.email}
          </Text>
          {presidentStatus === "pending" ? (
            <Text className="mt-1 text-base font-bold text-warn">
              Verification pending
            </Text>
          ) : null}
          <View
            className="mt-4 flex-row"
            style={{ gap: 3 }}
            accessibilityElementsHidden
          >
            {WEEKDAYS.map((d) => (
              <View
                key={d}
                className={`h-2 flex-1 ${busyDays.includes(d) ? "bg-python-blue" : "bg-light-surface-3 dark:bg-dark-surface-2"}`}
              />
            ))}
          </View>
          <Text className="mt-1.5 text-sm text-light-muted dark:text-dark-muted">
            {involvement}
          </Text>
        </View>
      </View>

      <View
        className={`mt-10 border-t-2 border-light-text pt-6 dark:border-dark-text ${twoColumn ? "flex-row items-start gap-16" : ""}`}
      >
        <View className={twoColumn ? "flex-1" : ""} style={{ minWidth: 0 }}>
          {membershipError ? (
            <View className="items-start gap-3 py-4">
              <Text className="text-danger">{membershipError}</Text>
              <Button label="Retry" onPress={() => void refreshMemberships()} />
            </View>
          ) : myClubs.length === 0 ? (
            <View className="items-start py-6">
              <Display size="lg">Nothing on the roster yet</Display>
              <Text className="mb-5 mt-2 max-w-md text-lg text-light-secondary dark:text-dark-secondary">
                Join a club and it takes its place here.
              </Text>
              <Button
                label="Browse clubs"
                size="lg"
                onPress={() => router.push("/browse")}
              />
            </View>
          ) : (
            byCategory.map(([category, rows]) => (
              <View
                key={category}
                className={`mb-7 ${compact ? "" : "flex-row gap-6"}`}
              >
                <View style={compact ? { marginBottom: 2 } : { width: 92 }}>
                  <Text className="pt-2 text-base font-bold text-light-muted dark:text-dark-muted">
                    {category}
                  </Text>
                </View>
                <View className="flex-1" style={{ minWidth: 0 }}>
                  {rows.map(({ membership, club }) => (
                    <RosterClub
                      key={membership.clubId}
                      membership={membership}
                      club={club}
                      compact={compact}
                      onOpen={() => router.push(`/club/${membership.clubId}`)}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        <View
          style={twoColumn ? { width: 300 } : undefined}
          className={twoColumn ? "" : "mt-6"}
        >
          <Display size="sm" accessibilityRole="header">
            Tell me about
          </Display>
          <View className="mt-1.5">
            {PREF_ROWS.map((row) => (
              <PrefToggle
                key={row.key}
                label={row.label}
                value={globalPrefs[row.key]}
                onToggle={() => void toggleGlobal(row.key)}
              />
            ))}
          </View>
          <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
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

          <View className="mt-8">
            <QuietLink
              label="Interests and free time"
              onPress={() => router.push("/onboarding")}
            />
            <QuietLink
              label="Settings and accessibility"
              onPress={() => router.push("/settings")}
            />
            <QuietLink
              label="Submit a new club"
              onPress={() => router.push("/club/new")}
            />
            {isSpecialAdmin ? (
              <QuietLink
                label="School admin tools"
                onPress={() => router.push("/admin")}
              />
            ) : null}
            <QuietLink
              label="Privacy and policies"
              onPress={() => router.push("/policies")}
            />
            <View className="mt-2 items-start">
              <Button
                label="Sign out"
                variant="secondary"
                loading={signingOut}
                onPress={() => void handleSignOut()}
              />
            </View>
          </View>
        </View>
      </View>

      {showPresidentCta ? (
        <View
          className="mt-14 bg-python-blue"
          style={{
            marginHorizontal: -gutter,
            paddingHorizontal: gutter,
            paddingVertical: 44,
          }}
          {...({ dataSet: { onblue: "true" } } as object)}
        >
          <View className={twoColumn ? "flex-row items-end gap-16" : ""}>
            <View className={twoColumn ? "flex-1" : ""}>
              <Display
                fontSize={compact ? 66 : 112}
                accessibilityRole="header"
                className="text-white"
              >
                Lead a club?
              </Display>
              <Text className="mt-2 max-w-xl text-lg leading-7 text-white">
                Verified presidents post events, files, notes and Canvas links,
                approve new members, name a board and edit their club's page.
              </Text>
            </View>
            <View style={twoColumn ? { width: 380 } : { marginTop: 24 }}>
              <Text className="text-base leading-6 text-white">
                Send a request and the school admin reviews it. If your club is
                already listed, you can also claim it from its own page.
              </Text>
              <Pressable
                onPress={() => void handleRequestPresident()}
                disabled={requesting || requested}
                accessibilityRole="button"
                accessibilityLabel={
                  requested ? "Request sent" : "Request president verification"
                }
                aria-busy={requesting}
                aria-disabled={requesting || requested}
                className="mt-4 h-16 justify-center rounded-sm bg-white px-5"
                style={{ opacity: requesting ? 0.75 : 1 }}
              >
                <Display fontSize={30} className="text-python-blue">
                  {requested
                    ? "Request sent"
                    : requesting
                      ? "One moment"
                      : "Request president verification"}
                </Display>
              </Pressable>
              <TextLink
                label="Find your club"
                onBlue
                onPress={() => router.push("/browse")}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={{ height: 56 }} />
      )}
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
