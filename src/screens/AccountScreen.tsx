import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/lib/auth';
import { deleteMyAccount, describeDbError, requestPresidentVerification } from '@/lib/db';
import { colors, radius } from '@/theme/tokens';
import { ROLE_LABELS } from '@/types/domain';

export function AccountScreen() {
  const { profile, session, role, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presidentStatus = profile?.president_status ?? null;

  async function requestVerification() {
    setBusy(true);
    setError(null);
    try {
      await requestPresidentVerification();
      await refreshProfile();
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account and cannot be undone. You can sign up again later with the same school email.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void runDelete() },
      ],
    );
  }

  async function runDelete() {
    setBusy(true);
    setError(null);
    try {
      // Signs out on success, which returns the app to the sign-in screen.
      await deleteMyAccount();
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Account</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{profile?.email ?? session?.user.email ?? 'Unknown'}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{role ? ROLE_LABELS[role] : 'Student'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Club president verification</Text>
        {presidentStatus === 'approved' ? (
          <Text style={styles.body}>You are a verified club president.</Text>
        ) : presidentStatus === 'pending' ? (
          <Text style={styles.body}>Your request is waiting for Special Admin review.</Text>
        ) : (
          <>
            <Text style={styles.body}>
              Presidents can manage their club page and post announcements once the school Special
              Admin verifies them.
              {presidentStatus === 'rejected' && profile?.president_rejection_reason
                ? `\n\nPrevious request was rejected: ${profile.president_rejection_reason}`
                : ''}
            </Text>
            <Pressable
              style={[styles.primary, busy && styles.disabled]}
              onPress={requestVerification}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.primaryText}>Request verification</Text>
              )}
            </Pressable>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Pressable style={styles.signOut} onPress={() => void signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <Pressable style={styles.deleteRow} onPress={confirmDelete} disabled={busy}>
        <Text style={styles.deleteText}>Delete my account</Text>
      </Pressable>
      <Text style={styles.deleteHint}>
        Deleting removes your profile, your club follows, and your notification tokens. Clubs and
        announcements you created stay in the directory without your name attached.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { color: colors.secondary, fontWeight: '900', fontSize: 16 },
  label: { color: colors.muted, marginTop: 10, fontSize: 12, letterSpacing: 1, fontWeight: '700' },
  value: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  body: { color: colors.muted, lineHeight: 22, marginTop: 10 },
  primary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: 14 },
  primaryText: { color: colors.bg, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  signOut: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  signOutText: { color: colors.text, fontWeight: '900' },
  deleteRow: { padding: 14, alignItems: 'center', marginTop: 8 },
  deleteText: { color: colors.danger, fontWeight: '800' },
  deleteHint: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  error: { color: colors.danger, fontWeight: '700', marginTop: 10 },
});
