import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { isBackendConfigured } from '@/lib/supabase';
import { AccountScreen } from '@/screens/AccountScreen';
import { AdminScreen } from '@/screens/AdminScreen';
import { BrowseScreen } from '@/screens/BrowseScreen';
import { ClubProfileScreen } from '@/screens/ClubProfileScreen';
import { PoliciesScreen } from '@/screens/PoliciesScreen';
import { SignInScreen } from '@/screens/SignInScreen';
import { SubmitClubScreen } from '@/screens/SubmitClubScreen';
import { colors } from '@/theme/tokens';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Browse: 'search',
  Admin: 'shield-checkmark',
  Account: 'person-circle',
  Policies: 'document-text',
};

function HomeTabs() {
  const { canAdministerSomething } = useAuth();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] ?? 'ellipse'} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="Browse" component={BrowseScreen} />
      {/* Hidden for plain students — the backend rejects their admin calls anyway. */}
      {canAdministerSomething ? <Tabs.Screen name="Admin" component={AdminScreen} /> : null}
      <Tabs.Screen name="Account" component={AccountScreen} />
      <Tabs.Screen name="Policies" component={PoliciesScreen} />
    </Tabs.Navigator>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

export function AppNavigator() {
  const { loading, session } = useAuth();

  if (!isBackendConfigured) {
    return (
      <Centered>
        <Text style={styles.heading}>Backend not configured</Text>
        <Text style={styles.body}>
          Set `supabaseUrl` and `supabaseAnonKey` in app.json (or EXPO_PUBLIC_SUPABASE_URL and
          EXPO_PUBLIC_SUPABASE_ANON_KEY) and restart Expo.
        </Text>
      </Centered>
    );
  }

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator color={colors.primary} />
      </Centered>
    );
  }

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.bg,
          text: colors.text,
          primary: colors.primary,
          card: colors.surface,
          border: colors.border,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '900' },
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="Tesla STEM Clubs" component={HomeTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ClubProfile" component={ClubProfileScreen} options={{ title: 'Club Profile' }} />
            <Stack.Screen name="SubmitClub" component={SubmitClubScreen} options={{ title: 'Submit a Club' }} />
          </>
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  heading: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  body: { color: colors.muted, lineHeight: 22, textAlign: 'center' },
});
