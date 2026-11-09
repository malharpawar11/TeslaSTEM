import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { TextLink, useHover, webFade } from "@/components/system";
import { ClubHeading } from "./ClubHeading";
import { Button, Input, SkeletonRow } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import {
  deleteReview,
  fetchReviews,
  saveReview,
  type ClubReview,
} from "@/data/discoveryRepo";
import { brand, surfaces } from "@/theme/tokens";
import { CLUB } from "./tokens";

const INITIAL_SHOWN = 3;

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const { isDark } = useTheme();
  const empty = isDark
    ? surfaces.dark.borderStrong
    : surfaces.light.borderStrong;
  return (
    <View className="flex-row" style={{ gap: 1 }} accessibilityElementsHidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={
            value >= n
              ? "star"
              : value >= n - 0.5
                ? "star-half"
                : "star-outline"
          }
          size={size}
          color={value >= n - 0.5 ? brand.blue : empty}
        />
      ))}
    </View>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const { isDark } = useTheme();
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value;
  const empty = isDark
    ? surfaces.dark.borderStrong
    : surfaces.light.borderStrong;
  const onKeyDown = (event: {
    nativeEvent: { key: string };
    preventDefault?: () => void;
  }) => {
    const key = event.nativeEvent.key;
    const step =
      key === "ArrowRight" || key === "ArrowUp"
        ? 1
        : key === "ArrowLeft" || key === "ArrowDown"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault?.();
    onChange(Math.min(5, Math.max(1, value + step)));
  };
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Your rating"
      className="flex-row"
      {...(Platform.OS === "web" ? ({ onKeyDown } as object) : null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          onHoverIn={() => setPreview(n)}
          onHoverOut={() => setPreview(null)}
          accessibilityRole="radio"
          aria-checked={value === n}
          accessibilityLabel={`${n} ${n === 1 ? "star" : "stars"}`}
          className="h-10 w-8 items-center justify-center"
        >
          <Ionicons
            name={shown >= n ? "star" : "star-outline"}
            size={20}
            color={shown >= n ? brand.blue : empty}
          />
        </Pressable>
      ))}
    </View>
  );
}

function ReviewEntry({
  review,
  mine,
  onEdit,
}: {
  review: ClubReview;
  mine: boolean;
  onEdit: () => void;
}) {
  const date = new Date(review.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <View className="border-b border-light-hairline py-4 dark:border-dark-hairline">
      <View
        className="flex-row flex-wrap items-center gap-x-3"
        accessible
        accessibilityLabel={`${review.author}, ${review.rating} out of 5`}
      >
        <Stars value={review.rating} />
        <Text className="text-sm font-bold text-light-text dark:text-dark-text">
          {mine ? "Your review" : review.author}
        </Text>
        <Text className="text-sm text-light-muted dark:text-dark-muted">
          {date}
        </Text>
      </View>
      <Text
        className="mt-1.5 text-base leading-6 text-light-secondary dark:text-dark-secondary"
        style={{ maxWidth: CLUB.readingWidth }}
      >
        {review.body}
      </Text>
      {mine ? (
        <View className="items-start">
          <TextLink
            label="Edit"
            accessibilityLabel="Edit your review"
            onPress={onEdit}
          />
        </View>
      ) : null}
    </View>
  );
}

/** The closed composer: tapping a star starts a review with that rating. */
function RatePrompt({ onRate }: { onRate: (rating: number) => void }) {
  const { hovered, hoverProps } = useHover();
  return (
    <View
      className="flex-row flex-wrap items-center gap-x-4 py-2"
      {...hoverProps}
      style={webFade("opacity")}
    >
      <Text
        className={`text-base font-bold ${hovered ? "text-light-text dark:text-dark-text" : "text-light-secondary dark:text-dark-secondary"}`}
      >
        Rate this club
      </Text>
      <StarPicker value={0} onChange={onRate} />
    </View>
  );
}

export function ClubReviews({
  clubId,
  isMember,
}: {
  clubId: string;
  isMember: boolean;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const reduced = useReducedMotion();
  const [reviews, setReviews] = useState<ClubReview[]>([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoaded = useRef(false);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const load = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    try {
      const result = await fetchReviews(clubId);
      if (result.ok) {
        setReviews(result.value);
        setError(null);
        hasLoaded.current = true;
        const own = result.value.find((r) => r.user_id === session?.user.id);
        setRating(own?.rating ?? 5);
        setBody(own?.body ?? "");
      } else setError(result.error);
    } catch {
      setError("Could not load member reviews.");
    } finally {
      setLoading(false);
    }
  }, [clubId, session?.user.id]);

  useEffect(() => {
    void load();
  }, [load, isMember]);

  const own = reviews.find((r) => r.user_id === session?.user.id);
  const others = reviews.filter((r) => r.user_id !== session?.user.id);
  const ordered = own ? [own, ...others] : others;
  const shown = showAll ? ordered : ordered.slice(0, INITIAL_SHOWN);
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const announce = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), CLUB.feedbackMs);
  };

  const submit = async () => {
    if (body.trim().length < 10) {
      toast("Write at least 10 characters about your experience.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await saveReview(clubId, rating, body);
      if (!result.ok) toast(result.error, "error");
      else {
        await load();
        setComposing(false);
        announce("Review saved");
      }
    } catch {
      toast("Could not save your review. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const result = await deleteReview(clubId, session.user.id);
      if (!result.ok) toast(result.error, "error");
      else {
        await load();
        setComposing(false);
        announce("Review removed");
      }
    } catch {
      toast("Could not remove your review.", "error");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setRating(own?.rating ?? 5);
    setBody(own?.body ?? "");
    setComposing(false);
  };

  return (
    <View
      className="border-t border-light-border pt-6 dark:border-dark-border"
      style={{ marginTop: CLUB.section }}
    >
      <View className="flex-row flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <ClubHeading fontSize={20} accessibilityRole="header">
          What members say
        </ClubHeading>
        {!loading && !error && reviews.length ? (
          <View
            className="flex-row items-center gap-2"
            accessible
            accessibilityLabel={`Average ${average.toFixed(1)} out of 5 from ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`}
          >
            <ClubHeading
              fontSize={18}
              className="text-light-text dark:text-dark-text"
            >
              {average.toFixed(1)}
            </ClubHeading>
            <Stars value={Math.round(average * 2) / 2} />
            <Text className="text-sm text-light-muted dark:text-dark-muted">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-2">
        {loading ? (
          <SkeletonRow count={2} />
        ) : error ? (
          <View className="items-start gap-2 py-2">
            <Text className="text-danger">{error}</Text>
            <Button
              label="Retry reviews"
              variant="secondary"
              onPress={() => void load()}
            />
          </View>
        ) : (
          <>
            {reviews.length === 0 ? (
              <Text className="py-2 text-base text-light-muted dark:text-dark-muted">
                {isMember
                  ? "No reviews yet. Yours can be the first."
                  : "No reviews yet. Share your experience after joining."}
              </Text>
            ) : (
              shown.map((review) => (
                <ReviewEntry
                  key={review.user_id}
                  review={review}
                  mine={review.user_id === session?.user.id}
                  onEdit={() => setComposing(true)}
                />
              ))
            )}
            {ordered.length > INITIAL_SHOWN ? (
              <View className="items-start">
                <TextLink
                  label={showAll ? "Show fewer" : `Show all ${ordered.length}`}
                  onPress={() => setShowAll((v) => !v)}
                />
              </View>
            ) : null}
          </>
        )}
      </View>

      {notice ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(CLUB.panelMs)}
        >
          <Text
            accessibilityLiveRegion="polite"
            className="mt-2 text-sm font-bold text-python-green dark:text-python-green-light"
          >
            {notice}
          </Text>
        </Animated.View>
      ) : null}

      {!isMember ? (
        <Text className="mt-2 text-sm text-light-muted dark:text-dark-muted">
          Only current club members can write a review.
        </Text>
      ) : composing ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(CLUB.panelMs)}
          className="mt-3"
          style={{ maxWidth: CLUB.readingWidth }}
        >
          <View className="flex-row flex-wrap items-center gap-x-3">
            <StarPicker value={rating} onChange={setRating} />
            <Text className="text-sm text-light-muted dark:text-dark-muted">
              {rating} out of 5
            </Text>
          </View>
          <View className="mt-1">
            <Input
              label="Your experience"
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={2000}
              helper="10–2000 characters. Reviews are public while you are a current member."
            />
          </View>
          <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
            <Button
              label="Save review"
              loading={busy}
              onPress={() => void submit()}
            />
            <TextLink label="Cancel" onPress={cancel} disabled={busy} />
            {own ? (
              <TextLink
                label="Delete my review"
                onPress={() => void remove()}
                disabled={busy}
              />
            ) : null}
          </View>
        </Animated.View>
      ) : !own && !loading && !error ? (
        <RatePrompt
          onRate={(value) => {
            setRating(value);
            setComposing(true);
          }}
        />
      ) : null}
    </View>
  );
}
