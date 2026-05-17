import { View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/context/ThemeContext';
import { PressableScale } from './PressableScale';

cssInterop(BlurView, { className: 'style' });

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { on: 'home', off: 'home-outline', label: 'Home' },
  browse: { on: 'search', off: 'search-outline', label: 'Browse' },
  submit: { on: 'add-circle', off: 'add-circle-outline', label: 'Submit' },
  admin: { on: 'shield-checkmark', off: 'shield-checkmark-outline', label: 'Admin' },
  policies: { on: 'document-text', off: 'document-text-outline', label: 'Policies' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  return (
    <BlurView
      intensity={isDark ? 40 : 60}
      tint={isDark ? 'dark' : 'light'}
      className="absolute bottom-0 left-0 right-0 flex-row border-t border-light-border/60 dark:border-dark-border/60"
      style={{ paddingBottom: insets.bottom + 8, paddingTop: 10 }}
    >
      {state.routes.map((route, index) => {
        const meta = ICONS[route.name];
        if (!meta) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <PressableScale
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            className="flex-1 items-center justify-center gap-1"
          >
            <Ionicons
              name={focused ? meta.on : meta.off}
              size={24}
              color={focused ? '#4CAF50' : isDark ? '#9AA3AD' : '#5A6470'}
            />
            <Text
              className={`text-[11px] font-semibold ${
                focused ? 'text-python-green' : 'text-light-muted dark:text-dark-muted'
              }`}
            >
              {meta.label}
            </Text>
          </PressableScale>
        );
      })}
    </BlurView>
  );
}
