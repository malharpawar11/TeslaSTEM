import { Link } from "expo-router";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "./AccessibleText";
import { useClubs } from "@/context/ClubsContext";
import { useWebsiteLayout } from "@/theme/layout";
import { clubInitials } from "@/types/domain";
import { brand } from "@/theme/tokens";

const categories = [
  { name: "STEM", detail: "Build, code, and experiment", icon: "flask-outline" },
  { name: "Arts", detail: "Create and perform", icon: "color-palette-outline" },
  { name: "Service", detail: "Make a difference together", icon: "heart-outline" },
] as const;

export function WebsiteHome() {
  const { clubs, loading } = useClubs();
  const { wide } = useWebsiteLayout();
  const featured = categories.flatMap(({ name }) => {
    const club = clubs.find((item) => item.category === name && item.description.trim());
    return club ? [club] : [];
  });
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
              <Link href="/onboarding" className="rounded-lg bg-python-green-light px-5 py-3 text-sm font-bold text-python-green-ink hover:bg-python-green-200">Take the club quiz →</Link>
              <Link href="/browse" className="rounded-lg border border-white/35 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Browse all clubs</Link>
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

        <View className={`gap-5 rounded-2xl border border-python-green/30 bg-python-green-50 p-6 dark:bg-python-green-900 ${wide ? "flex-row items-center gap-10 p-8" : ""}`}>
          <View className="flex-1 gap-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">Club Match Quiz</Text>
            <Text accessibilityRole="header" className="text-3xl font-bold tracking-tight text-light-text dark:text-white">Find clubs that fit you</Text>
            <Text className="max-w-xl text-base leading-6 text-light-secondary dark:text-dark-secondary">
              Choose what you enjoy, add any career goals or free time, and see matching Tesla STEM clubs as you go. No sign-in needed to try it.
            </Text>
            <Link href="/onboarding" className="mt-2 self-start rounded-lg bg-python-green-dark px-5 py-3 text-sm font-bold text-white hover:bg-python-green-ink dark:bg-python-green-light dark:text-python-green-ink">Start the quiz →</Link>
          </View>
          <View className={`gap-2 ${wide ? "w-[310px]" : ""}`}>
            {["Pick your interests", "Add goals or availability", "Explore your matches"].map((step, index) => (
              <View key={step} className="flex-row items-center gap-3 rounded-lg border border-python-green/20 bg-light-surface p-3 dark:bg-dark-surface">
                <Text className="text-sm font-bold text-python-green-dark dark:text-python-green-light">0{index + 1}</Text>
                <Text className="flex-1 text-sm font-semibold text-light-text dark:text-dark-text">{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {featured.length > 0 ? (
          <View className="gap-4">
            <View className="flex-row flex-wrap items-end justify-between gap-3">
              <View>
                <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-python-blue-dark dark:text-python-blue-light">From the directory</Text>
                <Text accessibilityRole="header" className="text-2xl font-bold tracking-tight text-light-text dark:text-dark-text">Clubs to explore</Text>
              </View>
              <Link href="/browse" className="text-sm font-semibold text-python-blue-dark hover:underline dark:text-python-blue-light">View all clubs →</Link>
            </View>
            <View className={`gap-4 ${wide ? "flex-row" : ""}`}>
              {featured.map((club) => (
                <View key={club.id} className="min-w-0 flex-1 gap-3 rounded-xl border border-light-border bg-light-surface p-5 dark:border-dark-border dark:bg-dark-surface">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-python-blue/10">
                      <Text className="text-xs font-bold text-python-blue-dark dark:text-python-blue-light">{clubInitials(club.name)}</Text>
                    </View>
                    <Text className="flex-1 text-xs font-bold uppercase tracking-wide text-light-muted dark:text-dark-muted">{club.category}</Text>
                  </View>
                  <Link href={`/club/${club.id}`} className="self-start text-base font-bold text-python-blue-dark hover:underline dark:text-python-blue-light">{club.name} →</Link>
                  <Text numberOfLines={3} className="text-sm leading-6 text-light-secondary dark:text-dark-secondary">{club.description}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View className="gap-2 border-t border-light-border pt-7 dark:border-dark-border">
          <Text accessibilityRole="header" className="text-2xl font-bold tracking-tight text-light-text dark:text-dark-text">About Tesla STEM Clubs</Text>
          <Text className="max-w-3xl text-base leading-7 text-light-secondary dark:text-dark-secondary">
            This site helps Tesla STEM students discover clubs, check meeting details, and plan around campus events. Browse without an account, or sign in with your school email to join clubs and save your preferences. Club announcement links open the original posts in Canvas.
          </Text>
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
