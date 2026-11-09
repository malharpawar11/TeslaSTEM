import { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { Display, useHover, webFade } from "@/components/system";
import { useTheme } from "@/context/ThemeContext";
import { meetingDays } from "@/lib/discovery";
import { surfaces } from "@/theme/tokens";
import { roleLabel, type Club, type Membership } from "@/types/domain";
import { PROFILE_SPACE, PROFILE_TYPE } from "./tokens";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const KNOB_TRAVEL = 18;

export function SectionHeading({ children }: { children: string }) {
  return (
    <Display
      fontSize={PROFILE_TYPE.sectionDisplay}
      accessibilityRole="header"
      className="text-light-text dark:text-dark-text"
    >
      {children}
    </Display>
  );
}

function useArrowColor() {
  const { isDark } = useTheme();
  return isDark ? surfaces.dark.muted : surfaces.light.muted;
}

/** Mon to Fri, with the days this club meets filled in. */
function DayMarks({ club }: { club: Club }) {
  const days = meetingDays(club.day);
  if (!days.some((day) => WEEKDAYS.includes(day)))
    return (
      <Text
        className="text-light-secondary dark:text-dark-secondary"
        style={PROFILE_TYPE.detail}
      >
        {club.day}
      </Text>
    );
  return (
    <View
      className="flex-row"
      style={{ gap: PROFILE_SPACE.dayGap }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {WEEKDAYS.map((day) => {
        const met = days.includes(day);
        return (
          <View
            key={day}
            className={`items-center justify-center rounded-[3px] ${met ? "bg-python-blue/15" : ""}`}
            style={{
              width: PROFILE_SPACE.dayCell,
              height: PROFILE_SPACE.dayCell,
            }}
          >
            <Text
              className={
                met
                  ? "text-python-blue dark:text-python-blue-light"
                  : "text-light-subtle dark:text-dark-subtle"
              }
              style={met ? PROFILE_TYPE.dayOn : PROFILE_TYPE.day}
            >
              {day.slice(0, 1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** One membership: what it is, your part in it, and when and where it meets. */
export function MembershipRow({
  membership,
  club,
  wide,
  onOpen,
}: {
  membership: Membership;
  club: Club;
  wide: boolean;
  onOpen: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const arrow = useArrowColor();
  const pending = membership.status === "pending";
  const leads = membership.role !== "member" && !pending;
  const role = pending
    ? "Waiting for approval"
    : roleLabel(membership.role, membership.position);
  const times = club.time.split(/;\s*/).filter(Boolean);
  const room = club.location === "TBD" ? null : club.location;

  const name = (
    <View style={wide ? { flex: 1.2, minWidth: 0 } : undefined}>
      <Display
        fontSize={PROFILE_TYPE.clubDisplay}
        className={
          hovered
            ? "text-python-blue"
            : pending
              ? "text-light-muted dark:text-dark-muted"
              : "text-light-text dark:text-dark-text"
        }
        style={webFade("color")}
      >
        {club.name}
      </Display>
      <Text
        className="mt-0.5 text-light-muted dark:text-dark-muted"
        style={PROFILE_TYPE.detail}
      >
        {club.category}
      </Text>
    </View>
  );
  const part = (
    <Text
      className={
        pending
          ? "text-warn"
          : leads
            ? "text-light-text dark:text-dark-text"
            : "text-light-secondary dark:text-dark-secondary"
      }
      style={[
        pending || leads ? PROFILE_TYPE.identityStrong : PROFILE_TYPE.identity,
        wide ? { width: PROFILE_SPACE.roleColumn } : null,
      ]}
    >
      {role}
    </Text>
  );
  const where = (
    <View style={wide ? { flex: 1, minWidth: 0 } : { flexShrink: 1 }}>
      {times.map((time) => (
        <Text
          key={time}
          className="text-light-text dark:text-dark-text"
          style={PROFILE_TYPE.detail}
        >
          {time}
        </Text>
      ))}
      {room ? (
        <Text
          className="text-light-muted dark:text-dark-muted"
          style={PROFILE_TYPE.detail}
        >
          {room}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Pressable
      onPress={onOpen}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`Open ${club.name}. ${club.category}. ${role}. Meets ${club.day}, ${club.time}.`}
      className="border-b border-light-border dark:border-dark-border"
      style={{ paddingVertical: 18 }}
    >
      {wide ? (
        <View className="flex-row items-center gap-6">
          {name}
          {part}
          <DayMarks club={club} />
          {where}
          <View
            style={[
              { transform: [{ translateX: hovered ? 3 : 0 }] },
              webFade("transform"),
            ]}
          >
            <Ionicons name="arrow-forward" size={16} color={arrow} />
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1" style={{ minWidth: 0 }}>
              {name}
            </View>
            <View className="pt-1">{part}</View>
          </View>
          <View className="flex-row flex-wrap items-center gap-x-5 gap-y-2">
            <DayMarks club={club} />
            {where}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** The whole row is the switch. It answers at once; a failed save puts it back. */
export function PreferenceRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  /** Resolves false when the save failed. */
  onToggle: () => Promise<boolean>;
}) {
  const reduced = useReducedMotion();
  const { hovered, hoverProps } = useHover();
  const [shown, setShown] = useState(value);
  useEffect(() => setShown(value), [value]);
  const x = useSharedValue(value ? KNOB_TRAVEL : 0);
  useEffect(() => {
    const to = shown ? KNOB_TRAVEL : 0;
    x.value = reduced ? to : withTiming(to, { duration: 150 });
  }, [shown, reduced, x]);
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  const toggle = () => {
    const before = shown;
    setShown(!before);
    void onToggle().then((saved) => {
      if (!saved) setShown(before);
    });
  };
  // Browsers only give Space to real buttons, so the switch handles it.
  const onKeyDown = (event: {
    nativeEvent: { key: string };
    preventDefault?: () => void;
  }) => {
    if (event.nativeEvent.key !== " ") return;
    event.preventDefault?.();
    toggle();
  };
  return (
    <View {...(Platform.OS === "web" ? ({ onKeyDown } as object) : null)}>
      <Pressable
        onPress={toggle}
        {...hoverProps}
        accessibilityRole="switch"
        aria-checked={shown}
        accessibilityLabel={label}
        className="flex-row items-center justify-between gap-4 border-b border-light-border dark:border-dark-border"
        style={{ minHeight: PROFILE_SPACE.listRow }}
      >
        <Text
          className={
            shown
              ? "text-light-text dark:text-dark-text"
              : "text-light-muted dark:text-dark-muted"
          }
          style={PROFILE_TYPE.label}
        >
          {label}
        </Text>
        <View className="flex-row items-center gap-2.5">
          <Text
            className="text-light-muted dark:text-dark-muted"
            style={[PROFILE_TYPE.small, { width: 22, textAlign: "right" }]}
          >
            {shown ? "On" : "Off"}
          </Text>
          <View
            className={`justify-center rounded-[3px] ${shown ? "bg-python-green" : "bg-light-border-strong dark:bg-dark-border-strong"}`}
            style={[
              {
                width: 40,
                height: 22,
                paddingHorizontal: 2,
                opacity: hovered ? 0.85 : 1,
              },
              webFade("background-color, opacity"),
            ]}
          >
            <Animated.View
              className="rounded-[2px] bg-white"
              style={[{ width: 18, height: 18 }, knob]}
            />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export function AccountLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const arrow = useArrowColor();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="flex-row items-center justify-between gap-4 border-b border-light-border dark:border-dark-border"
      style={{ minHeight: PROFILE_SPACE.listRow }}
    >
      <Text
        className={
          hovered
            ? "text-python-blue dark:text-python-blue-light"
            : "text-light-text dark:text-dark-text"
        }
        style={[PROFILE_TYPE.label, webFade("color")]}
      >
        {label}
      </Text>
      <View
        style={[
          { transform: [{ translateX: hovered ? 3 : 0 }] },
          webFade("transform"),
        ]}
      >
        <Ionicons name="chevron-forward" size={16} color={arrow} />
      </View>
    </Pressable>
  );
}

export function SignOutButton({
  busy,
  onPress,
}: {
  busy: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      aria-busy={busy}
      aria-disabled={busy}
      className={`justify-center self-start rounded-[4px] border px-3.5 ${
        hovered && !busy
          ? "border-light-text dark:border-dark-text"
          : "border-light-border-strong dark:border-dark-border-strong"
      }`}
      style={[
        { minHeight: PROFILE_SPACE.button, opacity: busy ? 0.7 : 1 },
        webFade("border-color"),
      ]}
    >
      <Text
        className="text-light-text dark:text-dark-text"
        style={PROFILE_TYPE.button}
      >
        {busy ? "Signing out" : "Sign out"}
      </Text>
    </Pressable>
  );
}
