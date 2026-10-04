import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const KEY = "tsc.insforge.refreshToken";
export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(KEY);
  const secure = await SecureStore.getItemAsync(KEY);
  if (secure) return secure;
  // Move existing installations into encrypted device storage.
  const legacy = await AsyncStorage.getItem(KEY);
  if (legacy) {
    await SecureStore.setItemAsync(KEY, legacy);
    await AsyncStorage.removeItem(KEY);
  }
  return legacy;
}
export async function persistRefreshToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (token) await AsyncStorage.setItem(KEY, token);
    else await AsyncStorage.removeItem(KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
  await AsyncStorage.removeItem(KEY);
}
