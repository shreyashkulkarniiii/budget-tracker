import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { LogOut, User, Shield, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Settings() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const avatar = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          {avatar
            ? <Image source={{ uri: avatar }} style={styles.avatar} />
            : <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{name[0].toUpperCase()}</Text>
              </View>
          }
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#1A3A3A' }]}>
              <User size={18} color={Colors.dark.primary} />
            </View>
            <Text style={styles.menuText}>Account</Text>
          </View>
          <Text style={styles.menuValue}>{email}</Text>
        </View>

        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#1A2A3A' }]}>
              <Shield size={18} color="#4ECDC4" />
            </View>
            <Text style={styles.menuText}>Data & Privacy</Text>
          </View>
          <Text style={styles.menuValue}>Your data is private</Text>
        </View>

        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#2A2A1A' }]}>
              <Info size={18} color="#FFD93D" />
            </View>
            <Text style={styles.menuText}>Version</Text>
          </View>
          <Text style={styles.menuValue}>1.0.0</Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)}>
        <LogOut size={20} color={Colors.dark.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmLogout}>
                <Text style={styles.modalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    paddingTop: 60, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg, backgroundColor: Colors.dark.surface,
  },
  headerTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: Spacing.lg, backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.md,
  },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  avatar: { width: 60, height: 60 },
  avatarFallback: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 24, fontWeight: Typography.weights.bold, color: Colors.dark.background },
  profileInfo: { flex: 1 },
  profileName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: 4 },
  profileEmail: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary },
  menuSection: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.dark.border, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuIcon: { width: 36, height: 36, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  menuText: { fontSize: Typography.sizes.md, color: Colors.dark.text, fontWeight: Typography.weights.medium },
  menuValue: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary, maxWidth: 150, textAlign: 'right' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    margin: Spacing.lg, backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.dark.error, gap: Spacing.sm,
  },
  logoutText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalBox: {
    backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, width: '80%', borderWidth: 1, borderColor: Colors.dark.border,
  },
  modalTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.sm },
  modalMessage: { fontSize: Typography.sizes.md, color: Colors.dark.textSecondary, marginBottom: Spacing.xl },
  modalButtons: { flexDirection: 'row', gap: Spacing.md },
  modalCancel: {
    flex: 1, backgroundColor: Colors.dark.surfaceLight, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border,
  },
  modalCancelText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.dark.text },
  modalConfirm: {
    flex: 1, backgroundColor: Colors.dark.error, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  modalConfirmText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: '#FFFFFF' },
});