import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { vars } from "nativewind";
import { surfaces } from "@/theme/tokens";

const KEY = "tsc.accessibility";
const defaults = { highContrast: false, dyslexicFont: false };
const Context = createContext({
  ...defaults,
  fontReady: false,
  fontError: false,
  update: (_: Partial<typeof defaults>) => {},
});
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [fontReady, fontError] = useFonts({
    OpenDyslexic: require("../../assets/fonts/OpenDyslexic-Regular.ttf"),
    OpenDyslexicBold: require("../../assets/fonts/OpenDyslexic-Bold.ttf"),
  });
  useEffect(() => {
    void AsyncStorage.getItem(KEY)
      .then((value) => {
        if (value) {
          const stored = JSON.parse(value);
          setSettings({
            highContrast: stored.highContrast === true,
            dyslexicFont: stored.dyslexicFont === true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready)
      void AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);
  const colors: Record<string, string> = {};
  for (const [mode, palette] of Object.entries(surfaces)) {
    for (const [name, original] of Object.entries(palette)) {
      const text = ["text", "secondary", "muted", "subtle"].includes(name);
      const border = ["border", "borderStrong", "hairline"].includes(name);
      colors[`--a11y-${mode}-${name}`] = settings.highContrast
        ? text
          ? mode === "light"
            ? "#111827"
            : "#FFFFFF"
          : border
            ? mode === "light"
              ? "#475569"
              : "#CBD5E1"
            : mode === "light"
              ? "#FFFFFF"
              : "#030712"
        : original;
    }
  }
  return (
    <Context.Provider
      value={{
        ...settings,
        fontReady,
        fontError: !!fontError,
        update: (next) => setSettings((previous) => ({ ...previous, ...next })),
      }}
    >
      <View style={[{ flex: 1 }, vars(colors)]}>{children}</View>
    </Context.Provider>
  );
}
export const useAccessibility = () => useContext(Context);
