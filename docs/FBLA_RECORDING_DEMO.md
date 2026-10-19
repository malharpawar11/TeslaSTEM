# FBLA president recording demo

This is the normal app running against a separate schema-only InsForge backend, with actual president/member permissions. It contains no copied student accounts. Demo announcements, messages and events never reach the live FBLA club.

- President: https://tesla-stem-fbla-demo.vercel.app/demo?view=president
- Member: https://tesla-stem-fbla-member.vercel.app/demo?view=member
- Logins are prefilled. Passwords are kept only in the local ignored `.insforge/fbla-demo-logins.json`; no password is embedded in the website or committed to Git.

The two hosts have independent browser storage, so both accounts can stay signed in side by side. The demo has one verified FBLA president, two active members, a welcome announcement, Tuesday lunch meetings in Wrenchey's Room, and the date-only October 24 FLC entry. Demo signup is disabled; the provisioned accounts are already verified.

## Recording steps

1. Sign in at the president link. Select **Manage FBLA — post an announcement or event**.
2. In **Announcements**, create and publish your announcement. In the member view, open FBLA and select **Announcements** to show the post arriving.
3. In **Events**, add an event with its Pacific date/time and location. Keep the member's **Calendar → My clubs** open to show the event appearing. Existing calendar export buttons continue to work.
4. Edit or cancel the event as president; the member's in-app calendar updates accordingly. Alerts also receive the normal database-generated notification, subject to notification preferences.
5. Before another take, delete your test posts/events through the management screen. Use the demo menu's sign-out button to return to login.

These are in-app calendar updates. Downloaded ICS files and events manually added to Google/Apple Calendar are snapshots, not a subscribed live feed.

## Implementation and checks

- The live-content trigger sends ID-only invalidations to private `member-content:<user-id>` channels for active club members and the president. Only the owner can subscribe. Clients cannot publish broadcasts. The UI refetches ordinary RLS-protected data for the visible club, dashboard, calendar and notification inbox.
- Returning from the background or reconnecting refreshes the views to recover missed updates. No recurring polling loop was added.
- `scripts/test-fbla-demo.cjs` validated actual announcement/event publishing, delivery to both members, member calendar/dashboard visibility, notifications, edits/cancellations, blocked member publishing, and rejected anonymous/cross-account subscriptions. It cleans up its validation content.
- `scripts/test-recording-demo.cjs` verifies that the demo flag cannot enable demo presentation on the production backend or an unrelated project.
- Fixed the preferences-loading race that could send an already-onboarded account back into the onboarding survey at sign-in.
- Fixed the ambiguous user/reviewer profile join in the leadership query, which previously prevented the club's announcement/event content from loading. The backend test exercises the actual repository query.

## Maintenance

The dedicated InsForge branch is `fbla-recording-demo` (`p252r4ze-5va`, branch ID `bfa4fc61-528a-4aab-8daf-31ee2b3c0493`). It is intentionally retained for recording and consumes backend resources until removed. Do not merge its demo data or locked signup settings into production. The live-content migration was applied separately to production after passing the isolated checks.

Vercel projects `tesla-stem-fbla-demo` and `tesla-stem-fbla-member` are separate from `tesla-stem-clubs`. Build only the demo projects with `EXPO_PUBLIC_RECORDING_DEMO=true`, the demo backend URL/public anon key, and `EXPO_PUBLIC_DEMO_CLUB_ID`. `.vercelignore` excludes `.insforge`, environment files, scripts and local credentials. The repository's CLI and Vercel link remain pointed at the live app after setup.
