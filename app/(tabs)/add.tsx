import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !merchant) {
      Alert.alert('Missing Information', 'Please enter amount and merchant');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('expenses').insert({
        amount: amountNum,
        category: selectedCategory,
        merchant: merchant.trim(),
        description: description.trim() || null,
        transaction_date: new Date(transactionDate).toISOString(),
        is_imported: false,
      });

      if (error) throw error;

      setAmount('');
      setMerchant('');
      setDescription('');
      setSelectedCategory('Food');
      setTransactionDate(new Date().toISOString().slice(0, 16));

      Alert.alert('Success', 'Expense added successfully', [
        { text: 'Add Another', onPress: () => {} },
        { text: 'View Dashboard', onPress: () => router.push('/(tabs)') },
      ]);
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <Text style={styles.headerSubtitle}>Record a new transaction</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <TouchableOpacity
          style={styles.gmailImportButton}
          onPress={() => router.push('/gmail-import')}
        >
          <Mail size={20} color={Colors.dark.primary} />
          <Text style={styles.gmailImportButtonText}>Import from Gmail (UPI)</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.dark.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Merchant / Description</Text>
            <TextInput
              style={styles.input}
              value={merchant}
              onChangeText={setMerchant}
              placeholder="e.g., Swiggy, Metro, Amazon"
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View
                    style={[
                      styles.categoryDot,
                      {
                        backgroundColor:
                          Colors.dark.categories[category as keyof typeof Colors.dark.categories],
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === category && styles.categoryTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                  {selectedCategory === category && (
                    <Check size={16} color={Colors.dark.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes about this expense"
              placeholderTextColor={Colors.dark.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date & Time</Text>
            <TextInput
              style={styles.input}
              value={transactionDate}
              onChangeText={setTransactionDate}
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={Colors.dark.textSecondary}
            />
            <Text style={styles.hint}>Format: YYYY-MM-DD HH:MM</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Adding...' : 'Add Expense'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.dark.surface,
  },
  headerTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: Spacing.xs,
  },
  categoryChipSelected: {
    backgroundColor: Colors.dark.surfaceLight,
    borderColor: Colors.dark.primary,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  categoryTextSelected: {
    color: Colors.dark.text,
    fontWeight: Typography.weights.semibold,
  },
  submitButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.background,
  },
});
