import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display } from "@/components/system";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useTheme } from "@/context/ThemeContext";
import { surface } from "@/theme/tokens";
import type { Club } from "@/types/domain";
import { floorWord, schedule, searchClubs, type SearchHit } from "./useClubMap";

function Result({
  hit,
  active,
  onPick,
  onHover,
}: {
  hit: SearchHit;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  const when = schedule(hit.club);
  return (
    <Pressable
      onPress={onPick}
      onHoverIn={onHover}
      accessibilityRole="button"
      accessibilityLabel={`${hit.club.name}, ${hit.room ? `room ${hit.room}` : "room not listed"}`}
      aria-selected={active}
      className={`flex-row items-start gap-3 border-l-[3px] py-2.5 pl-3 pr-3 ${
        active
          ? "border-python-blue bg-light-surface-2 dark:bg-dark-surface-2"
          : "border-transparent"
      }`}
    >
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Display fontSize={20} style={{ lineHeight: 23 }} numberOfLines={1}>
          {hit.club.name}
        </Display>
        <Text
          className="mt-0.5 text-sm text-light-secondary dark:text-dark-secondary"
          numberOfLines={1}
        >
          {when ?? "Schedule not listed"}
        </Text>
      </View>
      <View className="items-end">
        {hit.room ? (
          <>
            <Display fontSize={20} className="text-python-blue" style={{ lineHeight: 23 }}>
              {hit.room}
            </Display>
            <Text className="text-xs text-light-muted dark:text-dark-muted">
              {hit.floor ? floorWord(hit.floor) : ""}
            </Text>
          </>
        ) : (
          <Text className="pt-1 text-xs text-light-muted dark:text-dark-muted">
            No room listed
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Find a club by name (or a room by number). Results open under the field;
 * arrow keys move through them, Enter picks, Escape clears.
 */
export function MapSearch({
  clubs,
  onPick,
}: {
  clubs: Club[];
  onPick: (hit: SearchHit) => void;
}) {
  const { isDark } = useTheme();
  const { dyslexicFont, fontReady } = useAccessibility();
  const c = surface(isDark);
  const input = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const hits = useMemo(() => searchClubs(clubs, query), [clubs, query]);
  useEffect(() => setIndex(0), [query]);
  const open = focused && query.trim().length > 0;

  const pick = (hit: SearchHit | undefined) => {
    if (!hit) return;
    onPick(hit);
    setQuery("");
    input.current?.blur();
  };

  const onKey = (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const key = e.nativeEvent.key;
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault?.();
      if (!hits.length) return;
      setIndex((i) => (i + (key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length);
    } else if (key === "Enter") {
      pick(hits[index]);
    } else if (key === "Escape") {
      setQuery("");
    }
  };

  return (
    <View style={{ zIndex: 30 }}>
      <View
        className={`flex-row items-center gap-3 border-b-2 ${
          focused ? "border-python-blue" : "border-light-text dark:border-dark-text"
        }`}
      >
        <Ionicons name="search" size={20} color={c.muted} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={setQuery}
          onKeyPress={onKey as never}
          placeholder="Find a club or room"
          placeholderTextColor={c.subtle}
          accessibilityLabel="Find a club or room on the map"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => {
            clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          // A short delay lets a click on a result land before the list closes.
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 160);
          }}
          returnKeyType="search"
          className="h-12 flex-1 text-light-text dark:text-dark-text"
          style={[
            { fontSize: 18 },
            Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
            dyslexicFont && fontReady
              ? { fontFamily: "OpenDyslexic" }
              : Platform.OS === "web"
                ? null
                : { fontFamily: "Atkinson" },
          ]}
        />
        {query ? (
          <Pressable
            onPress={() => {
              setQuery("");
              input.current?.focus();
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="h-11 w-11 items-center justify-center"
          >
            <Ionicons name="close" size={18} color={c.muted} />
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View
          className="absolute left-0 right-0 border border-t-0 border-light-border-strong bg-light-bg dark:border-dark-border-strong dark:bg-dark-bg"
          style={{ top: "100%", maxHeight: 420, overflow: "hidden" }}
          accessibilityRole="list"
          aria-label="Matching clubs"
        >
          {hits.length ? (
            hits.map((hit, i) => (
              <Result
                key={hit.club.id}
                hit={hit}
                active={i === index}
                onHover={() => setIndex(i)}
                onPick={() => pick(hit)}
              />
            ))
          ) : (
            <Text className="px-3 py-3 text-sm text-light-secondary dark:text-dark-secondary">
              No club or room matches "{query.trim()}".
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
