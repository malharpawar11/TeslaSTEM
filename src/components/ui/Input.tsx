import { useState, ReactNode } from 'react';
import { View, Text, TextInput, TextInputProps, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { surface } from '@/theme/tokens';
import { timing } from '@/theme/motion';

interface FieldProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  trailing?: ReactNode;
  multiline?: boolean;
}

export function Input({
  label,
  helper,
  error,
  required,
  icon,
  trailing,
  multiline,
  ...rest
}: FieldProps) {
  const { isDark } = useTheme();
  const c = surface(isDark);
  const [focused, setFocused] = useState(false);

  const ringProgress = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringProgress.value,
    transform: [{ scale: 1 + ringProgress.value * 0.005 }],
  }));

  const showError = !!error;
  const borderClass = showError
    ? 'border-danger'
    : focused
      ? 'border-python-green'
      : 'border-light-border dark:border-dark-border';

  return (
    <View>
      {label ? (
        <View className="mb-2 flex-row items-center gap-1">
          <Text className="text-xs font-semibold tracking-wide text-light-secondary dark:text-dark-secondary">
            {label}
          </Text>
          {required ? <Text className="text-xs font-bold text-python-green">*</Text> : null}
        </View>
      ) : null}

      <View className="relative">
        <Animated.View
          pointerEvents="none"
          style={ringStyle}
          className={`absolute -inset-1 rounded-2xl ${showError ? 'bg-danger/14' : 'bg-python-green/14'}`}
        />
        <View
          className={`flex-row items-center gap-2.5 rounded-2xl border bg-light-surface px-3.5 dark:bg-dark-surface-2 ${borderClass}`}
        >
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={
                showError
                  ? '#E11D48'
                  : focused
                    ? '#4CAF50'
                    : isDark
                      ? c.muted
                      : c.muted
              }
            />
          ) : null}
          <TextInput
            {...rest}
            placeholderTextColor={c.subtle}
            multiline={multiline}
            onFocus={(e) => {
              setFocused(true);
              ringProgress.value = withTiming(1, timing.smooth);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              ringProgress.value = withTiming(0, timing.smooth);
              rest.onBlur?.(e);
            }}
            className={`flex-1 text-base text-light-text dark:text-dark-text ${
              multiline ? 'min-h-24 py-3' : 'h-12'
            }`}
            // react-native-web renders TextInput as an <input>; suppress the
            // browser's default focus outline so only our own green ring shows.
            style={[
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
              rest.style,
            ]}
          />
          {trailing}
        </View>
      </View>

      {showError ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="alert-circle" size={13} color="#E11D48" />
          <Text className="text-xs font-semibold text-danger">{error}</Text>
        </View>
      ) : helper ? (
        <Text className="mt-1.5 text-xs text-light-muted dark:text-dark-muted">{helper}</Text>
      ) : null}
    </View>
  );
}
