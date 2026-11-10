# Tesla STEM Clubs design system

Read this before changing any screen. The site is web-first and built with Expo
and React Native Web, so components are `View`/`Text`/`Pressable` styled with
NativeWind, and motion uses Reanimated.

## Idea

Black or white sheets, with colour used as ink. Oversized condensed type does
the work that cards, icons and shadows do elsewhere. Every page has one big
thing. Everything else is quiet, and every number or name on screen is real.

## Colour

Source of truth: `src/theme/tokens.ts` and `tailwind.config.js`. Keep them in sync.

| Token | Value | Use |
| --- | --- | --- |
| Page, dark mode | `#000000` | Background |
| Page, light mode | `#FFFFFF` | Background |
| `python-blue` / `ink.blue` | `#3068F0` | Actions, selection, leadership, the one accent on a page |
| `python-blue-light` | `#8AAEFF` | Small blue text on black only; display type stays `python-blue` |
| `laurel` | `#5CB82E` | "Today" marker, things that are live right now |
| `python-green` / `python-green-light` | `#3A8F1E` / `#7FD955` | Joined, on, approved |
| `danger` | `#D6402F` | Errors and cancellations only |
| `warn` | `#A86A00` | Pending, sparingly |

Rules

- Backgrounds are never tinted. A solid blue field is the only colour block
  allowed, and it marks a moment of action (sign-in, leadership, a request).
- Blue means act or selected. Green means yes, you're in. Don't swap them.
- Text on solid blue is white, including errors. Focus rings there are white
  (`dataSet={{ onblue: "true" }}`).

## Type

| Role | Face | Notes |
| --- | --- | --- |
| Display | Big Shoulders Display ExtraBold, `<Display>` | Names, titles, numbers |
| Reading and UI | Atkinson Hyperlegible 400 and 700 | Everything people read |
| Reading option | OpenDyslexic | User setting; never override it |

Only those two weights of Atkinson and one of Big Shoulders exist. Don't invent others.

| Size | Display px | Used for |
| --- | --- | --- |
| Hero | 112–150+, fitted to width | One per page |
| Section | 54–78 | Page and period titles |
| Entry | 34–46 | Club and event names |
| Label | 22–30 | Sub-headings, list items |

Reading sizes come from the Tailwind scale: `text-sm` 13, `text-base` 15, `text-lg` 17.

- Display line height is 0.94–0.98 of size. Raise it where descenders get clipped
  by `numberOfLines`.
- Sentence case. Uppercase only for the homepage title.
- Accent a phrase only when it means something, such as the part of a sentence
  the user can change.

## Space and structure

- Page gutter from `useLayout()`: 20 phones, 32 tablets, 48 desktop.
- Spacing steps: 4, 8, 12, 16, 24, 32, 48, 64.
- Sidebar folds away below 920px. Two-column layouts fold around 960–1000px of content.
- Structure comes from rules and alignment:
  - 2px rule in text colour starts a major list.
  - 1px `border` hairline separates entries.
- Radius is 2–4px. Circles are only for things that are circles.
- Shadows are not used for depth.

## Components

Shared pieces live in `src/components/system`, plus `ViewSwitch` for segmented choices.

- Buttons: solid blue for the main action, white on blue fields. Display type for
  large actions. No pills.
- Text fields: a labelled line, not a box.
- Options: `TextTabs` for sort and tabs, `ViewSwitch` for mutually exclusive
  modes, `Check` for filters. Avoid rows of chips on new screens.
- Lists: type on hairlines, not repeated cards.
- Week strip (`WeekMarks`): the standard way to show meeting days.
- Empty states say what is true and offer one next step.

## Motion

- Use Reanimated. `motion`, Radix and other DOM-only libraries don't fit
  React Native Web's elements.
- Durations: hover 140ms, selection 180–220ms, a panel 300ms.
- Only one thing moves unprompted on a page. Motion answers an action or marks
  an arrival.
- Don't use Reanimated `exiting` on children whose parent can unmount; it crashes
  on web. Fade the item out, then remove it.
- Respect reduced motion through `useReducedMotion`.
- 3D only where it's the page's one big thing. Every WebGL scene must load through
  `src/components/Scenes3D.ts`, or three.js lands in the main bundle.

## Accessibility

- On web, `accessibilityState` is ignored. Use `aria-pressed`, `aria-checked`,
  `aria-selected`, `aria-expanded`, `aria-disabled`, `aria-busy`, matched to the role.
- Touch targets are at least 44px.
- Don't convey a state by colour alone.

## Club pages

Every `/club/:id` page uses the same set of parts in `src/components/club`, with
layout, sizes and timing in `src/components/club/tokens.ts`. Those values apply
only there. The shared `ClubContentCards` still serve search, the dashboard and
club management, so change club-page content in `ClubContent.tsx` instead.

- Structure: a reading column and a full-height information panel (340–380px,
  24px padding) split by one hairline. The tab rule runs across to that divider
  and the panel's first line aligns with the back link.
- Display type: the club name at 64, 54 or 44px by length (46, 40, 34 on phones),
  plus the panel's meeting day, times and alerts heading. Headings inside tabs use
  `ClubHeading`, which is Atkinson Bold.
- Entry headings: 20 lead, 17 standard, 16 small. Agenda dates 22, next up 26.
  Section headings 20. Reading width 700px, with a 20px lead.
- The panel is bold but controlled, set by `PANEL_TYPE` and `PANEL_SPACE` in
  tokens.ts. Keep its structure: blue weekday blocks; the meeting day at 30px and
  the alerts heading at 20px in display type; lunch labels at 14 beside blue 19px
  display times; a full-width 42px button at 15px; 46px label and value rows split
  by hairlines, 13 and 15px regular; 14px alert labels with On or Off beside
  40x22 green switches.
- Each tab has its own shape: feed, agenda, file index, margin-labelled notes,
  president above a two-column board. None use cards.
- Tabs share one 2px blue underline that slides in 200ms. Panels fade in 170ms.
- Membership is one button. Its states are join, sending, joined (a green outline once,
  then quiet, "Leave club" on hover) and pending.

## Club Match Quiz

`/onboarding` asks one question at a time. Its parts live in `src/components/quiz`,
and the matching engine lives in `src/lib/clubMatch.ts`.

- Questions are about what a student enjoys doing, in the spirit of the O*NET
  Interest Profiler: activities, the kind of challenge, working style, what
  they want from a club, topics, experience and free times. Topics are offered
  only when a real club covers them. Up to three follow-ups ("What kind of coding?")
  appear only when earlier answers open an area that several clubs share.
- Every club's profile is read from its own name and description, and the
  matched words are kept. Reasons may only state what those words support.
  Never hand-write club traits; if a listing is too thin, say so (the results
  page names those clubs).
- Scoring is the `WEIGHTS` table: specific answers count most, each question has
  a cap, beginners are never ranked lower, member counts are never used, and a
  club that meets only when the student is busy is halved and listed separately.
- Layout: a 24px display label, "Question N of M" over a segmented blue bar, a 44px
  question (32 on phones), cards with a 24px display title and 14px line (2px
  border, 4px radius, solid blue with a white tick when chosen; ticks are squares
  for many, circles for one). Back, Skip and Continue sit in a fixed bottom bar.
  Questions slide in 220ms from the side they come from.
- Results: best matches (30px names, 34 for the first) with reasons on a 3px blue
  rule, the Mon–Fri strip, time, room, schedule fit and the club's own words about
  experience. Then more to explore, good fits at busy times, something different,
  every answer with Edit, and how matching works. Never show scores or percentages.

## Corner python

A 3D python lives behind the bottom-right corner on every page except the
quiz, whose Save button is pinned there. Its body slides out along a path that
starts off-screen. Each page visit gets one appearance: it lunges out, hisses once
and goes back in, then stays hidden until the next page. It ignores all clicks. It loads through `Scenes3D.ts` after the page settles, and holds one
still pose under reduced motion.

## Settings

`/settings` puts each section's name in a margin column with its rows beside it,
split by hairlines. Its parts and sizes live in `src/components/settings`: 32px
display title, 17px section names, 15px labels, 14px descriptions and buttons, and
40px controls (44px on phones). A switch row is one target, and handles Space itself.

## Profile

`/account` runs top to bottom: name, your clubs, then notification preferences and
account links side by side. Its parts and sizes live in `src/components/profile`.
The name is 44 to 96px on one line with the surname in blue, and role, email and
club summary sit right under it. Clubs are rows at 28px. Section headings are 24px
display type. Don't add promotional blocks to this page.

## Club map

`/map` (sidebar "Map") answers one question: where and when does a club meet.
Its parts live in `src/components/campusmap`. Floor outlines are traced from the
2026–2027 clubs poster in `plan.ts`. Clubs are placed by the room number in their
real `location`, so editing a club's room moves it on the map. Never type room
assignments into the page.

- Top: a 56px display title, one sentence, and the search line ("Find a club or
  room"). Results list under the field; arrow keys, Enter and Escape work.
  Picking a club switches floor, selects its room and marks that club in the panel.
  A club with no room opens its club page.
- Category filter: `TextTabs` with real counts. It changes which rooms are blue.
- Map: one floor at a time as a white miniature, rooms as separate blocks with a
  5-unit gap, the corridor in pale grey, soft shadows. Rooms with clubs are pale
  blue with a blue edge. A count badge appears when two or more clubs share a room.
  Rooms with your own clubs are green. The chosen room lifts and turns solid blue,
  and colours ease over about 150ms. Floors slide vertically when switched (the first
  sinks, the second rises). Rooms rise in once on load. Nothing moves on its own
  after that. On a stage taller than wide, the building turns so the corridor runs
  down the screen.
- Floor control: numbered 44px squares above the map, the active one filled blue.
- Panel: never empty. With no room picked, it gives an introduction and lists every
  room with clubs on the floor. With a room picked, it shows the room number at
  52px, floor and club count, then each club with its category, `WeekMarks` and
  time. On wide screens the map column is sticky.
- The homepage "Where clubs meet" section reuses the same scene in a simpler frame.

## Don't## Don't

- Rounded card grids, or the same card repeated down a page
- Gradients, glassmorphism, glows, blobs, decorative shapes
- An icon beside every line of text
- Tracked-out all-caps labels, eyebrows over every heading
- Purple, or any accent outside this palette
- Numbered markers on things that aren't a sequence
- Invented numbers, sample clubs, placeholder events
- Middle-dot metadata strings; write a plain comma-separated phrase
- Generic copy such as "Your Dashboard" or "Everything in one place"
- Animation that doesn't explain something
