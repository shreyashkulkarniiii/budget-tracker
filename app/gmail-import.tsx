import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, type Category } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Mail, Check, X, ArrowLeft } from 'lucide-react-native';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
const REDIRECT_URI = process.env.EXPO_PUBLIC_REDIRECT_URI || 'https://budget-tracker-rho-two.vercel.app/gmail-import';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

type UPITransaction = {
  id: string;
  amount: number;
  merchant: string;
  date: string;
  source: string;
  category: Category;
  selected: boolean;
  alreadyAdded: boolean;
};

function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(
      atob(str.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch { return ''; }
}

function autoCategory(merchant: string): Category {
  const m = merchant.toLowerCase();
  if (m.includes('swiggy') || m.includes('zomato') || m.includes('restaurant') || m.includes('food') || m.includes('cafe') || m.includes('pizza') || m.includes('burger')) return 'Food';
  if (m.includes('uber') || m.includes('ola') || m.includes('metro') || m.includes('rapido') || m.includes('bus') || m.includes('railway') || m.includes('irctc')) return 'Transport';
  if (m.includes('amazon') || m.includes('flipkart') || m.includes('myntra') || m.includes('ajio') || m.includes('nykaa') || m.includes('shop')) return 'Shopping';
  if (m.includes('netflix') || m.includes('spotify') || m.includes('hotstar') || m.includes('prime') || m.includes('movie') || m.includes('bookmyshow')) return 'Entertainment';
  if (m.includes('electricity') || m.includes('water') || m.includes('gas') || m.includes('internet') || m.includes('mobile') || m.includes('recharge') || m.includes('bill')) return 'Bills';
  if (m.includes('pharmacy') || m.includes('hospital') || m.includes('doctor') || m.includes('medical') || m.includes('health') || m.includes('clinic')) return 'Health';
  return 'Others';
}

function parseUPIEmail(subject: string, body: string, date: string): UPITransaction | null {
  const decodedBody = decodeBase64(body);
  const fullText = `${subject} ${decodedBody}`;
  let amount = 0;
  let merchant = '';
  let source = '';

  // Skip credit/received transactions — we only want money spent
  const creditKeywords = [
    'received', 'credited', 'credit', 'added to',
    'money received', 'paid to you', 'you have received',
    'deposited', 'refund', 'cashback', 'reward',
  ];
  const lowerText = fullText.toLowerCase();
  if (creditKeywords.some((kw) => lowerText.includes(kw))) return null;

  const amountMatch = fullText.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
  if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ''));

  if (fullText.includes('GPay') || fullText.includes('Google Pay')) {
    source = 'GPay';
    const m = fullText.match(/(?:to|paid to)\s+([A-Za-z0-9 &.'-]+?)(?:\s+(?:on|via|using|for)|$)/i);
    if (m) merchant = m[1].trim();
  } else if (fullText.includes('PhonePe') || fullText.includes('PHONEPE')) {
    source = 'PhonePe';
    const m = fullText.match(/(?:to|paid to|sent to)\s+([A-Za-z0-9 &.'-]+?)(?:\s+(?:on|via|using|from)|$)/i);
    if (m) merchant = m[1].trim();
  } else if (fullText.includes('Paytm') || fullText.includes('PAYTM')) {
    source = 'Paytm';
    const m = fullText.match(/(?:to|paid to|payment of)\s+([A-Za-z0-9 &.'-]+?)(?:\s+(?:on|via|using|was)|$)/i);
    if (m) merchant = m[1].trim();
  } else if (fullText.includes('UPI') || fullText.includes('debited')) {
    source = 'UPI';
    const m = fullText.match(/(?:to|VPA)\s+([A-Za-z0-9@._-]+)/i);
    if (m) merchant = m[1].trim();
  }

  if (!amount || !merchant || !source) return null;

  return {
    id: Math.random().toString(36).substr(2, 9),
    amount,
    merchant: merchant.substring(0, 50),
    date: new Date(date).toISOString(),
    source,
    category: autoCategory(merchant),
    selected: true,
    alreadyAdded: false,
  };
}

// Get today's date range (midnight to 23:59:59)
function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end };
}

export default function GmailImport() {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<UPITransaction[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=consent`;

    // Full redirect — no popup, works perfectly on iPhone PWA
    window.location.href = authUrl;
  };

  // On mount, check if we just came back from Google OAuth
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const token = params.get('access_token');
        if (token) {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          setAccessToken(token);
          scanEmailsWithToken(token);
        }
      }
    }
  }, []);

  const scanEmailsWithToken = async (token: string) => {
    setScanning(true);
    try {
      const { start } = getTodayRange();
      const after = Math.floor(start.getTime() / 1000);
      const query = encodeURIComponent(`(GPay OR PhonePe OR Paytm OR UPI OR "debited") after:${after}`);
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const listData = await listRes.json();

      if (!listData.messages || listData.messages.length === 0) {
        Alert.alert('No Transactions Found', "No UPI transaction emails found for today.");
        setScanning(false);
        return;
      }

      // Fetch today's already-imported expenses from Supabase
      const { end } = getTodayRange();
      const { data: existingExpenses } = await supabase
        .from('expenses')
        .select('amount, merchant, transaction_date')
        .eq('is_imported', true)
        .gte('transaction_date', start.toISOString())
        .lte('transaction_date', end.toISOString());

      const parsed: UPITransaction[] = [];
      for (const msg of listData.messages) {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const dateStr = headers.find((h: any) => h.name === 'Date')?.value || '';
        const body = msgData.payload?.body?.data || msgData.payload?.parts?.[0]?.body?.data || '';

        const emailDate = new Date(dateStr);
        if (emailDate >= start && emailDate <= end) {
          const transaction = parseUPIEmail(subject, body, dateStr);
          if (transaction) {
            // Check if already imported — match by transaction time (within 60 second window)
            const alreadyAdded = existingExpenses?.some((e) => {
              const diff = Math.abs(new Date(e.transaction_date).getTime() - new Date(transaction.date).getTime());
              return diff <= 60000; // 60 second window
            }) ?? false;
            parsed.push({ ...transaction, alreadyAdded, selected: !alreadyAdded });
          }
        }
      }

      if (parsed.length === 0) {
        Alert.alert('No Transactions Found', "No UPI transactions found in today's emails.");
      } else {
        // Sort: new transactions first, already added at bottom
        parsed.sort((a, b) => Number(a.alreadyAdded) - Number(b.alreadyAdded));
        setTransactions(parsed);
      }
    } catch (error) {
      console.error('Error scanning emails:', error);
    } finally {
      setScanning(false);
    }
  };

  const scanEmails = async () => {
    const token = accessToken;
    if (!token) {
      handleGoogleLogin();
      return;
    }
    await scanEmailsWithToken(token);
  };

  const toggleTransaction = (id: string) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));
  };

  const updateCategory = (id: string, category: Category) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)));
  };

  const importSelected = async () => {
    const selected = transactions.filter((t) => t.selected);
    if (selected.length === 0) {
      Alert.alert('No Transactions', 'Please select at least one transaction to import');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').insert(
        selected.map((t) => ({
          amount: t.amount,
          category: t.category,
          merchant: t.merchant,
          transaction_date: t.date,
          is_imported: true,
          import_source: t.source,
        }))
      );
      if (error) throw error;

      // Silently navigate back — no error flash
      router.replace('/(tabs)/add');
    } catch (error) {
      console.error('Error importing:', error);
      Alert.alert('Error', 'Failed to import transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `₹${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const todayLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Gmail UPI Import</Text>
          <Text style={styles.headerSubtitle}>Today: {todayLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Mail size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyTitle}>Import Today's Transactions</Text>
            <Text style={styles.emptyText}>
              Connect your Gmail to automatically import today's UPI payments from GPay, PhonePe, and Paytm.
            </Text>
            <TouchableOpacity style={styles.scanButton} onPress={scanEmails} disabled={scanning}>
              {scanning ? (
                <>
                  <ActivityIndicator color={Colors.dark.background} size="small" />
                  <Text style={styles.scanButtonText}>Scanning Gmail...</Text>
                </>
              ) : (
                <>
                  <Mail size={20} color={Colors.dark.background} />
                  <Text style={styles.scanButtonText}>
                    {accessToken ? 'Scan Today\'s Emails' : 'Connect Gmail & Scan'}
                  </Text>
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
              <Text style={styles.previewSubtitle}>Review and select to import</Text>
            </View>

            {/* New transactions section */}
            {transactions.filter(t => !t.alreadyAdded).length > 0 && (
              <Text style={styles.sectionLabel}>
                NEW ({transactions.filter(t => !t.alreadyAdded).length})
              </Text>
            )}

            {transactions.map((t, index) => {
              // Show "Already Added" divider label before first already-added item
              const prevNew = index > 0 && !transactions[index - 1].alreadyAdded;
              const showDivider = t.alreadyAdded && (index === 0 || prevNew);
              return (
                <>
                  {showDivider && (
                    <Text key={`divider-${t.id}`} style={styles.sectionLabel}>
                      ALREADY ADDED ({transactions.filter(t => t.alreadyAdded).length})
                    </Text>
                  )}
                  <View key={t.id} style={[styles.transactionCard, (t.alreadyAdded || !t.selected) && styles.transactionCardDisabled]}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => !t.alreadyAdded && toggleTransaction(t.id)}
                      disabled={t.alreadyAdded}
                    >
                      <View style={[styles.checkboxInner, t.selected && !t.alreadyAdded && styles.checkboxSelected]}>
                        {t.selected && !t.alreadyAdded && <Check size={16} color={Colors.dark.background} />}
                        {t.alreadyAdded && <Check size={16} color={Colors.dark.textSecondary} />}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.transactionInfo}>
                      <View style={styles.transactionRow}>
                        <Text style={styles.merchant}>{t.merchant}</Text>
                        <View style={styles.amountRow}>
                          {t.alreadyAdded && (
                            <View style={styles.addedBadge}>
                              <Text style={styles.addedBadgeText}>Added</Text>
                            </View>
                          )}
                          <Text style={styles.amount}>{formatCurrency(t.amount)}</Text>
                        </View>
                      </View>
                      <View style={styles.transactionRow}>
                        <Text style={styles.source}>{t.source}</Text>
                        <Text style={styles.date}>{formatDate(t.date)}</Text>
                      </View>
                      {!t.alreadyAdded && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                          {(['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Others'] as Category[]).map((cat) => (
                            <TouchableOpacity
                              key={cat}
                              style={[styles.categoryChip, t.category === cat && styles.categoryChipSelected]}
                              onPress={() => updateCategory(t.id, cat)}
                            >
                              <Text style={[styles.categoryChipText, t.category === cat && styles.categoryChipTextSelected]}>
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                </>
              );
            })}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setTransactions([])}>
                <X size={20} color={Colors.dark.text} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importButton, loading && styles.importButtonDisabled]}
                onPress={importSelected}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={Colors.dark.background} size="small" />
                  : <Check size={20} color={Colors.dark.background} />
                }
                <Text style={styles.importButtonText}>
                  {loading ? 'Importing...' : `Import ${transactions.filter((t) => t.selected).length}`}
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
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg, backgroundColor: Colors.dark.surface,
  },
  backButton: { marginRight: Spacing.md },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: Typography.sizes.sm, color: Colors.dark.primary },
  scrollView: { flex: 1 },
  emptyState: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.dark.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 22 },
  scanButton: {
    flexDirection: 'row', backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
  },
  scanButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.background },
  previewContainer: { padding: Spacing.lg },
  previewHeader: { marginBottom: Spacing.lg },
  previewTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  previewSubtitle: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary },
  transactionCard: {
    flexDirection: 'row', backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border,
  },
  transactionCardDisabled: { opacity: 0.5 },
  checkbox: { marginRight: Spacing.md, justifyContent: 'flex-start', paddingTop: 2 },
  checkboxInner: { width: 24, height: 24, borderRadius: BorderRadius.sm, borderWidth: 2, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  transactionInfo: { flex: 1 },
  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  merchant: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.dark.text },
  amount: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  source: { fontSize: Typography.sizes.xs, color: Colors.dark.primary, fontWeight: Typography.weights.semibold },
  date: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary },
  categorySelector: { marginTop: Spacing.sm },
  categoryChip: { backgroundColor: Colors.dark.surfaceLight, borderRadius: BorderRadius.full, paddingVertical: 6, paddingHorizontal: Spacing.sm, marginRight: Spacing.xs, borderWidth: 1, borderColor: Colors.dark.border },
  categoryChipSelected: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  categoryChipText: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary },
  categoryChipTextSelected: { color: Colors.dark.background, fontWeight: Typography.weights.semibold },
  sectionLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, color: Colors.dark.textSecondary, letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  addedBadge: { backgroundColor: Colors.dark.surfaceLight, borderRadius: BorderRadius.full, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, borderColor: Colors.dark.border },
  addedBadgeText: { fontSize: 10, color: Colors.dark.textSecondary, fontWeight: Typography.weights.semibold },
  actionButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  cancelButton: { flex: 1, flexDirection: 'row', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border },
  cancelButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  importButton: { flex: 1, flexDirection: 'row', backgroundColor: Colors.dark.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  importButtonDisabled: { opacity: 0.5 },
  importButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.background },
});