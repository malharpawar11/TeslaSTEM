-- Ciphertext-only new messages. Existing unencrypted history is preserved.
create table public.message_identity_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_key text not null check(public_key ~ '^[A-Za-z0-9+/]{43}=$'),
  salt text not null check(salt ~ '^[A-Za-z0-9+/]{43}=$'),
  nonce text not null check(nonce ~ '^[A-Za-z0-9+/]{32}$'),
  encrypted_key text not null check(encrypted_key ~ '^[A-Za-z0-9+/]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.message_identity_keys enable row level security;
revoke all on public.message_identity_keys from public, anon, authenticated;
grant select on public.message_identity_keys to authenticated;
create policy "own encrypted key backup" on public.message_identity_keys for select to authenticated using(user_id=(select auth.uid()));

create function public.my_message_vault()
returns table(public_key text,salt text,nonce text,encrypted_key text)
language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
  select k.public_key,k.salt,k.nonce,k.encrypted_key from public.message_identity_keys k where k.user_id=auth.uid()
$$;
create function public.register_message_vault(p_public_key text,p_salt text,p_nonce text,p_encrypted_key text)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sign in to set up encrypted messaging'; end if;
  -- Immutable identity prevents silent key replacement and accidental loss of history.
  if exists(select 1 from public.message_identity_keys where user_id=auth.uid()) then raise exception 'Messaging is already set up. Unlock it using your existing passphrase.'; end if;
  insert into public.message_identity_keys(user_id,public_key,salt,nonce,encrypted_key) values(auth.uid(),p_public_key,p_salt,p_nonce,p_encrypted_key);
end $$;
create function public.message_peer_key(p_club_id uuid,p_peer uuid)
returns table(public_key text) language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
  select k.public_key from public.message_identity_keys k where k.user_id=p_peer and
  (public.can_message_pair(p_club_id,auth.uid(),p_peer) or exists(select 1 from public.club_messages m where m.club_id=p_club_id and ((m.sender_id=auth.uid() and m.recipient_id=p_peer) or (m.recipient_id=auth.uid() and m.sender_id=p_peer))))
$$;
alter table public.club_messages add column envelope jsonb;
alter table public.club_messages add constraint encrypted_message_shape check(envelope is null or (body='[Encrypted message]' and jsonb_typeof(envelope)='object' and envelope->>'v'='1' and envelope ?& array['nonce','ciphertext','sender_key','recipient_key'] and length(envelope::text)<16000));
create unique index club_messages_unique_nonce on public.club_messages(sender_id,(envelope->>'nonce')) where envelope is not null;
create function public.send_encrypted_club_message(p_club_id uuid,p_recipient uuid,p_envelope jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare sk text; rk text;
begin
  if not public.can_message_pair(p_club_id,auth.uid(),p_recipient) then raise exception 'Messaging requires active membership and a board member or president'; end if;
  select public_key into sk from public.message_identity_keys where user_id=auth.uid();
  select public_key into rk from public.message_identity_keys where user_id=p_recipient;
  if sk is null or rk is null then raise exception 'Both people must enable encrypted messaging first'; end if;
  if p_envelope is null or jsonb_typeof(p_envelope)<>'object' or p_envelope->>'v' is distinct from '1'
    or p_envelope->>'sender_key' is distinct from sk or p_envelope->>'recipient_key' is distinct from rk
    or coalesce(p_envelope->>'nonce','') !~ '^[A-Za-z0-9+/]{32}$'
    or coalesce(p_envelope->>'ciphertext','') !~ '^[A-Za-z0-9+/]+={0,2}$'
    or length(coalesce(p_envelope->>'ciphertext','')) not between 24 and 14000
    or length(p_envelope::text)>16000 or (select count(*) from jsonb_object_keys(p_envelope))<>5
    then raise exception 'Invalid encrypted message or changed identity'; end if;
  insert into public.club_messages(club_id,sender_id,recipient_id,body,envelope) values(p_club_id,auth.uid(),p_recipient,'[Encrypted message]',p_envelope);
end $$;
-- Old app versions must fail closed rather than send readable text.
create or replace function public.send_club_message(p_club_id uuid,p_recipient uuid,p_body text)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin raise exception 'Update the app and enable encrypted messaging before sending'; end $$;
revoke all on function public.send_club_message(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.my_message_vault(),public.register_message_vault(text,text,text,text),public.message_peer_key(uuid,uuid),public.send_encrypted_club_message(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.my_message_vault(),public.register_message_vault(text,text,text,text),public.message_peer_key(uuid,uuid),public.send_encrypted_club_message(uuid,uuid,jsonb) to authenticated;
