import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, type Category } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Mail, Check, ArrowLeft, User, ChevronRight } from 'lucide-react-native';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
const REDIRECT_URI = process.env.EXPO_PUBLIC_REDIRECT_URI || 'https://budget-tracker-rho-two.vercel.app/gmail-callback';
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
    return decodeURIComponent(atob(str.replace(/-/g, '+').replace(/_/g, '/')).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
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
  let amount = 0; let merchant = ''; let source = '';
  const creditKeywords = ['received', 'credited', 'credit', 'added to', 'money received', 'paid to you', 'you have received', 'deposited', 'refund', 'cashback', 'reward'];
  if (creditKeywords.some((kw) => fullText.toLowerCase().includes(kw))) return null;
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
  return { id: Math.random().toString(36).substr(2, 9), amount, merchant: merchant.substring(0, 50), date: new Date(date).toISOString(), source, category: autoCategory(merchant), selected: true, alreadyAdded: false };
}

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
  const [error, setError] = useState('');
  const [noTransactions, setNoTransactions] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(true);
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setLoggedInEmail(session.user.email);
      if (session?.provider_token) setSessionToken(session.provider_token);
    };
    init();
  }, []);

  // Try existing token, if expired refresh via Vercel API, if that fails fallback to popup
  const getValidToken = async (): Promise<string | null> => {
    if (sessionToken) {
      const testRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (testRes.ok) return sessionToken;
    }
    // Token expired — try refresh via Vercel API
    const { data: { session } } = await supabase.auth.getSession();
    const refreshToken = session?.provider_refresh_token;
    if (!refreshToken) return null;
    try {
      const res = await fetch('/api/refresh-google-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await res.json();
      if (data.access_token) {
        setSessionToken(data.access_token);
        return data.access_token;
      }
    } catch (e) {
      console.error('Token refresh failed:', e);
    }
    return null;
  };

  const handleUseExistingAccount = async () => {
    setShowAccountModal(false);
    setScanning(true);
    setError('');
    setNoTransactions(false);
    const token = await getValidToken();
    if (token) {
      setAccessToken(token);
      scanEmailsWithToken(token);
    } else {
      setScanning(false);
      handleGoogleLoginPopup();
    }
  };

  const handleUseDifferentAccount = () => {
    setShowAccountModal(false);
    handleGoogleLoginPopup();
  };

  const handleGoogleLoginPopup = () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&prompt=consent`;
    const popup = window.open(authUrl, 'gmail-auth', 'width=500,height=600');
    const interval = setInterval(() => {
      try {
        if (popup && popup.location.href.includes('access_token')) {
          const params = new URLSearchParams(popup.location.hash.replace('#', ''));
          const token = params.get('access_token');
          if (token) { setAccessToken(token); popup.close(); clearInterval(interval); scanEmailsWithToken(token); }
        }
        if (popup && popup.closed) clearInterval(interval);
      } catch (e) {}
    }, 500);
  };

  const scanEmailsWithToken = async (token: string) => {
    setScanning(true);
    setError('');
    setNoTransactions(false);
    try {
      const { start, end } = getTodayRange();
      const after = Math.floor(start.getTime() / 1000);
      const query = encodeURIComponent(`(GPay OR PhonePe OR Paytm OR UPI OR "debited") after:${after}`);
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`, { headers: { Authorization: `Bearer ${token}` } });
      const listData = await listRes.json();

      // No emails at all for today
      if (!listData.messages || listData.messages.length === 0) {
        setNoTransactions(true);
        setScanning(false);
        return;
      }

      const { data: existingExpenses } = await supabase.from('expenses').select('amount, merchant, transaction_date').eq('is_imported', true).gte('transaction_date', start.toISOString()).lte('transaction_date', end.toISOString());

      const parsed: UPITransaction[] = [];
      for (const msg of listData.messages) {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const dateStr = headers.find((h: any) => h.name === 'Date')?.value || '';
        const body = msgData.payload?.body?.data || msgData.payload?.parts?.[0]?.body?.data || '';
        const emailDate = new Date(dateStr);
        if (emailDate >= start && emailDate <= end) {
          const transaction = parseUPIEmail(subject, body, dateStr);
          if (transaction) {
            const alreadyAdded = existingExpenses?.some((e) => Math.abs(new Date(e.transaction_date).getTime() - new Date(transaction.date).getTime()) <= 60000) ?? false;
            parsed.push({ ...transaction, alreadyAdded, selected: !alreadyAdded });
          }
        }
      }

      // Emails found but none were valid UPI debit transactions
      if (parsed.length === 0) {
        setNoTransactions(true);
      } else {
        parsed.sort((a, b) => Number(a.alreadyAdded) - Number(b.alreadyAdded));
        setTransactions(parsed);
      }
    } catch (e) {
      console.error('Error scanning emails:', e);
      setError('Failed to scan emails. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const toggleTransaction = (id: string) => setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, selected: !t.selected } : t));
  const updateCategory = (id: string, category: Category) => setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, category } : t));

  const importSelected = async () => {
    const selected = transactions.filter((t) => t.selected);
    if (selected.length === 0) { setError('Please select at least one transaction'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not logged in'); return; }
      const { error } = await supabase.from('expenses').insert(
        selected.map((t) => ({
          amount: t.amount, category: t.category, merchant: t.merchant,
          transaction_date: t.date, is_imported: true, import_source: t.source,
          user_id: user.id, user_email: user.email,
        }))
      );
      if (error) throw error;
      router.replace('/(tabs)/add');
    } catch (e) {
      console.error('Error importing:', e);
      setError('Failed to import transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

      {/* Account Chooser Modal */}
      <Modal visible={showAccountModal} transparent animationType="fade" onRequestClose={() => router.back()}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Choose Gmail Account</Text>
            <Text style={styles.modalSubtitle}>Which account do you want to scan?</Text>
            <TouchableOpacity style={styles.accountOption} onPress={handleUseExistingAccount}>
              <View style={styles.accountOptionLeft}>
                <View style={styles.accountAvatar}>
                  <User size={20} color={Colors.dark.primary} />
                </View>
                <View>
                  <Text style={styles.accountOptionTitle}>Use logged-in account</Text>
                  <Text style={styles.accountOptionEmail}>{loggedInEmail}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountOption} onPress={handleUseDifferentAccount}>
              <View style={styles.accountOptionLeft}>
                <View style={[styles.accountAvatar, { backgroundColor: '#1A2A3A' }]}>
                  <Mail size={20} color="#4ECDC4" />
                </View>
                <View>
                  <Text style={styles.accountOptionTitle}>Use a different account</Text>
                  <Text style={styles.accountOptionEmail}>Sign in with another Gmail</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.scrollView}>
        {/* Scanning state */}
        {scanning && (
          <View style={styles.emptyState}>
            <ActivityIndicator color={Colors.dark.primary} size="large" />
            <Text style={styles.emptyTitle}>Scanning Gmail...</Text>
            <Text style={styles.emptyText}>Looking for today's UPI transactions in your inbox.</Text>
          </View>
        )}

        {/* No transactions found */}
        {!scanning && noTransactions && (
          <View style={styles.emptyState}>
            <Mail size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyTitle}>No Transactions Today</Text>
            <Text style={styles.emptyText}>No UPI payment emails found for {todayLabel}.</Text>
            <TouchableOpacity style={styles.backToAddBtn} onPress={() => router.back()}>
              <Text style={styles.backToAddBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error state */}
        {!scanning && error !== '' && transactions.length === 0 && !noTransactions && (
          <View style={styles.emptyState}>
            <Mail size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.backToAddBtn} onPress={() => router.back()}>
              <Text style={styles.backToAddBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transactions list */}
        {!scanning && transactions.length > 0 && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Found {transactions.length} transaction{transactions.length > 1 ? 's' : ''}</Text>
              <Text style={styles.previewSubtitle}>Review and select to import</Text>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {transactions.filter(t => !t.alreadyAdded).length > 0 && <Text style={styles.sectionLabel}>NEW ({transactions.filter(t => !t.alreadyAdded).length})</Text>}

            {transactions.map((t, index) => {
              const showDivider = t.alreadyAdded && (index === 0 || !transactions[index - 1].alreadyAdded);
              return (
                <>
                  {showDivider && <Text key={`divider-${t.id}`} style={styles.sectionLabel}>ALREADY ADDED ({transactions.filter(t => t.alreadyAdded).length})</Text>}
                  <View key={t.id} style={[styles.transactionCard, (t.alreadyAdded || !t.selected) && styles.transactionCardDisabled]}>
                    <TouchableOpacity style={styles.checkbox} onPress={() => !t.alreadyAdded && toggleTransaction(t.id)} disabled={t.alreadyAdded}>
                      <View style={[styles.checkboxInner, t.selected && !t.alreadyAdded && styles.checkboxSelected]}>
                        {t.selected && !t.alreadyAdded && <Check size={16} color={Colors.dark.background} />}
                        {t.alreadyAdded && <Check size={16} color={Colors.dark.textSecondary} />}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.transactionInfo}>
                      <View style={styles.transactionRow}>
                        <Text style={styles.merchant}>{t.merchant}</Text>
                        <View style={styles.amountRow}>
                          {t.alreadyAdded && <View style={styles.addedBadge}><Text style={styles.addedBadgeText}>Added</Text></View>}
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
                            <TouchableOpacity key={cat} style={[styles.categoryChip, t.category === cat && styles.categoryChipSelected]} onPress={() => updateCategory(t.id, cat)}>
                              <Text style={[styles.categoryChipText, t.category === cat && styles.categoryChipTextSelected]}>{cat}</Text>
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
              <TouchableOpacity style={styles.cancelButton} onPress={() => router.replace('/(tabs)/add')}>
                <ArrowLeft size={20} color={Colors.dark.text} />
                <Text style={styles.cancelButtonText}>Back to Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.importButton, loading && styles.importButtonDisabled]} onPress={importSelected} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.dark.background} size="small" /> : <Check size={20} color={Colors.dark.background} />}
                <Text style={styles.importButtonText}>{loading ? 'Importing...' : `Import ${transactions.filter((t) => t.selected).length}`}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, backgroundColor: Colors.dark.surface },
  backButton: { marginRight: Spacing.md },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: Typography.sizes.sm, color: Colors.dark.primary },
  scrollView: { flex: 1 },
  emptyState: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.dark.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
  errorText: { fontSize: Typography.sizes.sm, color: Colors.dark.error, marginBottom: Spacing.md, textAlign: 'center', marginTop: Spacing.sm },
  backToAddBtn: { backgroundColor: Colors.dark.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginTop: Spacing.sm },
  backToAddBtnText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.background },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  modalBox: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, width: '100%', borderWidth: 1, borderColor: Colors.dark.border },
  modalTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  modalSubtitle: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary, marginBottom: Spacing.xl },
  accountOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.dark.surfaceLight, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  accountOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  accountAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A3A3A', alignItems: 'center', justifyContent: 'center' },
  accountOptionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.dark.text, marginBottom: 2 },
  accountOptionEmail: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary },
  cancelBtn: { marginTop: Spacing.sm, padding: Spacing.md, alignItems: 'center' },
  cancelBtnText: { fontSize: Typography.sizes.md, color: Colors.dark.textSecondary },
  previewContainer: { padding: Spacing.lg },
  previewHeader: { marginBottom: Spacing.lg },
  previewTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  previewSubtitle: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary },
  transactionCard: { flexDirection: 'row', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
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