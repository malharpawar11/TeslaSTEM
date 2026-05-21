import { ReactNode, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, PressableScale } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { brand } from '@/theme/tokens';

// Client-side LWSD gate. The database enforces the same rule independently —
// the profiles.email CHECK constraint and the handle_new_user() trigger both
// reject non-LWSD addresses — so this is a UX nicety, not the security line.
const LWSD_RE = /@lwsd\.org$/i;

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
 *   configured + signed out -> renders the LWSD email OTP sign-in flow
 *   configured + signed in  -> renders children
 *
 * Role checks belong to the wrapped screen via useAuth().profile — this gate
 * only proves identity, not authority.
 */
export function SignInGate({
  children,
  title = 'Sign in to continue',
  subtitle = 'Use your Lake Washington School District (@lwsd.org) account.',
}: SignInGateProps) {
  const { configured, loading, session, requestOtp, verifyOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Demo mode (no backend) or an existing session: pass straight through.
  if (!configured || session) return <>{children}</>;
  // Brief: the initial getSession() call is still in flight.
  if (loading) return <View className="flex-1 bg-light-bg dark:bg-dark-bg" />;

  const sendCode = async () => {
    const e = email.trim().toLowerCase();
    if (!LWSD_RE.test(e)) {
      setError('Enter a valid @lwsd.org school email.');
      return;
    }
    setError(null);
    setBusy(true);
    const res = await requestOtp(e);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEmail(e);
    setStep('code');
  };

  const verify = async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    setBusy(true);
    const res = await verifyOtp(email, code);
    setBusy(false);
    // On success the session updates and this component re-renders into children.
    if (res.error) setError(res.error);
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
        <Animated.View entering={FadeInDown.duration(420)} className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-python-green/14">
            <Ionicons name="shield-checkmark" size={30} color={brand.green} />
          </View>
          <Text className="mt-5 text-center text-2xl font-extrabold tracking-tight text-light-text dark:text-dark-text">
            {title}
          </Text>
          <Text className="mt-2 max-w-xs text-center text-sm leading-6 text-light-muted dark:text-dark-muted">
            {subtitle}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(420)} className="mt-7">
          <Card elevation="ambient" className="p-5">
            {step === 'email' ? (
              <View className="gap-4">
                <Input
                  label="School email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@lwsd.org"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                  returnKeyType="go"
                  onSubmitEditing={sendCode}
                />
                <Button
                  label="Send sign-in code"
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon="paper-plane"
                  loading={busy}
                  onPress={sendCode}
                />
              </View>
            ) : (
              <View className="gap-4">
                <View className="flex-row items-center gap-2 rounded-xl bg-light-surface-2 px-3 py-2.5 dark:bg-dark-surface-2">
                  <Ionicons name="mail" size={15} color={brand.green} />
                  <Text
                    className="flex-1 text-sm font-semibold text-light-secondary dark:text-dark-secondary"
                    numberOfLines={1}
                  >
                    {email}
                  </Text>
                  <PressableScale
                    onPress={() => {
                      setStep('email');
                      setCode('');
                      setError(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Change email"
                  >
                    <Text className="text-xs font-bold uppercase tracking-wide text-python-green-dark dark:text-python-green-light">
                      Change
                    </Text>
                  </PressableScale>
                </View>
                <Input
                  label="6-digit code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  icon="keypad-outline"
                  returnKeyType="go"
                  onSubmitEditing={verify}
                  helper="Check your inbox — the code expires shortly."
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
                  onPress={sendCode}
                  accessibilityRole="button"
                  accessibilityLabel="Resend code"
                  className="items-center py-1"
                >
                  <Text className="text-xs font-semibold text-light-muted dark:text-dark-muted">
                    Didn&apos;t get it? <Text className="text-python-green-dark dark:text-python-green-light">Resend code</Text>
                  </Text>
                </PressableScale>
              </View>
            )}

            {error ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                className="mt-4 flex-row items-start gap-2 rounded-xl border border-danger/40 bg-danger/14 p-3"
              >
                <Ionicons name="alert-circle" size={16} color="#E11D48" />
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
