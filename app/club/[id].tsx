import { useState, useCallback, useEffect } from 'react';
import { View, Text, LayoutChangeEvent, Share, Platform, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  Card,
  MetaRow,
  Avatar,
  Button,
  Input,
  PressableScale,
  EmptyState,
} from '@/components/ui';
import { useClubs } from '@/context/ClubsContext';
import { ClubProfileHeader } from '@/components/ClubProfileHeader';
import { useFollows } from '@/context/FollowContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { canManageClub, createAnnouncement } from '@/data/announcementsRepo';
import { clubInitials } from '@/types/domain';
import { brand, palette } from '@/theme/tokens';
import { spring } from '@/theme/motion';

type Tab = 'About' | 'Announcements' | 'Officers';
const TABS: Tab[] = ['About', 'Announcements', 'Officers'];

function formatAnnouncementDate(date: string | null | undefined): string {
  if (!date) return 'No date';
  // Slice to YYYY-MM-DD so ISO timestamps work too, then parse components
  // manually via the new Date(y, m, d) constructor — avoids Hermes/platform
  // inconsistencies with date string formats entirely.
  const parts = date.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 'No date';
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

interface SegmentedTabsProps {
  value: Tab;
  onChange: (t: Tab) => void;
}

function SegmentedTabs({ value, onChange }: SegmentedTabsProps) {
  const [tabWidth, setTabWidth] = useState(0);
  const activeIndex = TABS.indexOf(value);
  const indicatorX = useSharedValue(0);

  const onContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      // Container has p-1 (4px) on each side. Three tabs share width minus the
      // 4px gap (gap-1) between them, plus the padding.
      const innerPad = 4; // p-1
      const gap = 4; // gap-1
      const usable = w - innerPad * 2 - gap * (TABS.length - 1);
      const per = usable / TABS.length;
      setTabWidth(per);
      indicatorX.value = innerPad + activeIndex * (per + gap);
    },
    [activeIndex, indicatorX],
  );

  const select = (t: Tab) => {
    const idx = TABS.indexOf(t);
    const innerPad = 4;
    const gap = 4;
    indicatorX.value = withSpring(innerPad + idx * (tabWidth + gap), spring.pop);
    onChange(t);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      onLayout={onContainerLayout}
      className="relative flex-row gap-1 rounded-full bg-light-surface-2 p-1 dark:bg-dark-surface-2"
    >
      {tabWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            indicatorStyle,
            {
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 0,
              width: tabWidth,
            },
          ]}
          className="rounded-full bg-light-surface shadow-ambient dark:bg-dark-surface"
        />
      ) : null}
      {TABS.map((t) => {
        const active = t === value;
        return (
          <PressableScale
            key={t}
            onPress={() => select(t)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            scaleTo={0.97}
            className="h-9 flex-1 items-center justify-center rounded-full"
          >
            <Text
              className={`text-sm font-semibold ${
                active
                  ? 'text-light-text dark:text-dark-text'
                  : 'text-light-muted dark:text-dark-muted'
              }`}
            >
              {t}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export default function ClubProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFollowing, toggleFollow } = useFollows();
  const { getClub, refresh } = useClubs();
  const { isDark } = useTheme();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('About');

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const club = getClub(String(id));
  const clubId = club?.id;

  // Announcement composer — shown only to users who may manage this club.
  // `canManageClub` calls the same can_admin_club() the RLS policy uses, so
  // the control's visibility matches what the database will actually allow.
  const [canManage, setCanManage] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId || !session) {
      setCanManage(false);
      return;
    }
    let active = true;
    canManageClub(clubId).then((ok) => {
      if (active) setCanManage(ok);
    });
    return () => {
      active = false;
    };
  }, [clubId, session]);

  const submitAnnouncement = useCallback(async () => {
    if (!clubId) return;
    if (!annTitle.trim() || !annBody.trim()) {
      setPostError('Add a title and a message.');
      return;
    }
    setPostError(null);
    setPosting(true);
    const res = await createAnnouncement(clubId, annTitle, annBody);
    setPosting(false);
    if (!res.ok) {
      setPostError(res.error);
      return;
    }
    setAnnTitle('');
    setAnnBody('');
    setComposerOpen(false);
    await refresh();
  }, [clubId, annTitle, annBody, refresh]);

  if (!club) {
    return (
      <View className="flex-1 items-center justify-center bg-light-bg dark:bg-dark-bg">
        <EmptyState
          icon="alert-circle-outline"
          title="Club not found"
          description="This club may have moved or been removed."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const followed = isFollowing(club.id);

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') return;
      await Share.share({
        message: `Check out ${club.name} at Tesla STEM — ${club.description}`,
        title: club.name,
      });
    } catch {
      // noop
    }
  };

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <ClubProfileHeader
          club={club}
          onBack={() => router.back()}
          onShare={handleShare}
          scrollY={scrollY}
        />

        <View className="px-5 pt-5">
          <SegmentedTabs value={tab} onChange={setTab} />
        </View>

        <View className="px-5 pt-5">
          {tab === 'About' && (
            <Animated.View entering={FadeIn.duration(260)}>
              <Text className="text-base leading-7 text-light-secondary dark:text-dark-secondary">
                {club.description}
              </Text>

              {/* Meeting Info group — schedule + identity */}
              <View className="mt-6">
                <Text className="mb-2 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                  Meeting info
                </Text>
                <Card elevation="ambient" className="px-4">
                  <MetaRow
                    icon="calendar-outline"
                    label="Meeting"
                    value={`${club.day} · ${club.time}`}
                    iconTone="brand"
                  />
                  <MetaRow
                    icon="location-outline"
                    label="Location"
                    value={club.location}
                    iconTone="info"
                  />
                  <MetaRow
                    icon="person-outline"
                    label="Advisor"
                    value={club.advisor}
                    iconTone="brand"
                  />
                  <MetaRow
                    icon="people-outline"
                    label="Members"
                    value={`${club.memberCount} active members`}
                    iconTone="info"
                    divider={false}
                  />
                </Card>
              </View>

              {/* Connect group — contact + founding */}
              <View className="mt-4">
                <Text className="mb-2 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                  Connect
                </Text>
                <Card elevation="ambient" className="px-4">
                  <MetaRow
                    icon="mail-outline"
                    label="Contact"
                    value={club.contactEmail}
                    iconTone="info"
                    onPress={() => Linking.openURL(`mailto:${club.contactEmail}`)}
                  />
                  <MetaRow
                    icon="logo-instagram"
                    label="Instagram"
                    value={club.instagram}
                    iconTone="info"
                    onPress={() => {
                      const handle = club.instagram.startsWith('@')
                        ? club.instagram.slice(1)
                        : club.instagram;
                      Linking.openURL(`https://instagram.com/${handle}`);
                    }}
                  />
                  <MetaRow
                    icon="flag-outline"
                    label="Founded"
                    value={String(club.foundingYear)}
                    iconTone="brand"
                    divider={false}
                  />
                </Card>
              </View>
            </Animated.View>
          )}

          {tab === 'Announcements' && (
            <Animated.View entering={FadeIn.duration(260)}>
              {/* Permission-gated composer — only club managers see this.
                  The DB re-checks the same permission when the row inserts. */}
              {canManage ? (
                <View className="mb-4">
                  {composerOpen ? (
                    <Card elevation="ambient" className="p-4">
                      <Text className="mb-3 text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
                        New announcement
                      </Text>
                      <View className="gap-3">
                        <Input
                          label="Title"
                          value={annTitle}
                          onChangeText={setAnnTitle}
                          placeholder="What's happening?"
                          returnKeyType="next"
                        />
                        <Input
                          label="Message"
                          value={annBody}
                          onChangeText={setAnnBody}
                          multiline
                          placeholder="Share the details with members…"
                        />
                        {postError ? (
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons name="alert-circle" size={13} color="#E11D48" />
                            <Text className="text-xs font-semibold text-danger">
                              {postError}
                            </Text>
                          </View>
                        ) : null}
                        <View className="flex-row gap-2.5">
                          <View className="flex-1">
                            <Button
                              label="Cancel"
                              variant="secondary"
                              size="md"
                              fullWidth
                              onPress={() => {
                                setComposerOpen(false);
                                setPostError(null);
                              }}
                            />
                          </View>
                          <View className="flex-1">
                            <Button
                              label="Post"
                              variant="primary"
                              size="md"
                              fullWidth
                              icon="megaphone"
                              loading={posting}
                              onPress={submitAnnouncement}
                            />
                          </View>
                        </View>
                      </View>
                    </Card>
                  ) : (
                    <Button
                      label="Post an announcement"
                      variant="outline"
                      size="lg"
                      fullWidth
                      icon="megaphone-outline"
                      onPress={() => setComposerOpen(true)}
                    />
                  )}
                </View>
              ) : null}

              {club.announcements.length === 0 ? (
                <EmptyState
                  icon="megaphone-outline"
                  title="No announcements yet"
                  description="When this club shares updates, they'll appear here."
                  tone="neutral"
                />
              ) : (
                <View className="relative pl-7">
                  {/* Continuous timeline rail */}
                  <View
                    pointerEvents="none"
                    className="absolute left-1.5 top-2 bottom-2 w-px bg-light-border dark:bg-dark-border"
                  />
                  {club.announcements.map((a, i) => (
                    <Animated.View
                      key={a.id}
                      entering={FadeInDown.duration(380).delay(i * 70)}
                      className={i === club.announcements.length - 1 ? '' : 'mb-3'}
                    >
                      {/* Timeline dot */}
                      <View
                        pointerEvents="none"
                        className="absolute -left-7 top-4 h-3 w-3 rounded-full border-2 border-light-bg bg-python-green dark:border-dark-bg"
                      />
                      <Card elevation="ambient" className="p-4">
                        <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
                          {formatAnnouncementDate(a.date)}
                        </Text>
                        <Text className="mt-1 text-base font-bold tracking-tight text-light-text dark:text-dark-text">
                          {a.title}
                        </Text>
                        <Text className="mt-1.5 text-sm leading-6 text-light-secondary dark:text-dark-secondary">
                          {a.body}
                        </Text>
                      </Card>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {tab === 'Officers' && (
            <Animated.View entering={FadeIn.duration(260)}>
              {club.officers.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="No officers listed"
                  description="Officer information will appear here once added."
                  tone="neutral"
                />
              ) : (
                <View className="gap-3">
                  {club.officers.map((o, i) => (
                    <Animated.View
                      key={o.role}
                      entering={FadeInDown.duration(380).delay(i * 60)}
                    >
                      <Card elevation="ambient" className="flex-row items-center gap-4 p-4">
                        <Avatar
                          size="md"
                          tone={i % 2 === 0 ? 'brand' : 'info'}
                          initials={avatarInitials(o.name)}
                        />
                        <View className="flex-1">
                          <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                            {o.role}
                          </Text>
                          <Text className="mt-0.5 text-base font-bold tracking-tight text-light-text dark:text-dark-text">
                            {o.name}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={isDark ? '#8A8F99' : '#9CA3AF'}
                        />
                      </Card>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Sticky CTA bar with blur background */}
      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0"
      >
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(30,33,40,0.7)' : 'rgba(238,240,243,0.9)',
          }}
        >
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Button
                size="xl"
                fullWidth
                variant={followed ? 'outline' : 'primary'}
                icon={followed ? 'checkmark-circle' : 'notifications-outline'}
                label={followed ? "You're Following" : 'Follow Club'}
                onPress={() => toggleFollow(club.id)}
                accessibilityLabel={followed ? 'Unfollow club' : 'Follow club'}
              />
            </View>
            <PressableScale
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share club"
              scaleTo={0.94}
              className="h-14 w-14 items-center justify-center rounded-2xl border border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2"
            >
              <Ionicons
                name="share-outline"
                size={22}
                color={isDark ? palette.white : brand.greenDeep}
              />
            </PressableScale>
          </View>
        </BlurView>
      </View>
    </View>
  );
}
