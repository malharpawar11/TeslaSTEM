import { surface } from "@/theme/tokens";
import "../global.css";
import { View } from "react-native";
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
import { isWebsite } from "@/theme/layout";
import { CampusUpdatesProvider } from "@/context/CampusUpdatesContext";

cssInterop(GestureHandlerRootView, { className: "style" });

/**
 * A shared website header above the full-width route viewport.
 */


function RootStack() {
  const { isDark } = useTheme();
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
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
    {isWebsite ? <WebsiteNavigation /> : null}
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{ headerShown: false, animation: isWebsite ? "none" : "slide_from_right", contentStyle: isWebsite ? { backgroundColor: surface(isDark).bg } : undefined }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="club/[id]/index" />
        <Stack.Screen name="club/[id]/manage" />
        <Stack.Screen name="club/new" />
        <Stack.Screen name="search" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="policies" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1 bg-light-bg dark:bg-dark-bg">
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
