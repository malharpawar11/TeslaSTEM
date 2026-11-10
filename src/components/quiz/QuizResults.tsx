import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { WeekMarks } from "@/components/clubs/ClubEntry";
import { Display, TextLink, useHover } from "@/components/system";
import { Button } from "@/components/ui";
import { beginnerStatement, recommend, WEIGHTS, type Match, type QuizAnswers } from "@/lib/clubMatch";
import { fitsAvailability, type Availability } from "@/lib/discovery";
import type { Club } from "@/types/domain";
import type { Step } from "./steps";
import { answerLine, list, profileSentence } from "./summary";
import { QUIZ_TYPE } from "./tokens";

function ScheduleNote({ match }: { match: Match }) {
  const text =
    match.schedule === "fits"
      ? `Fits your ${match.fitWhen}`
      : match.schedule === "conflict"
        ? "Meets when you marked yourself busy"
        : match.schedule === "unknown"
          ? "Meeting time not listed yet"
          : null;
  if (!text) return null;
  return (
    <Text
      className={
        match.schedule === "fits"
          ? "text-python-green dark:text-python-green-light"
          : match.schedule === "conflict"
            ? "text-warn"
            : "text-light-muted dark:text-dark-muted"
      }
      style={QUIZ_TYPE.metaStrong}
    >
      {text}
    </Text>
  );
}

function MatchEntry({ match, lead }: { match: Match; lead?: boolean }) {
  const router = useRouter();
  const { hovered, hoverProps } = useHover();
  const { club, profile } = match;
  const beginner = beginnerStatement(profile);
  const time = club.time && club.time !== "TBD" ? club.time : null;
  return (
    <View className="border-b border-light-border py-5 dark:border-dark-border">
      <Pressable
        onPress={() => router.push(`/club/${club.id}`)}
        {...hoverProps}
        accessibilityRole="link"
        accessibilityLabel={`Open ${club.name}`}
        className="self-start"
      >
        <Display
          fontSize={lead ? QUIZ_TYPE.matchName + 4 : QUIZ_TYPE.matchName}
          className={`text-light-text dark:text-dark-text ${hovered ? "underline" : ""}`}
          style={{ lineHeight: (lead ? QUIZ_TYPE.matchName + 4 : QUIZ_TYPE.matchName) + 2 }}
        >
          {club.name}
        </Display>
      </Pressable>
      <Text className="mt-0.5 text-light-muted dark:text-dark-muted" style={QUIZ_TYPE.meta}>
        {club.category}
      </Text>

      {match.reasons.length ? (
        <View className="mt-3 border-l-[3px] border-python-blue pl-3" style={{ gap: 4 }}>
          {match.reasons.map((reason) => (
            <Text key={reason} className="text-light-text dark:text-dark-text" style={QUIZ_TYPE.reason}>
              {reason}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="mt-3 flex-row flex-wrap items-center gap-x-5 gap-y-2">
        {club.day && club.day !== "TBD" ? <WeekMarks club={club} /> : null}
        <Text className="text-light-secondary dark:text-dark-secondary" style={QUIZ_TYPE.meta}>
          {[time ?? "Time not listed", profile.room ? `Room ${profile.room}` : club.location && club.location !== "TBD" ? club.location : "Room not listed"].join(", ")}
        </Text>
      </View>
      <View className="mt-2 flex-row flex-wrap gap-x-5 gap-y-1">
        <ScheduleNote match={match} />
        <Text className="text-light-muted dark:text-dark-muted" style={QUIZ_TYPE.meta}>
          {beginner ? `Experience: “${beginner}”` : "Experience needed: not listed"}
        </Text>
      </View>
    </View>
  );
}

function Section({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <View className="mt-12">
      <View className="border-b-2 border-light-text pb-2 dark:border-dark-text">
        <Text accessibilityRole="header" className="text-light-text dark:text-dark-text" style={QUIZ_TYPE.section}>
          {title}
        </Text>
        {detail ? (
          <Text className="mt-0.5 text-light-secondary dark:text-dark-secondary" style={QUIZ_TYPE.meta}>
            {detail}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * The results: best matches with their reasons, more to explore, good fits at
 * busy times, a few clubs outside the student's picks, and their answers.
 */
export function QuizResults({
  clubs,
  answers,
  availability,
  steps,
  phone,
  saveState,
  onRetrySave,
  onEdit,
  signedIn,
}: {
  clubs: Club[];
  answers: QuizAnswers;
  availability: Availability[];
  steps: Step[];
  phone: boolean;
  saveState: "saving" | "saved" | "error" | "guest";
  onRetrySave: () => void;
  onEdit: (stepIndex: number) => void;
  signedIn: boolean;
}) {
  const router = useRouter();
  const results = useMemo(
    () => recommend(clubs, answers, availability, fitsAvailability),
    [clubs, answers, availability],
  );
  const [showAll, setShowAll] = useState(false);
  const sentence = profileSentence(answers, availability);
  const moreShown = showAll ? results.more : results.more.slice(0, 4);

  return (
    <View>
      <Display
        fontSize={phone ? QUIZ_TYPE.resultsPhone : QUIZ_TYPE.results}
        accessibilityRole="header"
        style={{ lineHeight: phone ? QUIZ_TYPE.resultsPhone : QUIZ_TYPE.results }}
      >
        {results.best.length ? "Your club matches" : "No close matches yet"}
      </Display>
      {sentence ? (
        <Text className="mt-2 max-w-2xl text-light-secondary dark:text-dark-secondary" style={QUIZ_TYPE.helper}>
          {sentence}
        </Text>
      ) : null}
      <View className="mt-4 flex-row flex-wrap items-center gap-x-5 gap-y-2">
        <Button label="Change answers" variant="secondary" onPress={() => onEdit(0)} />
        <TextLink label="Browse all clubs" onPress={() => router.push("/browse")} />
        <Text
          className={saveState === "error" ? "text-danger" : "text-light-muted dark:text-dark-muted"}
          style={QUIZ_TYPE.meta}
          accessibilityLiveRegion="polite"
        >
          {saveState === "saving"
            ? "Saving your answers…"
            : saveState === "saved"
              ? "Saved to your account. Change them anytime."
              : saveState === "error"
                ? "Couldn't save your answers."
                : "Sign in to keep these answers."}
        </Text>
        {saveState === "error" ? <TextLink label="Try again" onPress={onRetrySave} /> : null}
        {!signedIn ? <TextLink label="Sign in" onPress={() => router.push("/account")} /> : null}
      </View>

      {results.best.length ? (
        <Section title="Best matches" detail="Ranked by what you enjoy, what you want, and when you're free.">
          {results.best.map((m, i) => (
            <MatchEntry key={m.club.id} match={m} lead={i === 0} />
          ))}
        </Section>
      ) : (
        <Text className="mt-6 max-w-2xl text-light-secondary dark:text-dark-secondary" style={QUIZ_TYPE.helper}>
          Nothing lines up closely with these answers{availability.length ? " at the times you're free" : ""}. Try
          picking a few more activities or topics, or add more free times.
        </Text>
      )}

      {results.more.length ? (
        <Section title="More to explore">
          {moreShown.map((m) => (
            <MatchEntry key={m.club.id} match={m} />
          ))}
          {results.more.length > moreShown.length ? (
            <View className="mt-4 self-start">
              <Button
                label={`Show ${results.more.length - moreShown.length} more`}
                variant="secondary"
                onPress={() => setShowAll(true)}
              />
            </View>
          ) : null}
        </Section>
      ) : null}

      {results.busy.length ? (
        <Section
          title="Good fits, but you're busy then"
          detail="These match your interests and meet only at times you didn't mark free."
        >
          {results.busy.map((m) => (
            <MatchEntry key={m.club.id} match={m} />
          ))}
        </Section>
      ) : null}

      {results.different.length ? (
        <Section title="Something different" detail="Outside what you picked, but they offer what you want from a club.">
          {results.different.map((m) => (
            <MatchEntry key={m.club.id} match={m} />
          ))}
        </Section>
      ) : null}

      <Section title="Your answers">
        {steps.map((step, i) => {
          const line = answerLine(step, answers, availability);
          return (
            <View
              key={step.key}
              className="flex-row items-center justify-between gap-4 border-b border-light-border py-2.5 dark:border-dark-border"
            >
              <View className="flex-1" style={{ minWidth: 0 }}>
                <Text className="text-light-muted dark:text-dark-muted" style={QUIZ_TYPE.meta}>
                  {step.title}
                </Text>
                <Text className="text-light-text dark:text-dark-text" style={QUIZ_TYPE.body}>
                  {line || "Skipped"}
                </Text>
              </View>
              <TextLink label="Edit" accessibilityLabel={`Edit: ${step.title}`} onPress={() => onEdit(i)} />
            </View>
          );
        })}
      </Section>

      <Section title="How matching works">
        <Text className="mt-3 max-w-3xl text-light-secondary dark:text-dark-secondary" style={QUIZ_TYPE.body}>
          Every reason comes from what a club says about itself in its listing. Specific answers count most: a
          follow-up pick is worth {WEIGHTS.followUp} points, a topic {WEIGHTS.topic}, an activity {WEIGHTS.activity}, and
          each question has a cap so no single answer decides everything. Fitting your free time adds{" "}
          {WEIGHTS.scheduleFit}; meeting only when you're busy halves a club's points. Beginners are never ranked lower,
          and how many members a club has is never counted.
        </Text>
        {results.thin.length ? (
          <Text className="mt-3 max-w-3xl text-light-muted dark:text-dark-muted" style={QUIZ_TYPE.meta}>
            Some clubs say very little about what they do, so they may rank lower than they deserve:{" "}
            {list(results.thin.map((c) => c.name))}. Browse them on the Clubs page.
          </Text>
        ) : null}
      </Section>
    </View>
  );
}
