import "../global.css";
import { Platform, useWindowDimensions, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { cssInterop } from "nativewind";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import {
  PreferencesProvider,
  usePreferences,
} from "@/context/PreferencesContext";
import { ClubsProvider } from "@/context/ClubsContext";
import { MembershipProvider } from "@/context/MembershipContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { ToastProvider } from "@/context/ToastContext";
import { WebsiteNavigation } from "@/components/WebsiteNavigation";
import { CornerPython } from "@/components/python/CornerPython";
import { DESKTOP_NAV_WIDTH, RAIL_WIDTH } from "@/theme/layout";
import { surface } from "@/theme/tokens";
import { CampusUpdatesProvider } from "@/context/CampusUpdatesContext";

cssInterop(GestureHandlerRootView, { className: "style" });

const IS_WEB = Platform.OS === "web";

function RootStack() {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = IS_WEB && width >= DESKTOP_NAV_WIDTH;
  const { session } = useAuth();
  const { preferences, loading, error } = usePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const prompted = useRef<string | null>(null);
  useEffect(() => {
    if (!session) {
      prompted.current = null;
      return;
    }
    if (
      !loading &&
      !error &&
      !preferences.completed &&
      pathname !== "/onboarding" &&
      prompted.current !== session.user.id
    ) {
      prompted.current = session.user.id;
      router.push("/onboarding");
    }
  }, [session, preferences.completed, loading, error, pathname, router]);
  // Forms and admin tools read as one column, not as a full-width canvas.
  const document = desktop
    ? {
        contentStyle: {
          paddingHorizontal: Math.max(0, (width - RAIL_WIDTH - 980) / 2),
          backgroundColor: surface(isDark).bg,
        },
      }
    : undefined;
  return (
    <View className={`flex-1 ${desktop ? "flex-row" : ""}`}>
      {desktop ? <WebsiteNavigation /> : null}
      <View className="flex-1 bg-light-bg dark:bg-dark-bg">
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{ headerShown: false, animation: "slide_from_right" }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="club/[id]/index" />
          <Stack.Screen name="club/[id]/manage" options={document} />
          <Stack.Screen name="club/new" options={document} />
          <Stack.Screen name="search" options={document} />
          <Stack.Screen name="admin" options={document} />
          <Stack.Screen name="policies" options={document} />
          <Stack.Screen name="settings" options={document} />
          <Stack.Screen name="onboarding" />
        </Stack>
      </View>
      <CornerPython />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1 bg-light-surface-2 dark:bg-dark-surface-3">
      <SafeAreaProvider>
        <ThemeProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <CampusUpdatesProvider>
                <PreferencesProvider>
                  <ClubsProvider>
                    <MembershipProvider>
                      <ToastProvider>
                        <NotificationsProvider>
                          <RootStack />
                        </NotificationsProvider>
                      </ToastProvider>
                    </MembershipProvider>
                  </ClubsProvider>
                </PreferencesProvider>
              </CampusUpdatesProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
