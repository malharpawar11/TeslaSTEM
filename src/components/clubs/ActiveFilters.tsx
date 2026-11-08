import { Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { useTheme } from "@/context/ThemeContext";
import { palette } from "@/theme/tokens";

export interface ActiveFilter {
  key: string;
  label: string;
  clear: () => void;
}

/** What's narrowing the list right now, each removable on its own. */
export function ActiveFilters({
  filters,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
}) {
  const { isDark } = useTheme();
  const reduced = useReducedMotion();
  if (filters.length === 0) return null;
  const color = isDark ? palette.blue[300] : palette.blue[700];
  return (
    <View className="flex-row flex-wrap items-center gap-x-2 gap-y-2">
      {filters.map((filter) => (
        <Animated.View
          key={filter.key}
          entering={reduced ? undefined : FadeIn.duration(140)}
          layout={reduced ? undefined : LinearTransition.duration(160)}
        >
          <Pressable
            onPress={filter.clear}
            accessibilityRole="button"
            accessibilityLabel={`Remove filter: ${filter.label}`}
            className="h-9 flex-row items-center gap-1.5 rounded-sm bg-python-blue/10 pl-2.5 pr-2 hover:bg-python-blue/20 dark:bg-python-blue/25 dark:hover:bg-python-blue/40"
          >
            <Text style={{ color }} className="text-sm font-bold">
              {filter.label}
            </Text>
            <Ionicons name="close" size={15} color={color} />
          </Pressable>
        </Animated.View>
      ))}
      <Pressable
        onPress={onClearAll}
        accessibilityRole="button"
        accessibilityLabel="Clear all filters"
        className="h-9 justify-center px-1.5"
      >
        <Text className="text-sm font-bold text-light-secondary underline dark:text-dark-secondary">
          Clear all
        </Text>
      </Pressable>
    </View>
  );
}
