import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { AvailabilityEditor } from "@/components/quiz/AvailabilityEditor";
import { Choice } from "@/components/quiz/Choice";
import { MatchList } from "@/components/quiz/MatchList";
import {
  QUIZ_MOTION,
  QUIZ_RADIUS,
  QUIZ_SPACE,
  QUIZ_TYPE,
} from "@/components/quiz/tokens";
import { Display, useHover, webFade, webSticky } from "@/components/system";
import { Button, SkeletonRow } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useClubs } from "@/context/ClubsContext";
import { usePreferences } from "@/context/PreferencesContext";
import {
  CAREERS,
  recommendationReasons,
  type StudentPreferences,
} from "@/lib/discovery";
import { useLayout } from "@/theme/layout";
import { CATEGORIES } from "@/types/domain";

function toggled<T>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text
        accessibilityRole="header"
        className="text-light-text dark:text-dark-text"
        style={QUIZ_TYPE.section}
      >
        {title}
      </Text>
      {count ? (
        <Text
          className="text-light-muted dark:text-dark-muted"
          style={QUIZ_TYPE.meta}
        >
          {count} selected
        </Text>
      ) : null}
    </View>
  );
}

function SaveButton({
  saving,
  saved,
  onPress,
}: {
  saving: boolean;
  saved: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const blocked = saving || saved;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel="Save and discover clubs"
      aria-busy={saving}
      aria-disabled={blocked}
      className={`flex-row items-center justify-center gap-2 ${
        saved
          ? "bg-python-green"
          : hovered && !blocked
            ? "bg-python-blue-dark"
            : "bg-python-blue"
      }`}
      style={[
        {
          height: QUIZ_SPACE.controlHeight,
          borderRadius: QUIZ_RADIUS,
          opacity: saving ? 0.75 : 1,
        },
        webFade("background-color, opacity"),
      ]}
    >
      {saved ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
      <Text className="text-white" style={QUIZ_TYPE.button}>
        {saved ? "Saved" : saving ? "Saving" : "Save and discover clubs"}
      </Text>
    </Pressable>
  );
}

function SkipLink({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      {...hoverProps}
      accessibilityRole="button"
      aria-disabled={disabled}
      className="min-h-11 items-center justify-center"
    >
      <Text
        className={`underline ${hovered ? "text-light-text dark:text-dark-text" : "text-light-secondary dark:text-dark-secondary"}`}
        style={[QUIZ_TYPE.body, webFade("color")]}
      >
        Skip for now
      </Text>
    </Pressable>
  );
}

function Survey() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth, height } = useLayout();
  const { session } = useAuth();
  const { preferences, loading, error, refresh, save } = usePreferences();
  const {
    clubs,
    loading: clubsLoading,
    error: clubsError,
    refresh: refreshClubs,
  } = useClubs();
  const [form, setForm] = useState<StudentPreferences>(preferences);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [columnHeight, setColumnHeight] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setForm(preferences);
  }, [preferences]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const commit = async (skip = false) => {
    if (!session) return;
    setBusy(true);
    setSaveError(null);
    const result = await save({
      ...(skip ? { interests: [], careers: [], availability: [] } : form),
      completed: true,
    });
    setBusy(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    if (skip) {
      router.replace("/browse");
      return;
    }
    setSaved(true);
    timer.current = setTimeout(
      () => router.replace("/browse"),
      QUIZ_MOTION.savedPause,
    );
  };

  // The same ranking as before. Only how many are displayed at once changed.
  const matches = useMemo(
    () =>
      clubs
        .map((club) => ({ club, reasons: recommendationReasons(club, form) }))
        .filter((item) => item.reasons.length)
        .sort((a, b) => b.reasons.length - a.reasons.length),
    [clubs, form],
  );

  const phone = contentWidth < QUIZ_SPACE.phoneBelow;
  const twoColumn = contentWidth >= QUIZ_SPACE.twoColumnFrom;
  const gutter = phone ? QUIZ_SPACE.gutterPhone : QUIZ_SPACE.gutter;
  const answered =
    form.interests.length + form.careers.length + form.availability.length > 0;
  const unsaved =
    Boolean(session) &&
    JSON.stringify([form.interests, form.careers, form.availability]) !==
      JSON.stringify([
        preferences.interests,
        preferences.careers,
        preferences.availability,
      ]);

  const heading = clubsLoading
    ? "Finding your matches"
    : !answered
      ? "Your matches"
      : matches.length === 0
        ? "No matches yet"
        : `${matches.length} ${matches.length === 1 ? "club matches" : "clubs match"} so far`;

  const results = (
    <View>
      <View accessibilityLiveRegion="polite">
        <Text
          accessibilityRole="header"
          className="text-light-text dark:text-dark-text"
          style={QUIZ_TYPE.section}
        >
          {heading}
        </Text>
      </View>
      <Text
        className="mt-1 text-light-secondary dark:text-dark-secondary"
        style={QUIZ_TYPE.meta}
      >
        {session
          ? unsaved
            ? "Updates as you choose. Save to keep these answers."
            : "Updates as you choose."
          : "Updates as you choose. Guest answers aren't saved to an account."}
      </Text>
      <View className="mt-2 border-t border-light-text dark:border-dark-text">
        {clubsLoading ? (
          <View className="pt-3">
            <SkeletonRow count={2} />
          </View>
        ) : clubsError ? (
          <View className="items-start gap-2 py-4">
            <Text className="text-danger" style={QUIZ_TYPE.body}>
              Could not load clubs for recommendations.
            </Text>
            <Button
              label="Retry loading clubs"
              variant="secondary"
              onPress={() => void refreshClubs()}
            />
          </View>
        ) : matches.length === 0 ? (
          <Text
            className="py-4 text-light-secondary dark:text-dark-secondary"
            style={QUIZ_TYPE.body}
          >
            {answered
              ? "Nothing fits these choices. Try another interest or add a time you're free."
              : "Choose an interest, a career, or a time you're free, and clubs will appear here with the reason each one fits."}
          </Text>
        ) : (
          <MatchList
            matches={matches}
            preferences={form}
            onOpen={(id) => router.push(`/club/${id}`)}
          />
        )}
      </View>
      {/* Stays in view while the list scrolls, so saving is never a hunt. */}
      <View
        className="mt-3 bg-light-bg py-3 dark:bg-dark-bg"
        style={[
          Platform.OS === "web"
            ? ({ position: "sticky", bottom: 0 } as object)
            : null,
        ]}
      >
        {session ? (
          <>
            <View className="flex-row items-center gap-5">
              <View className="flex-1">
                <SaveButton
                  saving={busy}
                  saved={saved}
                  onPress={() => void commit()}
                />
              </View>
              <SkipLink
                disabled={busy || saved}
                onPress={() => void commit(true)}
              />
            </View>
            {saveError ? (
              <Text
                role="alert"
                className="mt-2 text-danger"
                style={QUIZ_TYPE.meta}
              >
                {saveError}
              </Text>
            ) : null}
          </>
        ) : (
          <Button
            label="Browse all clubs"
            variant="secondary"
            onPress={() => router.push("/browse")}
          />
        )}
      </View>
    </View>
  );

  const interestBasis = phone ? "46%" : "23%";
  const questions = (
    <View style={{ gap: QUIZ_SPACE.section }}>
      <View>
        <SectionHead
          title="What interests you?"
          count={form.interests.length}
        />
        <View
          role="group"
          aria-label="What interests you?"
          className="mt-3 flex-row flex-wrap"
          style={{ gap: QUIZ_SPACE.control }}
        >
          {CATEGORIES.map((category) => (
            <Choice
              key={category}
              label={category}
              selected={form.interests.includes(category)}
              onPress={() =>
                setForm({
                  ...form,
                  interests: toggled(form.interests, category),
                })
              }
              style={{ flexBasis: interestBasis, flexGrow: 1 }}
            />
          ))}
        </View>
      </View>
      <View className="border-t border-light-border pt-8 dark:border-dark-border">
        <SectionHead
          title="What careers interest you?"
          count={form.careers.length}
        />
        <View
          role="group"
          aria-label="What careers interest you?"
          className="mt-3 flex-row flex-wrap"
          style={{ gap: QUIZ_SPACE.control }}
        >
          {Object.keys(CAREERS).map((career) => (
            <Choice
              key={career}
              label={career}
              selected={form.careers.includes(career)}
              onPress={() =>
                setForm({ ...form, careers: toggled(form.careers, career) })
              }
            />
          ))}
        </View>
      </View>
      <View className="border-t border-light-border pt-8 dark:border-dark-border">
        <AvailabilityEditor
          windows={form.availability}
          onChange={(availability) => setForm({ ...form, availability })}
          phone={phone}
        />
      </View>
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <View
        className="w-full self-center"
        style={{
          maxWidth: QUIZ_SPACE.pageMax,
          paddingHorizontal: gutter,
          paddingTop: insets.top + 32,
        }}
      >
        <Display
          fontSize={QUIZ_TYPE.titleDisplay}
          accessibilityRole="header"
          className="text-light-text dark:text-dark-text"
        >
          Club Match Quiz
        </Display>
        <Text
          className="mt-1.5 text-light-secondary dark:text-dark-secondary"
          style={[QUIZ_TYPE.intro, { maxWidth: 620 }]}
        >
          Tell us what you like and when you're free, and see which clubs fit
          and why. You can change your answers anytime.
        </Text>

        {loading ? (
          <View className="mt-8">
            <SkeletonRow count={3} />
          </View>
        ) : session && error ? (
          <View className="mt-8 items-start gap-2">
            <Text className="text-danger" style={QUIZ_TYPE.body}>
              {error}
            </Text>
            <View className="flex-row gap-3">
              <Button label="Retry" onPress={() => void refresh()} />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => router.back()}
              />
            </View>
          </View>
        ) : (
          <View
            className={twoColumn ? "flex-row items-stretch" : ""}
            style={{
              marginTop: QUIZ_SPACE.section,
              gap: twoColumn ? QUIZ_SPACE.columnGap : QUIZ_SPACE.section,
            }}
          >
            <View className={twoColumn ? "flex-1" : ""} style={{ minWidth: 0 }}>
              {questions}
            </View>
            <View
              style={twoColumn ? { width: QUIZ_SPACE.matchColumn } : undefined}
            >
              {!twoColumn ? (
                <View className="mb-8 border-t border-light-border dark:border-dark-border" />
              ) : null}
              <View
                onLayout={(event) =>
                  setColumnHeight(event.nativeEvent.layout.height)
                }
                style={
                  twoColumn && columnHeight > 0 && columnHeight + 48 <= height
                    ? webSticky(24)
                    : undefined
                }
              >
                {results}
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

export default function OnboardingScreen() {
  return <Survey />;
}
