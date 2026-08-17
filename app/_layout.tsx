import '../global.css';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ClubsProvider } from '@/context/ClubsContext';
import { MembershipProvider } from '@/context/MembershipContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { ToastProvider } from '@/context/ToastContext';
import { APP_MAX_WIDTH } from '@/theme/layout';

cssInterop(GestureHandlerRootView, { className: 'style' });

/**
 * On web the app still lays out as a phone-width column. Centring it inside a
 * readable measure keeps line lengths sane on a laptop instead of stretching
 * every club row to 1400px.
 */
const IS_WEB = Platform.OS === 'web';

function RootStack() {
  const { isDark } = useTheme();
  return (
    <View
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      style={IS_WEB ? { width: '100%', maxWidth: APP_MAX_WIDTH, alignSelf: 'center' } : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="club/[id]/index" />
        <Stack.Screen name="club/[id]/manage" />
        <Stack.Screen name="club/new" />
        <Stack.Screen name="search" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="policies" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1 bg-light-surface-2 dark:bg-dark-surface-3">
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ClubsProvider>
              <MembershipProvider>
                <NotificationsProvider>
                  <ToastProvider>
                    <RootStack />
                  </ToastProvider>
                </NotificationsProvider>
              </MembershipProvider>
            </ClubsProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
