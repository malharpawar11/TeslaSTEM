# Campus interface redesign

Four independently checked and pushed sections:
1. Foundation: blue/green palette, rounded surfaces, navigation, controls and accessible motion.
2. Discovery: home, directory cards, filters and onboarding.
3. Club workflows: profile, content, leadership tools, account and administration.
4. Communication: calendar, inbox, conversations and notifications; final responsive QA.

All routes, providers, backend contracts, permissions and existing action handlers are retained. Motion respects reduced-motion preferences. Long lists stay virtualized. Layout supports light/dark modes and narrow screens.

Figma MCP created [Tesla STEM Campus UI](https://www.figma.com/design/dLL0W9xQthMtWSNUZQAgt9), but subsequent inspection/design writes were rejected by the account's Starter-plan MCP tool-call limit. The file is empty; it is not a completed design reference.

Higgsfield rejected the requested orbital motion background with “Requires plus plan or higher.” No generated media is used. The orbital visual is implemented with React Native animation so it remains native, lightweight and compatible with reduced motion. External service limitations do not change the app's backend or functionality.
