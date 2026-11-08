import { ReactNode, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import {
  AuthBrand,
  AuthBrandCompact,
  type AuthPurpose,
} from "@/components/auth/AuthBrand";
import { AuthField } from "@/components/auth/AuthField";
import { useReducedMotion } from "@/components/CampusVisual";
import { ViewSwitch } from "@/components/clubs/ViewSwitch";
import { Display, TextLink, useHover, webFade } from "@/components/system";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useLayout } from "@/theme/layout";

// Client-side LWSD gate. The database enforces the same rule independently:
// a BEFORE INSERT trigger on auth.users rejects non-LWSD addresses, so this
// is a UX nicety, not the security line.
const LWSD_RE = /^[^\s@]+@lwsd\.org$/i;

type Mode = "signIn" | "signUp";
type Step = "form" | "code";
const MODES = ["Sign in", "Sign up"] as const;

// Matches `min_interval_seconds` in insforge.toml: the backend rejects a
// resend inside this window, so don't offer the button until it has passed.
const RESEND_COOLDOWN_SECONDS = 60;

interface SignInGateProps {
  children: ReactNode;
  /** Short reason shown above the form, e.g. "Sign in to submit a club". */
  title?: string;
  subtitle?: string;
  initialEmail?: string;
  allowSignUp?: boolean;
  /** Offer Settings to signed-out visitors (reading options work without an account). */
  showSettings?: boolean;
  /** Which real data the brand panel highlights. */
  purpose?: AuthPurpose;
}

/**
 * Wraps any screen that needs a signed-in @lwsd.org user.
 *
 *   backend not configured  -> displays an unavailable message
 *   configured + signed out -> renders the LWSD sign-in / sign-up form
 *   configured + signed in  -> renders children
 *
 * Role checks belong to the wrapped screen via useAuth().profile; this gate
 * only proves identity, not authority.
 */
export function SignInGate({
  children,
  title = "Sign in to continue",
  subtitle = "Use your Lake Washington School District (@lwsd.org) account.",
  initialEmail = "",
  allowSignUp = true,
  showSettings = false,
  purpose = "general",
}: SignInGateProps) {
  const {
    configured,
    loading,
    session,
    signUp,
    verifyCode,
    signIn,
    resendCode,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDesktop, contentWidth, height, gutter } = useLayout();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>("signIn");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const { hovered: submitHover, hoverProps: submitHoverProps } = useHover();
  // A refused sign-in nudges the form once, so failure is felt as well as read.
  const nudge = useSharedValue(0);
  const nudgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));
  useEffect(() => {
    if (!error || reduced) return;
    nudge.value = withSequence(
      withTiming(-6, { duration: 50 }),
      withTiming(5, { duration: 70 }),
      withTiming(-3, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    );
  }, [error, reduced, nudge]);

  // Tick the resend cooldown down to zero, then re-enable the button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  if (!configured)
    return (
      <View className="flex-1 justify-center bg-light-bg px-5 dark:bg-dark-bg">
        <Text className="text-xl font-bold text-light-text dark:text-dark-text">
          Service unavailable
        </Text>
        <Text className="mt-3 text-light-muted dark:text-dark-muted">
          Account features are unavailable until the app can connect to its
          backend.
        </Text>
      </View>
    );
  if (session) return <>{children}</>;
  // Brief: the initial session restore is still in flight.
  if (loading) return <View className="flex-1 bg-light-bg dark:bg-dark-bg" />;

  const checkEmail = (value = email) =>
    LWSD_RE.test(value.trim())
      ? null
      : "Use your school email, ending in @lwsd.org.";
  const checkPassword = (value = password) =>
    value.length >= 8 ? null : "Passwords are at least 8 characters.";

  const validate = () => {
    const nextEmail = checkEmail();
    const nextPassword = checkPassword();
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    if (nextEmail || nextPassword) return null;
    return email.trim().toLowerCase();
  };

  /** Move to the code step and start the resend cooldown for the code just sent. */
  const enterCodeStep = (e: string, message: string) => {
    setEmail(e);
    setCode("");
    setNotice(message);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStep("code");
  };

  const submit = async () => {
    const e = validate();
    if (!e) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    const res =
      mode === "signUp" ? await signUp(e, password) : await signIn(e, password);
    setBusy(false);

    // An unverified account reaches here from either mode: sign-up returns
    // requiresCode for a brand-new user, sign-in returns it for someone who
    // never finished. Sending can fail while an older code is still usable.
    if (res.requiresCode) {
      enterCodeStep(
        e,
        res.error
          ? "Enter a previous code, or request a new one."
          : `We sent a 6-digit code to ${e}.`,
      );
      if (res.error) {
        setError(res.error);
        setCooldown(0);
      }
      return;
    }
    if (res.error) {
      setError(res.error);
      // The address is taken, so sign-up can never succeed; flip to sign-in
      // with the email kept so the user just types their password.
      if (res.existingAccount) {
        setMode("signIn");
        setEmail(e);
        setPassword("");
      }
      return;
    }
    setEmail(e);
  };

  const verify = async () => {
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setCodeError("Enter all 6 digits from your email.");
      return;
    }
    setCodeError(null);
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = await verifyCode(email, digits);
    setBusy(false);
    // On success the session updates and this component re-renders into children.
    if (res.error) setError(res.error);
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = await resendCode(email);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCode("");
    setNotice(`A new code is on its way to ${email}.`);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const split = isDesktop && contentWidth >= 860;
  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPasswordError(null);
  };
  const heading =
    step === "code"
      ? "Check your email"
      : mode === "signUp"
        ? "Create your account"
        : title;
  const detail =
    step === "code"
      ? "Enter the code we sent to finish setting up your account."
      : subtitle;
  const submitLabel = mode === "signUp" ? "Create account" : "Sign in";

  const primary = (
    label: string,
    action: () => void,
    disabled = false,
  ) => (
    <Pressable
      onPress={action}
      disabled={busy || disabled}
      {...submitHoverProps}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy || disabled }}
      className="h-[68px] flex-row items-center justify-between rounded-sm bg-python-blue px-5"
      style={[
        {
          opacity: busy ? 0.75 : disabled ? 0.45 : submitHover ? 0.9 : 1,
        },
        webFade("opacity"),
      ]}
    >
      <Display fontSize={34} className="text-white">
        {busy ? "One moment" : label}
      </Display>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : null}
    </Pressable>
  );

  const messages = (
    <>
      {notice && !error ? (
        <Animated.View entering={FadeIn.duration(160)} className="mb-3">
          <Text
            accessibilityLiveRegion="polite"
            className="text-base font-bold text-python-green dark:text-python-green-light"
          >
            {notice}
          </Text>
        </Animated.View>
      ) : null}
      {error ? (
        <Animated.View style={nudgeStyle} className="mb-3">
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            className="text-base font-bold text-danger"
          >
            {error}
          </Text>
        </Animated.View>
      ) : null}
    </>
  );

  const form = (
    <View className="w-full" style={{ maxWidth: 440 }}>
      <Animated.View
        key={`${step}-${mode}`}
        entering={reduced ? undefined : FadeIn.duration(170)}
      >
        <Display fontSize={split ? 62 : 48} accessibilityRole="header">
          {heading}
        </Display>
        <Text className="mt-2 text-lg leading-7 text-light-secondary dark:text-dark-secondary">
          {detail}
        </Text>
      </Animated.View>

      {step === "form" ? (
        <View className="mt-7">
          {allowSignUp ? (
            <View className="mb-6 items-start">
              <ViewSwitch
                options={MODES}
                value={mode === "signIn" ? "Sign in" : "Sign up"}
                onChange={(next) =>
                  switchMode(next === "Sign in" ? "signIn" : "signUp")
                }
                width={110}
                label="Sign in or sign up"
              />
            </View>
          ) : null}
          <AuthField
            label="School email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError(null);
              if (error) setError(null);
            }}
            onBlur={() => {
              if (email.trim()) setEmailError(checkEmail());
            }}
            error={emailError}
            placeholder="you@lwsd.org"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <View className="mt-3">
            <AuthField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (passwordError) setPasswordError(null);
                if (error) setError(null);
              }}
              error={passwordError}
              hint={mode === "signUp" ? "At least 8 characters." : undefined}
              placeholder={mode === "signUp" ? "Choose a password" : "Your password"}
              secureTextEntry
              reveal
              autoCapitalize="none"
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              textContentType={mode === "signUp" ? "newPassword" : "password"}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </View>
          <View className="mt-3">
            {messages}
            {primary(submitLabel, submit)}
          </View>
        </View>
      ) : (
        <View className="mt-7">
          <View className="mb-5 flex-row items-center justify-between gap-3">
            <Text
              numberOfLines={1}
              className="shrink text-base font-bold text-light-text dark:text-dark-text"
            >
              {email}
            </Text>
            <TextLink
              label="Change email"
              onPress={() => {
                setStep("form");
                setCode("");
                setError(null);
                setNotice(null);
                setCodeError(null);
              }}
            />
          </View>
          <AuthField
            label="6-digit code"
            large
            value={code}
            onChangeText={(t) => {
              setCode(t.replace(/\D/g, "").slice(0, 6));
              if (codeError) setCodeError(null);
              if (error) setError(null);
            }}
            error={codeError}
            hint="The code expires shortly."
            placeholder="000000"
            keyboardType="number-pad"
            autoCapitalize="none"
            returnKeyType="go"
            maxLength={6}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            onSubmitEditing={verify}
          />
          <View className="mt-3">
            {messages}
            {primary("Verify and continue", verify)}
          </View>
          <View className="mt-2 items-start">
            <TextLink
              label={
                cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : "Didn't get it? Resend code"
              }
              accessibilityLabel="Resend verification code"
              disabled={cooldown > 0 || busy}
              onPress={resend}
            />
          </View>
        </View>
      )}

      <Text className="mt-5 text-sm leading-5 text-light-muted dark:text-dark-muted">
        Only Lake Washington School District accounts can sign in. The server
        checks your access on every request.
      </Text>
    </View>
  );

  const utility = (
    <View className="flex-row items-center justify-between">
      {showSettings ? (
        <TextLink
          label="Settings and accessibility"
          icon="settings-outline"
          onPress={() => router.push("/settings")}
        />
      ) : (
        <View />
      )}
      {!isDesktop ? <ThemeToggle /> : null}
    </View>
  );

  if (split)
    return (
      <View className="flex-1 flex-row bg-light-bg dark:bg-dark-bg">
        <View style={{ flex: 6, minWidth: 0 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, minHeight: 620 }}>
            <AuthBrand
              purpose={purpose}
              height={Math.max(height, 620)}
              width={(contentWidth * 6) / 11}
            />
          </ScrollView>
        </View>
        <View style={{ flex: 5, minWidth: 0 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 48,
              paddingTop: 24,
              paddingBottom: 48,
            }}
          >
            {utility}
            <View className="flex-1 justify-end pt-6">{form}</View>
          </ScrollView>
        </View>
      </View>
    );

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: gutter,
      }}
    >
      {utility}
      <View className="mt-3 border-b border-light-border pb-6 dark:border-dark-border">
        <AuthBrandCompact purpose={purpose} width={contentWidth - gutter * 2} />
      </View>
      <View className="mt-6">{form}</View>
    </ScrollView>
  );
}
