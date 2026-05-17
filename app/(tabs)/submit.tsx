import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, ClubCategory } from '@/types/domain';
import { PressableScale } from '@/components/PressableScale';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/context/ThemeContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const GRADES = ['9', '10', '11', '12'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SectionCard({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-2xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card">
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name={icon} size={18} color="#4CAF50" />
        <Text className="text-base font-extrabold text-light-text dark:text-dark-text">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  error,
  required,
  keyboardType,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  placeholder?: string;
  multiline?: boolean;
}) {
  const { isDark } = useTheme();
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase text-light-muted dark:text-dark-muted">
        {label}
        {required ? <Text className="text-python-green"> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#9AA3AD' : '#5A6470'}
        keyboardType={keyboardType}
        multiline={multiline}
        accessibilityLabel={label}
        className={`rounded-xl border bg-light-bg px-3 text-base text-light-text dark:bg-dark-bg dark:text-dark-text ${
          multiline ? 'h-24 py-3' : 'h-12'
        } ${error ? 'border-python-blue' : 'border-light-border dark:border-dark-border'}`}
      />
      {error ? (
        <Text className="mt-1 text-xs font-semibold text-python-blue">{error}</Text>
      ) : null}
    </View>
  );
}

export default function SubmitScreen() {
  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);

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

  const onSubmit = () => {
    if (validate()) setSubmitted(true);
  };

  if (submitted) {
    return (
      <View className="flex-1 items-center justify-center bg-light-bg px-8 dark:bg-dark-bg">
        <Animated.View
          entering={ZoomIn.duration(400)}
          className="h-24 w-24 items-center justify-center rounded-full bg-python-green"
        >
          <Ionicons name="checkmark" size={52} color="#FFFFFF" />
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          className="mt-6 text-center text-2xl font-extrabold text-light-text dark:text-dark-text"
        >
          Submitted for Approval
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(350).duration(500)}
          className="mt-2 text-center text-base text-light-muted dark:text-dark-muted"
        >
          {name} has been sent to the admin team. You&apos;ll be notified once it&apos;s reviewed.
        </Animated.Text>
        <PressableScale
          onPress={() => {
            setSubmitted(false);
            setName('');
            setCategory('');
            setDescription('');
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
            setGrades([]);
            setErrors({});
          }}
          className="mt-8 h-12 justify-center rounded-2xl bg-python-green px-8"
        >
          <Text className="text-base font-extrabold text-white">Register Another Club</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <View className="flex-row items-center justify-between px-5 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <View>
          <Text className="text-3xl font-extrabold text-light-text dark:text-dark-text">
            Register Your Club
          </Text>
          <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
            Start a club at Tesla STEM Pythons
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-3"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-36"
        keyboardShouldPersistTaps="handled"
      >
        <SectionCard title="Club Info" icon="information-circle-outline">
          <Field label="Club name" value={name} onChangeText={setName} error={errors.name} required placeholder="e.g. Robotics Club" />
          <Text className="mb-1 text-xs font-semibold uppercase text-light-muted dark:text-dark-muted">
            Category<Text className="text-python-green"> *</Text>
          </Text>
          <View className="mb-1 flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <PressableScale
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityState={{ selected: active }}
                  className={`h-9 justify-center rounded-full border px-3 ${
                    active ? 'border-python-green bg-python-green' : 'border-light-border dark:border-dark-border'
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-light-muted dark:text-dark-muted'}`}>
                    {c}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          {errors.category ? <Text className="mb-2 text-xs font-semibold text-python-blue">{errors.category}</Text> : null}
          <View className="mt-2">
            <Field label="Description" value={description} onChangeText={setDescription} error={errors.description} required multiline placeholder="What is the club about?" />
            <Field label="Founding year" value={foundingYear} onChangeText={setFoundingYear} keyboardType="number-pad" placeholder="2026" />
          </View>
        </SectionCard>

        <SectionCard title="Meeting Details" icon="calendar-outline">
          <Text className="mb-1 text-xs font-semibold uppercase text-light-muted dark:text-dark-muted">
            Meeting days<Text className="text-python-green"> *</Text>
          </Text>
          <View className="mb-1 flex-row gap-2">
            {DAYS.map((d) => {
              const active = days.includes(d);
              return (
                <PressableScale
                  key={d}
                  onPress={() => toggle(days, setDays, d)}
                  accessibilityState={{ selected: active }}
                  className={`h-10 flex-1 items-center justify-center rounded-xl border ${
                    active ? 'border-python-green bg-python-green' : 'border-light-border dark:border-dark-border'
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-light-muted dark:text-dark-muted'}`}>
                    {d}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          {errors.days ? <Text className="mb-2 text-xs font-semibold text-python-blue">{errors.days}</Text> : null}
          <View className="mt-2">
            <Field label="Time" value={time} onChangeText={setTime} error={errors.time} required placeholder="e.g. After School" />
            <Field label="Location" value={location} onChangeText={setLocation} error={errors.location} required placeholder="e.g. RM 110" />
          </View>
        </SectionCard>

        <SectionCard title="Leadership" icon="people-outline">
          <Field label="President" value={president} onChangeText={setPresident} error={errors.president} required />
          <Field label="Vice President" value={vp} onChangeText={setVp} />
          <Field label="Secretary" value={secretary} onChangeText={setSecretary} />
          <Field label="Treasurer" value={treasurer} onChangeText={setTreasurer} />
          <Field label="Advisor name" value={advisor} onChangeText={setAdvisor} error={errors.advisor} required />
          <Field label="Advisor email" value={advisorEmail} onChangeText={setAdvisorEmail} error={errors.advisorEmail} required keyboardType="email-address" placeholder="advisor@lwsd.org" />
        </SectionCard>

        <SectionCard title="Contact" icon="mail-outline">
          <Field label="Club email" value={clubEmail} onChangeText={setClubEmail} error={errors.clubEmail} required keyboardType="email-address" placeholder="club@lwsd.org" />
          <Field label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="@teslastem.club" />
          <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://" />
        </SectionCard>

        <SectionCard title="Settings" icon="settings-outline">
          <Field label="Max members" value={maxMembers} onChangeText={setMaxMembers} keyboardType="number-pad" placeholder="No limit" />
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base text-light-text dark:text-dark-text">Open to all grades</Text>
            <Switch
              value={openToAll}
              onValueChange={setOpenToAll}
              trackColor={{ false: '#9AA3AD', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {!openToAll && (
            <View>
              <Text className="mb-1 text-xs font-semibold uppercase text-light-muted dark:text-dark-muted">
                Grades
              </Text>
              <View className="flex-row gap-2">
                {GRADES.map((g) => {
                  const active = grades.includes(g);
                  return (
                    <PressableScale
                      key={g}
                      onPress={() => toggle(grades, setGrades, g)}
                      accessibilityState={{ selected: active }}
                      className={`h-10 flex-1 flex-row items-center justify-center gap-1 rounded-xl border ${
                        active ? 'border-python-green bg-python-green' : 'border-light-border dark:border-dark-border'
                      }`}
                    >
                      {active && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-light-muted dark:text-dark-muted'}`}>
                        {g}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
              {errors.grades ? <Text className="mt-1 text-xs font-semibold text-python-blue">{errors.grades}</Text> : null}
            </View>
          )}
        </SectionCard>

        <PressableScale
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityLabel="Submit club for approval"
          className="mt-2 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-python-green"
        >
          <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
          <Text className="text-base font-extrabold text-white">Submit for Approval</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}
