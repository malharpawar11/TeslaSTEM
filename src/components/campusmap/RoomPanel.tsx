import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { WeekMarks } from "@/components/clubs/ClubEntry";
import { Display, TextLink, useHover } from "@/components/system";
import type { Club } from "@/types/domain";
import { FLOORS, type RoomClubs } from "./plan";
import { floorWord, schedule } from "./useClubMap";

function ClubItem({
  club,
  focused,
  mine,
}: {
  club: Club;
  focused: boolean;
  mine: boolean;
}) {
  const router = useRouter();
  const { hovered, hoverProps } = useHover();
  const when = schedule(club);
  return (
    <Pressable
      onPress={() => router.push(`/club/${club.id}`)}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={`Open ${club.name}${when ? `, meets ${when}` : ""}`}
      className={`border-b border-l-[3px] border-b-light-border py-3 pl-3 dark:border-b-dark-border ${
        focused ? "border-l-python-blue" : "border-l-transparent"
      }`}
    >
      <Display
        fontSize={24}
        className={`text-light-text dark:text-dark-text ${hovered ? "underline" : ""}`}
        style={{ lineHeight: 26 }}
      >
        {club.name}
      </Display>
      <Text className="mt-0.5 text-sm text-light-muted dark:text-dark-muted">
        {club.category}
        {mine ? (
          <Text className="font-bold text-python-green dark:text-python-green-light">
            , you're a member
          </Text>
        ) : null}
      </Text>
      <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        {club.day && club.day !== "TBD" ? <WeekMarks club={club} /> : null}
        <Text className="text-sm text-light-secondary dark:text-dark-secondary">
          {club.time && club.time !== "TBD"
            ? club.time
            : when
              ? ""
              : "Meeting time not listed"}
        </Text>
      </View>
    </Pressable>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 border-t border-light-border pt-2 dark:border-dark-border">
      <Text className="text-xs text-light-muted dark:text-dark-muted">{label}</Text>
      <Display fontSize={24} style={{ lineHeight: 28 }}>
        {value}
      </Display>
    </View>
  );
}

/** The selected room: its number, floor, and every club that meets in it. */
export function RoomDetails({
  room,
  entry,
  focusClub,
  myClubIds,
  onBack,
  still,
}: {
  room: string;
  entry: RoomClubs | undefined;
  focusClub: string | null;
  myClubIds: Set<string>;
  onBack: () => void;
  still: boolean;
}) {
  const level = FLOORS.find((f) => room in f.rooms)?.level ?? 1;
  const clubs = entry?.clubs ?? [];
  return (
    <Animated.View key={room} entering={still ? undefined : FadeIn.duration(200)}>
      <TextLink label="All rooms" icon="arrow-back" onPress={onBack} />
      <Display fontSize={52} accessibilityRole="header" style={{ lineHeight: 52 }}>
        Room {room}
      </Display>
      {entry?.name ? (
        <Text className="mt-1 text-base text-light-secondary dark:text-dark-secondary">
          {entry.name}
        </Text>
      ) : null}
      <View className="mt-4 flex-row gap-6">
        <Fact label="Floor" value={level === 1 ? "First" : "Second"} />
        <Fact
          label="Clubs here"
          value={clubs.length ? String(clubs.length) : "None listed"}
        />
      </View>
      {clubs.length ? (
        <View className="mt-5 border-t-2 border-light-text dark:border-dark-text">
          {clubs.map((club) => (
            <ClubItem
              key={club.id}
              club={club}
              focused={club.id === focusClub}
              mine={myClubIds.has(club.id)}
            />
          ))}
        </View>
      ) : (
        <View className="mt-5 border-t-2 border-light-text pt-3 dark:border-dark-text">
          <Text className="text-base leading-6 text-light-secondary dark:text-dark-secondary">
            No club has listed Room {room} as where it meets.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

function RoomRow({
  entry,
  mine,
  onPress,
}: {
  entry: RoomClubs;
  mine: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const names = entry.clubs.map((c) => c.name);
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={`Room ${entry.room}: ${names.join(", ")}`}
      className="flex-row items-start gap-3 border-b border-light-border py-2.5 dark:border-dark-border"
    >
      <Display
        fontSize={24}
        className={
          mine ? "text-python-green dark:text-python-green-light" : "text-python-blue"
        }
        style={{ lineHeight: 26, width: 52 }}
      >
        {entry.room}
      </Display>
      <Text
        className={`flex-1 pt-0.5 text-sm leading-5 text-light-secondary dark:text-dark-secondary ${hovered ? "underline" : ""}`}
        numberOfLines={2}
      >
        {names.join(", ")}
      </Text>
    </Pressable>
  );
}

/** Before a room is picked: what the map holds, and every room on this floor. */
export function MapOverview({
  floor,
  rooms,
  totalPlaced,
  unplaced,
  myRooms,
  filtered,
  onPick,
}: {
  floor: 1 | 2;
  rooms: RoomClubs[];
  totalPlaced: number;
  unplaced: number;
  myRooms: Set<string>;
  filtered: string | null;
  onPick: (room: string) => void;
}) {
  const roomCount = rooms.length;
  const clubCount = rooms.reduce((n, r) => n + r.clubs.length, 0);
  return (
    <View>
      <Display fontSize={34} accessibilityRole="header" style={{ lineHeight: 36 }}>
        Explore the school
      </Display>
      <Text className="mt-2 text-base leading-6 text-light-secondary dark:text-dark-secondary">
        Explore the school to discover where clubs meet. Pick a room on the map,
        or search for a club, to see who meets there and when.
      </Text>
      <Text className="mt-3 text-sm text-light-muted dark:text-dark-muted">
        {totalPlaced} clubs have a room on the map.
        {unplaced > 0
          ? ` ${unplaced} more haven't listed one yet.`
          : ""}
      </Text>

      <Text className="mt-6 text-sm font-bold text-light-text dark:text-dark-text">
        {roomCount
          ? `${clubCount} ${filtered ? `${filtered} ` : ""}${clubCount === 1 ? "club" : "clubs"} in ${roomCount} ${roomCount === 1 ? "room" : "rooms"} on the ${floorWord(floor)}`
          : `No ${filtered ? `${filtered} ` : ""}clubs meet on the ${floorWord(floor)}`}
      </Text>
      <View className="mt-2 border-t-2 border-light-text dark:border-dark-text">
        {rooms.map((entry) => (
          <RoomRow
            key={entry.room}
            entry={entry}
            mine={myRooms.has(entry.room)}
            onPress={() => onPick(entry.room)}
          />
        ))}
      </View>
    </View>
  );
}
