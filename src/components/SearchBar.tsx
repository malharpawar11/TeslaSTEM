import { useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { surface } from "@/theme/tokens";

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  resultCount?: number;
}

/** A line to write on, set large enough that it reads as the page's question. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search by club, advisor, room or day",
  resultCount,
}: Props) {
  const { isDark } = useTheme();
  const { dyslexicFont, fontReady, highContrast } = useAccessibility();
  const c = surface(isDark);
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={`flex-row items-center gap-3 border-b-2 ${
        focused
          ? "border-python-blue"
          : "border-light-border-strong dark:border-dark-border-strong"
      }`}
    >
      <Ionicons name="search" size={22} color={c.muted} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={
          highContrast ? (isDark ? "#FFFFFF" : "#111827") : c.subtle
        }
        accessibilityLabel="Search clubs"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        className="h-14 flex-1 text-light-text dark:text-dark-text"
        style={[
          { fontSize: 20 },
          Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
          dyslexicFont && fontReady
            ? { fontFamily: "OpenDyslexic" }
            : Platform.OS === "web"
              ? null
              : { fontFamily: "Atkinson" },
        ]}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => {
            onChangeText("");
            inputRef.current?.focus();
          }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          className="h-8 w-8 items-center justify-center"
        >
          <Ionicons name="close" size={18} color={c.muted} />
        </Pressable>
      ) : resultCount != null && resultCount >= 0 ? (
        <Text className="text-sm text-light-muted dark:text-dark-muted">
          {resultCount}
        </Text>
      ) : null}
    </View>
  );
}
