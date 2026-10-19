import { ScrollView, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Button, Card } from "@/components/ui";
import { SignInGate } from "@/components/SignInGate";
import { useAuth } from "@/context/AuthContext";
import {
  DEMO_CLUB_ID,
  DEMO_MEMBER_EMAIL,
  DEMO_PRESIDENT_EMAIL,
  isRecordingDemo,
} from "@/lib/recordingDemo";

function DemoGuide() {
  const router = useRouter(),
    { session, profile, signOut } = useAuth();
  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{ padding: 20, paddingTop: 36, gap: 16 }}
    >
      <Card className="gap-4 p-5">
        <Text className="text-2xl font-bold text-light-text dark:text-dark-text">
          FBLA recording studio
        </Text>
        <Text className="text-light-muted dark:text-dark-muted">
          Signed in as {profile?.display_name ?? session?.user.email}. Posts and
          events here are stored in an isolated demo backend and reach demo
          members only.
        </Text>
        {profile?.role === "verified_president" ? (
          <Button
            label="Manage FBLA — post an announcement or event"
            onPress={() => router.push(`/club/${DEMO_CLUB_ID}/manage`)}
          />
        ) : null}
        <Button
          label="Open FBLA club page"
          variant="secondary"
          onPress={() => router.push(`/club/${DEMO_CLUB_ID}`)}
        />
        <Button
          label="Open my calendar"
          variant="secondary"
          onPress={() => router.push("/calendar")}
        />
        <Button
          label="Open my announcements and alerts"
          variant="secondary"
          onPress={() => router.push("/notifications")}
        />
        <Text className="text-sm text-light-muted dark:text-dark-muted">
          For a two-screen recording, open the president and member links
          separately. New announcements appear on FBLA's Announcements tab; new
          events appear on each demo member's My clubs calendar. Editing or
          cancelling an event updates the same entry.
        </Text>
        <Button
          label="Sign out to switch demo account"
          variant="ghost"
          onPress={() => void signOut()}
        />
      </Card>
    </ScrollView>
  );
}
export default function Demo() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const router = useRouter();
  if (!isRecordingDemo || !DEMO_CLUB_ID) return <Redirect href="/" />;
  if (view !== "president" && view !== "member")
    return (
      <View className="flex-1 justify-center gap-4 bg-light-bg p-5 dark:bg-dark-bg">
        <Text className="text-2xl font-bold text-light-text dark:text-dark-text">
          FBLA demo
        </Text>
        <Text className="text-light-muted dark:text-dark-muted">
          Choose the view to record. Use the demo password provided to you.
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
      subtitle="Use the provided recording-demo password. This account cannot post to the live school app."
    >
      <DemoGuide />
    </SignInGate>
  );
}
