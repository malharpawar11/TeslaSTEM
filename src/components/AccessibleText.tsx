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
  const bold = weight === "bold" || Number(weight) >= 600;
  // Web fonts are mapped by weight in global.css. Native registers each file
  // as its own family, so weight has to be translated into a family here, and
  // a custom family can't also carry fontWeight on iOS.
  const nativeFamily =
    Platform.OS === "web"
      ? null
      : style?.fontFamily === "BigShoulders"
        ? { fontWeight: "normal" as const }
        : style?.fontFamily
          ? null
          : {
              fontFamily: bold ? "AtkinsonBold" : "Atkinson",
              fontWeight: "normal" as const,
            };
  const reading =
    dyslexicFont && fontReady
      ? {
          fontFamily: bold ? "OpenDyslexicBold" : "OpenDyslexic",
          fontWeight: Platform.OS === "web" ? undefined : ("normal" as const),
        }
      : null;
  return (
    <NativeText
      {...props}
      ref={ref}
      style={[props.style, fontReady ? nativeFamily : null, reading]}
    />
  );
});
AccessibleText.displayName = "AccessibleText";
cssInterop(AccessibleText, { className: "style" });
