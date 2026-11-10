import { insforge } from "@/lib/insforge";
import {
  callRpc,
  callRpcValue,
  NOT_CONFIGURED,
  type ValueResult,
} from "./result";
import { readAnswers } from "@/lib/clubMatch";
import { EMPTY_PREFERENCES, type StudentPreferences } from "@/lib/discovery";

export async function fetchPreferences(
  userId: string,
): Promise<ValueResult<StudentPreferences>> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const read = (columns: string) =>
    insforge!.database
      .from("student_preferences")
      .select(columns)
      .eq("user_id", userId)
      .limit(1);
  let { data, error } = await read("interests,careers,availability,completed,answers");
  // Until the answers column exists everywhere, fall back to the older row.
  if (error && /answers/i.test(error.message))
    ({ data, error } = await read("interests,careers,availability,completed"));
  if (error) return { ok: false, error: error.message };
  const row = data?.[0] as (StudentPreferences & { answers?: unknown }) | undefined;
  return {
    ok: true,
    value: row ? { ...row, answers: readAnswers(row.answers) } : EMPTY_PREFERENCES,
  };
}
export async function savePreferences(preferences: StudentPreferences) {
  const base = {
    p_interests: preferences.interests,
    p_careers: preferences.careers,
    p_availability: preferences.availability,
    p_completed: preferences.completed,
  };
  if (preferences.answers) {
    const result = await callRpc("save_quiz_preferences", {
      ...base,
      p_answers: preferences.answers,
    });
    if (result.ok || !/save_quiz_preferences|function/i.test(result.error)) return result;
  }
  return callRpc("save_student_preferences", base);
}
export interface ClubReview {
  user_id: string;
  author: string;
  rating: number;
  body: string;
  updated_at: string;
}
export const fetchReviews = (clubId: string) =>
  callRpcValue<ClubReview[]>("club_reviews_public", { p_club_id: clubId });
export const saveReview = (clubId: string, rating: number, body: string) =>
  callRpc("save_club_review", {
    p_club_id: clubId,
    p_rating: rating,
    p_body: body.trim(),
  });
export async function deleteReview(clubId: string, userId: string) {
  if (!insforge) return { ok: false as const, error: NOT_CONFIGURED };
  const { error } = await insforge.database
    .from("club_reviews")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", userId);
  return error
    ? { ok: false as const, error: error.message }
    : { ok: true as const };
}
