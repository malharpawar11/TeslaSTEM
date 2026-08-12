import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BrandHeader } from '@/components/BrandHeader';
import { env } from '@/config/env';
import {
  RESEND_COOLDOWN_SECONDS,
  VERIFICATION_CODE_LENGTH,
  normalizeCode,
  sendVerificationCode,
  verifyCode,
} from '@/lib/auth';
import { colors, radius } from '@/theme/tokens';

type Step = 'email' | 'code';

export function SignInScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cooldown]);

  async function handleSendCode() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await sendVerificationCode(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep('code');
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice(`We sent a ${VERIFICATION_CODE_LENGTH}-digit code to ${email.trim().toLowerCase()}.`);
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    const result = await verifyCode(email, code);
    setBusy(false);
    // On success the auth listener in AuthProvider swaps this screen out; there
    // is nothing to navigate to here.
    if (!result.ok) setError(result.message);
  }

  function handleChangeEmail() {
    setStep('email');
    setCode('');
    setError(null);
    setNotice(null);
  }

  const canSend = email.trim().length > 3 && !busy;
  const canVerify = normalizeCode(code).length === VERIFICATION_CODE_LENGTH && !busy;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandHeader />
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          Only {env.allowedEmailDomain} school accounts can access the club directory. We email you
          a one-time verification code — no password to remember.
        </Text>

        {step === 'email' ? (
          <View style={styles.card}>
            <Text style={styles.label}>School email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={`you${env.allowedEmailDomain}`}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!busy}
              onSubmitEditing={() => canSend && handleSendCode()}
              style={styles.input}
            />
            <Pressable
              onPress={handleSendCode}
              disabled={!canSend}
              style={[styles.primary, !canSend && styles.disabled]}
            >
              {busy ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.primaryText}>Email me a code</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(normalizeCode(value))}
              placeholder="000000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={VERIFICATION_CODE_LENGTH}
              editable={!busy}
              onSubmitEditing={() => canVerify && handleVerify()}
              style={[styles.input, styles.codeInput]}
            />
            <Pressable
              onPress={handleVerify}
              disabled={!canVerify}
              style={[styles.primary, !canVerify && styles.disabled]}
            >
              {busy ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.primaryText}>Verify and continue</Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleSendCode}
              disabled={cooldown > 0 || busy}
              style={styles.secondary}
            >
              <Text style={[styles.secondaryText, (cooldown > 0 || busy) && styles.mutedText]}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            </Pressable>
            <Pressable onPress={handleChangeEmail} disabled={busy} style={styles.secondary}>
              <Text style={styles.secondaryText}>Use a different email</Text>
            </Pressable>
          </View>
        )}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 12 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
    marginTop: 22,
  },
  label: { color: colors.secondary, fontWeight: '900', marginBottom: 8 },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    padding: 14,
    fontSize: 16,
  },
  codeInput: { fontSize: 28, letterSpacing: 10, textAlign: 'center', fontWeight: '800' },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryText: { color: colors.bg, fontWeight: '900', fontSize: 16 },
  disabled: { opacity: 0.5 },
  secondary: { padding: 12, alignItems: 'center' },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  mutedText: { color: colors.muted },
  notice: { color: colors.muted, marginTop: 16, lineHeight: 20 },
  error: { color: colors.danger, marginTop: 12, fontWeight: '700', lineHeight: 20 },
});
