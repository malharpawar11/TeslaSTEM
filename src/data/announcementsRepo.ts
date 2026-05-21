import { supabase } from '@/lib/supabase';

export type RpcResult = { ok: true } | { ok: false; error: string };

/**
 * Whether the signed-in user may manage this club — post announcements, edit
 * it, etc. This calls the very same `can_admin_club()` function that the RLS
 * policies use, so the control the UI shows always matches what the database
 * will actually permit (special admin, the club's verified president, or an
 * assigned club admin).
 */
export async function canManageClub(clubId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('can_admin_club', { c: clubId });
  if (error) return false;
  return data === true;
}

/**
 * Posts an announcement for a club. This is permission-gated by the database:
 * the "admins create club announcements" RLS policy independently re-checks
 * `can_admin_club(club_id)` AND `created_by = auth.uid()`, so an unauthorized
 * caller is rejected by Postgres even if the UI control somehow leaked.
 */
export async function createAnnouncement(
  clubId: string,
  title: string,
  body: string,
): Promise<RpcResult> {
  if (!supabase) return { ok: false, error: 'Backend not configured.' };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: 'Sign in to post an announcement.' };

  const { error } = await supabase.from('announcements').insert({
    club_id: clubId,
    title: title.trim(),
    body: body.trim(),
    created_by: uid,
  });
  if (error) return { ok: false, error: error.message };

  await supabase.rpc('log_audit', {
    p_action: 'create_announcement',
    p_entity: 'announcement',
    p_metadata: { club_id: clubId, title: title.trim() },
  });
  return { ok: true };
}
