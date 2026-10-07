# Encrypted club messaging

New message text is encrypted on the sending device with TweetNaCl's X25519/XSalsa20-Poly1305 authenticated box. Each account generates a random private key using Expo Crypto's `getRandomValues` (never its development `getRandomBytes` fallback). A fresh 24-byte nonce is used for each message; the database rejects reused sender nonces. The encrypted payload binds text to its club, sender and recipient. Recipients reject damaged payloads and identity mismatches.

## Unlocking on another device

Open Messages and create a separate, unique messaging passphrase of at least 16 characters. Use several random words and keep it safe. Both participants must enable messaging before sending. On another device, sign in and unlock with the same messaging passphrase.

The server stores a public identity key and an encrypted private-key backup: PBKDF2-HMAC-SHA256 with 600,000 iterations and a random 32-byte salt derives the backup wrapping key, and XSalsa20-Poly1305 secretbox protects it. The passphrase is never sent to the backend. Unlocked private keys live in application memory, not localStorage/AsyncStorage. Lock or sign out to clear the application's copy. Browser/JavaScript memory erasure cannot be guaranteed. There is intentionally no destructive key reset: forgotten passphrases cannot be recovered by administrators.

## Verify the person

In a conversation, open **Show safety number**. Compare the full number in person or through another trusted channel, then mark that the numbers match. Public-key pins and the verified flag are stored locally (they are public information). Unexpected changes block sending. A new device must compare the number again. First-use pinning alone does not establish the other person's identity against a malicious server. Verified identity depends on actually comparing the number, rather than merely pressing the button.

## Security boundaries

- Only the two participants can query message rows. Active approved-club membership and at least one verified board member/president are required to send. Removed members retain their own history but cannot send.
- Key backups are account-private. Contacts can fetch a public key only when authorized to message, or when they already share historical messages. Keys cannot be replaced through client writes.
- Direct client inserts/updates/deletes are forbidden; the ciphertext send RPC rechecks identities and memberships. The old plaintext RPC is revoked and also fails closed.
- Historical plaintext is preserved and explicitly labeled **Older unencrypted message**. It was not retroactively encrypted, and old copies/backups cannot be made confidential by this change.
- Participant IDs, club IDs/names, message dates, message size, and read receipts remain visible to the platform. Inbox previews contain a generic encrypted-message label, not decrypted text.
- Static account keys do **not** provide forward secrecy: compromise of a private key or its passphrase could expose historical encrypted messages. This is not the Signal Double Ratchet protocol.
- A compromised endpoint, malicious browser extension, weak passphrase, compromised account used to distribute a false identity before verification, or compromised frontend code can defeat these protections. CSP and HTTPS help reduce risks, but cannot eliminate them.
- No independent audit of this application's protocol has been performed. Tests cannot establish that breaches are impossible.

## Validation

`npm test` checks two-way encryption/decryption, second-device key recovery, wrong-passphrase rejection, modified ciphertext rejection, incorrect participants/conversations, unique nonces, and matching safety numbers. The backend integration suite uses disposable accounts on a schema-only branch; it checks member/board delivery, read receipts, private backups, rejected outsiders/anonymous users/forged sends/nonce replay/plaintext sends, and readability after leaving a club. Production should receive migrations only after these integration checks pass.

Phone browser behavior must be tested over HTTPS. Native iOS/Android export/type checking is not a substitute for testing on a physical device.

The existing Expo 51 dependency tree also has npm audit findings, including critical advisories for build-tool dependencies `tar` and `shell-quote`. The encryption packages were not flagged by that audit. These findings still need a separately tested dependency upgrade; a successful messaging test is not a clean audit of the entire application or its build tooling.

References: [TweetNaCl.js documentation and audit](https://github.com/dchest/tweetnacl-js), [Noble hashes PBKDF2](https://github.com/paulmillr/noble-hashes#pbkdf2).

## October 6 verification results

- TypeScript and all unit/regression tests passed. Web, iOS and Android exports built successfully; physical native-device execution has not been verified.
- The schema-only backend integration suite passed with separate member, president, outsider and administrator accounts. It verified actual encrypted delivery/decryption and database ciphertext, second-device recovery, read receipts, 57-message pagination with timestamp ties, denied plaintext/forged/replayed sends, private key backups, account binding, and denied sends after leaving.
- A browser test sent a message through the application UI. The president account decrypted it and sent an encrypted reply through the real backend; the open conversation displayed that reply automatically and updated read receipts. The UI safety number matched an independently calculated number for the test identities.
- Backend catalog checks confirmed key-backup RLS, no anonymous vault execution, no direct client key inserts, and revoked plaintext sending and old unbound key registration.
- Branch advisor scan `f95ed43b-29a0-4b1e-adaf-207ece59ccf0` reported 51 critical generic SECURITY DEFINER flags, zero performance warnings and 27 informational findings. Required caller-guarded RPCs remain definer functions; this is not a zero-findings audit. New RPCs restrict execution to authenticated users, pin their search paths, bind ownership/membership, and pass access-denial tests. Select-only message/key policies are deliberate: mutations go through guarded RPCs. The advisor's slow-query rule failed again, so that part of its scan is incomplete.
- InsForge API connections intermittently timed out during verification. Tests passed once it responded. Reported as platform feedback `2ff956c5-f1c2-409e-9e7c-dd63b4158719`; availability is a separate operational concern.
- Figma MCP inspection/search was attempted, but the Starter-plan tool quota blocked further design work. The mobile filter panel was implemented in code; no completed Figma design is claimed.
- All three migrations were merged into production after the passing branch tests, with zero conflicts and no auth configuration changes. Production retained its 47 clubs and zero existing messages. Email verification was restored on the test branch before merge; the disposable branch was deleted afterward.
- Deployment packaging initially included Git-ignored local backend support files in Vercel's private source archive. That staged deployment was removed. `.vercelignore` now explicitly excludes backend credentials, environment files and support artifacts; a dry run verified zero `.insforge` and environment files in the new upload. The production admin API key was rotated with zero grace and local CLI configuration updated. The app's public anon key was retained. No admin key was found in the frontend bundle or returned by the public backend-config route. This check does not establish that historical private build archives never contained credentials.
