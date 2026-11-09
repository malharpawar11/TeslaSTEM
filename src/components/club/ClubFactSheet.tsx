import { useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { Display, useHover, webFade } from "@/components/system";
import { useNotifications } from "@/context/NotificationsContext";
import { useToast } from "@/context/ToastContext";
import { meetingDays } from "@/lib/discovery";
import type { Club, NotificationPrefs } from "@/types/domain";
import {
  PANEL_SPACE,
  PANEL_TYPE,
  WEEKDAYS,
  meetingTimes,
  pluralDays,
} from "./tokens";

/** When the club meets, drawn on the school week. */
export function ClubSchedule({ club }: { club: Club }) {
  const days = meetingDays(club.day).filter((d) =>
    (WEEKDAYS as readonly string[]).includes(d),
  );
  return (
    <View>
      {days.length ? (
        <View
          className="flex-row"
          style={{ gap: 3 }}
          accessible
          accessibilityLabel={`Meets ${days.join(" and ")}`}
        >
          {WEEKDAYS.map((day) => {
            const met = days.includes(day);
            return (
              <View
                key={day}
                className={`h-9 flex-1 items-center justify-center ${met ? "bg-python-blue" : "bg-light-surface-2 dark:bg-dark-surface"}`}
              >
                <Text
                  className={
                    met ? "text-white" : "text-light-muted dark:text-dark-muted"
                  }
                  style={PANEL_TYPE.weekday}
                >
                  {day.slice(0, 3)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
      <Display
        fontSize={PANEL_TYPE.dayDisplay}
        accessibilityRole="header"
        className="mt-3.5 text-light-text dark:text-dark-text"
      >
        {days.length ? pluralDays(days) : club.day}
      </Display>
      <View className="mt-2" style={{ gap: 6 }}>
        {meetingTimes(club.time).map((part, index) => (
          <View key={index} className="flex-row items-baseline">
            {part.label ? (
              <Text
                className="text-light-text dark:text-dark-text"
                style={[PANEL_TYPE.timeLabel, { width: 76 }]}
              >
                {part.label}
              </Text>
            ) : null}
            <Display
              fontSize={PANEL_TYPE.timeDisplay}
              className="shrink text-python-blue"
              style={{ lineHeight: 24 }}
            >
              {part.value}
            </Display>
          </View>
        ))}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const inner = (
    <>
      <Text
        className="text-light-muted dark:text-dark-muted"
        style={[PANEL_TYPE.factLabel, { width: PANEL_SPACE.factColumn }]}
      >
        {label}
      </Text>
      <Text
        className={`flex-1 ${
          onPress
            ? `underline ${hovered ? "text-python-blue dark:text-python-blue-light" : "text-light-text dark:text-dark-text"}`
            : "text-light-text dark:text-dark-text"
        }`}
        style={[
          PANEL_TYPE.factValue,
          { wordBreak: "break-word" } as object,
          webFade("color"),
        ]}
      >
        {value}
      </Text>
    </>
  );
  const row =
    "flex-row items-start border-b border-light-border py-3 dark:border-dark-border";
  const height = { minHeight: PANEL_SPACE.factRow };
  return onPress ? (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
      className={row}
      style={height}
    >
      {inner}
    </Pressable>
  ) : (
    <View className={row} style={height}>
      {inner}
    </View>
  );
}

export function ClubLedger({ club }: { club: Club }) {
  return (
    <View className="border-t border-light-border dark:border-dark-border">
      <Row
        label="Room"
        value={club.location === "TBD" ? "Not listed yet" : club.location}
      />
      <Row label="Advisor" value={club.advisor} />
      <Row
        label="Members"
        value={club.memberCount === 0 ? "None yet" : String(club.memberCount)}
      />
      <Row
        label="Joining"
        value={
          club.joinPolicy === "approval" ? "Leader approves" : "Open to all"
        }
      />
      {club.contactEmail ? (
        <Row
          label="Email"
          value={club.contactEmail}
          onPress={() => void Linking.openURL(`mailto:${club.contactEmail}`)}
        />
      ) : null}
      {club.instagram ? (
        <Row
          label="Instagram"
          value={club.instagram}
          onPress={() =>
            void Linking.openURL(
              `https://instagram.com/${club.instagram!.replace(/^@/, "")}`,
            )
          }
        />
      ) : null}
      {club.website ? (
        <Row
          label="Website"
          value={club.website}
          onPress={() => void Linking.openURL(club.website!)}
        />
      ) : null}
    </View>
  );
}

function PrefSwitch({
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
  // Answers immediately; a failed save brings the saved value back.
  const [shown, setShown] = useState(value);
  useEffect(() => setShown(value), [value]);
  const x = useSharedValue(value ? 18 : 0);
  useEffect(() => {
    const to = shown ? 18 : 0;
    x.value = reduced ? to : withTiming(to, { duration: 150 });
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
      accessibilityLabel={`${label} notifications`}
      className="min-h-11 flex-row items-center justify-between gap-3"
    >
      <Text
        className={
          shown
            ? "text-light-text dark:text-dark-text"
            : "text-light-muted dark:text-dark-muted"
        }
        style={PANEL_TYPE.alertLabel}
      >
        {label}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Text
          className="text-light-muted dark:text-dark-muted"
          style={PANEL_TYPE.alertState}
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
  );
}

const PREFS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: "events", label: "Events" },
  { key: "files", label: "New files" },
  { key: "notes", label: "Notes and resources" },
];

/** Per-club alert settings, shown to members. */
export function ClubAlertPrefs({ clubId }: { clubId: string }) {
  const { prefsFor, savePrefs } = useNotifications();
  const { toast } = useToast();
  const prefs = prefsFor(clubId);
  const toggle = async (key: keyof NotificationPrefs) => {
    const res = await savePrefs(clubId, { ...prefs, [key]: !prefs[key] });
    if (!res.ok) toast(res.error ?? "Could not save that preference.", "error");
  };
  return (
    <View>
      <Display
        fontSize={PANEL_TYPE.alertsDisplay}
        accessibilityRole="header"
        className="mb-1.5 text-light-text dark:text-dark-text"
      >
        Alerts from this club
      </Display>
      {PREFS.map((row) => (
        <PrefSwitch
          key={row.key}
          label={row.label}
          value={prefs[row.key]}
          onToggle={() => void toggle(row.key)}
        />
      ))}
    </View>
  );
}
