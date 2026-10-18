import { useRouter } from "expo-router";
import { SignInGate } from "@/components/SignInGate";
import { StudentProfileGate } from "@/components/StudentProfileGate";
export default function StudentProfile() {
  const router = useRouter();
  return (
    <SignInGate>
      <StudentProfileGate edit onSaved={() => router.replace("/messages")}>
        {null}
      </StudentProfileGate>
    </SignInGate>
  );
}
