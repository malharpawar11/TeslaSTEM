import { useTheme } from "@/context/ThemeContext";
import { surface } from "@/theme/tokens";
import { isWebsite } from "@/theme/layout";
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  const { isDark } = useTheme();
  return (
    <Tabs
      sceneContainerStyle={isWebsite ? { backgroundColor: surface(isDark).bg } : undefined}
      tabBar={(props) => isWebsite ? null : <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="browse" options={{ title: 'Clubs' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="account" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
