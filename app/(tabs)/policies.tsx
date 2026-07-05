import { useRef } from 'react';
import { View, Text, ScrollView, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Card, PressableScale, Chip, Divider } from '@/components/ui';
import { brand } from '@/theme/tokens';
import { ThemeToggle } from '@/components/ThemeToggle';

type Section = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  eyebrow: string;
  tone: 'green' | 'blue';
  body: string[];
};

const SECTIONS: Section[] = [
  {
    icon: 'school-outline',
    title: 'Who Can Use This App',
    eyebrow: 'ACCESS',
    tone: 'green',
    body: [
      'Access is limited to Lake Washington School District accounts. You sign in with a one-time code sent to your @lwsd.org school email — no password required.',
      'Non-LWSD accounts are blocked at sign-in. Every subsequent request is verified server-side, so there is no way to bypass this restriction from the app.',
    ],
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Roles & Permissions',
    eyebrow: 'ROLES',
    tone: 'blue',
    body: [
      'The app has four roles. Each one is assigned by the system, never chosen by the user, and enforced by the server on every request.',
      'The Special Admin is a single school-wide administrator who approves clubs, verifies presidents, and assigns club admins. This role is granted by the system only and cannot be self-assigned.',
      'A Verified President is a student who has been approved by the special admin to run a club. They can update their club page and post announcements for it.',
      'A Club Admin is assigned by the special admin to help manage announcements for one specific club.',
      'Any signed-in LWSD user is a Student. Students can browse the full directory and follow any clubs they choose.',
    ],
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Club Approval Workflow',
    eyebrow: 'CLUB APPROVAL',
    tone: 'green',
    body: [
      'Any signed-in student can submit a new club. Submitted clubs are not visible to other users until reviewed by the special admin.',
      'Clubs move through one of three states: pending (under review), approved (live in the directory), or rejected (returned with a reason). When a club is approved, its submitter is automatically verified as president.',
      'The admin may request changes before approving, or reject a submission that does not meet school guidelines.',
    ],
  },
  {
    icon: 'person-circle-outline',
    title: 'President Verification',
    eyebrow: 'VERIFICATION',
    tone: 'blue',
    body: [
      'A club only goes live once its president has been verified by the special admin. Verification happens automatically when the admin approves a club submission.',
      'Students can also request verification separately — for example, if leadership changes after a club is already listed. Verification requests are reviewed manually.',
    ],
  },
  {
    icon: 'megaphone-outline',
    title: 'Announcements',
    eyebrow: 'ANNOUNCEMENTS',
    tone: 'green',
    body: [
      'Only three roles may post announcements: the special admin (any club), a verified president (their own club only), and an approved club admin (their assigned club only).',
      'These restrictions are enforced by the server on every post — the UI will hide controls you cannot use, but access is ultimately decided by the database, not the client.',
    ],
  },
  {
    icon: 'lock-closed-outline',
    title: 'Privacy & Security',
    eyebrow: 'PRIVACY · SECURITY',
    tone: 'blue',
    body: [
      'The app stores the minimum data needed to run the directory: your school email (for authentication), the clubs you follow, and your theme preference. Follows and preferences are kept locally on your device.',
      'We do not sell, share, or transmit personal information to third parties. No tracking or advertising SDKs are used.',
      'Security is enforced in the database using Row-Level Security (RLS). Your role and any approval checks are evaluated by the server on every request — the client is never trusted to decide what you can access.',
    ],
  },
  {
    icon: 'document-text-outline',
    title: 'Terms of Use',
    eyebrow: 'TERMS OF USE',
    tone: 'green',
    body: [
      'This app is provided for Tesla STEM High School students and staff to discover and follow school clubs.',
      'Misuse of club submission, admin, or announcement tools — including submitting false information or attempting to circumvent role restrictions — may result in access being revoked.',
    ],
  },
  {
    icon: 'mail-outline',
    title: 'Contact',
    eyebrow: 'CONTACT',
    tone: 'blue',
    body: [
      'Questions, corrections, or accessibility feedback can be sent to the Tesla STEM Pythons admin team at clubs@lwsd.org.',
    ],
  },
];

const TOC_LABELS = ['Access', 'Roles', 'Club Approval', 'Verification', 'Announcements', 'Privacy', 'Terms', 'Contact'];

export default function PoliciesScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionYs = useRef<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);

  const jumpTo = (i: number) => {
    const y = sectionYs.current[i] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
  };

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-40"
      >
        {/* Header */}
        <View
          className="flex-row items-start justify-between pb-2"
          style={{ paddingTop: insets.top + 8 }}
        >
          <View className="flex-1 pr-3">
            <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
              LEGAL · 2026
            </Text>
            <Text className="mt-3 text-4xl font-extrabold tracking-tighter text-light-text dark:text-dark-text">
              {'Trust &\nPrivacy'}
            </Text>
          </View>
          <ThemeToggle />
        </View>

        <Text className="mt-5 text-base leading-7 text-light-secondary dark:text-dark-secondary">
          Tesla STEM Pythons Club Directory is built on a role-based, approval-driven system so the
          right people manage the right clubs while everyone else can browse safely. The details
          below are plain and current as of May 20, 2026.
        </Text>

        <Text className="mt-5 text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
          Last updated · May 20, 2026
        </Text>

        {/* Table of Contents */}
        <View className="mt-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 pr-5"
          >
            {TOC_LABELS.map((label, i) => (
              <Chip
                key={label}
                label={label}
                variant="filter"
                tone={SECTIONS[i].tone === 'blue' ? 'info' : 'brand'}
                size="sm"
                onPress={() => jumpTo(i)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Sections */}
        <View className="mt-10">
          {SECTIONS.map((s, i) => {
            const isBlue = s.tone === 'blue';
            const iconColor = isBlue ? brand.blue : brand.green;
            const iconBg = isBlue ? 'bg-python-blue/14' : 'bg-python-green/14';
            const eyebrowColor = isBlue
              ? 'text-python-blue-dark dark:text-python-blue-light'
              : 'text-python-green-dark dark:text-python-green-light';

            return (
              <Animated.View
                key={s.title}
                entering={FadeInDown.delay(i * 80).duration(420)}
                onLayout={(e) => {
                  sectionYs.current[i] = e.nativeEvent.layout.y;
                }}
                className={i === 0 ? '' : 'mt-12'}
              >
                <Divider variant="soft" />

                {/* Icon chip */}
                <View
                  className={`mt-6 h-10 w-10 items-center justify-center rounded-2xl ${iconBg}`}
                >
                  <Ionicons name={s.icon} size={20} color={iconColor} />
                </View>

                {/* Eyebrow with index + dot */}
                <View className="mt-4 flex-row items-center gap-2">
                  <Text
                    className={`text-2xs font-bold uppercase tracking-widest ${eyebrowColor}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                  <View
                    className={`h-1 w-1 rounded-full ${isBlue ? 'bg-python-blue' : 'bg-python-green'}`}
                  />
                  <Text
                    className={`text-2xs font-bold uppercase tracking-widest ${eyebrowColor}`}
                  >
                    {s.eyebrow}
                  </Text>
                </View>

                {/* Heading */}
                <Text className="mt-2 text-2xl font-extrabold tracking-tight text-light-text dark:text-dark-text">
                  {s.title}
                </Text>

                {/* Lede paragraph */}
                <Text className="mt-4 text-base font-semibold leading-7 text-light-text dark:text-dark-text">
                  {s.body[0]}
                </Text>

                {/* Remaining paragraphs */}
                {s.body.slice(1).map((p, idx) => (
                  <Text
                    key={idx}
                    className="mt-4 text-base leading-7 text-light-secondary dark:text-dark-secondary"
                  >
                    {p}
                  </Text>
                ))}

                {/* Contact-only email pill */}
                {s.title === 'Contact' ? (
                  <View className="mt-5 flex-row">
                    <PressableScale
                      onPress={() => Linking.openURL('mailto:clubs@lwsd.org')}
                      accessibilityRole="link"
                      accessibilityLabel="Email clubs@lwsd.org"
                      scaleTo={0.97}
                      pressedOpacity={0.85}
                      className="flex-row items-center gap-2 self-start rounded-full border border-light-border bg-light-surface px-4 py-2.5 dark:border-dark-border dark:bg-dark-surface"
                    >
                      <Ionicons name="mail" size={16} color={brand.blue} />
                      <Text className="text-base font-semibold text-light-text dark:text-dark-text">
                        clubs@lwsd.org
                      </Text>
                    </PressableScale>
                  </View>
                ) : null}
              </Animated.View>
            );
          })}
        </View>

        {/* End card */}
        <Card elevation="ambient" className="mt-12 p-5">
          <View className="flex-row items-center">
            <Image
              source={require('../../assets/teslastemlogo.png')}
              className="h-10 w-10"
              resizeMode="contain"
            />
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold tracking-tight text-light-text dark:text-dark-text">
                Tesla STEM Pythons
              </Text>
              <Text className="mt-0.5 text-2xs text-light-muted dark:text-dark-muted">
                Club Directory · v1.0 · Built with care
              </Text>
            </View>
          </View>

          {/* Buttons live on their own row so the title column above keeps its
              full width — sharing a row with these pills squeezes it to nothing
              on narrow screens and wraps the text character-by-character. */}
          <View className="mt-4 flex-row gap-2">
            <PressableScale
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="GitHub"
              scaleTo={0.97}
              pressedOpacity={0.85}
              className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-light-border bg-light-surface px-3 dark:border-dark-border dark:bg-dark-surface"
            >
              <Ionicons name="logo-github" size={13} color={brand.green} />
              <Text className="text-xs font-semibold text-light-secondary dark:text-dark-secondary">
                GitHub
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Feedback"
              scaleTo={0.97}
              pressedOpacity={0.85}
              className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-light-border bg-light-surface px-3 dark:border-dark-border dark:bg-dark-surface"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={brand.blue} />
              <Text className="text-xs font-semibold text-light-secondary dark:text-dark-secondary">
                Feedback
              </Text>
            </PressableScale>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
