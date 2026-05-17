import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getClub } from '@/data/mockData';
import { ClubProfileHeader } from '@/components/ClubProfileHeader';
import { PressableScale } from '@/components/PressableScale';
import { useFollows } from '@/context/FollowContext';

type Tab = 'About' | 'Announcements' | 'Officers';
const TABS: Tab[] = ['About', 'Announcements', 'Officers'];

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-3 border-b border-light-border py-3 dark:border-dark-border">
      <Ionicons name={icon} size={18} color="#4CAF50" />
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase text-light-muted dark:text-dark-muted">
          {label}
        </Text>
        <Text className="mt-0.5 text-base text-light-text dark:text-dark-text">{value}</Text>
      </View>
    </View>
  );
}

export default function ClubProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFollowing, toggleFollow } = useFollows();
  const [tab, setTab] = useState<Tab>('About');

  const club = getClub(String(id));

  if (!club) {
    return (
      <View className="flex-1 items-center justify-center bg-light-bg px-8 dark:bg-dark-bg">
        <Text className="text-lg font-bold text-light-text dark:text-dark-text">
          Club not found
        </Text>
        <PressableScale
          onPress={() => router.back()}
          className="mt-4 h-11 justify-center rounded-full bg-python-green px-6"
        >
          <Text className="font-bold text-white">Go back</Text>
        </PressableScale>
      </View>
    );
  }

  const followed = isFollowing(club.id);

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ClubProfileHeader club={club} onBack={() => router.back()} />

      <View className="flex-row gap-2 px-5 py-4">
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <PressableScale
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`h-10 flex-1 items-center justify-center rounded-xl border ${
                active
                  ? 'border-python-green bg-python-green'
                  : 'border-light-border bg-light-card dark:border-dark-border dark:bg-dark-card'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  active ? 'text-white' : 'text-light-muted dark:text-dark-muted'
                }`}
              >
                {t}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32"
      >
        {tab === 'About' && (
          <Animated.View entering={FadeIn.duration(250)}>
            <Text className="text-base leading-6 text-light-text dark:text-dark-text">
              {club.description}
            </Text>
            <View className="mt-4 rounded-2xl border border-light-border bg-light-card px-4 dark:border-dark-border dark:bg-dark-card">
              <InfoRow icon="calendar-outline" label="Meeting" value={`${club.day} · ${club.time}`} />
              <InfoRow icon="location-outline" label="Location" value={club.location} />
              <InfoRow icon="person-outline" label="Advisor" value={club.advisor} />
              <InfoRow icon="mail-outline" label="Contact" value={club.contactEmail} />
              <InfoRow icon="logo-instagram" label="Instagram" value={club.instagram} />
              <InfoRow icon="flag-outline" label="Founded" value={String(club.foundingYear)} />
            </View>
          </Animated.View>
        )}

        {tab === 'Announcements' && (
          <Animated.View entering={FadeIn.duration(250)} className="gap-3">
            {club.announcements.map((a) => (
              <View
                key={a.id}
                className="rounded-2xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-base font-bold text-light-text dark:text-dark-text">
                    {a.title}
                  </Text>
                  <Text className="text-xs font-semibold text-python-green">{a.date}</Text>
                </View>
                <Text className="mt-2 text-sm leading-5 text-light-muted dark:text-dark-muted">
                  {a.body}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}

        {tab === 'Officers' && (
          <Animated.View entering={FadeIn.duration(250)} className="gap-3">
            {club.officers.map((o) => (
              <View
                key={o.role}
                className="flex-row items-center gap-3 rounded-2xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-python-blue/15">
                  <Ionicons name="person" size={20} color="#1565C0" />
                </View>
                <View>
                  <Text className="text-xs font-semibold uppercase text-light-muted dark:text-dark-muted">
                    {o.role}
                  </Text>
                  <Text className="text-base font-bold text-light-text dark:text-dark-text">
                    {o.name}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-light-border bg-light-bg px-5 pt-3 dark:border-dark-border dark:bg-dark-bg"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <PressableScale
          onPress={() => toggleFollow(club.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: followed }}
          accessibilityLabel={followed ? 'Unfollow club' : 'Follow club'}
          className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl ${
            followed ? 'border-2 border-python-green bg-transparent' : 'bg-python-green'
          }`}
        >
          <Ionicons
            name={followed ? 'checkmark-circle' : 'notifications-outline'}
            size={20}
            color={followed ? '#4CAF50' : '#FFFFFF'}
          />
          <Text
            className={`text-base font-extrabold ${
              followed ? 'text-python-green' : 'text-white'
            }`}
          >
            {followed ? 'Following Club' : 'Follow Club'}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}
