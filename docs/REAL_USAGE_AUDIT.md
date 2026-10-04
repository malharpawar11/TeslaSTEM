# Real usage audit

Reviewed the active Expo app, its data repositories and contexts, auth integration, SQL workflows, storage rules, and legacy backend sources. The running app uses InsForge, not the legacy Express/Supabase backend. No fabricated clubs, reviews, deadlines, messages, or local-only memberships were found in the active data flow.

## Fixes

- Removed the missing-backend demo bypass from protected screens. Missing configuration now blocks account actions.
- Search and dashboard failures now produce visible errors with retry instead of empty results. Search loading always finishes after a failed request.
- Notification and membership failures preserve existing state and report errors. Read marking reports failed writes. Preference writes cannot update another account's state after a session change.
- Unread notification counts now use an exact backend count rather than counting only the latest 60 loaded notifications.
- Review queues, club content, rosters, and access checks propagate backend errors. Management and profile loads handle those errors, finish loading, and provide recovery. Refresh failures after successful content writes are reported separately.
- Club profile loads ignore stale responses and clear member-only content when the account changes.
- The web calendar explains that Expo device reminders require the installed app and offers calendar export; it no longer offers a reminder action that cannot run on web.
- Removed the invented Expo EAS project identifier. Native builds read the real ID from `EXPO_PUBLIC_EAS_PROJECT_ID`.

## Validation

TypeScript checks and regression tests passed, including backend-outage cases and unread counts beyond the loaded page. Web and Android/Hermes exports passed. The real SDK integration runner passed on a fresh schema-only InsForge branch: submission/approval, membership transitions, event and announcement publication, notifications, private notes/files and upload denial, search/dashboard visibility, preferences privacy, member reviews, direct messages, read receipts, and unauthorized-write denial. That test branch was deleted and CLI context restored to production. The live app's backend environment was never redirected to the test branch, and synthetic content was not added to production.

## Unfinished dependencies and limits

Remote native push delivery is not ready: it needs an actual Expo EAS project, device credentials/build, and a trusted delivery worker. Registering a token alone does not send pushes. In-app Alerts use real database notifications. Physical iPhone behavior and remote push cannot be certified by a bundle export.

Some leaders have not published exact meeting times, rooms, deadlines, or reviews. These appear as missing information, rather than invented data. Messaging uses focus/manual refresh, not live WebSocket updates. Automated checks cover the listed workflows and failures; they do not establish that every environment is bug-free.
