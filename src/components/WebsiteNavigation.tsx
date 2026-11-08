import { Link, usePathname } from "expo-router";
import { Image, View } from "react-native";
import { AccessibleText as Text } from "./AccessibleText";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { APP_MAX_WIDTH, useWebsiteLayout } from "@/theme/layout";

const pages = [
  ["/", "Home"],
  ["/browse", "Clubs"],
  ["/calendar", "Calendar"],
] as const;

export function WebsiteNavigation() {
  const path = usePathname();
  const { session } = useAuth();
  const { unreadCount } = useNotifications();
  const { wide } = useWebsiteLayout();
  const items = session ? [...pages, ["/notifications", "Alerts"], ["/account", "Profile"]] as const : pages;

  return (
    <View role="banner" className="z-10 shrink-0 border-b border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface">
      <View style={{ maxWidth: APP_MAX_WIDTH }} className={`mx-auto w-full px-5 ${wide ? "min-h-[76px] flex-row items-center gap-12 px-8" : "pt-3"}`}>
        <View className="flex-row items-center justify-between">
          <Link href="/" accessibilityLabel="Tesla STEM Clubs home">
            <View className="flex-row items-center gap-3">
              <Image source={require("../../assets/teslastemlogo.png")} style={{ width: 36, height: 36 }} resizeMode="contain" accessible={false} />
              <View>
                <Text className="text-base font-bold leading-5 text-light-text dark:text-dark-text">Tesla STEM Clubs</Text>
                <Text className="text-xs text-light-muted dark:text-dark-muted">Student activities</Text>
              </View>
            </View>
          </Link>
          {!wide ? (
            <View className="flex-row items-center gap-3">
              {!session ? <Link href="/account" className="rounded-lg bg-python-blue px-3 py-2 text-sm font-semibold text-white">Sign in</Link> : null}
              <ThemeToggle />
            </View>
          ) : null}
        </View>
        <View role="navigation" accessibilityLabel="Main navigation" className={`flex-1 flex-row items-center gap-1 ${wide ? "self-stretch" : "mt-2 flex-wrap"}`}>
          {items.map(([href, label]) => {
            const active = href === path || (href === "/browse" && path.startsWith("/club/"));
            return (
              <Link
                key={href}
                href={href as "/"}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 px-3 py-3 text-sm font-semibold ${wide ? "py-6" : ""} ${active
                  ? "border-python-blue text-python-blue-dark dark:text-python-blue-light"
                  : "border-transparent text-light-secondary hover:text-python-blue-dark dark:text-dark-secondary dark:hover:text-white"}`}
              >
                {label}{href === "/notifications" && unreadCount ? ` (${unreadCount > 99 ? "99+" : unreadCount})` : ""}
              </Link>
            );
          })}
        </View>
        {wide ? (
          <View className="flex-row items-center gap-4">
            <ThemeToggle />
            {!session ? <Link href="/account" className="rounded-lg bg-python-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-python-blue-700">School sign in</Link> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
