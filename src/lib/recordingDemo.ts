const baseUrl = process.env.EXPO_PUBLIC_INSFORGE_URL ?? "";
// The live production backend can never enable demo presentation or login hints.
export const isRecordingDemo =
  process.env.EXPO_PUBLIC_RECORDING_DEMO === "true" &&
  /^https:\/\/p252r4ze-[a-z0-9]+\.us-east\.insforge\.app$/.test(baseUrl);
export const DEMO_CLUB_ID = process.env.EXPO_PUBLIC_DEMO_CLUB_ID ?? "";
export const DEMO_PRESIDENT_EMAIL = "fbla.demo.president@lwsd.org";
export const DEMO_MEMBER_EMAIL = "fbla.demo.member@lwsd.org";
