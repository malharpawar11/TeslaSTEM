import '../global.css';
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

cssInterop(GestureHandlerRootView, { className: 'style' });

function RootStack() {
  const { isDark } = useTheme();
  return (
    <>
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
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
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
