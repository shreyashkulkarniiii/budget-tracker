import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://budget-tracker-rho-two.vercel.app',
          scopes: 'https://www.googleapis.com/auth/gmail.readonly',
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.logo}>💰</Text>
        <Text style={styles.appName}>Budget Tracker</Text>
        <Text style={styles.tagline}>Your personal UPI spending tracker</Text>
      </View>

      <View style={styles.card}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={styles.googleIcon}>G</Text>
          }
          <Text style={styles.googleButtonText}>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background, justifyContent: 'center', padding: Spacing.lg },
  top: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { fontSize: 64, marginBottom: Spacing.sm },
  appName: { fontSize: 32, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  tagline: { fontSize: Typography.sizes.md, color: Colors.dark.textSecondary },
  card: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.dark.border },
  errorText: { fontSize: Typography.sizes.sm, color: Colors.dark.error, marginBottom: Spacing.md, textAlign: 'center' },
  googleButton: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  googleIcon: { fontSize: 18, fontWeight: Typography.weights.bold, color: '#4285F4' },
  googleButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: '#000000' },
});