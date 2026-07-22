import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, Divider } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignInGate } from '@/components/SignInGate';
import { useAuth } from '@/context/AuthContext';
import { requestPresidentVerification } from '@/data/adminRepo';
import { brand } from '@/theme/tokens';

const ROLE_LABEL: Record<string, string> = {
  special_admin: 'Special Admin',
  verified_president: 'Verified President',
  club_admin: 'Club Admin',
  student: 'Student',
};

function AccountDashboard() {
  const insets = useSafeAreaInsets();
  const { profile, signOut, refreshProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  const displayName = profile?.display_name ?? profile?.email ?? 'Student';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  const handleRequestPresident = async () => {
    setRequestError(null);
    setRequesting(true);
    const res = await requestPresidentVerification();
    setRequesting(false);
    if (!res.ok) {
      setRequestError(res.error);
      return;
    }
    setRequested(true);
    await refreshProfile();
  };

  const presidentStatus = profile?.president_status;
  const showPresidentCta = profile?.role === 'student' && (!presidentStatus || presidentStatus === 'rejected');

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-5 pb-36"
    >
      <View
        className="flex-row items-start justify-between pb-1"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-1 pr-3">
          <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
            ACCOUNT
          </Text>
          <Text className="mt-1.5 text-3xl font-extrabold tracking-tighter text-light-text dark:text-dark-text">
            My Account
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <Animated.View entering={FadeInDown.duration(340)}>
        <Card elevation="ambient" className="mt-5 flex-row items-center gap-3 rounded-2xl p-4">
          <Avatar size="lg" tone="brand" initials={initials} />
          <View className="flex-1">
            <Text className="text-base font-bold text-light-text dark:text-dark-text" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted" numberOfLines={1}>
              {profile?.email}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
              <View className="rounded-full bg-python-green/14 px-2 py-0.5">
                <Text className="text-2xs font-bold uppercase tracking-wide text-python-green-dark dark:text-python-green-light">
                  {ROLE_LABEL[profile?.role ?? 'student'] ?? 'Student'}
                </Text>
              </View>
              {presidentStatus === 'pending' ? (
                <View className="rounded-full bg-python-blue/14 px-2 py-0.5">
                  <Text className="text-2xs font-bold uppercase tracking-wide text-python-blue">
                    Verification pending
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>
      </Animated.View>

      {showPresidentCta ? (
        <Animated.View entering={FadeInDown.delay(80).duration(340)}>
          <Card elevation="ambient" className="mt-4 p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="shield-checkmark-outline" size={16} color={brand.green} />
              <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                Run a club?
              </Text>
            </View>
            <Text className="mt-1.5 text-xs leading-5 text-light-muted dark:text-dark-muted">
              Ask the special admin to verify you as a club president so you can submit and manage a
              club.
            </Text>
            {requestError ? (
              <Text className="mt-2 text-xs font-semibold text-danger">{requestError}</Text>
            ) : null}
            <Button
              label={requested ? 'Request sent' : 'Request president verification'}
              variant={requested ? 'tonal' : 'primary'}
              size="sm"
              icon={requested ? 'checkmark' : 'paper-plane-outline'}
              loading={requesting}
              disabled={requesting || requested}
              onPress={handleRequestPresident}
              className="mt-3"
            />
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(140).duration(340)}>
        <Divider variant="hairline" className="my-5" />
        <Button
          label="Sign out"
          variant="outline"
          size="md"
          icon="log-out-outline"
          loading={signingOut}
          onPress={handleSignOut}
          fullWidth
        />
      </Animated.View>
    </ScrollView>
  );
}

export default function AccountScreen() {
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <SignInGate title="Sign in or sign up" subtitle="Access your Tesla STEM Clubs account.">
        <AccountDashboard />
      </SignInGate>
    </View>
  );
}
