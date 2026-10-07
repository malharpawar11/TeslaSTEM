-- Protect against an account/session switch while an asynchronous KDF is running.
create function public.register_message_vault(p_public_key text,p_salt text,p_nonce text,p_encrypted_key text,p_owner uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_owner then raise exception 'The signed-in account changed. Try again.'; end if;
  if exists(select 1 from public.message_identity_keys where user_id=auth.uid()) then raise exception 'Messaging is already set up. Unlock it using your existing passphrase.'; end if;
  insert into public.message_identity_keys(user_id,public_key,salt,nonce,encrypted_key) values(auth.uid(),p_public_key,p_salt,p_nonce,p_encrypted_key);
end $$;
revoke all on function public.register_message_vault(text,text,text,text) from public,anon,authenticated;
revoke all on function public.register_message_vault(text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.register_message_vault(text,text,text,text,uuid) to authenticated;
