import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Chip, Input, SkeletonRow } from "./ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  deleteReview,
  fetchReviews,
  saveReview,
  type ClubReview,
} from "@/data/discoveryRepo";

export function ClubReviews({
  clubId,
  isMember,
}: {
  clubId: string;
  isMember: boolean;
}) {
  const { session } = useAuth(),
    { toast } = useToast();
  const [reviews, setReviews] = useState<ClubReview[]>([]);
  const [rating, setRating] = useState(5),
    [body, setBody] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReviews(clubId);
      if (result.ok) {
        setReviews(result.value);
        setError(null);
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
  const submit = async () => {
    if (body.trim().length < 10) {
      toast("Write at least 10 characters about your experience.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await saveReview(clubId, rating, body);
      if (!result.ok) toast(result.error, "error");
      else await load();
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
      else await load();
    } catch {
      toast("Could not remove your review.", "error");
    } finally {
      setBusy(false);
    }
  };
  const own = reviews.find((r) => r.user_id === session?.user.id);
  return (
    <View className="mt-6 gap-3">
      <Text className="text-lg font-semibold text-light-text dark:text-dark-text">
        Current member reviews
      </Text>
      {loading ? (
        <SkeletonRow count={2} />
      ) : error ? (
        <>
          <Text className="text-danger">{error}</Text>
          <Button
            label="Retry reviews"
            variant="secondary"
            onPress={() => void load()}
          />
        </>
      ) : (
        <>
          <Text className="text-sm text-light-muted dark:text-dark-muted">
            {reviews.length
              ? `${(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)} / 5 · ${reviews.length} reviews`
              : "No reviews yet. Share your experience after joining."}
          </Text>
          {reviews.map((review) => (
            <Card key={review.user_id} className="p-5">
              <Text className="font-semibold text-light-text dark:text-dark-text">
                {review.author} · {review.rating}/5
              </Text>
              <Text className="mt-2 text-sm text-light-secondary dark:text-dark-secondary">
                {review.body}
              </Text>
              <Text className="mt-2 text-xs text-light-muted dark:text-dark-muted">
                {new Date(review.updated_at).toLocaleDateString()}
              </Text>
            </Card>
          ))}
        </>
      )}
      {isMember ? (
        <Card className="gap-4 p-5">
          <Text className="font-semibold text-light-text dark:text-dark-text">
            {own ? "Edit your review" : "Write a review"}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Chip
                key={value}
                label={`${value} ★`}
                active={rating === value}
                onPress={() => setRating(value)}
              />
            ))}
          </View>
          <Input
            label="Your experience"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
            helper="10–2000 characters. Reviews are public while you are a current member."
          />
          <Button
            label="Save review"
            loading={busy}
            onPress={() => void submit()}
          />
          {own ? (
            <Button
              label="Delete my review"
              variant="ghost"
              disabled={busy}
              onPress={() => void remove()}
            />
          ) : null}
        </Card>
      ) : (
        <Text className="text-sm text-light-muted dark:text-dark-muted">
          Only current club members can write a review.
        </Text>
      )}
    </View>
  );
}
