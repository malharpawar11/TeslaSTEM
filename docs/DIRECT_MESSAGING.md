# Account-based direct messaging

As requested on October 18, 2026, new conversations use verified school accounts without a separate messaging passphrase. New messages are **not end-to-end encrypted**: the database stores their text. HTTPS protects transport, and participant-only database policies and guarded RPCs restrict application access. Backend administrators can access stored text.

After email verification, students complete their name, grade (9–12), and unique handle. Existing users complete this on their next gated screen. Edit these details from Profile or Messages. Search supports name/handle and exact school email; search results never return email or birth date. Birth dates are not collected for directory identification. Names/grades are self-reported, not school-verified; compare the unique handle before contacting someone.

Messages supports any verified LWSD account, independently of club membership. Club messaging routes show eligible club contacts and open the same direct conversations. An existing recipient can receive a message before completing the new directory profile and can complete it at next sign-in to reply.

Realtime sends message-ID invalidations through a per-user channel with owner-only subscription rules. It sends no message bodies through that channel. The app re-reads participant-scoped history/inbox RPCs and uses five-second polling as a reconnect fallback. Message history has a timestamp plus UUID cursor, a 50-row page, and read receipts. Sending is limited to 2,000 characters and 30 messages per minute per sender. Blocking prevents sending in either direction while preserving history.

The old ciphertext tables and encrypted keys remain untouched. Previous conversations are accessible through a separate read-only archive; unlocking those old records still requires their original passphrase. The new messaging flow never requires that passphrase.

## Validation

`scripts/test-direct-messaging.cjs` runs only on a disposable Tesla STEM backend branch. It verifies real two-account delivery/replies, private realtime delivery, denied outsider subscriptions, private history, forged-write rejection, anonymous and unverified restrictions, duplicate-name disambiguation, exact-email contact before directory setup, read receipts, blocking/unblocking, and input validation. It uses synthetic accounts, not real student messages.

`scripts/test-date-only-calendar.cjs` verifies date-only display and Google/ICS exports. FLC is October 24, 2026, with no asserted start time or location. Date-only events do not schedule an invented timed reminder.

This validation is not a guarantee that security breaches are impossible or an independent security audit. Existing Expo dependency advisories documented in ENCRYPTED_MESSAGING.md are not resolved by this change.
