import { ReactNode, useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { AccessibleText as Text } from "./AccessibleText";
import { Button, Card, Input } from "./ui";
import { useAuth } from "@/context/AuthContext";
import {
  myStudentProfile,
  saveStudentProfile,
} from "@/data/directMessagesRepo";

/** Completes the verified account's directory identity after first sign-in. */
export function StudentProfileGate({
  children,
  edit = false,
  onSaved,
}: {
  children: ReactNode;
  edit?: boolean;
  onSaved?: () => void;
}) {
  const { session, refreshProfile } = useAuth();
  const uid = session?.user.id;
  const [ready, setReady] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  const [name, setName] = useState(""),
    [grade, setGrade] = useState(""),
    [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setReady(null);
    setError(null);
    setName("");
    setGrade("");
    setHandle("");
    if (!uid) {
      setLoading(false);
      return;
    }
    void myStudentProfile(uid).then((r) => {
      if (!active) return;
      if (r.ok && r.value) {
        if (!edit) setReady(uid);
        setName(r.value.name);
        setGrade(String(r.value.grade));
        setHandle(r.value.handle);
      } else if (!r.ok) setError(r.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [uid, edit]);
  if (!uid) return <>{children}</>;
  if (loading)
    return (
      <Text className="p-5 text-light-text dark:text-dark-text">
        Loading your profile…
      </Text>
    );
  if (ready === uid) return <>{children}</>;
  const save = async () => {
    setError(null);
    if (
      name.trim().length < 2 ||
      !["9", "10", "11", "12"].includes(grade) ||
      !/^[a-z0-9][a-z0-9_]{2,23}$/.test(handle)
    ) {
      setError(
        "Enter your name, grade 9–12, and a unique handle (3–24 lowercase letters, numbers or underscores).",
      );
      return;
    }
    setBusy(true);
    try {
      const r = await saveStudentProfile(name, Number(grade), handle);
      if (!r.ok) setError(r.error);
      else {
        await refreshProfile();
        setReady(uid);
        onSaved?.();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{ padding: 20, paddingTop: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card className="gap-4 p-5">
        <Text className="text-xl font-bold text-light-text dark:text-dark-text">
          Complete your student profile
        </Text>
        <Text className="text-light-muted dark:text-dark-muted">
          Other verified students can find your name, grade and unique handle.
          Your email and birth date are not shown in search. Choose a handle
          that helps classmates identify you.
        </Text>
        <Input
          label="Full name"
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Input
          label="Grade (9–12)"
          value={grade}
          onChangeText={setGrade}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Input
          label="Unique handle"
          value={handle}
          onChangeText={(v) => setHandle(v.toLowerCase())}
          autoCapitalize="none"
          maxLength={24}
          placeholder="malhar_pawar"
        />
        {error ? (
          <Text accessibilityRole="alert" className="text-danger">
            {error}
          </Text>
        ) : null}
        <Button
          label={busy ? "Saving…" : "Save and continue"}
          onPress={() => void save()}
          disabled={busy}
        />
      </Card>
    </ScrollView>
  );
}
