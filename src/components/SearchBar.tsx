import { useState, useRef } from 'react';
import { View, TextInput, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { surface, brand } from '@/theme/tokens';

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

  const borderClass = focused
    ? 'border-python-blue'
    : 'border-light-border dark:border-dark-border';

  return (
    <View
      className={`flex-row items-center gap-2.5 rounded-lg border bg-light-surface px-3 dark:bg-dark-surface-2 ${borderClass}`}
    >
      <Ionicons name="search" size={17} color={focused ? brand.blue : c.muted} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.subtle}
        accessibilityLabel="Search clubs"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        className="h-11 flex-1 text-base text-light-text dark:text-dark-text"
        style={Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : undefined}
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
          className="h-6 w-6 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-3"
        >
          <Ionicons name="close" size={13} color={c.muted} />
        </Pressable>
      ) : resultCount != null && resultCount >= 0 ? (
        <Text className="text-xs font-medium text-light-muted dark:text-dark-muted">
          {resultCount}
        </Text>
      ) : null}
    </View>
  );
}
