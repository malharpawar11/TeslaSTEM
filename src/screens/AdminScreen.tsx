import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import {
  approveClub,
  describeDbError,
  fetchAuditLog,
  fetchPendingClubs,
  fetchPendingPresidents,
  rejectClub,
  rejectPresident,
  verifyPresident,
} from '@/lib/db';
import { colors, radius } from '@/theme/tokens';
import type { AuditLogEntry, Club, Profile } from '@/types/domain';

export function AdminScreen() {
  const { isSpecialAdmin, role } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [presidents, setPresidents] = useState<Profile[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSpecialAdmin) {
      setLoading(false);
      return;
    }
    try {
      const [pendingClubs, pendingPresidents, log] = await Promise.all([
        fetchPendingClubs(),
        fetchPendingPresidents(),
        fetchAuditLog(25),
      ]);
      setClubs(pendingClubs);
      setPresidents(pendingPresidents);
      setAudit(log);
      setError(null);
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setLoading(false);
    }
  }, [isSpecialAdmin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Every action below is also re-checked server-side by a SECURITY DEFINER RPC;
  // hiding the buttons is convenience, not the security boundary.
  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setBusyId(null);
    }
  }

  function confirmReject(label: string, onConfirm: (reason: string) => void) {
    Alert.alert(`Reject ${label}?`, 'The submitter is told it was rejected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => onConfirm('Rejected by school admin') },
    ]);
  }

  if (!isSpecialAdmin) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Admin console</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            {role === 'club_admin' || role === 'verified_president'
              ? 'You can manage the clubs assigned to you. Approving clubs, verifying presidents, and reading audit logs are reserved for the school Special Admin.'
              : 'Only the school Special Admin can review submissions. Ask an administrator if you need access.'}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
      }
    >
      <Text style={styles.title}>Admin console</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      <Text style={styles.section}>Clubs awaiting approval ({clubs.length})</Text>
      {clubs.length === 0 ? <Text style={styles.muted}>Nothing pending.</Text> : null}
      {clubs.map((club) => (
        <View key={club.id} style={styles.card}>
          <Text style={styles.cardTitle}>{club.name}</Text>
          <Text style={styles.muted}>
            {club.category} • submitted by {club.president_email ?? 'unknown'}
          </Text>
          <Text style={styles.body}>{club.description}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.approve, busyId === club.id && styles.disabled]}
              disabled={busyId === club.id}
              onPress={() => run(club.id, () => approveClub(club.id))}
            >
              <Text style={styles.approveText}>Approve</Text>
            </Pressable>
            <Pressable
              style={[styles.reject, busyId === club.id && styles.disabled]}
              disabled={busyId === club.id}
              onPress={() =>
                confirmReject(club.name, (reason) => run(club.id, () => rejectClub(club.id, reason)))
              }
            >
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.section}>President verifications ({presidents.length})</Text>
      {presidents.length === 0 ? <Text style={styles.muted}>Nothing pending.</Text> : null}
      {presidents.map((person) => (
        <View key={person.id} style={styles.card}>
          <Text style={styles.cardTitle}>{person.display_name ?? person.email}</Text>
          <Text style={styles.muted}>{person.email}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.approve, busyId === person.id && styles.disabled]}
              disabled={busyId === person.id}
              onPress={() => run(person.id, () => verifyPresident(person.id))}
            >
              <Text style={styles.approveText}>Verify</Text>
            </Pressable>
            <Pressable
              style={[styles.reject, busyId === person.id && styles.disabled]}
              disabled={busyId === person.id}
              onPress={() =>
                confirmReject(person.email, (reason) =>
                  run(person.id, () => rejectPresident(person.id, reason)),
                )
              }
            >
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.section}>Recent audit log</Text>
      {audit.length === 0 ? <Text style={styles.muted}>No admin activity recorded yet.</Text> : null}
      {audit.map((entry) => (
        <View key={entry.id} style={styles.logRow}>
          <Text style={styles.logAction}>{entry.action}</Text>
          <Text style={styles.muted}>
            {entry.entity} • {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: 16 },
  section: { color: colors.secondary, fontWeight: '900', fontSize: 16, marginTop: 24, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22, marginTop: 8 },
  muted: { color: colors.muted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  approve: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 18 },
  approveText: { color: colors.bg, fontWeight: '900' },
  reject: { borderColor: colors.danger, borderWidth: 1, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 18 },
  rejectText: { color: colors.danger, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  logRow: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 10 },
  logAction: { color: colors.text, fontWeight: '700' },
  error: { color: colors.danger, fontWeight: '700', marginBottom: 12 },
});
