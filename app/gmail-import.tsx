import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, type Category } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Mail, Check, X, ArrowLeft, RefreshCw } from 'lucide-react-native';

type UPITransaction = {
  id: string;
  amount: number;
  merchant: string;
  date: string;
  source: 'GPay' | 'PhonePe' | 'Paytm';
  category: Category;
  selected: boolean;
};

export default function GmailImport() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<UPITransaction[]>([]);
  const [scanning, setScanning] = useState(false);

  const mockScanEmails = () => {
    setScanning(true);
    setTimeout(() => {
      const mockTransactions: UPITransaction[] = [
        {
          id: '1',
          amount: 450,
          merchant: 'Swiggy',
          date: new Date().toISOString(),
          source: 'GPay',
          category: 'Food',
          selected: true,
        },
        {
          id: '2',
          amount: 50,
          merchant: 'Delhi Metro',
          date: new Date(Date.now() - 86400000).toISOString(),
          source: 'PhonePe',
          category: 'Transport',
          selected: true,
        },
        {
          id: '3',
          amount: 1299,
          merchant: 'Amazon',
          date: new Date(Date.now() - 172800000).toISOString(),
          source: 'Paytm',
          category: 'Shopping',
          selected: true,
        },
        {
          id: '4',
          amount: 299,
          merchant: 'BookMyShow',
          date: new Date(Date.now() - 259200000).toISOString(),
          source: 'GPay',
          category: 'Entertainment',
          selected: true,
        },
      ];
      setTransactions(mockTransactions);
      setScanning(false);
    }, 2000);
  };

  const toggleTransaction = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const updateCategory = (id: string, category: Category) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category } : t))
    );
  };

  const importSelected = async () => {
    const selectedTransactions = transactions.filter((t) => t.selected);
    if (selectedTransactions.length === 0) {
      Alert.alert('No Transactions', 'Please select at least one transaction to import');
      return;
    }

    setLoading(true);
    try {
      const expensesToInsert = selectedTransactions.map((t) => ({
        amount: t.amount,
        category: t.category,
        merchant: t.merchant,
        transaction_date: t.date,
        is_imported: true,
        import_source: t.source,
      }));

      const { error } = await supabase.from('expenses').insert(expensesToInsert);

      if (error) throw error;

      Alert.alert(
        'Success',
        `Imported ${selectedTransactions.length} transaction${selectedTransactions.length > 1 ? 's' : ''}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error importing transactions:', error);
      Alert.alert('Error', 'Failed to import transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Gmail UPI Import</Text>
          <Text style={styles.headerSubtitle}>Import from GPay, PhonePe, Paytm</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Mail size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyTitle}>Scan UPI Emails</Text>
            <Text style={styles.emptyText}>
              This feature will scan your Gmail for UPI transaction emails from GPay,
              PhonePe, and Paytm
            </Text>
            <Text style={styles.noteText}>
              Note: Gmail API integration requires OAuth setup. This is a demo showing how
              the import preview would work.
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={mockScanEmails}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <RefreshCw size={20} color={Colors.dark.background} />
                  <Text style={styles.scanButtonText}>Scanning...</Text>
                </>
              ) : (
                <>
                  <Mail size={20} color={Colors.dark.background} />
                  <Text style={styles.scanButtonText}>Scan Emails (Demo)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>
                Found {transactions.length} transaction{transactions.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.previewSubtitle}>
                Review and select to import
              </Text>
            </View>

            {transactions.map((transaction) => (
              <View
                key={transaction.id}
                style={[
                  styles.transactionCard,
                  !transaction.selected && styles.transactionCardDisabled,
                ]}
              >
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleTransaction(transaction.id)}
                >
                  <View
                    style={[
                      styles.checkboxInner,
                      transaction.selected && styles.checkboxSelected,
                    ]}
                  >
                    {transaction.selected && (
                      <Check size={16} color={Colors.dark.background} />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.transactionInfo}>
                  <View style={styles.transactionRow}>
                    <Text style={styles.merchant}>{transaction.merchant}</Text>
                    <Text style={styles.amount}>
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                  <View style={styles.transactionRow}>
                    <Text style={styles.source}>{transaction.source}</Text>
                    <Text style={styles.date}>{formatDate(transaction.date)}</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categorySelector}
                  >
                    {['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Others'].map(
                      (cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            transaction.category === cat && styles.categoryChipSelected,
                          ]}
                          onPress={() => updateCategory(transaction.id, cat as Category)}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              transaction.category === cat &&
                                styles.categoryChipTextSelected,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </ScrollView>
                </View>
              </View>
            ))}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setTransactions([])}
              >
                <X size={20} color={Colors.dark.text} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importButton, loading && styles.importButtonDisabled]}
                onPress={importSelected}
                disabled={loading}
              >
                <Check size={20} color={Colors.dark.background} />
                <Text style={styles.importButtonText}>
                  {loading
                    ? 'Importing...'
                    : `Import ${transactions.filter((t) => t.selected).length}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.dark.surface,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
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
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  noteText: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scanButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.background,
  },
  previewContainer: {
    padding: Spacing.lg,
  },
  previewHeader: {
    marginBottom: Spacing.lg,
  },
  previewTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  previewSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  transactionCardDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    marginRight: Spacing.md,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  merchant: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.dark.text,
  },
  amount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
  source: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.primary,
    fontWeight: Typography.weights.semibold,
  },
  date: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
  },
  categorySelector: {
    marginTop: Spacing.sm,
  },
  categoryChip: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: BorderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  categoryChipText: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
  },
  categoryChipTextSelected: {
    color: Colors.dark.background,
    fontWeight: Typography.weights.semibold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
  importButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.background,
  },
});
