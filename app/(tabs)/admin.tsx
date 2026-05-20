import { useEffect, useState } from 'react';
import { View, Text, ScrollView, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Badge,
  Card,
  PressableCard,
  PressableScale,
  Divider,
  SectionHeader,
  StatTile,
  Tag,
} from '@/components/ui';
import { surface } from '@/theme/tokens';
import { spring } from '@/theme/motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/context/ThemeContext';

type Role = 'Super Admin' | 'Club Admin' | 'Student';
const ROLES: Role[] = ['Super Admin', 'Club Admin', 'Student'];

const ROLE_INITIALS: Record<Role, string> = {
  'Super Admin': 'SA',
  'Club Admin': 'CA',
  Student: 'ST',
};

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: number;
  superOnly?: boolean;
}

const ACTIONS: Action[] = [
  {
    icon: 'hourglass-outline',
    title: 'Pending Approvals',
    description: 'Review and approve newly submitted clubs',
    badge: 4,
  },
  {
    icon: 'people-circle-outline',
    title: 'Manage Club Admins',
    description: 'Assign or revoke club admin access',
  },
  {
    icon: 'megaphone-outline',
    title: 'Moderate Announcements',
    description: 'Review flagged or scheduled announcements',
  },
  {
    icon: 'receipt-outline',
    title: 'Audit Logs',
    description: 'Inspect privileged actions and history',
  },
  {
    icon: 'school-outline',
    title: 'School-wide Message',
    description: 'Broadcast to every student at Tesla STEM',
    superOnly: true,
  },
];

interface Activity {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  time: string;
}

const ACTIVITY: Activity[] = [
  { icon: 'checkmark-circle', title: 'Chemistry Club approved by admin', time: '2h ago' },
  { icon: 'shield-checkmark', title: 'New club admin assigned to Robotics', time: '5h ago' },
  { icon: 'megaphone', title: 'Yearbook Club posted an announcement', time: '8h ago' },
];

/** Pulsing green status dot for the persona chip. */
function StatusDot() {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.35,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="h-2.5 w-2.5 items-center justify-center">
      <Animated.View
        style={ringStyle}
        className="absolute h-2.5 w-2.5 rounded-full bg-python-green"
      />
      <View className="h-2 w-2 rounded-full bg-python-green" />
    </View>
  );
}

interface SegmentedProps {
  options: Role[];
  value: Role;
  onChange: (r: Role) => void;
}

function RoleSegmented({ options, value, onChange }: SegmentedProps) {
  const [trackW, setTrackW] = useState(0);
  const tx = useSharedValue(0);
  const idx = options.indexOf(value);
  const pillW = trackW > 0 ? (trackW - 8) / options.length : 0; // p-1 = 4px on each side

  useEffect(() => {
    if (pillW > 0) {
      tx.value = withSpring(idx * pillW, spring.pop);
    }
  }, [idx, pillW, tx]);

  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    width: pillW,
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)}
      className="relative mt-2 h-11 flex-row rounded-full border border-light-hairline bg-light-surface-2 p-1 dark:border-dark-border dark:bg-dark-surface-2"
    >
      {pillW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[indicator, { height: 36 }]}
          className="absolute left-1 top-1 rounded-full bg-light-surface shadow-ambient dark:bg-dark-surface"
        />
      ) : null}
      {options.map((r) => {
        const active = r === value;
        return (
          <PressableScale
            key={r}
            onPress={() => onChange(r)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`View as ${r}`}
            accessibilityState={{ selected: active }}
            className="h-full flex-1 items-center justify-center rounded-full"
          >
            <Text
              className={`text-xs font-bold ${
                active
                  ? 'text-light-text dark:text-dark-text'
                  : 'text-light-muted dark:text-dark-muted'
              }`}
            >
              {r}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const s = surface(isDark);
  const [role, setRole] = useState<Role>('Super Admin');
  const isSuper = role === 'Super Admin';

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-36"
      >
        {/* Header */}
        <View
          className="flex-row items-start justify-between pb-1"
          style={{ paddingTop: insets.top + 8 }}
        >
          <View className="flex-1 pr-3">
            <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
              ADMIN
            </Text>
            <Text className="mt-1.5 text-3xl font-extrabold tracking-tighter text-light-text dark:text-dark-text">
              Mission Control
            </Text>
            <Text className="mt-1.5 text-base leading-6 text-light-muted dark:text-dark-muted">
              Manage clubs, moderate content, and run school-wide ops.
            </Text>
          </View>
          <ThemeToggle />
        </View>

        {/* Persona chip */}
        <Card
          elevation="ambient"
          className="mt-5 flex-row items-center gap-3 rounded-2xl p-2.5 pr-4"
        >
          <Avatar size="md" tone="brand" initials={ROLE_INITIALS[role]} />
          <View className="flex-1">
            <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
              Signed in
            </Text>
            <View className="mt-0.5 flex-row items-center gap-2">
              <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                {role}
              </Text>
              <Text className="text-2xs text-light-subtle dark:text-dark-subtle">
                · Tesla STEM
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2 rounded-full bg-success/14 px-2.5 py-1">
            <StatusDot />
            <Text className="text-2xs font-bold uppercase tracking-wider text-python-green-dark dark:text-python-green-light">
              Active
            </Text>
          </View>
        </Card>

        {/* Stat tiles */}
        <View className="mt-4 flex-row gap-3">
          <StatTile
            icon="hourglass-outline"
            value="4"
            label="Pending Approvals"
            tone="brand"
          />
          <StatTile
            icon="megaphone-outline"
            value="12"
            label="Announcements / wk"
            tone="info"
          />
          <StatTile
            icon="people-circle-outline"
            value="47"
            label="Active clubs"
            tone="brand"
          />
        </View>

        {/* Role switcher (demo "View as") */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
              View as
            </Text>
            <Text className="text-2xs text-light-subtle dark:text-dark-subtle">
              Demo role toggle
            </Text>
          </View>
          <RoleSegmented options={ROLES} value={role} onChange={setRole} />
        </View>

        {/* Actions */}
        <View className="mt-7">
          <SectionHeader
            eyebrow="ADMIN TOOLS"
            title="What needs your attention"
            size="md"
          />
          <View className="mt-4 gap-3">
            {ACTIONS.map((a, i) => {
              const locked = !!a.superOnly && !isSuper;
              return (
                <Animated.View
                  key={a.title}
                  entering={FadeInDown.delay(i * 50).duration(360)}
                >
                  <PressableCard
                    onPress={() => {}}
                    elevation="ambient"
                    accessibilityLabel={a.title}
                    className={`flex-row items-center gap-3.5 p-4 ${
                      locked ? 'opacity-50' : ''
                    }`}
                  >
                    <Avatar size="md" tone="brand" icon={a.icon} />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="text-base font-bold text-light-text dark:text-dark-text"
                          numberOfLines={1}
                        >
                          {a.title}
                        </Text>
                        {a.badge ? <Badge count={a.badge} tone="brand" /> : null}
                      </View>
                      <Text
                        className="mt-0.5 text-sm leading-5 text-light-muted dark:text-dark-muted"
                        numberOfLines={2}
                      >
                        {a.description}
                      </Text>
                      {locked ? (
                        <View className="mt-2 flex-row">
                          <Tag tone="warn" label="Super Admin only" />
                        </View>
                      ) : null}
                    </View>
                    <Ionicons
                      name={locked ? 'lock-closed' : 'chevron-forward'}
                      size={18}
                      color={locked ? s.subtle : s.muted}
                    />
                  </PressableCard>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Recent activity */}
        <Card elevation="ambient" className="mt-6 p-4">
          <SectionHeader
            eyebrow="RECENT ACTIVITY"
            title="Last 24 hours"
            size="sm"
          />
          <View className="mt-3">
            {ACTIVITY.map((a, i) => (
              <View key={a.title}>
                <View className="flex-row items-center gap-3 py-3">
                  <Avatar size="sm" tone="neutral" icon={a.icon} />
                  <Text
                    className="flex-1 text-sm font-semibold text-light-text dark:text-dark-text"
                    numberOfLines={1}
                  >
                    {a.title}
                  </Text>
                  <Text className="text-2xs font-semibold text-light-muted dark:text-dark-muted">
                    {a.time}
                  </Text>
                </View>
                {i < ACTIVITY.length - 1 ? <Divider variant="hairline" /> : null}
              </View>
            ))}
          </View>
        </Card>

        {/* Access note */}
        {!isSuper ? (
          <View className="mt-5 flex-row">
            <View className="flex-row items-center gap-2 rounded-full bg-warn/14 px-3 py-1.5">
              <Ionicons name="lock-closed" size={12} color="#B45309" />
              <Text className="text-2xs font-bold uppercase tracking-wider text-warn">
                Some actions require Super Admin
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
