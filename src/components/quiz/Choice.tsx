import { Pressable, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useHover, webFade } from "@/components/system";
import { QUIZ_RADIUS, QUIZ_SPACE, QUIZ_TYPE } from "./tokens";

/**
 * One selectable answer. A filled square with a check and a heavier label mark
 * it as chosen, so the state never depends on colour alone.
 */
export function Choice({
  label,
  selected,
  onPress,
  style,
  showBox = true,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  /** Single-choice rows read better without a checkbox. */
  showBox?: boolean;
  accessibilityLabel?: string;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      aria-pressed={selected}
      accessibilityLabel={accessibilityLabel ?? label}
      className={`flex-row items-center gap-2.5 border ${showBox ? "px-3" : "justify-center px-0.5"} ${
        selected
          ? "border-python-blue bg-python-blue"
          : hovered
            ? "border-light-text dark:border-dark-text"
            : "border-light-border-strong dark:border-dark-border-strong"
      }`}
      style={[
        { height: QUIZ_SPACE.controlHeight, borderRadius: QUIZ_RADIUS },
        webFade("background-color, border-color"),
        style,
      ]}
    >
      {showBox ? (
        <View
          className={`items-center justify-center border ${
            selected
              ? "border-white bg-white"
              : "border-light-border-strong dark:border-dark-border-strong"
          }`}
          style={[
            { width: 18, height: 18, borderRadius: 3 },
            webFade("background-color"),
          ]}
        >
          {selected ? (
            <Ionicons name="checkmark" size={14} color="#3068F0" />
          ) : null}
        </View>
      ) : null}
      <Text
        numberOfLines={1}
        className={
          selected ? "text-white" : "text-light-text dark:text-dark-text"
        }
        style={selected ? QUIZ_TYPE.choiceOn : QUIZ_TYPE.choice}
      >
        {label}
      </Text>
    </Pressable>
  );
}
