import {
  Component,
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { webGLAvailable } from "@/components/python/Python";
import { Display, Rule, TextTabs, useHover } from "@/components/system";
import { useClubs } from "@/context/ClubsContext";
import { useMemberships } from "@/context/MembershipContext";
import { useTheme } from "@/context/ThemeContext";
import { useLayout } from "@/theme/layout";
import type { Club } from "@/types/domain";
import { FLOORS, clubsByRoom, type RoomClubs } from "./plan";

export const MapCanvas = lazy(() =>
  import("@/components/Scenes3D").then((m) => ({ default: m.MapCanvas })),
);

const FLOOR_NAMES = ["First floor", "Second floor"] as const;
type FloorName = (typeof FLOOR_NAMES)[number];

export class Boundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** True once the section is close to the screen, so three.js loads late. */
function useNearScreen(mounted: boolean) {
  const ref = useRef<View>(null);
  const [near, setNear] = useState(Platform.OS !== "web");
  useEffect(() => {
    if (near || !mounted) return;
    if (typeof IntersectionObserver === "undefined") return setNear(true);
    const node = ref.current as unknown as Element | null;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near, mounted]);
  return { ref, near };
}

function meets(club: Club) {
  return [club.day, club.time].filter((part) => part && part !== "TBD").join(", ");
}

function busiest(rooms: RoomClubs[]) {
  return [...rooms].sort(
    (a, b) => b.clubs.length - a.clubs.length || a.room.localeCompare(b.room),
  )[0]?.room ?? null;
}

function RoomButton({
  entry,
  selected,
  mine,
  onPress,
}: {
  entry: RoomClubs;
  selected: boolean;
  mine: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const count = entry.clubs.length;
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      aria-pressed={selected}
      accessibilityLabel={`Room ${entry.room}, ${count} ${count === 1 ? "club" : "clubs"}${mine ? ", including one of yours" : ""}`}
      className={`min-h-11 min-w-11 flex-row items-baseline gap-1 border-b-2 px-0.5 ${
        selected
          ? "border-python-blue"
          : hovered
            ? "border-light-border-strong dark:border-dark-border-strong"
            : "border-transparent"
      }`}
    >
      <Display
        fontSize={24}
        className={
          selected
            ? "text-python-blue"
            : mine
              ? "text-python-green dark:text-python-green-light"
              : "text-light-text dark:text-dark-text"
        }
        style={{ lineHeight: 34 }}
      >
        {entry.room}
      </Display>
      <Text className="text-xs text-light-muted dark:text-dark-muted">{count}</Text>
    </Pressable>
  );
}

function ClubLine({ club, mine }: { club: Club; mine: boolean }) {
  const router = useRouter();
  const { hovered, hoverProps } = useHover();
  const when = meets(club);
  return (
    <Pressable
      onPress={() => router.push(`/club/${club.id}`)}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`Open ${club.name}`}
      className="border-b border-light-border py-2.5 dark:border-dark-border"
    >
      <Display
        fontSize={24}
        className={`text-light-text dark:text-dark-text ${hovered ? "underline" : ""}`}
        style={{ lineHeight: 27 }}
      >
        {club.name}
      </Display>
      <Text className="mt-0.5 text-sm text-light-secondary dark:text-dark-secondary">
        {when}
        {mine ? (
          <Text className="font-bold text-python-green dark:text-python-green-light">
            {when ? ", " : ""}you're a member
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

/**
 * Where clubs meet: the school's two floors from the 2026–2027 clubs poster,
 * built in 3D with each room's real clubs. The room buttons do everything the
 * model does, so it works by keyboard and without WebGL.
 */
export function CampusMap({
  className,
  page = false,
}: {
  className?: string;
  /** On its own page: the page title replaces the section rule, and the model gets more room. */
  page?: boolean;
}) {
  const { clubs } = useClubs();
  const { memberships } = useMemberships();
  const { isDark } = useTheme();
  const still = useReducedMotion();
  const { isWide, contentWidth } = useLayout();
  const [canRender, setCanRender] = useState<boolean | null>(null);
  useEffect(() => setCanRender(webGLAvailable()), []);

  const { rooms, unplaced } = useMemo(() => clubsByRoom(clubs), [clubs]);
  const { ref, near } = useNearScreen(rooms.size > 0);
  const myClubIds = useMemo(
    () =>
      new Set(
        [...memberships.values()]
          .filter((m) => m.status === "active")
          .map((m) => m.clubId),
      ),
    [memberships],
  );
  const myRooms = useMemo(
    () =>
      new Set(
        [...rooms.values()]
          .filter((r) => r.clubs.some((c) => myClubIds.has(c.id)))
          .map((r) => r.room),
      ),
    [rooms, myClubIds],
  );
  const counts = useMemo(
    () => Object.fromEntries([...rooms.values()].map((r) => [r.room, r.clubs.length])),
    [rooms],
  );

  const [floor, setFloor] = useState<1 | 2>(1);
  const onFloor = useMemo(
    () =>
      FLOORS[floor - 1]
        ? Object.keys(FLOORS[floor - 1].rooms)
            .map((room) => rooms.get(room))
            .filter((r): r is RoomClubs => !!r)
        : [],
    [rooms, floor],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const selected =
    picked && rooms.get(picked)?.floor === floor ? picked : busiest(onFloor);
  const entry = selected ? rooms.get(selected) : undefined;

  const floorCounts = useMemo(() => {
    const out: Partial<Record<FloorName, number>> = {};
    for (const r of rooms.values())
      out[FLOOR_NAMES[r.floor - 1]] = (out[FLOOR_NAMES[r.floor - 1]] ?? 0) + r.clubs.length;
    return out;
  }, [rooms]);

  const [canvasWidth, setCanvasWidth] = useState(0);
  const canvasHeight = Math.round(
    Math.min(page ? 460 : 400, Math.max(contentWidth < 640 ? 190 : 260, canvasWidth * (page ? 0.38 : 0.34))),
  );
  const show3D = canRender === true && near;

  if (rooms.size === 0) return null;

  const scene = (
    <View
      onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
      style={{ height: canvasHeight }}
      aria-hidden
      className="w-full"
    >
      {show3D && canvasWidth > 0 ? (
        <Boundary fallback={null}>
          <Suspense fallback={null}>
            <MapCanvas
              floor={floor}
              counts={counts}
              mine={myRooms}
              selected={selected}
              onSelect={setPicked}
              isDark={isDark}
              still={still}
            />
          </Suspense>
        </Boundary>
      ) : null}
    </View>
  );

  const roomPicker = (
    <View>
      <Text className="text-sm text-light-muted dark:text-dark-muted">
        Rooms with clubs on the {floor === 1 ? "first" : "second"} floor
      </Text>
      <View className="mt-1 flex-row flex-wrap gap-x-4">
        {onFloor.map((r) => (
          <RoomButton
            key={r.room}
            entry={r}
            selected={r.room === selected}
            mine={myRooms.has(r.room)}
            onPress={() => setPicked(r.room)}
          />
        ))}
      </View>
    </View>
  );

  const details = entry ? (
    <View aria-live="polite">
      <Display fontSize={44} accessibilityRole="header" style={{ lineHeight: 44 }}>
        Room {entry.room}
      </Display>
      <Text className="mt-1 text-base text-light-secondary dark:text-dark-secondary">
        {[entry.name, FLOOR_NAMES[entry.floor - 1].toLowerCase()]
          .filter(Boolean)
          .join(", ")
          .replace(/^./, (c) => c.toUpperCase())}
        , {entry.clubs.length} {entry.clubs.length === 1 ? "club meets" : "clubs meet"} here
      </Text>
      <View className="mt-3 border-t-2 border-light-text dark:border-dark-text">
        {entry.clubs.map((club) => (
          <ClubLine key={club.id} club={club} mine={myClubIds.has(club.id)} />
        ))}
      </View>
    </View>
  ) : (
    <Text className="text-base text-light-secondary dark:text-dark-secondary">
      No clubs have listed a room on this floor yet.
    </Text>
  );

  return (
    <View ref={ref} className={className}>
      {page ? null : <Rule title="Where clubs meet" />}
      <Text className={`${page ? "" : "mt-3 "}max-w-2xl text-base leading-6 text-light-secondary dark:text-dark-secondary`}>
        {show3D
          ? "Rooms with clubs stand taller for each club that meets there. Drag to turn the building and pick a room to see who's in it."
          : "Pick a room to see which clubs meet there."}
        {unplaced.length > 0
          ? ` ${unplaced.length} ${unplaced.length === 1 ? "club hasn't" : "clubs haven't"} listed a room yet.`
          : ""}
      </Text>
      <View className="mt-4">
        <TextTabs
          label="Floor"
          options={FLOOR_NAMES}
          value={FLOOR_NAMES[floor - 1]}
          counts={floorCounts}
          onChange={(next) => setFloor(next === "First floor" ? 1 : 2)}
        />
      </View>
      <View
        className={isWide ? "mt-2 flex-row items-start" : "mt-2"}
        style={{ gap: isWide ? 40 : 20 }}
      >
        <View className={isWide ? "flex-1" : ""} style={{ minWidth: 0 }}>
          {canRender ? scene : null}
          {isWide ? <View className="mt-2">{roomPicker}</View> : null}
        </View>
        <View style={isWide ? { width: Math.min(380, Math.max(320, contentWidth * 0.28)) } : undefined}>
          {isWide ? null : <View className="mb-5">{roomPicker}</View>}
          {details}
        </View>
      </View>
    </View>
  );
}
