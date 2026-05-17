import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search clubs, advisors, days…' }: Props) {
  const { isDark } = useTheme();
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-light-border bg-light-card px-4 dark:border-dark-border dark:bg-dark-card">
      <Ionicons name="search" size={20} color={isDark ? '#9AA3AD' : '#5A6470'} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#9AA3AD' : '#5A6470'}
        accessibilityLabel="Search clubs"
        className="h-12 flex-1 text-base text-light-text dark:text-dark-text"
      />
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-python-green/15">
        <Ionicons name="options-outline" size={18} color="#4CAF50" />
      </View>
    </View>
  );
}
