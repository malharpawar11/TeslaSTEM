import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
      <Tabs.Screen name="submit" options={{ title: 'Submit' }} />
      <Tabs.Screen name="admin" options={{ title: 'Admin' }} />
      <Tabs.Screen name="policies" options={{ title: 'Policies' }} />
    </Tabs>
  );
}
