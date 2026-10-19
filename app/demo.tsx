import { View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Button } from "@/components/ui";
import { SignInGate } from "@/components/SignInGate";
import {
  DEMO_CLUB_ID,
  DEMO_MEMBER_EMAIL,
  DEMO_PRESIDENT_EMAIL,
  isRecordingDemo,
} from "@/lib/recordingDemo";

export default function Demo() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const router = useRouter();
  if (!isRecordingDemo || !DEMO_CLUB_ID) return <Redirect href="/" />;
  if (view !== "president" && view !== "member")
    return (
      <View className="flex-1 justify-center gap-4 bg-light-bg p-5 dark:bg-dark-bg">
        <Text className="text-2xl font-bold text-light-text dark:text-dark-text">
          FBLA
        </Text>
        <Text className="text-light-muted dark:text-dark-muted">
          Choose your account to sign in.
        </Text>
        <Button
          label="President view"
          onPress={() => router.replace("/demo?view=president")}
        />
        <Button
          label="Member view"
          variant="secondary"
          onPress={() => router.replace("/demo?view=member")}
        />
      </View>
    );
  return (
    <SignInGate
      key={view}
      initialEmail={
        view === "president" ? DEMO_PRESIDENT_EMAIL : DEMO_MEMBER_EMAIL
      }
      allowSignUp={false}
      title={
        view === "president"
          ? "Sign in as FBLA president"
          : "Sign in as an FBLA member"
      }
      subtitle="Sign in to access your club."
    >
      <Redirect href={view === "president" ? `/club/${DEMO_CLUB_ID}/manage` : `/club/${DEMO_CLUB_ID}`} />
    </SignInGate>
  );
}
