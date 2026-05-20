import { useState, useRef } from 'react';
import { View, TextInput, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { surface, brand } from '@/theme/tokens';
import { timing } from '@/theme/motion';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  resultCount?: number;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search clubs, advisors, days…',
  resultCount,
}: Props) {
  const { isDark } = useTheme();
  const c = surface(isDark);
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const ring = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value * 0.45,
  }));

  const borderClass = focused
    ? 'border-python-green'
    : 'border-light-border dark:border-dark-border';

  return (
    <View className="relative">
      <Animated.View
        pointerEvents="none"
        style={ringStyle}
        className="absolute -inset-1 rounded-3xl bg-python-green/25"
      />
      <View
        className={`flex-row items-center gap-3 rounded-2xl border bg-light-surface px-4 dark:bg-dark-surface-2 ${borderClass}`}
      >
        <Ionicons
          name="search"
          size={18}
          color={focused ? brand.green : c.muted}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.subtle}
          accessibilityLabel="Search clubs"
          onFocus={() => {
            setFocused(true);
            ring.value = withTiming(1, timing.smooth);
          }}
          onBlur={() => {
            setFocused(false);
            ring.value = withTiming(0, timing.smooth);
          }}
          returnKeyType="search"
          className="h-12 flex-1 text-base text-light-text dark:text-dark-text"
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText('');
              inputRef.current?.focus();
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
            className="h-7 w-7 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-3"
          >
            <Ionicons name="close" size={13} color={c.muted} />
          </Pressable>
        ) : resultCount != null && resultCount >= 0 ? (
          <View className="rounded-full bg-light-surface-2 px-2.5 py-1 dark:bg-dark-surface-3">
            <Text className="text-2xs font-bold text-light-muted dark:text-dark-muted">
              {resultCount}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
