import { Suspense, useEffect, useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { webGLAvailable } from "@/components/python/Python";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Display, TextTabs, webSticky } from "@/components/system";
import { Button } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useLayout } from "@/theme/layout";
import { Boundary, MapCanvas } from "./CampusMap";
import { MapSearch } from "./MapSearch";
import { FLOORS, type RoomClubs } from "./plan";
import { MapOverview, RoomDetails } from "./RoomPanel";
import type { HoverPoint } from "./types";
import { useClubMap, type CategoryFilter, type SearchHit } from "./useClubMap";

/** Floor buttons, numbered like a lift panel. */
function FloorSwitch({
  floor,
  counts,
  onChange,
}: {
  floor: 1 | 2;
  counts: Record<1 | 2, number>;
  onChange: (floor: 1 | 2) => void;
}) {
  const levels: (1 | 2)[] = [1, 2];
  return (
    <View accessibilityRole="radiogroup" aria-label="Floor" className="flex-row gap-6">
      {levels.map((level) => {
        const on = level === floor;
        const n = counts[level];
        return (
          <Pressable
            key={level}
            onPress={() => onChange(level)}
            accessibilityRole="radio"
            aria-checked={on}
            accessibilityLabel={`${level === 1 ? "First" : "Second"} floor, ${n} ${n === 1 ? "club" : "clubs"}`}
            className="flex-row items-center gap-2.5"
          >
            <View
              className={`h-11 w-11 items-center justify-center rounded border-2 ${
                on
                  ? "border-python-blue bg-python-blue"
                  : "border-light-border-strong bg-light-bg dark:border-dark-border-strong dark:bg-dark-bg"
              }`}
            >
              <Display
                fontSize={26}
                className={on ? "text-white" : "text-light-text dark:text-dark-text"}
                style={{ lineHeight: 30 }}
              >
                {level}
              </Display>
            </View>
            {(
              <View>
                <Text
                  className={`text-sm ${on ? "font-bold text-light-text dark:text-dark-text" : "text-light-secondary dark:text-dark-secondary"}`}
                >
                  {level === 1 ? "First floor" : "Second floor"}
                </Text>
                <Text className="text-xs text-light-muted dark:text-dark-muted">
                  {n} {n === 1 ? "club" : "clubs"}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** What's in the room under the pointer, without clicking. */
function HoverCard({
  hover,
  entry,
  stageWidth,
}: {
  hover: HoverPoint;
  entry: RoomClubs | undefined;
  stageWidth: number;
}) {
  const width = 230;
  const left = Math.max(8, Math.min(stageWidth - width - 8, hover.x - width / 2));
  const names = entry?.clubs.map((c) => c.name) ?? [];
  return (
    <View
      pointerEvents="none"
      className="absolute rounded border border-light-border-strong bg-light-bg px-3 py-2 dark:border-dark-border-strong dark:bg-dark-bg"
      style={{ left, top: hover.y - 14, width, transform: [{ translateY: "-100%" as never }] }}
    >
      <Display fontSize={20} style={{ lineHeight: 22 }}>
        Room {hover.room}
      </Display>
      {names.length ? (
        <>
          {names.slice(0, 3).map((name) => (
            <Text
              key={name}
              numberOfLines={1}
              className="text-sm text-light-secondary dark:text-dark-secondary"
            >
              {name}
            </Text>
          ))}
          {names.length > 3 ? (
            <Text className="text-xs text-light-muted dark:text-dark-muted">
              and {names.length - 3} more
            </Text>
          ) : null}
        </>
      ) : (
        <Text className="text-sm text-light-muted dark:text-dark-muted">
          No clubs listed here
        </Text>
      )}
    </View>
  );
}

function Key({ swatch, label }: { swatch: "club" | "mine" | "count" | "empty"; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      {swatch === "count" ? (
        <View className="h-4 w-4 items-center justify-center rounded-full bg-python-blue">
          <Text className="text-white" style={{ fontSize: 10, lineHeight: 12, fontWeight: "700" }}>
            2
          </Text>
        </View>
      ) : (
        <View
          className={`h-3.5 w-3.5 rounded-sm border ${
            swatch === "club"
              ? "border-python-blue bg-python-blue/20"
              : swatch === "mine"
                ? "border-python-green bg-python-green/20"
                : "border-light-border-strong bg-light-bg dark:border-dark-border-strong dark:bg-dark-bg"
          }`}
        />
      )}
      <Text className="text-xs text-light-secondary dark:text-dark-secondary">{label}</Text>
    </View>
  );
}

/**
 * /map: find any club's room. Search and the category filter sit over a 3D
 * miniature of one floor; the panel beside it always says something useful.
 */
export function ClubMapExplorer() {
  const router = useRouter();
  const { isDark } = useTheme();
  const still = useReducedMotion();
  const { isDesktop, isWide, contentWidth } = useLayout();
  const { height: windowHeight } = useWindowDimensions();
  const [category, setCategory] = useState<CategoryFilter>("All");
  const map = useClubMap(category);
  const [floor, setFloor] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusClub, setFocusClub] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [canRender, setCanRender] = useState<boolean | null>(null);
  useEffect(() => setCanRender(webGLAvailable()), []);

  const phone = contentWidth < 640;
  const stageHeight = Math.round(
    phone
      ? Math.min(560, Math.max(380, stageWidth * 1.35))
      : Math.min(480, Math.max(300, stageWidth * 0.42), windowHeight - 300),
  );

  const floorRooms = useMemo(
    () =>
      Object.keys(FLOORS[floor - 1].rooms)
        .map((room) => map.shownRooms.get(room))
        .filter((r): r is RoomClubs => !!r),
    [map.shownRooms, floor],
  );

  const select = (room: string | null) => {
    setSelected(room);
    setFocusClub(null);
  };
  const changeFloor = (next: 1 | 2) => {
    setFloor(next);
    setHover(null);
    if (selected && !(selected in FLOORS[next - 1].rooms)) select(null);
  };
  const pickHit = (hit: SearchHit) => {
    if (!hit.room || !hit.floor) {
      router.push(`/club/${hit.club.id}`);
      return;
    }
    if (category !== "All" && hit.club.category !== category) setCategory("All");
    setFloor(hit.floor);
    setSelected(hit.room);
    setFocusClub(hit.club.id);
    setHover(null);
  };

  const panel = selected ? (
    <RoomDetails
      room={selected}
      entry={map.rooms.get(selected)}
      focusClub={focusClub}
      myClubIds={map.myClubIds}
      onBack={() => select(null)}
      still={still}
    />
  ) : (
    <MapOverview
      floor={floor}
      rooms={floorRooms}
      totalPlaced={map.categoryCounts.All ?? 0}
      unplaced={map.unplaced.length}
      myRooms={map.myRooms}
      filtered={category === "All" ? null : category}
      onPick={(room) => select(room)}
    />
  );

  const legend = (
    <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
      <Key swatch="club" label="Clubs meet here" />
      {map.myRooms.size ? <Key swatch="mine" label="Your clubs" /> : null}
      <Key swatch="count" label="Number of clubs" />
      <Key swatch="empty" label="No clubs listed" />
    </View>
  );

  const stage = (
    <View>
      <View className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
        <FloorSwitch floor={floor} counts={map.floorCounts} onChange={changeFloor} />
        {!phone && canRender ? (
          <Text className="text-xs text-light-muted dark:text-dark-muted">
            Drag the map to turn it
          </Text>
        ) : null}
      </View>
      <View
        onLayout={(e) => setStageWidth(e.nativeEvent.layout.width)}
        style={{ height: canRender === false ? 120 : stageHeight }}
        className="relative w-full border-y border-light-border dark:border-dark-border"
      >
        {canRender && stageWidth > 0 ? (
          <View className="absolute inset-0" aria-hidden>
            <Boundary fallback={null}>
              <Suspense fallback={null}>
                <MapCanvas
                  floor={floor}
                  counts={map.counts}
                  mine={map.myRooms}
                  selected={selected}
                  onSelect={select}
                  onHover={setHover}
                  isDark={isDark}
                  still={still}
                />
              </Suspense>
            </Boundary>
          </View>
        ) : null}
        {canRender === false ? (
          <View className="absolute inset-0 items-center justify-center px-6">
            <Text className="max-w-sm text-center text-sm text-light-secondary dark:text-dark-secondary">
              This browser can't draw the 3D map. Every room with clubs is listed
              beside it.
            </Text>
          </View>
        ) : null}
        {hover ? (
          <HoverCard hover={hover} entry={map.rooms.get(hover.room)} stageWidth={stageWidth} />
        ) : null}
      </View>
      <View className="mt-3">{legend}</View>
    </View>
  );

  const header = (
    <View
      className={isWide ? "flex-row items-end justify-between gap-10" : "gap-4"}
      style={{ zIndex: 10 }}
    >
      <View className="shrink" style={{ maxWidth: 560 }}>
        <View className="flex-row items-start justify-between gap-4">
          <Display fontSize={phone ? 44 : 56} accessibilityRole="header" style={{ lineHeight: phone ? 44 : 56 }}>
            Club map
          </Display>
          {!isDesktop ? <ThemeToggle /> : null}
        </View>
        <Text className="mt-2 text-base leading-6 text-light-secondary dark:text-dark-secondary">
          Every club with a listed room, on the school's two floors. Search for a
          club or pick a room to see who meets there and when.
        </Text>
      </View>
      <View style={isWide ? { width: 420 } : undefined}>
        <MapSearch clubs={map.clubs} onPick={pickHit} />
      </View>
    </View>
  );

  if (map.error && !map.clubs.length)
    return (
      <View>
        {header}
        <View className="mt-10 items-start gap-3">
          <Display size="sm">Couldn't load clubs</Display>
          <Text className="text-sm text-light-secondary dark:text-dark-secondary">{map.error}</Text>
          <Button label="Retry" onPress={() => void map.refresh()} />
        </View>
      </View>
    );

  return (
    <View>
      {header}
      <View className="mt-6" style={{ zIndex: 1 }}>
        <TextTabs
          label="Club category"
          options={map.categories}
          value={category}
          counts={map.categoryCounts}
          onChange={(next) => {
            setCategory(next);
            setFocusClub(null);
          }}
        />
      </View>
      <View
        className={isWide ? "mt-3 flex-row items-start" : "mt-3"}
        style={{ gap: isWide ? 36 : 20 }}
      >
        {/* The map stays in view while a long room list scrolls past. */}
        <View
          className={isWide ? "flex-1" : ""}
          style={[{ minWidth: 0 }, isWide ? webSticky(16) : null]}
        >
          {stage}
        </View>
        <View
          style={isWide ? { width: Math.min(400, Math.max(340, contentWidth * 0.28)) } : undefined}
        >
          {map.loading && !map.clubs.length ? (
            <Text className="text-sm text-light-muted dark:text-dark-muted">
              Loading clubs…
            </Text>
          ) : (
            panel
          )}
        </View>
      </View>
    </View>
  );
}
