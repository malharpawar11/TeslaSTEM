import { Link } from "expo-router";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "./AccessibleText";
import { useClubs } from "@/context/ClubsContext";
import { useWebsiteLayout } from "@/theme/layout";
import { brand } from "@/theme/tokens";

const categories = [
  { name: "STEM", detail: "Build, code, and experiment", icon: "flask-outline" },
  { name: "Arts", detail: "Create and perform", icon: "color-palette-outline" },
  { name: "Service", detail: "Make a difference together", icon: "heart-outline" },
] as const;

export function WebsiteHome() {
  const { clubs, loading } = useClubs();
  const { wide } = useWebsiteLayout();
  return (
    <ScrollView className="flex-1 bg-light-bg dark:bg-dark-bg">
      <View className={`gap-10 ${wide ? "px-8 pb-12 pt-9" : "px-5 pb-8 pt-5"}`}>
        <View style={{ backgroundColor: "#102952" }} className={`overflow-hidden rounded-2xl border border-white/10 ${wide ? "flex-row items-center gap-10 p-12" : "gap-7 p-6"}`}>
          <View className="flex-1">
            <View className="mb-5 flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-python-green-light" />
              <Text className="text-xs font-bold uppercase tracking-widest text-python-green-light">Explore Tesla STEM</Text>
            </View>
            <Text accessibilityRole="header" className={`font-bold tracking-tight text-white ${wide ? "text-6xl leading-[1.04]" : "text-4xl leading-tight"}`}>
              Find your people.{"\n"}<Text className="text-python-blue-light">Build your future.</Text>
            </Text>
            <Text className="mt-5 max-w-lg text-base leading-7 text-white/80">
              Discover student clubs, find meeting times that fit your week, and keep track of what’s happening on campus.
            </Text>
            <View className="mt-7 flex-row flex-wrap items-center gap-3">
              <Link href="/browse" className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-python-blue-ink hover:bg-python-blue-100">Explore clubs →</Link>
              <Link href="/calendar" className="rounded-lg border border-white/35 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">View calendar</Link>
            </View>
          </View>
          <View style={wide ? { width: 380 } : undefined} className="gap-2 rounded-xl border border-white/20 bg-white/10 p-4">
            <View className="mb-2 flex-row items-center justify-between gap-3">
              <Text className="text-base font-bold text-white">Explore by interest</Text>
              {!loading && clubs.length ? <Text className="text-xs font-semibold text-python-green-light">{clubs.length} clubs</Text> : null}
            </View>
            {categories.map(({ name, detail, icon }) => {
              const count = clubs.filter((club) => club.category === name).length;
              return (
                <Link key={name} href={{ pathname: "/browse", params: { category: name } }}>
                  <View className="w-full flex-row items-center gap-3 rounded-lg bg-white/10 p-3 hover:bg-white/20">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                      <Ionicons name={icon} size={19} color="#93B8FF" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-white">{name}</Text>
                      <Text className="text-xs text-white/75">{detail}</Text>
                    </View>
                    {count ? <Text className="text-xs text-white/75">{count}</Text> : null}
                    <Ionicons name="arrow-forward" size={16} color="#93B8FF" />
                  </View>
                </Link>
              );
            })}
          </View>
        </View>

        <View className="gap-4">
          <Text accessibilityRole="header" className="text-2xl font-bold tracking-tight text-light-text dark:text-dark-text">Plan your campus life</Text>
          <View className={`gap-4 ${wide ? "flex-row" : ""}`}>
            {([
              ["/browse", "compass-outline", "Club directory", "Search by interest, career goal, or meeting time."],
              ["/calendar", "calendar-outline", "Campus calendar", "See upcoming meetings, events, and deadlines."],
              ["/account", "person-circle-outline", "Your club dashboard", "Sign in with your school account to join and follow clubs."],
            ] as const).map(([href, icon, title, detail]) => (
              <View key={href} className="flex-1 rounded-xl border border-light-border bg-light-surface p-5 dark:border-dark-border dark:bg-dark-surface">
                <View className="mb-3 h-10 w-10 items-center justify-center rounded-lg bg-python-blue/10">
                  <Ionicons name={icon} size={20} color={brand.blue} />
                </View>
                <Link href={href} className="self-start text-base font-bold text-python-blue-dark hover:underline dark:text-python-blue-light">{title} →</Link>
                <Text className="mt-2 text-sm leading-6 text-light-muted dark:text-dark-muted">{detail}</Text>
              </View>
            ))}
          </View>
        </View>
        <View role="contentinfo" className="flex-row flex-wrap items-center justify-between gap-3 border-t border-light-border pt-5 dark:border-dark-border">
          <Text className="text-sm font-semibold text-light-secondary dark:text-dark-secondary">Tesla STEM High School · Student activities</Text>
          <Link href="/policies" className="text-sm text-python-blue-dark hover:underline dark:text-python-blue-light">Community policies</Link>
        </View>
      </View>
    </ScrollView>
  );
}
