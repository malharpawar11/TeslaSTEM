import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { AvailabilityGrid, OptionCard } from "@/components/quiz/QuizControls";
import { QuizResults } from "@/components/quiz/QuizResults";
import {
  buildSteps,
  pruneAnswers,
  selectedFor,
  withSelection,
  type Step,
} from "@/components/quiz/steps";
import { QUIZ_MOTION, QUIZ_RADIUS, QUIZ_SPACE, QUIZ_TYPE } from "@/components/quiz/tokens";
import { Display, TextLink, useHover, webFade } from "@/components/system";
import { Button, SkeletonRow } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useClubs } from "@/context/ClubsContext";
import { usePreferences } from "@/context/PreferencesContext";
import {
  availablePeriods,
  EMPTY_ANSWERS,
  hasAnswers,
  lunchMatters,
  type Option,
  type QuizAnswers,
} from "@/lib/clubMatch";
import type { Availability } from "@/lib/discovery";
import { useLayout } from "@/theme/layout";

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <View>
      <Text className="text-light-secondary dark:text-dark-secondary" style={QUIZ_TYPE.metaStrong}>
        Question {index + 1} of {total}
      </Text>
      <View
        className="mt-2 flex-row"
        style={{ gap: 4 }}
        accessibilityRole="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
      >
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className={`h-1.5 flex-1 ${i <= index ? "bg-python-blue" : "bg-light-surface-2 dark:bg-dark-surface-2"}`}
            style={[{ borderRadius: 2 }, webFade("background-color")]}
          />
        ))}
      </View>
    </View>
  );
}

function OptionGrid({
  options,
  selected,
  multi,
  small,
  columns,
  onToggle,
  label,
}: {
  options: Option[];
  selected: string[];
  multi: boolean;
  small: boolean;
  columns: number;
  onToggle: (id: string) => void;
  label: string;
}) {
  return (
    <View
      role={multi ? "group" : "radiogroup"}
      aria-label={label}
      style={{ gap: QUIZ_SPACE.cardGap }}
    >
      {chunk(options, columns).map((row, r) => (
        <View key={r} className="flex-row" style={{ gap: QUIZ_SPACE.cardGap }}>
          {row.map((option) => (
            <View key={option.id} className="flex-1 flex-row">
              <OptionCard
                title={option.title}
                label={small ? undefined : option.label}
                selected={selected.includes(option.id)}
                multi={multi}
                small={small}
                onPress={() => onToggle(option.id)}
              />
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

function SkipQuestion({ onPress, short }: { onPress: () => void; short: boolean }) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel="Skip this question"
      className="min-h-11 justify-center px-2"
    >
      <Text
        className={`underline ${hovered ? "text-light-text dark:text-dark-text" : "text-light-secondary dark:text-dark-secondary"}`}
        style={QUIZ_TYPE.body}
      >
        {short ? "Skip" : "Skip this question"}
      </Text>
    </Pressable>
  );
}

function Quiz() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const { contentWidth } = useLayout();
  const { session } = useAuth();
  const { preferences, loading, error, refresh, save } = usePreferences();
  const { clubs, loading: clubsLoading, error: clubsError, refresh: refreshClubs } = useClubs();

  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [stage, setStage] = useState<"quiz" | "results">("quiz");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error" | "guest">("guest");
  const [leaving, setLeaving] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const hydrated = useRef(false);

  // Start from what the student saved last time, so answers can be edited.
  useEffect(() => {
    if (loading || hydrated.current) return;
    hydrated.current = true;
    setAnswers(preferences.answers ?? EMPTY_ANSWERS);
    setAvailability(preferences.availability);
    if (preferences.completed && hasAnswers(preferences.answers)) {
      setStage("results");
      setSaveState(session ? "saved" : "guest");
    }
  }, [loading, preferences, session]);

  const steps = useMemo(() => buildSteps(answers, clubs), [answers, clubs]);
  const at = Math.min(index, steps.length - 1);
  const step = steps[at];

  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [at, stage]);

  const phone = contentWidth < QUIZ_SPACE.phoneBelow;
  const gutter = phone ? QUIZ_SPACE.gutterPhone : QUIZ_SPACE.gutter;
  const wide = contentWidth >= 900;

  const persist = async (final: QuizAnswers, windows: Availability[]) => {
    if (!session) return setSaveState("guest");
    setSaveState("saving");
    const result = await save({ ...preferences, availability: windows, answers: final, completed: true });
    setSaveState(result.ok ? "saved" : "error");
  };

  const go = (next: number) => {
    setDirection(next > at ? 1 : -1);
    setIndex(next);
  };
  const finish = () => {
    const final = pruneAnswers(answers, steps);
    setAnswers(final);
    setStage("results");
    void persist(final, availability);
  };
  const advance = () => (at >= steps.length - 1 ? finish() : go(at + 1));

  const skipQuiz = async () => {
    if (!session) return router.push("/browse");
    setLeaving(true);
    // Keeps whatever was answered before; it only stops the quiz prompting.
    await save({ ...preferences, completed: true });
    setLeaving(false);
    router.replace("/browse");
  };

  if (loading || (clubsLoading && !clubs.length))
    return (
      <View className="flex-1 bg-light-bg px-8 pt-16 dark:bg-dark-bg">
        <SkeletonRow count={3} />
      </View>
    );

  if ((session && error) || (clubsError && !clubs.length))
    return (
      <View className="flex-1 items-start gap-3 bg-light-bg px-8 pt-16 dark:bg-dark-bg">
        <Display size="sm">Couldn't load the quiz</Display>
        <Text className="text-danger" style={QUIZ_TYPE.body}>
          {error ?? clubsError}
        </Text>
        <Button
          label="Try again"
          onPress={() => void (error ? refresh() : refreshClubs())}
        />
      </View>
    );

  if (stage === "results")
    return (
      <ScrollView
        ref={scroller}
        className="flex-1 bg-light-bg dark:bg-dark-bg"
        contentContainerStyle={{ paddingBottom: insets.bottom + 64 }}
      >
        <View
          className="w-full self-center"
          style={{ maxWidth: QUIZ_SPACE.resultsMax, paddingHorizontal: gutter, paddingTop: insets.top + 32 }}
        >
          <QuizResults
            clubs={clubs}
            answers={answers}
            availability={availability}
            steps={steps}
            phone={phone}
            saveState={saveState}
            signedIn={!!session}
            onRetrySave={() => void persist(answers, availability)}
            onEdit={(i) => {
              setStage("quiz");
              setDirection(1);
              setIndex(i);
            }}
          />
        </View>
      </ScrollView>
    );

  const isOptions = step.key !== "availability";
  const selected = selectedFor(step, answers);
  const multi = "multi" in step && step.multi;
  const columns =
    "size" in step && step.size === "small" ? (wide ? 4 : 2) : wide ? 3 : phone ? 1 : 2;
  const toggle = (id: string) => {
    const next = multi
      ? selected.includes(id)
        ? selected.filter((v) => v !== id)
        : [...selected, id]
      : selected.includes(id)
        ? []
        : [id];
    setAnswers(withSelection(step, answers, next));
  };
  const count = isOptions ? selected.length : availability.filter((w) => w.period).length;
  const last = at === steps.length - 1;
  const entering = still
    ? undefined
    : (direction > 0 ? FadeInRight : FadeInLeft).duration(QUIZ_MOTION.step);

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        ref={scroller}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="w-full self-center"
          style={{ maxWidth: QUIZ_SPACE.questionMax, paddingHorizontal: gutter, paddingTop: insets.top + 28 }}
        >
          <View className="flex-row items-center justify-between gap-4">
            <Display fontSize={24} style={{ lineHeight: 28 }}>
              Club Match Quiz
            </Display>
            <TextLink
              label={leaving ? "Saving…" : session ? "Skip the quiz" : "Browse clubs instead"}
              disabled={leaving}
              onPress={() => void skipQuiz()}
            />
          </View>
          <View className="mt-4">
            <Progress index={at} total={steps.length} />
          </View>

          <Animated.View key={step.key} entering={entering} className="mt-8">
            <Display
              fontSize={phone ? QUIZ_TYPE.questionPhone : QUIZ_TYPE.question}
              accessibilityRole="header"
              style={{ lineHeight: (phone ? QUIZ_TYPE.questionPhone : QUIZ_TYPE.question) + 2 }}
            >
              {step.title}
            </Display>
            <View className="mt-2 flex-row flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <Text
                className="max-w-xl flex-1 text-light-secondary dark:text-dark-secondary"
                style={[QUIZ_TYPE.helper, { minWidth: 220 }]}
              >
                {step.helper}
              </Text>
              {count ? (
                <Text className="text-python-blue" style={QUIZ_TYPE.metaStrong} accessibilityLiveRegion="polite">
                  {count} selected
                </Text>
              ) : null}
            </View>

            <View className="mt-6">
              {isOptions ? (
                <OptionGrid
                  options={(step as Exclude<Step, { key: "availability" }>).options}
                  selected={selected}
                  multi={multi}
                  small={"size" in step && step.size === "small"}
                  columns={columns}
                  onToggle={toggle}
                  label={step.title}
                />
              ) : (
                <AvailabilityGrid
                  windows={availability}
                  periods={availablePeriods(clubs)}
                  onChange={setAvailability}
                  lunch={answers.lunch}
                  onLunch={(lunch) => setAnswers({ ...answers, lunch })}
                  showLunch={lunchMatters(clubs)}
                />
              )}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Back and Continue stay in reach however long the question is. */}
      <View
        className="border-t border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-bg"
        style={{ paddingBottom: Math.max(12, insets.bottom), paddingTop: 12 }}
      >
        <View
          className="w-full flex-row items-center justify-between self-center"
          style={{ maxWidth: QUIZ_SPACE.questionMax, paddingHorizontal: gutter, gap: 12 }}
        >
          <View style={{ minWidth: phone ? 0 : 120 }}>
            {at > 0 ? (
              <Button label="Back" variant="secondary" icon="arrow-back" onPress={() => go(at - 1)} />
            ) : null}
          </View>
          <View className="flex-row items-center" style={{ gap: phone ? 4 : 16 }}>
            <SkipQuestion
              short={phone}
              onPress={() => {
                if (isOptions) setAnswers(withSelection(step, answers, []));
                advance();
              }}
            />
            <Pressable
              onPress={advance}
              accessibilityRole="button"
              accessibilityLabel={last ? "See my matches" : "Continue"}
              className="flex-row items-center justify-center bg-python-blue px-6"
              style={[{ height: QUIZ_SPACE.controlHeight, borderRadius: QUIZ_RADIUS }, webFade("background-color")]}
            >
              <Text className="text-white" style={QUIZ_TYPE.button}>
                {last ? "See my matches" : "Continue"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  return <Quiz />;
}
