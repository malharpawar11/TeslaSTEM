import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { describeDbError, submitClub, type ClubSubmission } from '@/lib/db';
import { colors, radius } from '@/theme/tokens';

const EMPTY: ClubSubmission = {
  name: '',
  category: '',
  description: '',
  meetingDay: '',
  meetingTime: '',
  location: '',
  advisor: '',
  contactEmail: '',
};

export function SubmitClubScreen({ navigation }: any) {
  const [form, setForm] = useState<ClubSubmission>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function update(key: keyof ClubSubmission, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await submitClub(form);
      setDone(true);
      setForm(EMPTY);
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setBusy(false);
    }
  }

  const ready =
    form.name.trim().length > 1 &&
    form.category.trim().length > 1 &&
    form.description.trim().length > 9 &&
    !busy;

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Submitted</Text>
        <Text style={styles.body}>
          Your club is now pending Special Admin review. It appears in the directory once approved.
        </Text>
        <Pressable style={styles.primary} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryText}>Back to directory</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.body}>
          Submissions are reviewed by the school Special Admin before they appear in the directory.
        </Text>
        <Field label="Club name *" value={form.name} onChange={(v) => update('name', v)} />
        <Field
          label="Category *"
          value={form.category}
          onChange={(v) => update('category', v)}
          placeholder="STEM, Service, Arts, Culture…"
        />
        <Field
          label="Description *"
          value={form.description}
          onChange={(v) => update('description', v)}
          multiline
        />
        <Field label="Meeting day" value={form.meetingDay} onChange={(v) => update('meetingDay', v)} />
        <Field label="Meeting time" value={form.meetingTime} onChange={(v) => update('meetingTime', v)} />
        <Field label="Location" value={form.location} onChange={(v) => update('location', v)} />
        <Field label="Advisor" value={form.advisor} onChange={(v) => update('advisor', v)} />
        <Field
          label="Contact email"
          value={form.contactEmail}
          onChange={(v) => update('contactEmail', v)}
          keyboardType="email-address"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={[styles.primary, !ready && styles.disabled]} onPress={submit} disabled={!ready}>
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.primaryText}>Submit for approval</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: 12 },
  body: { color: colors.muted, lineHeight: 22, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { color: colors.secondary, fontWeight: '800', marginBottom: 6 },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    padding: 14,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  primary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryText: { color: colors.bg, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, fontWeight: '700', marginBottom: 10 },
});
