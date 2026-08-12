import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Club } from '@/types/domain';
import { colors, radius } from '@/theme/tokens';

function meetingLine(club: Club) {
  const parts = [club.meeting_day, club.meeting_time, club.location].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Meeting details coming soon';
}

export function ClubCard({ club, onPress }: { club: Club; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{club.name}</Text>
        <Text style={styles.badge}>{club.category}</Text>
      </View>
      <Text style={styles.desc} numberOfLines={4}>
        {club.description}
      </Text>
      <Text style={styles.meta}>{meetingLine(club)}</Text>
      {club.advisor ? <Text style={styles.advisor}>Advisor: {club.advisor}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 },
  badge: {
    color: colors.white,
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
  },
  desc: { color: colors.muted, marginTop: 8, lineHeight: 20 },
  meta: { color: colors.primary, marginTop: 12, fontWeight: '700' },
  advisor: { color: colors.text, marginTop: 6 },
});
