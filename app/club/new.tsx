import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, PressableScale } from '@/components/ui';
import { SignInGate } from '@/components/SignInGate';
import { useClubs } from '@/context/ClubsContext';
import { useToast } from '@/context/ToastContext';
import { submitClub } from '@/data/clubsRepo';
import { CATEGORIES, type ClubCategory } from '@/types/domain';
import { brand } from '@/theme/tokens';

/**
 * New-club submission. The row is created as `pending` and owned by the
 * submitter — both enforced by the insert policy — so nothing here can put a
 * club in the directory without a school admin approving it.
 */
function NewClubForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useClubs();
  const { toast, toastResult } = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClubCategory>('STEM');
  const [description, setDescription] = useState('');
  const [meetingDay, setMeetingDay] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [location, setLocation] = useState('');
  const [advisor, setAdvisor] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'approval'>('open');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (name.trim().length < 3 || description.trim().length < 20) {
      toast('Add a club name and a description of at least 20 characters.', 'error');
      return;
    }
    setBusy(true);
    const res = await submitClub({
      name,
      category,
      description,
      meetingDay,
      meetingTime,
      location,
      advisor,
      contactEmail,
      joinPolicy,
    });
    setBusy(false);
    if (toastResult(res, 'Submitted — the school admin will review it.')) {
      setSubmitted(true);
      await refresh();
    }
  };

  if (submitted) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-python-green/14">
          <Ionicons name="checkmark-circle" size={32} color={brand.green} />
        </View>
        <Text className="mt-4 text-center text-2xl font-extrabold tracking-tight text-light-text dark:text-dark-text">
          Club submitted
        </Text>
        <Text className="mt-2 text-center text-sm leading-6 text-light-muted dark:text-dark-muted">
          A school administrator reviews new clubs before they appear in the directory. You'll be
          notified when it's approved, and you'll become its president.
        </Text>
        <Button
          label="Back to clubs"
          variant="primary"
          size="lg"
          className="mt-6"
          onPress={() => router.replace('/browse')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 60, paddingHorizontal: 20 }}
    >
      <View className="flex-row items-start gap-3" style={{ paddingTop: insets.top + 8 }}>
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          scaleTo={0.9}
          className="mt-1 h-9 w-9 items-center justify-center rounded-full border border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2"
        >
          <Ionicons name="chevron-back" size={18} color={brand.green} />
        </PressableScale>
        <View className="flex-1">
          <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
            New club
          </Text>
          <Text className="mt-1 text-3xl font-extrabold tracking-tighter text-light-text dark:text-dark-text">
            Start a club
          </Text>
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(320)} className="mt-5 gap-3">
        <Input label="Club name" value={name} onChangeText={setName} placeholder="Rocketry Club" />

        <View>
          <Text className="mb-2 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <PressableScale
                key={c}
                onPress={() => setCategory(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: category === c }}
                scaleTo={0.96}
                className={`h-8 items-center justify-center rounded-full px-3 ${
                  category === c
                    ? 'bg-python-green'
                    : 'border border-light-border dark:border-dark-border'
                }`}
              >
                <Text
                  className={`text-2xs font-bold ${
                    category === c ? 'text-white' : 'text-light-secondary dark:text-dark-secondary'
                  }`}
                >
                  {c}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="What the club does, who it's for, and what members can expect…"
        />
        <Input label="Meeting day" value={meetingDay} onChangeText={setMeetingDay} placeholder="Tuesday" />
        <Input
          label="Meeting time"
          value={meetingTime}
          onChangeText={setMeetingTime}
          placeholder="After School"
        />
        <Input label="Location" value={location} onChangeText={setLocation} placeholder="RM 117" />
        <Input
          label="Advisor"
          value={advisor}
          onChangeText={setAdvisor}
          placeholder="Teacher sponsoring the club"
        />
        <Input
          label="Contact email"
          value={contactEmail}
          onChangeText={setContactEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="clubname@lwsd.org"
        />

        <Card elevation="ambient" className="p-4">
          <Text className="text-sm font-bold text-light-text dark:text-dark-text">Who can join</Text>
          <View className="mt-3 flex-row gap-2">
            {(['open', 'approval'] as const).map((policy) => (
              <PressableScale
                key={policy}
                onPress={() => setJoinPolicy(policy)}
                accessibilityRole="button"
                accessibilityState={{ selected: joinPolicy === policy }}
                scaleTo={0.97}
                className={`h-9 flex-1 items-center justify-center rounded-full ${
                  joinPolicy === policy
                    ? 'bg-python-green'
                    : 'border border-light-border dark:border-dark-border'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    joinPolicy === policy
                      ? 'text-white'
                      : 'text-light-secondary dark:text-dark-secondary'
                  }`}
                >
                  {policy === 'open' ? 'Anyone can join' : 'Approve each request'}
                </Text>
              </PressableScale>
            ))}
          </View>
        </Card>

        <Button
          label="Submit for approval"
          variant="primary"
          size="lg"
          icon="paper-plane-outline"
          fullWidth
          loading={busy}
          onPress={() => void submit()}
        />
        <Text className="text-2xs leading-4 text-light-subtle dark:text-dark-subtle">
          A school administrator reviews every new club. Once approved, you become its president and
          get the full management dashboard.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

export default function NewClubScreen() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate
        title="Sign in to submit a club"
        subtitle="Use your Lake Washington School District (@lwsd.org) account."
      >
        <NewClubForm />
      </SignInGate>
    </View>
  );
}
