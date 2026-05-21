import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, Card, Input, Chip, Tag, Skeleton } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignInGate } from '@/components/SignInGate';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useClubs } from '@/context/ClubsContext';
import { submitClub, fetchMySubmissions, type MySubmission } from '@/data/clubsRepo';
import { requestPresidentVerification } from '@/data/adminRepo';
import { CATEGORIES, ClubCategory } from '@/types/domain';
import { timing } from '@/theme/motion';
import { semantic } from '@/theme/tokens';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const GRADES = ['9', '10', '11', '12'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/*  Inline Section component — Card wrapper + eyebrow + title         */
/* ------------------------------------------------------------------ */
interface SectionProps {
  eyebrow: string;
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}

function Section({ eyebrow, title, description, icon, children }: SectionProps) {
  return (
    <Card elevation="ambient" className="mb-4 p-5">
      <View className="mb-4">
        <View className="mb-2 flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-python-green/14">
            <Ionicons name={icon} size={15} color="#4CAF50" />
          </View>
          <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
            {eyebrow}
          </Text>
        </View>
        <Text className="text-xl font-extrabold tracking-tight text-light-text dark:text-dark-text">
          {title}
        </Text>
        {description ? (
          <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted leading-5">
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tiny inline "Field group label" — used for chip-group sections    */
/* ------------------------------------------------------------------ */
function GroupLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <View className="mb-2 flex-row items-center gap-1">
      <Text className="text-xs font-semibold tracking-wide text-light-secondary dark:text-dark-secondary">
        {label}
      </Text>
      {required ? <Text className="text-xs font-bold text-python-green">*</Text> : null}
    </View>
  );
}

function GroupError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View className="mt-1.5 flex-row items-center gap-1.5">
      <Ionicons name="alert-circle" size={13} color="#E11D48" />
      <Text className="text-xs font-semibold text-danger">{message}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress bar — Reanimated width tied to required-fields-filled    */
/* ------------------------------------------------------------------ */
function ProgressBar({ progress }: { progress: number }) {
  const width = useSharedValue(progress);
  width.value = withTiming(progress, timing.smooth);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View className="mt-3 h-1 w-full overflow-hidden rounded-full bg-light-surface-2 dark:bg-dark-surface-2">
      <Animated.View
        style={fillStyle}
        className="h-full rounded-full bg-python-green"
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  President status strip                                             */
/* ------------------------------------------------------------------ */
interface PresidentStripProps {
  status: 'pending' | 'approved' | 'rejected' | null;
  onRequest: () => void;
  requesting: boolean;
}

function PresidentStrip({ status, onRequest, requesting }: PresidentStripProps) {
  if (status === 'approved') {
    return (
      <Card elevation="flat" className="mb-4 flex-row items-center gap-3 border-python-green/30 bg-python-green/8 p-4">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-python-green/20">
          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-python-green-dark dark:text-python-green-light">
            Verified president
          </Text>
          <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted leading-4">
            Your president status is confirmed by the admin team.
          </Text>
        </View>
      </Card>
    );
  }

  if (status === 'pending') {
    return (
      <Card elevation="flat" className="mb-4 flex-row items-center gap-3 border-warn/30 bg-warn/8 p-4">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-warn/20">
          <Ionicons name="hourglass-outline" size={16} color={semantic.warn} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-warn">
            President verification pending
          </Text>
          <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted leading-4">
            The admin team is reviewing your request. You can still submit clubs.
          </Text>
        </View>
      </Card>
    );
  }

  if (status === 'rejected') {
    return (
      <Card elevation="flat" className="mb-4 gap-3 border-danger/30 bg-danger/8 p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-danger/20">
            <Ionicons name="close-circle-outline" size={18} color={semantic.danger} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-danger">
              President verification rejected
            </Text>
            <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted leading-4">
              You can re-request verification below.
            </Text>
          </View>
        </View>
        <Button
          label="Re-request verification"
          variant="secondary"
          size="sm"
          icon="refresh"
          loading={requesting}
          onPress={onRequest}
        />
      </Card>
    );
  }

  // null — never requested
  return (
    <Card elevation="flat" className="mb-4 gap-2.5 border-light-hairline bg-light-surface-2/60 p-4 dark:border-dark-border dark:bg-dark-surface-2/60">
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-2">
          <Ionicons name="ribbon-outline" size={15} color="#6B7280" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
            Club submission = president registration
          </Text>
          <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted leading-4">
            Submitting a club registers you as its president (pending admin verification). Clubs are not public until a special admin approves them — approval also verifies you as president.
          </Text>
        </View>
      </View>
      <Button
        label="Request president verification"
        variant="secondary"
        size="sm"
        icon="ribbon-outline"
        loading={requesting}
        onPress={onRequest}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  My submissions list                                                */
/* ------------------------------------------------------------------ */
interface SubmissionsListProps {
  submissions: MySubmission[];
  loading: boolean;
  error: string | null;
}

function statusTone(status: MySubmission['status']): 'warn' | 'brand' | 'danger' {
  if (status === 'approved') return 'brand';
  if (status === 'rejected') return 'danger';
  return 'warn';
}

function statusLabel(status: MySubmission['status']): string {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

function SubmissionsList({ submissions, loading, error }: SubmissionsListProps) {
  if (loading) {
    return (
      <Card elevation="flat" className="mb-4 gap-3 p-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Ionicons name="list" size={14} color="#6B7280" />
          <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
            Your submissions
          </Text>
        </View>
        <View className="gap-2.5">
          <Skeleton height={52} radius="xl" />
          <Skeleton height={52} radius="xl" />
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card elevation="flat" className="mb-4 flex-row items-center gap-2.5 border-danger/30 bg-danger/8 p-4">
        <Ionicons name="alert-circle-outline" size={16} color={semantic.danger} />
        <Text className="flex-1 text-xs font-semibold text-danger">{error}</Text>
      </Card>
    );
  }

  if (submissions.length === 0) {
    return null;
  }

  return (
    <Card elevation="flat" className="mb-4 p-4">
      <View className="mb-3 flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-md bg-light-surface-2 dark:bg-dark-surface-2">
          <Ionicons name="list" size={13} color="#6B7280" />
        </View>
        <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
          Your submissions
        </Text>
      </View>
      <View className="gap-2.5">
        {submissions.map((sub) => (
          <View
            key={sub.id}
            className="rounded-2xl border border-light-hairline bg-light-surface-2/60 p-3 dark:border-dark-border dark:bg-dark-surface-2/60"
          >
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text
                  className="text-sm font-bold text-light-text dark:text-dark-text"
                  numberOfLines={1}
                >
                  {sub.name}
                </Text>
                <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted">
                  {sub.category}
                  {sub.createdAt ? ` · ${sub.createdAt.slice(0, 10)}` : ''}
                </Text>
              </View>
              <Tag label={statusLabel(sub.status)} tone={statusTone(sub.status)} />
            </View>
            {sub.status === 'rejected' && sub.rejectionReason ? (
              <View className="mt-2 flex-row items-start gap-1.5 rounded-xl bg-danger/8 p-2">
                <Ionicons name="information-circle-outline" size={13} color={semantic.danger} />
                <Text className="flex-1 text-xs text-danger leading-4">
                  {sub.rejectionReason}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </Card>
  );
}

/* ================================================================== */
/*  Inner form — rendered when the gate passes                        */
/* ================================================================== */
function SubmitForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refresh } = useClubs();
  const { isDark } = useTheme();
  const { profile, configured, refreshProfile } = useAuth();

  /* ---- submission state ---- */
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ---- president verification ---- */
  const [requesting, setRequesting] = useState(false);

  /* ---- my submissions ---- */
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);

  /* ---- form fields ---- */
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClubCategory | ''>('');
  const [description, setDescription] = useState('');
  const [foundingYear, setFoundingYear] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [president, setPresident] = useState('');
  const [vp, setVp] = useState('');
  const [secretary, setSecretary] = useState('');
  const [treasurer, setTreasurer] = useState('');
  const [advisor, setAdvisor] = useState('');
  const [advisorEmail, setAdvisorEmail] = useState('');
  const [clubEmail, setClubEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [openToAll, setOpenToAll] = useState(true);
  const [grades, setGrades] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /* ---- load submissions on mount ---- */
  const loadSubmissions = useCallback(async () => {
    if (!configured) {
      setSubmissions([]);
      return;
    }
    setSubsLoading(true);
    setSubsError(null);
    try {
      const data = await fetchMySubmissions();
      setSubmissions(data);
    } catch {
      setSubsError('Could not load your submissions.');
    } finally {
      setSubsLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  /* ---- request president verification ---- */
  const handleRequestVerification = useCallback(async () => {
    setRequesting(true);
    const res = await requestPresidentVerification();
    setRequesting(false);
    if (res.ok) {
      await refreshProfile();
    }
  }, [refreshProfile]);

  /* ---- progress: 10 required fields ---- */
  const progress = useMemo(() => {
    let filled = 0;
    if (name.trim()) filled++;
    if (category) filled++;
    if (description.trim()) filled++;
    if (days.length >= 1) filled++;
    if (time.trim()) filled++;
    if (location.trim()) filled++;
    if (president.trim()) filled++;
    if (advisor.trim()) filled++;
    if (EMAIL_RE.test(advisorEmail)) filled++;
    if (EMAIL_RE.test(clubEmail)) filled++;
    return filled / 10;
  }, [name, category, description, days, time, location, president, advisor, advisorEmail, clubEmail]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Club name is required.';
    if (!category) e.category = 'Pick a category.';
    if (!description.trim()) e.description = 'Add a short description.';
    if (days.length === 0) e.days = 'Select at least one meeting day.';
    if (!time.trim()) e.time = 'Meeting time is required.';
    if (!location.trim()) e.location = 'Meeting location is required.';
    if (!president.trim()) e.president = 'President name is required.';
    if (!advisor.trim()) e.advisor = 'Advisor name is required.';
    if (!EMAIL_RE.test(advisorEmail)) e.advisorEmail = 'Enter a valid advisor email.';
    if (!EMAIL_RE.test(clubEmail)) e.clubEmail = 'Enter a valid club email.';
    if (!openToAll && grades.length === 0) e.grades = 'Pick at least one grade.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setSubmitError(null);
    setSending(true);
    const res = await submitClub({
      name: name.trim(),
      category: category as ClubCategory,
      description: description.trim(),
      day: days.join(' & '),
      time: time.trim(),
      location: location.trim(),
      advisor: advisor.trim(),
      contactEmail: clubEmail.trim().toLowerCase(),
    });
    setSending(false);
    if (!res.ok) {
      setSubmitError(res.error);
      return;
    }
    if (res.remote) {
      refresh();
      await loadSubmissions();
    }
    setSubmitted(true);
  };

  const resetAll = () => {
    setSubmitted(false);
    setName('');
    setCategory('');
    setDescription('');
    setFoundingYear('');
    setDays([]);
    setTime('');
    setLocation('');
    setPresident('');
    setVp('');
    setSecretary('');
    setTreasurer('');
    setAdvisor('');
    setAdvisorEmail('');
    setClubEmail('');
    setInstagram('');
    setWebsite('');
    setMaxMembers('');
    setOpenToAll(true);
    setGrades([]);
    setErrors({});
    setSubmitError(null);
    loadSubmissions();
  };

  /* ================================================================ */
  /*  Success state                                                    */
  /* ================================================================ */
  if (submitted) {
    return (
      <View
        className="flex-1 items-center justify-center bg-light-bg px-8 dark:bg-dark-bg"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* outer halo ring */}
        <Animated.View
          entering={ZoomIn.duration(360)}
          className="h-24 w-24 items-center justify-center rounded-full bg-python-green/14"
        >
          {/* inner solid ring */}
          <Animated.View
            entering={ZoomIn.delay(150).duration(360).springify()}
            className="h-[72px] w-[72px] items-center justify-center rounded-full bg-python-green"
          >
            <Ionicons name="checkmark" size={40} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(240).duration(420)}
          className="mt-7 text-center text-3xl font-extrabold tracking-tight text-light-text dark:text-dark-text"
        >
          Submitted for Review
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(340).duration(420)}
          className="mt-2 max-w-xs text-center text-base text-light-muted dark:text-dark-muted leading-6"
        >
          {name} has been sent to the admin team. You&apos;ll be notified when it&apos;s reviewed — usually within 48 hours.
        </Animated.Text>

        {/* Confirmation card with mini-stats */}
        <Animated.View entering={FadeInDown.delay(440).duration(420)} className="w-full max-w-sm">
          <Card elevation="ambient" className="mt-6 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 items-center">
                <View className="mb-1.5 h-8 w-8 items-center justify-center rounded-full bg-python-green/14">
                  <Ionicons name="paper-plane" size={15} color="#4CAF50" />
                </View>
                <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                  Submitted
                </Text>
                <View className="mt-1.5 flex-row items-center gap-1">
                  <Ionicons name="checkmark-circle" size={13} color="#4CAF50" />
                  <Text className="text-xs font-semibold text-python-green-dark dark:text-python-green-light">
                    Done
                  </Text>
                </View>
              </View>

              <View className="mx-2 h-10 w-px bg-light-hairline dark:bg-dark-border" />

              <View className="flex-1 items-center">
                <View className="mb-1.5 h-8 w-8 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-2">
                  <Ionicons name="hourglass" size={14} color={isDark ? '#8A8F99' : '#6B7280'} />
                </View>
                <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                  Pending
                </Text>
                <View className="mt-1.5 flex-row items-center gap-1">
                  <View className="h-1.5 w-1.5 rounded-full bg-light-muted dark:bg-dark-muted" />
                  <Text className="text-xs font-semibold text-light-secondary dark:text-dark-secondary">
                    Review
                  </Text>
                </View>
              </View>

              <View className="mx-2 h-10 w-px bg-light-hairline dark:bg-dark-border" />

              <View className="flex-1 items-center">
                <View className="mb-1.5 h-8 w-8 items-center justify-center rounded-full bg-light-surface-2 dark:bg-dark-surface-2">
                  <Ionicons name="notifications" size={14} color={isDark ? '#8A8F99' : '#6B7280'} />
                </View>
                <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
                  Notify
                </Text>
                <View className="mt-1.5 flex-row items-center gap-1">
                  <View className="h-1.5 w-1.5 rounded-full bg-light-muted dark:bg-dark-muted" />
                  <Text className="text-xs font-semibold text-light-secondary dark:text-dark-secondary">
                    On approve
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(540).duration(420)}
          className="mt-7 w-full max-w-sm gap-2.5"
        >
          <Button
            label="Done"
            variant="primary"
            size="lg"
            fullWidth
            icon="checkmark"
            onPress={() => router.replace('/browse')}
          />
          <Button
            label="Register another club"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={resetAll}
          />
        </Animated.View>
      </View>
    );
  }

  /* ================================================================ */
  /*  Form                                                             */
  /* ================================================================ */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 bg-light-bg dark:bg-dark-bg">
        {/* ---------- Header ---------- */}
        <View className="px-5 pb-3" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="mb-1.5 text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
                REGISTRATION · 2026
              </Text>
              <Text className="text-3xl font-extrabold tracking-tighter text-light-text dark:text-dark-text">
                Register Your Club
              </Text>
              <Text className="mt-1.5 text-base text-light-muted dark:text-dark-muted leading-6">
                Tell us about your club. Submissions are reviewed by the Tesla STEM admin team within 48 hours.
              </Text>
            </View>
            <ThemeToggle />
          </View>

          <ProgressBar progress={progress} />
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
              {Math.round(progress * 10)} of 10 required
            </Text>
            <Text className="text-2xs font-bold uppercase tracking-widest text-python-green-dark dark:text-python-green-light">
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-40"
          keyboardShouldPersistTaps="handled"
        >
          {/* ---------- President status strip ---------- */}
          <PresidentStrip
            status={profile?.president_status ?? null}
            onRequest={handleRequestVerification}
            requesting={requesting}
          />

          {/* ---------- My submissions ---------- */}
          <SubmissionsList
            submissions={submissions}
            loading={subsLoading}
            error={subsError}
          />

          {/* ---------- 1. Club Info ---------- */}
          <Section
            eyebrow="01 · CLUB INFO"
            title="The basics"
            description="What your club is called and what it stands for."
            icon="information-circle"
          >
            <View className="gap-4">
              <Input
                label="Club name"
                value={name}
                onChangeText={setName}
                error={errors.name}
                required
                placeholder="e.g. Robotics Club"
                returnKeyType="next"
              />

              <View>
                <GroupLabel label="Category" required />
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      active={category === c}
                      onPress={() => setCategory(c)}
                      size="sm"
                    />
                  ))}
                </View>
                <GroupError message={errors.category} />
              </View>

              <Input
                label="Description"
                value={description}
                onChangeText={setDescription}
                error={errors.description}
                required
                multiline
                placeholder="What is the club about? Who is it for?"
                helper="A short blurb — 1 or 2 sentences is plenty."
              />

              <Input
                label="Founding year"
                value={foundingYear}
                onChangeText={setFoundingYear}
                keyboardType="number-pad"
                placeholder="2026"
                icon="calendar-outline"
              />
            </View>
          </Section>

          {/* ---------- 2. Schedule ---------- */}
          <Section
            eyebrow="02 · SCHEDULE"
            title="When you meet"
            description="Days and time so members know where to find you."
            icon="calendar"
          >
            <View className="gap-4">
              <View>
                <GroupLabel label="Meeting days" required />
                <View className="flex-row flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <Chip
                      key={d}
                      label={d}
                      active={days.includes(d)}
                      onPress={() => toggle(days, setDays, d)}
                      size="sm"
                    />
                  ))}
                </View>
                <GroupError message={errors.days} />
              </View>

              <Input
                label="Time"
                value={time}
                onChangeText={setTime}
                error={errors.time}
                required
                placeholder="e.g. After School, 3:30–4:30 PM"
                icon="time-outline"
              />
              <Input
                label="Location"
                value={location}
                onChangeText={setLocation}
                error={errors.location}
                required
                placeholder="e.g. Room 110"
                icon="location-outline"
              />
            </View>
          </Section>

          {/* ---------- 3. Leadership ---------- */}
          <Section
            eyebrow="03 · LEADERSHIP"
            title="Who runs the club"
            description="Officers and the staff advisor on file."
            icon="people"
          >
            <View className="gap-4">
              <Input
                label="President"
                value={president}
                onChangeText={setPresident}
                error={errors.president}
                required
                placeholder="Full name"
                icon="person-outline"
              />
              <Input
                label="Vice President"
                value={vp}
                onChangeText={setVp}
                placeholder="Full name"
                icon="person-outline"
              />
              <Input
                label="Secretary"
                value={secretary}
                onChangeText={setSecretary}
                placeholder="Full name"
                icon="person-outline"
              />
              <Input
                label="Treasurer"
                value={treasurer}
                onChangeText={setTreasurer}
                placeholder="Full name"
                icon="person-outline"
              />
              <Input
                label="Advisor name"
                value={advisor}
                onChangeText={setAdvisor}
                error={errors.advisor}
                required
                placeholder="Staff member"
                icon="school-outline"
              />
              <Input
                label="Advisor email"
                value={advisorEmail}
                onChangeText={setAdvisorEmail}
                error={errors.advisorEmail}
                required
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="advisor@lwsd.org"
                icon="mail-outline"
              />
            </View>
          </Section>

          {/* ---------- 4. Contact ---------- */}
          <Section
            eyebrow="04 · CONTACT"
            title="How to reach you"
            description="Where students should send questions."
            icon="mail"
          >
            <View className="gap-4">
              <Input
                label="Club email"
                value={clubEmail}
                onChangeText={setClubEmail}
                error={errors.clubEmail}
                required
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="club@lwsd.org"
                icon="mail-outline"
              />
              <Input
                label="Instagram"
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
                placeholder="@teslastem.club"
                icon="logo-instagram"
              />
              <Input
                label="Website"
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                placeholder="https://"
                icon="globe-outline"
              />
            </View>
          </Section>

          {/* ---------- 5. Settings ---------- */}
          <Section
            eyebrow="05 · SETTINGS"
            title="Who can join"
            description="Capacity and eligibility rules for new members."
            icon="settings"
          >
            <View className="gap-4">
              <Input
                label="Max members"
                value={maxMembers}
                onChangeText={setMaxMembers}
                keyboardType="number-pad"
                placeholder="No limit"
                icon="people-outline"
                helper="Leave blank for no cap."
              />

              <View className="rounded-2xl border border-light-hairline bg-light-surface-2/60 p-3.5 dark:border-dark-border dark:bg-dark-surface-2/60">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-light-text dark:text-dark-text">
                      Open to all grades
                    </Text>
                    <Text className="mt-0.5 text-xs text-light-muted dark:text-dark-muted leading-4">
                      Allow students from any grade level to join the club.
                    </Text>
                  </View>
                  <Switch
                    value={openToAll}
                    onValueChange={setOpenToAll}
                    trackColor={{ false: isDark ? '#2A2E36' : '#D1D5DB', true: '#4CAF50' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={isDark ? '#2A2E36' : '#D1D5DB'}
                  />
                </View>

                {!openToAll && (
                  <Animated.View entering={FadeInDown.duration(220)} className="mt-4">
                    <GroupLabel label="Grades allowed" required />
                    <View className="flex-row gap-2">
                      {GRADES.map((g) => (
                        <View key={g} className="flex-1">
                          <Chip
                            label={g}
                            active={grades.includes(g)}
                            onPress={() => toggle(grades, setGrades, g)}
                            size="sm"
                          />
                        </View>
                      ))}
                    </View>
                    <GroupError message={errors.grades} />
                  </Animated.View>
                )}
              </View>
            </View>
          </Section>

          {/* ---------- Submit error banner ---------- */}
          {submitError ? (
            <Animated.View entering={FadeInDown.duration(220)}>
              <Card
                elevation="flat"
                className="mb-3 flex-row items-start gap-2.5 border-danger/40 bg-danger/14 p-4"
              >
                <Ionicons name="alert-circle" size={18} color="#E11D48" />
                <Text className="flex-1 text-sm font-semibold text-danger leading-5">
                  {submitError}
                </Text>
              </Card>
            </Animated.View>
          ) : null}

          {/* ---------- Submit button ---------- */}
          <Button
            label="Submit for Approval"
            variant="primary"
            size="xl"
            fullWidth
            icon="paper-plane"
            loading={sending}
            onPress={onSubmit}
          />

          <Text className="mt-3 text-center text-xs text-light-muted dark:text-dark-muted leading-4">
            Clubs are not public until a special admin approves them. Approval also verifies you as president. By submitting, you confirm the information is accurate and an advisor has agreed to sponsor this club.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ================================================================== */
/*  SubmitScreen — top-level export, wraps inner form in SignInGate   */
/* ================================================================== */
export default function SubmitScreen() {
  return (
    <SignInGate
      title="Sign in to submit a club"
      subtitle="Use your @lwsd.org account to register a club for review."
    >
      <SubmitForm />
    </SignInGate>
  );
}
