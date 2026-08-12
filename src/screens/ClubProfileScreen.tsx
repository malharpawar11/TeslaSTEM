import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  canAdminClub,
  createAnnouncement,
  describeDbError,
  fetchAnnouncements,
  fetchClub,
  followClub,
  isFollowing,
  unfollowClub,
} from '@/lib/db';
import { getExpoPushToken } from '@/lib/notifications';
import { colors, radius } from '@/theme/tokens';
import type { Announcement, Club } from '@/types/domain';

export function ClubProfileScreen({ route }: any) {
  const clubId: string | undefined = route?.params?.clubId;
  const [club, setClub] = useState<Club | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [following, setFollowing] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    if (!clubId) {
      setError('No club was selected.');
      setLoading(false);
      return;
    }
    try {
      const [record, posts, follows, manages] = await Promise.all([
        fetchClub(clubId),
        fetchAnnouncements(clubId),
        isFollowing(clubId),
        canAdminClub(clubId),
      ]);
      setClub(record);
      setAnnouncements(posts);
      setFollowing(follows);
      setCanManage(manages);
      setError(record ? null : 'That club is no longer available.');
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFollow() {
    if (!clubId) return;
    setBusy(true);
    setError(null);
    try {
      if (following) {
        await unfollowClub(clubId);
        setFollowing(false);
      } else {
        // A null token is fine — the follow is recorded either way, only push
        // delivery needs the token.
        await followClub(clubId, await getExpoPushToken());
        setFollowing(true);
      }
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setBusy(false);
    }
  }

  async function post() {
    if (!clubId) return;
    setBusy(true);
    setError(null);
    try {
      await createAnnouncement(clubId, title, body);
      setTitle('');
      setBody('');
      setAnnouncements(await fetchAnnouncements(clubId));
    } catch (err) {
      setError(describeDbError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Club not found.'}</Text>
      </View>
    );
  }

  const meeting = [club.meeting_day, club.meeting_time].filter(Boolean).join(' at ');
  const canPost = title.trim().length > 2 && body.trim().length > 2 && !busy;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>{club.category}</Text>
      <Text style={styles.title}>{club.name}</Text>
      <Text style={styles.desc}>{club.description}</Text>

      <Pressable
        style={[styles.follow, following && styles.followingBtn, busy && styles.disabled]}
        onPress={toggleFollow}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={following ? colors.text : colors.bg} />
        ) : (
          <Text style={[styles.followText, following && styles.followingText]}>
            {following ? 'Following — tap to unfollow' : 'Follow club notifications'}
          </Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Section
        title="Meeting"
        body={[meeting, club.location].filter(Boolean).join('\n') || 'To be announced'}
      />
      <Section title="Advisor" body={club.advisor || 'To be announced'} />
      <Section title="Contact" body={club.contact_email || club.president_email || 'Not provided'} />

      {canManage ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post an announcement</Text>
          <Text style={styles.hint}>Followers of this club will see it here.</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What do members need to know?"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, styles.multiline]}
          />
          <Pressable
            style={[styles.postBtn, !canPost && styles.disabled]}
            onPress={post}
            disabled={!canPost}
          >
            <Text style={styles.postText}>Post announcement</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        {announcements.length === 0 ? (
          <Text style={styles.body}>No announcements yet.</Text>
        ) : (
          announcements.map((item) => (
            <View key={item.id} style={styles.post}>
              <Text style={styles.postTitle}>{item.title}</Text>
              {item.created_at ? (
                <Text style={styles.postDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              ) : null}
              <Text style={styles.body}>{item.body}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: { padding: 20 },
  kicker: { color: colors.primary, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 8 },
  desc: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12 },
  follow: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    marginVertical: 20,
  },
  followingBtn: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.primary },
  disabled: { opacity: 0.6 },
  followText: { color: colors.bg, fontWeight: '900' },
  followingText: { color: colors.text },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { color: colors.secondary, fontWeight: '900', fontSize: 16, marginBottom: 8 },
  hint: { color: colors.muted, marginBottom: 10 },
  body: { color: colors.text, lineHeight: 22 },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    padding: 12,
    marginBottom: 10,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  postBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: 13,
    alignItems: 'center',
  },
  postText: { color: colors.bg, fontWeight: '900' },
  post: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  postTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  postDate: { color: colors.muted, fontSize: 12, marginBottom: 6, marginTop: 2 },
  error: { color: colors.danger, fontWeight: '700', marginBottom: 12 },
});
