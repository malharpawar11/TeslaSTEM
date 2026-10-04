import { PageIntro } from "@/components/CampusVisual";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Chip, Input, SkeletonRow } from "@/components/ui";
import { SignInGate } from "@/components/SignInGate";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import {
  CAREERS,
  DAYS,
  MEETING_PERIODS,
  minutes,
  recommendationReasons,
  type StudentPreferences,
} from "@/lib/discovery";
import { CATEGORIES } from "@/types/domain";
import { useClubs } from "@/context/ClubsContext";

function Survey() {
  const router = useRouter(),
    insets = useSafeAreaInsets();
  const { preferences, loading, error, refresh, save } = usePreferences();
  const { clubs } = useClubs();
  const { toast } = useToast();
  const [form, setForm] = useState<StudentPreferences>(preferences);
  const [day, setDay] = useState("Monday");
  const [period, setPeriod] = useState<string>("Custom time");
  const [start, setStart] = useState("15:00"),
    [end, setEnd] = useState("16:00");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setForm(preferences);
  }, [preferences]);
  const commit = async (skip = false) => {
    setBusy(true);
    const result = await save({
      ...(skip ? { interests: [], careers: [], availability: [] } : form),
      completed: true,
    });
    setBusy(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    router.replace("/browse");
  };
  const addWindow = () => {
    const a = minutes(start),
      b = minutes(end);
    if (
      period === "Custom time" &&
      (!/^\d{2}:\d{2}$/.test(start) ||
        !/^\d{2}:\d{2}$/.test(end) ||
        a === null ||
        b === null ||
        b <= a)
    ) {
      toast(
        "Use 24-hour times with an end after the start, for example 15:00 to 16:00.",
        "error",
      );
      return;
    }
    if (form.availability.length >= 28) {
      toast("You can add up to 28 availability windows.", "info");
      return;
    }
    setForm({
      ...form,
      availability: [
        ...form.availability,
        period === "Custom time"
          ? { day, start, end }
          : { day, start: "", end: "", period },
      ],
    });
  };
  const recommended = clubs
    .map((club) => ({ club, reasons: recommendationReasons(club, form) }))
    .filter((item) => item.reasons.length)
    .sort((a, b) => b.reasons.length - a.reasons.length)
    .slice(0, 5);
  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{
        padding: 20,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <View className="gap-4">
        <PageIntro
          eyebrow="YOUR PERSONAL CLUB GUIDE"
          title="Follow your curiosity."
          description="Choose your interests, future goals, and free time. We will help you find your fit. Edit anytime; schedules use Pacific time."
        />
        {loading ? (
          <SkeletonRow count={3} />
        ) : error ? (
          <>
            <Text className="text-danger">{error}</Text>
            <Button label="Retry" onPress={() => void refresh()} />
            <Button
              label="Back"
              variant="ghost"
              onPress={() => router.back()}
            />
          </>
        ) : (
          <>
            <Text className="font-semibold text-light-text dark:text-dark-text">
              01 / What interests you?
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  active={form.interests.includes(category)}
                  onPress={() =>
                    setForm({
                      ...form,
                      interests: form.interests.includes(category)
                        ? form.interests.filter((v) => v !== category)
                        : [...form.interests, category],
                    })
                  }
                />
              ))}
            </View>
            <Text className="font-semibold text-light-text dark:text-dark-text">
              Career goals
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {Object.keys(CAREERS).map((career) => (
                <Chip
                  key={career}
                  label={career}
                  active={form.careers.includes(career)}
                  onPress={() =>
                    setForm({
                      ...form,
                      careers: form.careers.includes(career)
                        ? form.careers.filter((v) => v !== career)
                        : [...form.careers, career],
                    })
                  }
                />
              ))}
            </View>
            <Text className="font-semibold text-light-text dark:text-dark-text">
              03 / Make space in your week
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DAYS.map((d) => (
                <Chip
                  key={d}
                  label={d.slice(0, 3)}
                  active={day === d}
                  onPress={() => setDay(d)}
                />
              ))}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {["Custom time", ...MEETING_PERIODS].map((option) => (
                <Chip
                  key={option}
                  label={option}
                  active={period === option}
                  onPress={() => setPeriod(option)}
                />
              ))}
            </View>
            {period === "Custom time" ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="From (24-hour)"
                    value={start}
                    onChangeText={setStart}
                    placeholder="15:00"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Until (24-hour)"
                    value={end}
                    onChangeText={setEnd}
                    placeholder="16:00"
                  />
                </View>
              </View>
            ) : (
              <Text className="text-sm text-light-muted dark:text-dark-muted">
                Matches clubs listed in this school period. Exact clock-time
                matching requires the club to publish its start and end times.
              </Text>
            )}
            <Button
              label="Add availability"
              variant="secondary"
              onPress={addWindow}
            />
            {form.availability.map((window, i) => (
              <View
                key={`${window.day}-${i}`}
                className="flex-row items-center justify-between"
              >
                <Text className="text-light-text dark:text-dark-text">
                  {window.day} ·{" "}
                  {window.period ?? `${window.start}–${window.end}`}
                </Text>
                <Button
                  label="Remove"
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    setForm({
                      ...form,
                      availability: form.availability.filter(
                        (_, index) => index !== i,
                      ),
                    })
                  }
                />
              </View>
            ))}
            <Text className="font-semibold text-light-text dark:text-dark-text">
              Your recommendations
            </Text>
            {!recommended.length ? (
              <Text className="text-light-muted dark:text-dark-muted">
                Choose an interest or career to see matching clubs.
              </Text>
            ) : (
              recommended.map(({ club, reasons }) => (
                <Card key={club.id} className="p-4">
                  <Text className="font-semibold text-light-text dark:text-dark-text">
                    {club.name}
                  </Text>
                  <Text className="mt-1 text-sm text-light-muted dark:text-dark-muted">
                    {reasons.join(" · ")}
                  </Text>
                </Card>
              ))
            )}
            <Button
              label="Save and discover clubs"
              loading={busy}
              onPress={() => void commit()}
            />
            <Button
              label="Skip for now"
              variant="ghost"
              disabled={busy}
              onPress={() => void commit(true)}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}
export default function OnboardingScreen() {
  return (
    <SignInGate>
      <Survey />
    </SignInGate>
  );
}
