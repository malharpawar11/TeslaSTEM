import { insforge } from "@/lib/insforge";
import {
  callRpc,
  callRpcValue,
  NOT_CONFIGURED,
  type ValueResult,
} from "./result";
import { EMPTY_PREFERENCES, type StudentPreferences } from "@/lib/discovery";

export async function fetchPreferences(
  userId: string,
): Promise<ValueResult<StudentPreferences>> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const { data, error } = await insforge.database
    .from("student_preferences")
    .select("interests,careers,availability,completed")
    .eq("user_id", userId)
    .limit(1);
  return error
    ? { ok: false, error: error.message }
    : {
        ok: true,
        value: (data?.[0] as StudentPreferences) ?? EMPTY_PREFERENCES,
      };
}
export function savePreferences(preferences: StudentPreferences) {
  return callRpc("save_student_preferences", {
    p_interests: preferences.interests,
    p_careers: preferences.careers,
    p_availability: preferences.availability,
    p_completed: preferences.completed,
  });
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
export interface MessageContact {
  user_id: string;
  name: string;
  member_position: string;
}
export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}
export interface MessageThread {
  club_id: string;
  club_name: string;
  user_id: string;
  name: string;
  body: string;
  created_at: string;
  unread: number;
}
export const fetchMessageContacts = (clubId: string) =>
  callRpcValue<MessageContact[]>("message_contacts", { p_club_id: clubId });
export const fetchMessageThreads = () =>
  callRpcValue<MessageThread[]>("message_threads");
export const fetchMessages = (
  clubId: string,
  peer: string,
  before: string | null = null,
) =>
  callRpcValue<DirectMessage[]>("message_history", {
    p_club_id: clubId,
    p_peer: peer,
    p_before: before,
  });
export const sendMessage = (clubId: string, peer: string, body: string) =>
  callRpc("send_club_message", {
    p_club_id: clubId,
    p_recipient: peer,
    p_body: body.trim(),
  });
export const readMessages = (clubId: string, peer: string) =>
  callRpc("read_club_messages", { p_club_id: clubId, p_peer: peer });
