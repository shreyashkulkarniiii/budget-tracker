import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function GmailCallback() {
  useEffect(() => {
    // Extract access token from URL hash
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const token = params.get('access_token');
        if (token) {
          // Store token in sessionStorage so gmail-import can pick it up
          sessionStorage.setItem('gmail_access_token', token);
        }
      }
      // Redirect back to gmail import
      router.replace('/gmail-import');
    }
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
      <Text style={styles.text}>Connecting Gmail...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  text: {
    fontSize: Typography.sizes.md,
    color: Colors.dark.textSecondary,
  },
});