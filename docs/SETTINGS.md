# Profile settings

Profile links to `/settings`, including while signed out. The page provides the existing real sign-in/sign-up flow, sign-out, and a shortcut to interests/career/availability preferences.

Light/dark theme, high contrast, and OpenDyslexic are saved on the device. They remain usable without signing in and apply throughout the app. High contrast changes shared text/surface/border colors while keeping blue and green actions. OpenDyslexic 3 regular/bold fonts are bundled locally under SIL OFL 1.1; license and original font notices are in `assets/fonts`. App text and inputs use the selected font; icon fonts are preserved. Native text respects OS text scaling, and the existing motion treatment respects the OS reduced-motion preference.

Browser verification covered profile navigation, light/dark contrast, actual computed font/color changes, cross-screen application, and persistence after reloading, at a 390px phone viewport. Settings controls expose labels, switch state, and selected theme state. TypeScript, regression tests, web export, and Android/Hermes export passed. Physical-device screen-reader and large-text layout testing remain necessary; no full accessibility conformance certification is claimed. Sign-out was not exercised on the owner's live session during visual testing.
