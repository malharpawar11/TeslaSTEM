import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemeToggle } from '@/components/ThemeToggle';

const SECTIONS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string[] }[] = [
  {
    icon: 'lock-closed-outline',
    title: 'Privacy Policy',
    body: [
      'Tesla STEM Pythons Club Directory stores only the data needed to run the directory: the clubs you follow and your theme preference, kept locally on your device.',
      'We do not sell, share, or transmit personal information to third parties. No tracking or advertising SDKs are used.',
    ],
  },
  {
    icon: 'document-text-outline',
    title: 'Terms of Use',
    body: [
      'This app is provided for Tesla STEM students and staff to discover and follow school clubs.',
      'Club submissions are reviewed by the admin team before appearing in the directory. Misuse of submission or admin tools may result in access being revoked.',
    ],
  },
  {
    icon: 'trash-outline',
    title: 'Data Deletion',
    body: [
      'Because your follows and preferences are stored only on your device, clearing the app data or uninstalling removes everything.',
      'For directory data corrections, contact the admin team and changes will be reviewed promptly.',
    ],
  },
  {
    icon: 'mail-outline',
    title: 'Contact',
    body: [
      'Questions, corrections, or accessibility feedback can be sent to the Tesla STEM Pythons admin team at clubs@lwsd.org.',
    ],
  },
];

export default function PoliciesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-36"
      >
        <View className="flex-row items-center justify-between pb-2" style={{ paddingTop: insets.top + 8 }}>
          <View>
            <Text className="text-3xl font-extrabold text-light-text dark:text-dark-text">
              Policies
            </Text>
            <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
              How this directory handles your data
            </Text>
          </View>
          <ThemeToggle />
        </View>

        <View className="mt-4 gap-4">
          {SECTIONS.map((s, i) => (
            <Animated.View
              key={s.title}
              entering={FadeInDown.delay(i * 70).duration(420)}
              className="rounded-2xl border border-light-border bg-light-card p-5 dark:border-dark-border dark:bg-dark-card"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-python-blue/15">
                  <Ionicons name={s.icon} size={20} color="#1565C0" />
                </View>
                <Text className="text-lg font-extrabold text-light-text dark:text-dark-text">
                  {s.title}
                </Text>
              </View>
              {s.body.map((p, idx) => (
                <Text
                  key={idx}
                  className="mt-3 text-sm leading-6 text-light-muted dark:text-dark-muted"
                >
                  {p}
                </Text>
              ))}
            </Animated.View>
          ))}
        </View>

        <Text className="mt-6 text-center text-xs text-light-muted dark:text-dark-muted">
          Tesla STEM Pythons · Club Directory v1.0
        </Text>
      </ScrollView>
    </View>
  );
}
