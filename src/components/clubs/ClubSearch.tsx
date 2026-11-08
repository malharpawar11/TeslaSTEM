import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display } from "@/components/system";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useTheme } from "@/context/ThemeContext";
import { useLayout } from "@/theme/layout";
import { surface } from "@/theme/tokens";
import type { Club } from "@/types/domain";

const IS_WEB = Platform.OS === "web";

/**
 * Search with live club suggestions. Keyboard follows the combobox pattern:
 * arrows move, Enter opens, Escape closes then clears, "/" focuses from
 * anywhere on the page.
 */
export function ClubSearch({
  value,
  onChangeText,
  clubs,
  focusedScreen,
  onOpen,
}: {
  value: string;
  onChangeText: (t: string) => void;
  clubs: Club[];
  focusedScreen: boolean;
  onOpen: (id: string) => void;
}) {
  const { isDark } = useTheme();
  const { dyslexicFont, fontReady, highContrast } = useAccessibility();
  const c = surface(isDark);
  const { isDesktop, contentWidth } = useLayout();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return clubs
      .filter((club) =>
        [club.name, club.advisor, club.location]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .sort((a, b) => {
        const rank = (club: Club) =>
          club.name.toLowerCase().startsWith(q)
            ? 0
            : club.name.toLowerCase().includes(q)
              ? 1
              : 2;
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [clubs, value]);
  const open = focused && !dismissed && suggestions.length > 0;

  useEffect(() => {
    setCursor(-1);
    setDismissed(false);
  }, [value]);

  useEffect(() => {
    if (!IS_WEB || !focusedScreen) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      const slash = event.key === "/" && !typing;
      const command =
        event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (slash || command) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focusedScreen]);

  const onKeyPress = (event: {
    nativeEvent: { key: string };
    preventDefault?: () => void;
  }) => {
    const key = event.nativeEvent.key;
    if (key === "ArrowDown" && open) {
      event.preventDefault?.();
      setCursor((i) => (i + 1) % suggestions.length);
    } else if (key === "ArrowUp" && open) {
      event.preventDefault?.();
      setCursor((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (key === "Enter") {
      if (open && cursor >= 0) onOpen(suggestions[cursor].id);
      else setDismissed(true);
    } else if (key === "Escape") {
      if (open) setDismissed(true);
      else onChangeText("");
    }
  };

  const webCombo = IS_WEB
    ? ({
        role: "combobox",
        "aria-expanded": open,
        "aria-controls": "club-suggestions",
        "aria-autocomplete": "list",
        "aria-activedescendant":
          open && cursor >= 0 ? `club-option-${cursor}` : undefined,
      } as object)
    : {};

  return (
    <View style={{ zIndex: 30 }}>
      <View
        className={`h-[72px] flex-row items-center gap-4 border-b-[3px] ${
          focused
            ? "border-python-blue"
            : "border-light-text dark:border-dark-text"
        }`}
      >
        <Ionicons name="search" size={26} color={c.text} />
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChangeText}
          onKeyPress={onKeyPress as never}
          placeholder={
            contentWidth < 520
              ? "Club, advisor, room or day"
              : "Search clubs, advisors, rooms or days"
          }
          placeholderTextColor={
            highContrast ? (isDark ? "#FFFFFF" : "#111827") : c.muted
          }
          accessibilityLabel="Search clubs"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 140)}
          returnKeyType="search"
          className="h-full flex-1 text-light-text dark:text-dark-text"
          style={[
            { fontSize: 22, minWidth: 0 },
            IS_WEB ? ({ outlineStyle: "none" } as object) : null,
            dyslexicFont && fontReady
              ? { fontFamily: "OpenDyslexic" }
              : IS_WEB
                ? null
                : { fontFamily: "Atkinson" },
          ]}
          {...webCombo}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText("");
              input.current?.focus();
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="h-11 w-11 items-center justify-center"
          >
            <Ionicons name="close" size={24} color={c.text} />
          </Pressable>
        ) : isDesktop ? (
          <View className="h-7 w-7 items-center justify-center rounded-sm bg-light-surface-2 dark:bg-dark-surface-2">
            <Text className="text-sm font-bold text-light-secondary dark:text-dark-secondary">
              /
            </Text>
          </View>
        ) : null}
      </View>

      {open ? (
        <View
          nativeID="club-suggestions"
          {...({ role: "listbox" } as object)}
          className="absolute left-0 right-0 rounded-b-sm border-x-2 border-b-2 border-light-text bg-light-bg dark:border-dark-text dark:bg-dark-bg"
          style={{ top: 72, zIndex: 40 }}
        >
          {suggestions.map((club, i) => {
            const active = i === cursor;
            return (
              <Pressable
                key={club.id}
                nativeID={`club-option-${i}`}
                {...({ role: "option", "aria-selected": active } as object)}
                onHoverIn={() => setCursor(i)}
                onPress={() => onOpen(club.id)}
                className={`flex-row flex-wrap items-baseline justify-between gap-x-6 px-4 py-2.5 ${active ? "bg-python-blue" : ""}`}
              >
                <Display
                  fontSize={28}
                  className={active ? "text-white" : "text-light-text dark:text-dark-text"}
                >
                  {club.name}
                </Display>
                <Text
                  className={`text-sm ${active ? "text-white" : "text-light-muted dark:text-dark-muted"}`}
                >
                  {club.day}, {club.time}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
