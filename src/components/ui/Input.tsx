import { useState, ReactNode } from 'react';
import { View, Text, TextInput, TextInputProps, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { surface, brand, semantic } from '@/theme/tokens';

interface FieldProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  trailing?: ReactNode;
  multiline?: boolean;
}

/**
 * Text field. Focus is communicated by a single blue border, no halo, no
 * animated ring. One clear signal is easier to read than a glow.
 */
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

  const showError = !!error;
  const borderClass = showError
    ? 'border-danger'
    : focused
      ? 'border-python-blue'
      : 'border-light-border dark:border-dark-border';

  return (
    <View>
      {label ? (
        <View className="mb-1.5 flex-row items-center gap-1">
          <Text className="text-xs font-semibold text-light-secondary dark:text-dark-secondary">
            {label}
          </Text>
          {required ? <Text className="text-xs font-semibold text-danger">*</Text> : null}
        </View>
      ) : null}

      <View
        className={`flex-row items-center gap-2.5 rounded-lg border bg-light-surface px-3 dark:bg-dark-surface-2 ${borderClass}`}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={17}
            color={showError ? semantic.danger : focused ? brand.blue : c.muted}
          />
        ) : null}
        <TextInput
          {...rest}
          placeholderTextColor={c.subtle}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          className={`flex-1 text-base text-light-text dark:text-dark-text ${
            multiline ? 'min-h-24 py-3' : 'h-11'
          }`}
          // react-native-web renders TextInput as an <input>; suppress the
          // browser's default focus outline so only our own border shows.
          style={[
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            rest.style,
          ]}
        />
        {trailing}
      </View>

      {showError ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="alert-circle" size={13} color={semantic.danger} />
          <Text className="text-xs font-medium text-danger">{error}</Text>
        </View>
      ) : helper ? (
        <Text className="mt-1.5 text-xs text-light-muted dark:text-dark-muted">{helper}</Text>
      ) : null}
    </View>
  );
}
