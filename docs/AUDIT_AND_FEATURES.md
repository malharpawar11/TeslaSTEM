# October 4, 2026 audit and club discovery update

The new backend migrations were applied to an isolated schema-only InsForge branch, exercised through the installed JavaScript SDK, reviewed with a merge dry run, and merged into Tesla-STEM-Clubs. The temporary branch was removed afterward. The main backend was restored from its inactivity pause. The frontend changes are in this checkout; no frontend deployment was performed.

## Features

- Club cards now show meeting locations alongside days and times. The existing profile and leadership settings continue to expose the full schedule. New submissions and settings validate recognizable weekdays, a meeting period or a start/end range, and a location.
- Browse includes availability, career, and recommendation filters, combined with category/search/joined filters.
- The first signed-in visit opens an optional onboarding survey. Interests, multiple career goals, and availability are saved per account in InsForge. Students can edit preferences from Browse and preview recommendations with explanations.
- Availability supports exact windows in Pacific time and school periods (Lunch, Before School, After School). Exact windows must cover a full published meeting; unknown clock times are not inferred from a school-period label.
- Career matching uses club text and relevant categories. Leaders can add explicit career tags in Settings.
- The calendar includes a deadlines-only filter using the existing Deadline event type. Leaders create deadlines in Manage club → Events. Calendar groups and event editing use Pacific time, including daylight saving validation.
- Messages has a private inbox and per-club contacts. Active members can message active verified board members/presidents; leadership can reply and initiate conversations with members. Threads support read receipts, older-message loading, and pull-to-refresh. Former members may read their own history but cannot send. Messages do not require finding email addresses.
- Current members can create, edit, and delete a 1–5 star review. Public club profiles display reviews and an average. Only current-member reviews are publicly returned. Reviews are validated and limited to one per member per club.

## Confirmed bugs fixed

- Storage object policies existed but row-level security was disabled, allowing unauthorized uploads. RLS is now enabled, and authenticated callers can execute the key parser required by authorized file uploads. Regression tests verify both authorized uploads and outsider denial.
- Missing foreign-key indexes and uncached user-ID checks in public access policies were addressed without changing their authorization predicates.
- Approving a submitted club verified the submitter's account but did not set club ownership or create their president membership. Approval now does both and notifies the submitter. The migration repairs eligible existing clubs with unset ownership.
- Requesting a board role could create active membership in a club requiring membership approval. Such requests now stay pending.
- Board review could demote a president or review a user without a pending board request. Review now requires a pending non-president request.
- Rejoining an inactive membership could retain previous board permissions. Rejoining resets role and permissions.
- A president could leave and strand leadership. Ownership must now be transferred first.
- Existing workflow functions inherited PUBLIC execute permission. Grants now distinguish authenticated workflows, safe anonymous reads/helpers, and internal trigger functions.
- The Joined directory filter included pending/rejected memberships. It now requires active membership.
- Calendar grouping used the ISO/UTC date, splitting evening events into the wrong school day. Grouping and display now use Pacific time.
- Event text parsing silently rolled impossible dates forward and interpreted dates in the device's timezone. It now validates dates in school time and rejects nonexistent DST times.
- Expired mobile access tokens were not refreshed automatically in SDK server mode. Active sessions now refresh periodically and on foregrounding. Native refresh tokens migrate into SecureStore; transient startup outages preserve the persisted token.
- Profile, membership, and notification responses could repopulate an old account's state after sign-out/account changes. Account guards and state resets were added.
- Search responses could arrive out of order and replace newer results. Stale responses are ignored.
- Notification read state was marked successful before the backend accepted it. Local state now updates after success.
- Calendar errors were rendered as empty schedules, and thrown directory failures could leave loading stuck. Errors are now visible and retryable.
- Repeated reminder requests could schedule duplicates and ignored reminder preferences. Event reminder IDs are stable; cancelled events and disabled preferences are excluded.
- A failed club-image row update left an orphaned upload. Failed updates clean up the uploaded object.
- Empty/nonalphabetic club names could crash the initials helper. They now have a safe fallback.
- Push registration now reports the missing real Expo EAS project ID instead of attempting the configured placeholder.

## Verification completed

- `npm run typecheck` passed.
- `npm test` passed time parsing, full-window matching, school-period matching, weekday parsing, unknown schedules, career tags, recommendation reasons, impossible dates/DST transitions, Pacific grouping, and empty initials.
- `npm run test:backend` passed on the test branch: school-account signup/sign-in, club submission/approval, president membership, joining/leaving, approval restrictions, preferences privacy/validation, review upserts/rating validation/current-member visibility, contacts, private messages, forged-write denial, outsider isolation, read receipts, and retained former-member history.
- An expanded second-branch run also passed event publication/cancellation and notifications, announcements, member-only notes, file uploads and write denial, search isolation, and dashboard results.
- `npx expo export --platform web` passed.
- `npx expo export --platform android --output-dir .expo/qa-android` passed, including Hermes bundling.
- Browser checks verified the 47-club directory, career filters, deadline filter, public meeting information, and review empty state against the main backend.
- Backend advisor scans and database diagnostics were inspected. SECURITY DEFINER warnings are not themselves proof of unauthorized access: the required workflow functions intentionally use guarded definer execution. Anonymous workflow grants were revoked; the integration tests exercise authorization denials. No warnings were suppressed.

## Remaining data and platform limitations

- All 47 existing club schedules use school-period labels rather than exact clock-time ranges. Period matching works now. Exact-window matching needs club leaders to publish exact ranges; no bell times were invented.
- 10 existing clubs still have `TBD` locations. New/edit validation requires a location, but historical unknown rooms were preserved.
- Push delivery still requires a real Expo EAS project ID and an actual push delivery job; registering tokens alone does not send remote notifications.
- Native device interaction, email delivery to real school inboxes, and iOS runtime behavior were not exercised. Bundle success is not a device test.
- Messaging refreshes on screen focus or user refresh; live WebSocket delivery is not implemented.
- Calendar deadlines appear when leaders publish Deadline events. No deadlines or reviews were fabricated for existing clubs.
- This audit covers the reviewed code and tests above; it is not a guarantee of defect-free behavior in every environment.

## Backend regression runner

The runner intentionally refuses the production hostname. Use a fresh schema-only branch, apply pending migrations, and temporarily disable email verification on that branch to avoid sending test mail. Run `npm run test:backend`, restore verification, and remove the test branch. Its synthetic users/clubs must never be copied into production.
