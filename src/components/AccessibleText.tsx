import { forwardRef } from "react";
import { Text as NativeText, TextProps, StyleSheet, Platform } from "react-native";
import { cssInterop } from "nativewind";
import { useAccessibility } from "@/context/AccessibilityContext";

export const AccessibleText = forwardRef<
  NativeText,
  TextProps & { className?: string }
>((props, ref) => {
  const { dyslexicFont, fontReady } = useAccessibility();
  const style = StyleSheet.flatten(props.style);
  const weight = String(style?.fontWeight ?? "400");
  return (
    <NativeText
      {...props}
      ref={ref}
      style={[
        props.style,
        dyslexicFont && fontReady
          ? {
              fontFamily:
                weight === "bold" || Number(weight) >= 600
                  ? "OpenDyslexicBold"
                  : "OpenDyslexic",
              fontWeight: Platform.OS === 'web' ? undefined : 'normal',
            }
          : null,
      ]}
    />
  );
});
AccessibleText.displayName = "AccessibleText";
cssInterop(AccessibleText, { className: "style" });
