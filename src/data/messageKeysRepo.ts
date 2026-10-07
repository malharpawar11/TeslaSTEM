import { callRpc, callRpcValue } from "./result";
import type { MessageVault, Envelope } from "@/lib/messageCrypto";
export const fetchMessageVault = () =>
  callRpcValue<MessageVault[]>("my_message_vault");
export const registerMessageVault = (vault: MessageVault, owner: string) =>
  callRpc("register_message_vault", {
    p_public_key: vault.public_key,
    p_salt: vault.salt,
    p_nonce: vault.nonce,
    p_encrypted_key: vault.encrypted_key,
    p_owner: owner,
  });
export const fetchPeerKey = (clubId: string, peer: string) =>
  callRpcValue<{ public_key: string }[]>("message_peer_key", {
    p_club_id: clubId,
    p_peer: peer,
  });
export const sendEncryptedMessage = (
  clubId: string,
  peer: string,
  envelope: Envelope,
) =>
  callRpc("send_encrypted_club_message", {
    p_club_id: clubId,
    p_recipient: peer,
    p_envelope: envelope,
  });
