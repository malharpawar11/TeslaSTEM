import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/PressableScale';
import { ThemeToggle } from '@/components/ThemeToggle';

type Role = 'Super Admin' | 'Club Admin' | 'Student';
const ROLES: Role[] = ['Super Admin', 'Club Admin', 'Student'];

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: number;
  superOnly?: boolean;
}

const ACTIONS: Action[] = [
  { icon: 'hourglass-outline', title: 'Pending Approvals', description: 'Review and approve newly submitted clubs', badge: 4 },
  { icon: 'people-circle-outline', title: 'Manage Club Admins', description: 'Assign or revoke club admin access' },
  { icon: 'megaphone-outline', title: 'Moderate Announcements', description: 'Review flagged or scheduled announcements' },
  { icon: 'receipt-outline', title: 'Audit Logs', description: 'Inspect privileged actions and history' },
  { icon: 'school-outline', title: 'School-wide Message', description: 'Broadcast to every student at Tesla STEM', superOnly: true },
];

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<Role>('Super Admin');
  const isSuper = role === 'Super Admin';

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-36"
      >
        <View className="flex-row items-start justify-between pb-2" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-python-green/15">
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-light-text dark:text-dark-text">
                Secure Admin Console
              </Text>
              <Text className="text-sm text-light-muted dark:text-dark-muted">
                Role-gated management tools
              </Text>
            </View>
          </View>
          <ThemeToggle />
        </View>

        <View className="mt-3 flex-row items-center gap-2">
          <Ionicons name="ribbon-outline" size={16} color="#1565C0" />
          <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
            Signed in as
          </Text>
          <View className="rounded-full bg-python-blue px-3 py-1">
            <Text className="text-xs font-bold text-white">{role}</Text>
          </View>
        </View>

        <View className="mt-3 flex-row gap-2">
          {ROLES.map((r) => {
            const active = r === role;
            return (
              <PressableScale
                key={r}
                onPress={() => setRole(r)}
                accessibilityState={{ selected: active }}
                className={`h-9 flex-1 items-center justify-center rounded-xl border ${
                  active ? 'border-python-green bg-python-green' : 'border-light-border bg-light-card dark:border-dark-border dark:bg-dark-card'
                }`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-light-muted dark:text-dark-muted'}`}>
                  {r}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <View className="mt-5 gap-3">
          {ACTIONS.map((a, i) => {
            const locked = a.superOnly && !isSuper;
            return (
              <Animated.View key={a.title} entering={FadeInDown.delay(i * 60).duration(400)}>
                <PressableScale
                  onPress={() => {}}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityLabel={a.title}
                  accessibilityState={{ disabled: locked }}
                  className={`flex-row items-center gap-3 rounded-2xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card ${
                    locked ? 'opacity-50' : ''
                  }`}
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-python-green/15">
                    <Ionicons name={a.icon} size={22} color="#4CAF50" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-light-text dark:text-dark-text">
                        {a.title}
                      </Text>
                      {a.badge ? (
                        <View className="h-5 min-w-5 items-center justify-center rounded-full bg-python-blue px-1.5">
                          <Text className="text-[11px] font-bold text-white">{a.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-0.5 text-sm text-light-muted dark:text-dark-muted">
                      {a.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={locked ? 'lock-closed' : 'chevron-forward'}
                    size={20}
                    color={locked ? '#9AA3AD' : '#4CAF50'}
                  />
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        {!isSuper && (
          <Text className="mt-4 text-center text-xs text-light-muted dark:text-dark-muted">
            Some actions require Super Admin access.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
