# Campus interface redesign

Four independently checked and pushed sections:
1. Foundation: blue/green palette, rounded surfaces, navigation, controls and accessible motion.
2. Discovery: home, directory cards, filters and onboarding.
3. Club workflows: profile, content, leadership tools, account and administration.
4. Communication: calendar, inbox, conversations and notifications; final responsive QA.

All routes, providers, backend contracts, permissions and existing action handlers are retained. Motion respects reduced-motion preferences. Long lists stay virtualized. Layout supports light/dark modes and narrow screens.

Figma MCP created [Tesla STEM Campus UI](https://www.figma.com/design/dLL0W9xQthMtWSNUZQAgt9), but subsequent inspection/design writes were rejected by the account's Starter-plan MCP tool-call limit. The file is empty; it is not a completed design reference.

Higgsfield rejected the requested orbital motion background with “Requires plus plan or higher.” No generated media is used. The orbital visual is implemented with React Native animation so it remains native, lightweight and compatible with reduced motion. External service limitations do not change the app's backend or functionality.

## Preserved workflows

| Area | Retained actions |
| --- | --- |
| Discovery | Search, category/career/availability/recommendation filters, joined filter, join/leave, refresh |
| Onboarding | Multiple interests and careers, school periods/custom windows, recommendation preview, save and skip |
| Club profile | Meeting details, contact/share links, announcements/events, leadership, member resources, reviews, messages, membership requests |
| Leadership and administration | Approval queues, membership and board permissions, ownership tools, announcements, events, files, notes and settings |
| Calendar | My/all clubs, deadlines, agenda, export, individual calendar links, reminders and refresh; month/date navigation added |
| Messaging | Contacts, private history, older messages, send, read receipts, former-member history and refresh |
| Account and alerts | Sign-in/up and email code flow, verification requests, global/club preferences, push registration, sign-out, unread/request filters and mark-read |

## Verification

Type checking, discovery regression tests, web export and Android/Hermes export passed. Browser checks covered the 47-club directory, career filtering, public profile/review/meeting information, calendar month navigation and date selection, and sign-in gates. Layout was inspected at desktop, 390px and 320px widths in light and dark themes; sign-in fields and submit remained reachable when scrolling.

Authenticated publishing, messaging and management operations were preserved in the code but were not exercised through a signed-in browser in this UI pass. No production content or backend schema was changed. Native exports passed; physical-device keyboard and animation behavior still need device QA.

The four sections were pushed separately to `main`, with one additional correction commit for discovery's empty-state import. Section 4 includes final formatting and responsive cleanup.
