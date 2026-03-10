import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, CATEGORIES, type Category } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Check, Mail } from 'lucide-react-native';

export default function AddExpense() {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Food');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!amount || !merchant) { setError('Please enter amount and merchant'); return; }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { setError('Please enter a valid amount'); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not logged in'); return; }

      const { error } = await supabase.from('expenses').insert({
        amount: amountNum,
        category: selectedCategory,
        merchant: merchant.trim(),
        description: description.trim() || null,
        transaction_date: new Date(transactionDate).toISOString(),
        is_imported: false,
        user_id: user.id,
      });
      if (error) throw error;

      setAmount('');
      setMerchant('');
      setDescription('');
      setSelectedCategory('Food');
      setTransactionDate(new Date().toISOString().slice(0, 16));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e: any) {
      console.error('Error adding expense:', e);
      setError('Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <Text style={styles.headerSubtitle}>Record a new transaction</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <TouchableOpacity style={styles.gmailBanner} onPress={() => router.push('/gmail-import')} activeOpacity={0.85}>
          <View style={styles.gmailBannerLeft}>
            <View style={styles.gmailIconContainer}>
              <Mail size={24} color={Colors.dark.background} />
            </View>
            <View>
              <Text style={styles.gmailBannerTitle}>Import from Gmail</Text>
              <Text style={styles.gmailBannerSubtitle}>Auto-import UPI transactions</Text>
            </View>
          </View>
          <Text style={styles.gmailBannerArrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or add manually</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>✓ Expense added successfully!</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={Colors.dark.textSecondary} keyboardType="decimal-pad" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Merchant / Description</Text>
            <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} placeholder="e.g., Swiggy, Metro, Amazon" placeholderTextColor={Colors.dark.textSecondary} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipSelected]} onPress={() => setSelectedCategory(category)}>
                  <View style={[styles.categoryDot, { backgroundColor: Colors.dark.categories[category as keyof typeof Colors.dark.categories] }]} />
                  <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextSelected]}>{category}</Text>
                  {selectedCategory === category && <Check size={16} color={Colors.dark.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes (Optional)</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Add notes about this expense" placeholderTextColor={Colors.dark.textSecondary} multiline numberOfLines={3} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date & Time</Text>
            <TextInput style={styles.input} value={transactionDate} onChangeText={setTransactionDate} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={Colors.dark.textSecondary} />
            <Text style={styles.hint}>Format: YYYY-MM-DD HH:MM</Text>
          </View>

          <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitButtonText}>{loading ? 'Adding...' : 'Add Expense'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, backgroundColor: Colors.dark.surface },
  headerTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary },
  scrollView: { flex: 1 },
  gmailBanner: { margin: Spacing.lg, marginBottom: 0, backgroundColor: Colors.dark.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gmailBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  gmailIconContainer: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  gmailBannerTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.background },
  gmailBannerSubtitle: { fontSize: Typography.sizes.xs, color: 'rgba(0,0,0,0.6)', marginTop: 2 },
  gmailBannerArrow: { fontSize: 20, color: Colors.dark.background, fontWeight: Typography.weights.bold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginVertical: Spacing.lg },
  divider: { flex: 1, height: 1, backgroundColor: Colors.dark.border },
  dividerText: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary, marginHorizontal: Spacing.sm },
  form: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  errorText: { fontSize: Typography.sizes.sm, color: Colors.dark.error, marginBottom: Spacing.md, textAlign: 'center' },
  successText: { fontSize: Typography.sizes.sm, color: Colors.dark.primary, marginBottom: Spacing.md, textAlign: 'center', fontWeight: Typography.weights.bold },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.dark.text, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.sizes.md, color: Colors.dark.text, borderWidth: 1, borderColor: Colors.dark.border },
  textArea: { height: 80, textAlignVertical: 'top' },
  hint: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary, marginTop: Spacing.xs },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.xs },
  categoryChipSelected: { backgroundColor: Colors.dark.surfaceLight, borderColor: Colors.dark.primary },
  categoryDot: { width: 8, height: 8, borderRadius: BorderRadius.full },
  categoryText: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary },
  categoryTextSelected: { color: Colors.dark.text, fontWeight: Typography.weights.semibold },
  submitButton: { backgroundColor: Colors.dark.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.background },
});