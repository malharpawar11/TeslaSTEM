import { ReactNode, useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, PressableScale } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { brand, semantic } from '@/theme/tokens';

// Client-side LWSD gate. The database enforces the same rule independently:
// a BEFORE INSERT trigger on auth.users rejects non-LWSD addresses, so this
// is a UX nicety, not the security line.
const LWSD_RE = /@lwsd\.org$/i;

type Mode = 'signIn' | 'signUp';
type Step = 'form' | 'code';

// Matches `min_interval_seconds` in insforge.toml: the backend rejects a
// resend inside this window, so don't offer the button until it has passed.
const RESEND_COOLDOWN_SECONDS = 60;

interface SignInGateProps {
  children: ReactNode;
  /** Short reason shown above the form, e.g. "Sign in to submit a club". */
  title?: string;
  subtitle?: string;
}

/**
 * Wraps any screen that needs a signed-in @lwsd.org user.
 *
 *   backend not configured  -> renders children (local demo mode)
 *   configured + signed out -> renders the LWSD sign-in / sign-up form
 *   configured + signed in  -> renders children
 *
 * Role checks belong to the wrapped screen via useAuth().profile; this gate
 * only proves identity, not authority.
 */
export function SignInGate({
  children,
  title = 'Sign in to continue',
  subtitle = 'Use your Lake Washington School District (@lwsd.org) account.',
}: SignInGateProps) {
  const { configured, loading, session, signUp, verifyCode, signIn, resendCode } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signIn');
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Tick the resend cooldown down to zero, then re-enable the button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Demo mode (no backend) or an existing session: pass straight through.
  if (!configured || session) return <>{children}</>;
  // Brief: the initial session restore is still in flight.
  if (loading) return <View className="flex-1 bg-light-bg dark:bg-dark-bg" />;

  const validate = () => {
    const e = email.trim().toLowerCase();
    if (!LWSD_RE.test(e)) {
      setError('Enter a valid @lwsd.org school email.');
      return null;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return null;
    }
    return e;
  };

  /** Move to the code step and start the resend cooldown for the code just sent. */
  const enterCodeStep = (e: string, message: string) => {
    setEmail(e);
    setCode('');
    setNotice(message);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStep('code');
  };

  const submit = async () => {
    const e = validate();
    if (!e) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = mode === 'signUp' ? await signUp(e, password) : await signIn(e, password);
    setBusy(false);

    // An unverified account reaches here from either mode: sign-up returns
    // requiresCode for a brand-new user, sign-in returns it for someone who
    // never finished. Both mean "a code is in their inbox".
    if (res.requiresCode) {
      enterCodeStep(e, `We sent a 6-digit code to ${e}.`);
      return;
    }
    if (res.error) {
      setError(res.error);
      // The address is taken, so sign-up can never succeed; flip to sign-in
      // with the email kept so the user just types their password.
      if (res.existingAccount) {
        setMode('signIn');
        setEmail(e);
        setPassword('');
      }
      return;
    }
    setEmail(e);
  };

  const verify = async () => {
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
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
    setCode('');
    setNotice(`A new code is on its way to ${email}.`);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <View
      className="flex-1 bg-light-bg px-6 dark:bg-dark-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row justify-end pt-2">
        <ThemeToggle />
      </View>

      <View className="flex-1 justify-center">
        <Animated.View entering={FadeIn.duration(180)} className="items-center">
          <View className="h-14 w-14 items-center justify-center rounded-xl bg-python-blue/10 dark:bg-python-blue/20">
            <Ionicons name="shield-checkmark-outline" size={26} color={brand.blue} />
          </View>
          <Text className="mt-5 text-center text-xl font-semibold tracking-tight text-light-text dark:text-dark-text">
            {title}
          </Text>
          <Text className="mt-2 max-w-xs text-center text-sm leading-5 text-light-muted dark:text-dark-muted">
            {subtitle}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(180)} className="mt-7">
          <Card elevation="ambient" className="p-5">
            {step === 'form' ? (
              <View className="gap-4">
                {/* Sign in / sign up toggle */}
                <View className="flex-row rounded-xl bg-light-surface-2 p-1 dark:bg-dark-surface-2">
                  <PressableScale
                    onPress={() => {
                      setMode('signIn');
                      setError(null);
                      setNotice(null);
                    }}
                    className={`flex-1 items-center rounded-lg py-2 ${
                      mode === 'signIn' ? 'bg-light-surface dark:bg-dark-surface' : ''
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in"
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        mode === 'signIn'
                          ? 'text-python-blue-dark dark:text-python-blue-light'
                          : 'text-light-muted dark:text-dark-muted'
                      }`}
                    >
                      Sign in
                    </Text>
                  </PressableScale>
                  <PressableScale
                    onPress={() => {
                      setMode('signUp');
                      setError(null);
                      setNotice(null);
                    }}
                    className={`flex-1 items-center rounded-lg py-2 ${
                      mode === 'signUp' ? 'bg-light-surface dark:bg-dark-surface' : ''
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel="Sign up"
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        mode === 'signUp'
                          ? 'text-python-blue-dark dark:text-python-blue-light'
                          : 'text-light-muted dark:text-dark-muted'
                      }`}
                    >
                      Sign up
                    </Text>
                  </PressableScale>
                </View>

                <Input
                  label="School email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@lwsd.org"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                  returnKeyType="next"
                />
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signUp' ? 'At least 8 characters' : 'Your password'}
                  secureTextEntry
                  autoCapitalize="none"
                  icon="lock-closed-outline"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
                <Button
                  label={mode === 'signUp' ? 'Create account' : 'Sign in'}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={mode === 'signUp' ? 'person-add' : 'log-in'}
                  loading={busy}
                  onPress={submit}
                />
              </View>
            ) : (
              <View className="gap-4">
                <View className="flex-row items-center gap-2 rounded-xl bg-light-surface-2 px-3 py-2.5 dark:bg-dark-surface-2">
                  <Ionicons name="mail-outline" size={15} color={brand.blue} />
                  <Text
                    className="flex-1 text-sm font-semibold text-light-secondary dark:text-dark-secondary"
                    numberOfLines={1}
                  >
                    {email}
                  </Text>
                  <PressableScale
                    onPress={() => {
                      setStep('form');
                      setCode('');
                      setError(null);
                      setNotice(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Change email"
                  >
                    <Text className="text-xs font-semibold text-python-blue-dark dark:text-python-blue-light">
                      Change
                    </Text>
                  </PressableScale>
                </View>
                <Input
                  label="6-digit code"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  icon="keypad-outline"
                  returnKeyType="go"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  onSubmitEditing={verify}
                  helper="Check your inbox: the code expires shortly."
                />
                <Button
                  label="Verify & continue"
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon="checkmark"
                  loading={busy}
                  onPress={verify}
                />
                <PressableScale
                  onPress={resend}
                  disabled={cooldown > 0 || busy}
                  className="items-center py-1"
                  accessibilityRole="button"
                  accessibilityLabel="Resend verification code"
                >
                  <Text
                    className={`text-xs font-semibold ${
                      cooldown > 0
                        ? 'text-light-subtle dark:text-dark-subtle'
                        : 'text-python-blue-dark dark:text-python-blue-light'
                    }`}
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get it? Resend code"}
                  </Text>
                </PressableScale>
              </View>
            )}

            {notice && !error ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                className="mt-4 flex-row items-start gap-2 rounded-xl border border-python-blue/40 bg-python-blue/10 p-3 dark:bg-python-blue/20"
              >
                <Ionicons name="mail-unread-outline" size={16} color={brand.blue} />
                <Text className="flex-1 text-xs font-semibold leading-5 text-python-blue-dark dark:text-python-blue-light">
                  {notice}
                </Text>
              </Animated.View>
            ) : null}

            {error ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                className="mt-4 flex-row items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 dark:bg-danger/20 p-3"
              >
                <Ionicons name="alert-circle" size={16} color={semantic.danger} />
                <Text className="flex-1 text-xs font-semibold leading-5 text-danger">
                  {error}
                </Text>
              </Animated.View>
            ) : null}
          </Card>
        </Animated.View>

        <Text className="mt-5 text-center text-2xs leading-5 text-light-subtle dark:text-dark-subtle">
          Only Lake Washington School District accounts can sign in.{'\n'}
          Access is verified by the server on every request.
        </Text>
      </View>
    </View>
  );
}
