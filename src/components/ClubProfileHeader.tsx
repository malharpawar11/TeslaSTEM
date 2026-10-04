import { CampusVisual } from "./CampusVisual";

import { View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";

import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Club, clubInitials } from "@/types/domain";

import { Gradient } from "./Gradient";

import { PressableScale } from "./ui/Pressable";

import { ThemeToggle } from "./ThemeToggle";

import { palette } from "@/theme/tokens";

interface Props {
  club: Club;

  onBack: () => void;

  onShare?: () => void;
}

export function ClubProfileHeader({ club, onBack, onShare }: Props) {
  const insets = useSafeAreaInsets();

  const facts: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { icon: "pricetag-outline", label: club.category },

    {
      icon: "people-outline",
      label: `${club.memberCount} member${club.memberCount === 1 ? "" : "s"}`,
    },

    { icon: "calendar-outline", label: `${club.day} · ${club.time}` },

    { icon: "location-outline", label: club.location },
  ];

  return (
    <Gradient
      colors={["#10285D", "#104A51"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 16, overflow: "hidden" }}
    >
      <CampusVisual active={false} />

      <View className="px-6 pb-8">
        <View className="flex-row items-center justify-between">
          <PressableScale
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            scaleTo={0.94}
            pressedOpacity={0.7}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10"
          >
            <Ionicons name="arrow-back" size={19} color={palette.white} />
          </PressableScale>

          <View className="flex-row items-center gap-2">
            {onShare ? (
              <PressableScale
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel="Share club"
                scaleTo={0.94}
                pressedOpacity={0.7}
                className="h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10"
              >
                <Ionicons
                  name="share-outline"
                  size={18}
                  color={palette.white}
                />
              </PressableScale>
            ) : null}

            <ThemeToggle variant="translucent" />
          </View>
        </View>

        <View className="mt-8 flex-row items-center gap-3.5">
          <View className="h-18 w-18 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
            <Text className="text-lg font-semibold text-white">
              {clubInitials(club.name)}
            </Text>
          </View>

          <Text
            className="flex-1 text-3xl font-bold tracking-tight text-white"
            numberOfLines={2}
          >
            {club.name}
          </Text>
        </View>

        <View className="mt-4 flex-row flex-wrap items-center gap-2">
          {facts.map((f) => (
            <View
              key={f.icon}
              className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-2"
            >
              <Ionicons
                name={f.icon}
                size={13}
                color="rgba(255,255,255,0.75)"
              />

              <Text className="text-sm text-white/80">{f.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Gradient>
  );
}
