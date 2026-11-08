import { View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "brand" | "info" | "neutral";
}

export function EmptyState({
  icon = "search",
  title,
  description,
  actionLabel,
  onAction,
  tone = "info",
}: Props) {
  return (
    <View className="items-start py-12">
      <Text
        className="font-display text-light-text dark:text-dark-text"
        style={{ fontSize: 34, lineHeight: 36 }}
      >
        {title}
      </Text>
      {description ? (
        <Text className="mt-2 max-w-md text-base text-light-muted dark:text-dark-muted">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-5">
          <Button
            label={actionLabel}
            onPress={onAction}
            variant="secondary"
            size="md"
          />
        </View>
      ) : null}
    </View>
  );
}
