import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Permanent account deletion, required by both app stores for any app that lets
// users create an account. A user may only ever delete themselves: the id comes
// from the verified JWT, never from the request body.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Missing bearer token' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Invalid or expired session' }, 401);
  const userId = userData.user.id;

  const admin = createClient(url, serviceKey);

  // Losing the only special_admin would leave the school with nobody able to
  // approve clubs, and the role can only be re-granted via bootstrap.
  const { data: profile } = await admin
    .from('profiles')
    .select('role,email')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.role === 'special_admin') {
    return json(
      { error: 'The special admin account cannot be deleted from the app. Transfer the role first.' },
      403,
    );
  }

  // Written before the delete, because the actor row disappears with the user.
  await admin.from('audit_logs').insert({
    actor: null,
    action: 'delete_account',
    entity: 'profile',
    entity_id: userId,
    metadata: { email: profile?.email ?? userData.user.email ?? null, self_service: true },
  });

  // Cascades to profiles, club_admins, and club_followers; clubs, announcements
  // and audit rows survive with their author reference nulled.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ deleted: true }, 200);
});
