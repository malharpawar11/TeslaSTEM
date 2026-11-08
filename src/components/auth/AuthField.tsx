import { forwardRef, useState } from "react";
import { Platform, Pressable, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useTheme } from "@/context/ThemeContext";
import { webFade } from "@/components/system";
import { semantic, surface } from "@/theme/tokens";

const IS_WEB = Platform.OS === "web";

/** A labelled line to write on: the same language as the Clubs search. */
export const AuthField = forwardRef<
  TextInput,
  TextInputProps & {
    label: string;
    error?: string | null;
    hint?: string;
    reveal?: boolean;
    large?: boolean;
  }
>(function AuthField(
  { label, error, hint, reveal, large, secureTextEntry, onBlur, onFocus, ...rest },
  ref,
) {
  const { isDark } = useTheme();
  const { dyslexicFont, fontReady, highContrast } = useAccessibility();
  const c = surface(isDark);
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const rule = error ? semantic.danger : focused ? "#3068F0" : c.borderStrong;
  return (
    <View>
      <Text className="text-base font-bold text-light-text dark:text-dark-text">
        {label}
      </Text>
      <View
        className="flex-row items-center"
        style={[
          {
            height: large ? 76 : 56,
            borderBottomWidth: focused || error ? 3 : 2,
            borderBottomColor: rule,
            marginBottom: focused || error ? 0 : 1,
          },
          webFade("border-bottom-color"),
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          {...({ dataSet: { underlined: "true" } } as object)}
          accessibilityLabel={label}
          aria-invalid={!!error}
          secureTextEntry={secureTextEntry && !shown}
          placeholderTextColor={highContrast ? (isDark ? "#FFFFFF" : "#111827") : c.subtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`h-full flex-1 text-light-text dark:text-dark-text ${large ? "font-display" : ""}`}
          style={[
            {
              fontSize: large ? 52 : 20,
              minWidth: 0,
              letterSpacing: large ? 10 : 0,
            },
            IS_WEB ? ({ outlineStyle: "none" } as object) : null,
            dyslexicFont && fontReady
              ? { fontFamily: "OpenDyslexic" }
              : IS_WEB
                ? null
                : { fontFamily: large ? "BigShoulders" : "Atkinson" },
          ]}
        />
        {reveal ? (
          <Pressable
            onPress={() => setShown((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={shown ? "Hide password" : "Show password"}
            className="h-11 w-11 items-center justify-center"
          >
            <Ionicons
              name={shown ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={c.secondary}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={{ minHeight: 24 }} className="justify-center">
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm font-bold text-danger"
          >
            {error}
          </Text>
        ) : hint ? (
          <Text className="text-sm text-light-muted dark:text-dark-muted">
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
});
