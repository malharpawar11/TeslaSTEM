import nacl from "tweetnacl";
import { fromByteArray, toByteArray } from "base64-js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

// Hermes in Expo 51 does not provide TextEncoder/TextDecoder on every device.
function utf8ToBytes(value: string): Uint8Array {
  const escaped = encodeURIComponent(value),
    bytes: number[] = [];
  for (let i = 0; i < escaped.length; i++) {
    if (escaped[i] === "%") {
      bytes.push(parseInt(escaped.slice(i + 1, i + 3), 16));
      i += 2;
    } else bytes.push(escaped.charCodeAt(i));
  }
  return new Uint8Array(bytes);
}
function bytesToUtf8(bytes: Uint8Array): string {
  return decodeURIComponent(
    Array.from(bytes, (byte) => `%${byte.toString(16).padStart(2, "0")}`).join(
      "",
    ),
  );
}

export const KDF_ROUNDS = 600000;
export interface MessageVault {
  public_key: string;
  salt: string;
  nonce: string;
  encrypted_key: string;
}
export interface Envelope {
  v: 1;
  nonce: string;
  ciphertext: string;
  sender_key: string;
  recipient_key: string;
}
export interface MessageBinding {
  club_id: string;
  sender_id: string;
  recipient_id: string;
}
export const encode = fromByteArray;
export function decode(value: string, length?: number): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4)
    throw new Error("Invalid encryption data.");
  const bytes = toByteArray(value);
  if (length !== undefined && bytes.length !== length)
    throw new Error("Invalid encryption key.");
  return bytes;
}
async function wrappingKey(passphrase: string, salt: Uint8Array) {
  return pbkdf2Async(sha256, utf8ToBytes(passphrase), salt, {
    c: KDF_ROUNDS,
    dkLen: 32,
    asyncTick: 10,
  });
}
// The random source is supplied by Expo Crypto in the app; tests use Node crypto.
export async function createVault(
  passphrase: string,
  random: (size: number) => Uint8Array,
) {
  if (passphrase.length < 16)
    throw new Error(
      "Use a unique passphrase of at least 16 characters (several random words).",
    );
  const secretKey = random(32),
    pair = nacl.box.keyPair.fromSecretKey(secretKey);
  const salt = random(32),
    nonce = random(24),
    key = await wrappingKey(passphrase, salt);
  try {
    const vault: MessageVault = {
      public_key: encode(pair.publicKey),
      salt: encode(salt),
      nonce: encode(nonce),
      encrypted_key: encode(nacl.secretbox(secretKey, nonce, key)),
    };
    return { vault, secretKey };
  } finally {
    key.fill(0);
  }
}
export async function unlockVault(passphrase: string, vault: MessageVault) {
  const key = await wrappingKey(passphrase, decode(vault.salt, 32));
  try {
    const secret = nacl.secretbox.open(
      decode(vault.encrypted_key, 48),
      decode(vault.nonce, 24),
      key,
    );
    if (
      !secret ||
      encode(nacl.box.keyPair.fromSecretKey(secret).publicKey) !==
        vault.public_key
    )
      throw new Error("Incorrect messaging passphrase or damaged key backup.");
    return secret;
  } finally {
    key.fill(0);
  }
}
export function encryptMessage(
  text: string,
  binding: MessageBinding,
  secretKey: Uint8Array,
  peerKey: string,
  random: (size: number) => Uint8Array,
): Envelope {
  if (!text.trim() || text.trim().length > 2000)
    throw new Error("Messages must be between 1 and 2000 characters.");
  const nonce = random(24),
    senderKey = nacl.box.keyPair.fromSecretKey(secretKey).publicKey;
  return {
    v: 1,
    nonce: encode(nonce),
    ciphertext: encode(
      nacl.box(
        utf8ToBytes(JSON.stringify({ ...binding, text: text.trim() })),
        nonce,
        decode(peerKey, 32),
        secretKey,
      ),
    ),
    sender_key: encode(senderKey),
    recipient_key: peerKey,
  };
}
export function decryptMessage(
  envelope: Envelope,
  binding: MessageBinding,
  userId: string,
  secretKey: Uint8Array,
): string {
  if (
    envelope.v !== 1 ||
    ![binding.sender_id, binding.recipient_id].includes(userId)
  )
    throw new Error("Unsupported message or participant.");
  const ownKey = encode(nacl.box.keyPair.fromSecretKey(secretKey).publicKey);
  const sent = userId === binding.sender_id;
  if (ownKey !== (sent ? envelope.sender_key : envelope.recipient_key))
    throw new Error("Message uses a different identity key.");
  const plaintext = nacl.box.open(
    decode(envelope.ciphertext),
    decode(envelope.nonce, 24),
    decode(sent ? envelope.recipient_key : envelope.sender_key, 32),
    secretKey,
  );
  if (!plaintext) throw new Error("Message authentication failed.");
  try {
    const payload = JSON.parse(bytesToUtf8(plaintext));
    if (
      payload.club_id !== binding.club_id ||
      payload.sender_id !== binding.sender_id ||
      payload.recipient_id !== binding.recipient_id ||
      typeof payload.text !== "string" ||
      payload.text.length > 2000
    )
      throw new Error("Message identity does not match this conversation.");
    return payload.text;
  } finally {
    plaintext.fill(0);
  }
}
// Compare this number with the other person using a trusted channel.
export function safetyNumber(
  aId: string,
  aKey: string,
  bId: string,
  bKey: string,
) {
  const identities = [`${aId}:${aKey}`, `${bId}:${bKey}`].sort().join("|");
  return bytesToHex(sha256(utf8ToBytes(`tesla-clubs-e2ee-v1|${identities}`)))
    .match(/.{1,8}/g)!
    .join(" ");
}
