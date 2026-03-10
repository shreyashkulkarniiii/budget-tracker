import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Mail, ArrowRight, Chrome } from 'lucide-react-native';

type Step = 'landing' | 'email' | 'otp';

export default function Login() {
  const [step, setStep] = useState<Step>('landing');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://budget-tracker-rho-two.vercel.app',
          scopes: 'https://www.googleapis.com/auth/gmail.readonly',
        },
      });
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('otp');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) throw error;
      // Auth state change will trigger redirect in _layout.tsx
    } catch (error: any) {
      Alert.alert('Invalid Code', 'The code is incorrect or expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>₹</Text>
          </View>
          <Text style={styles.appName}>Budget Tracker</Text>
          <Text style={styles.tagline}>Track every rupee, effortlessly</Text>
        </View>

        {/* Landing step */}
        {step === 'landing' && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.dark.background} size="small" />
                : <Chrome size={20} color={Colors.dark.background} />
              }
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.emailButton}
              onPress={() => setStep('email')}
            >
              <Mail size={20} color={Colors.dark.text} />
              <Text style={styles.emailButtonText}>Continue with Email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Email step */}
        {step === 'email' && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>Enter your email</Text>
            <Text style={styles.stepSubtitle}>We'll send you a one-time code</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.dark.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.dark.background} size="small" />
                : <ArrowRight size={20} color={Colors.dark.background} />
              }
              <Text style={styles.primaryButtonText}>
                {loading ? 'Sending...' : 'Send Code'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('landing')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>Check your email</Text>
            <Text style={styles.stepSubtitle}>
              We sent a 6-digit code to{'\n'}<Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              value={otp}
              onChangeText={setOtp}
              placeholder="000000"
              placeholderTextColor={Colors.dark.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.dark.background} size="small" />
                : <ArrowRight size={20} color={Colors.dark.background} />
              }
              <Text style={styles.primaryButtonText}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('email'); setOtp(''); }}>
              <Text style={styles.backText}>← Change email</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  brand: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoBox: {
    width: 72, height: 72, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.dark.primary, alignItems: 'center',
    justifyContent: 'center', marginBottom: Spacing.md,
  },
  logoText: { fontSize: 36, color: Colors.dark.background, fontWeight: '700' },
  appName: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  tagline: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary },
  card: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border },
  googleButton: {
    flexDirection: 'row', backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  googleButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.background },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  divider: { flex: 1, height: 1, backgroundColor: Colors.dark.border },
  dividerText: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary, marginHorizontal: Spacing.sm },
  emailButton: {
    flexDirection: 'row', backgroundColor: Colors.dark.surfaceLight,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  emailButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.dark.text },
  stepTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  stepSubtitle: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },
  emailHighlight: { color: Colors.dark.primary, fontWeight: Typography.weights.semibold },
  input: {
    backgroundColor: Colors.dark.background, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: Typography.sizes.md, color: Colors.dark.text,
    borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.md,
  },
  otpInput: { fontSize: 28, fontWeight: Typography.weights.bold, textAlign: 'center', letterSpacing: 8 },
  primaryButton: {
    flexDirection: 'row', backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.background },
  backText: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary, textAlign: 'center' },
});