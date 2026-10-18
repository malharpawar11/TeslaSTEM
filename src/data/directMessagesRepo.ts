import { callRpc, callRpcValue } from "./result";
import { insforge } from "@/lib/insforge";
export interface StudentContact {
  user_id: string;
  name: string;
  grade: number | null;
  handle: string;
  blocked?: boolean;
}
export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}
export interface ChatThread extends StudentContact {
  body: string;
  created_at: string;
  unread: number;
}
export const searchStudents = (query: string) =>
  callRpcValue<StudentContact[]>("search_students", { p_query: query });
export const fetchContact = (peer: string) =>
  callRpcValue<StudentContact[]>("direct_contact", { p_peer: peer });
export const fetchInbox = () => callRpcValue<ChatThread[]>("direct_inbox");
export const fetchChat = (peer: string, before?: ChatMessage) =>
  callRpcValue<ChatMessage[]>("direct_history", {
    p_peer: peer,
    p_before: before?.created_at ?? null,
    p_before_id: before?.id ?? null,
  });
export const sendChat = (peer: string, body: string) =>
  callRpc("send_direct_message", { p_peer: peer, p_body: body });
export const markChatRead = (peer: string, ids: string[]) =>
  callRpc("read_visible_direct_messages", { p_peer: peer, p_ids: ids });
export const blockContact = (peer: string, block: boolean) =>
  callRpc("block_message_user", { p_peer: peer, p_block: block });
export const saveStudentProfile = (
  name: string,
  grade: number,
  handle: string,
) =>
  callRpc("save_directory_profile", {
    p_name: name,
    p_grade: grade,
    p_handle: handle,
  });
export async function myStudentProfile(uid: string) {
  if (!insforge) return { ok: false as const, error: "Backend unavailable" };
  try {
    const { data, error } = await insforge.database
      .from("student_directory")
      .select("user_id,name,grade,handle")
      .eq("user_id", uid)
      .limit(1);
    return error
      ? { ok: false as const, error: error.message }
      : {
          ok: true as const,
          value: (data?.[0] as StudentContact | undefined) ?? null,
        };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Could not load your profile",
    };
  }
}
