import "../global.css";
import { Platform, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { cssInterop } from "nativewind";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { MessagingProvider } from "@/context/MessagingContext";
import {
  PreferencesProvider,
  usePreferences,
} from "@/context/PreferencesContext";
import { ClubsProvider } from "@/context/ClubsContext";
import { MembershipProvider } from "@/context/MembershipContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { ToastProvider } from "@/context/ToastContext";
import { APP_MAX_WIDTH } from "@/theme/layout";

cssInterop(GestureHandlerRootView, { className: "style" });

/**
 * On web the app still lays out as a phone-width column. Centring it inside a
 * readable measure keeps line lengths sane on a laptop instead of stretching
 * every club row to 1400px.
 */
const IS_WEB = Platform.OS === "web";

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
    <View
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      style={
        IS_WEB
          ? { width: "100%", maxWidth: APP_MAX_WIDTH, alignSelf: "center" }
          : undefined
      }
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
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
        <Stack.Screen name="club/[id]/messages" />
      </Stack>
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
              <MessagingProvider>
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
              </MessagingProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
