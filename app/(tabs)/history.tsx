import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, type Expense } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Search, ListFilter as Filter, X } from 'lucide-react-native';

type DateFilter = 'all' | 'this_month' | 'last_30' | 'last_6_months' | 'custom';

export default function History() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
      setFilteredExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchExpenses(); }, []));
  useEffect(() => { fetchExpenses(); }, []);
  useEffect(() => { filterExpenses(); }, [searchQuery, dateFilter, customFrom, customTo, expenses]);

  const getDateRange = (): { from: Date | null; to: Date | null } => {
    const now = new Date();
    if (dateFilter === 'this_month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    if (dateFilter === 'last_30') {
      const from = new Date(now); from.setDate(from.getDate() - 30); return { from, to: now };
    }
    if (dateFilter === 'last_6_months') {
      const from = new Date(now); from.setMonth(from.getMonth() - 6); return { from, to: now };
    }
    if (dateFilter === 'custom' && customFrom && customTo) {
      return { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59') };
    }
    return { from: null, to: null };
  };

  const filterExpenses = () => {
    let filtered = [...expenses];
    if (searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.amount.toString().includes(searchQuery)
      );
    }
    const { from, to } = getDateRange();
    if (from && to) {
      filtered = filtered.filter((e) => {
        const d = new Date(e.transaction_date);
        return d >= from && d <= to;
      });
    }
    setFilteredExpenses(filtered);
  };

  const onRefresh = () => { setRefreshing(true); fetchExpenses(); };

  const applyCustomRange = () => {
    if (!pendingFrom || !pendingTo) return;
    setCustomFrom(pendingFrom);
    setCustomTo(pendingTo);
    setDateFilter('custom');
    setShowFilters(false);
  };

  const handleFilterSelect = (key: DateFilter) => {
    if (key === 'custom') {
      setDateFilter('custom');
      // Don't close modal - let user pick dates
    } else {
      setDateFilter(key);
      setCustomFrom('');
      setCustomTo('');
      setPendingFrom('');
      setPendingTo('');
      setShowFilters(false);
    }
  };

  const clearFilter = () => {
    setDateFilter('all');
    setCustomFrom('');
    setCustomTo('');
    setPendingFrom('');
    setPendingTo('');
  };

  const formatCurrency = (amount: number) =>
    `₹${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const filterLabels: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'this_month', label: 'This Month' },
    { key: 'last_30', label: 'Last 30 Days' },
    { key: 'last_6_months', label: 'Last 6 Months' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const activeLabel = filterLabels.find((f) => f.key === dateFilter)?.label;

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseMain}>
        <View style={[styles.categoryIndicator, { backgroundColor: Colors.dark.categories[item.category as keyof typeof Colors.dark.categories] }]} />
        <View style={styles.expenseInfo}>
          <Text style={styles.merchant}>{item.merchant}</Text>
          <Text style={styles.category}>{item.category}</Text>
          {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}
          <View style={styles.dateTimeRow}>
            <Text style={styles.dateTime}>{formatDate(item.transaction_date)}</Text>
            <Text style={styles.dateTime}> • </Text>
            <Text style={styles.dateTime}>{formatTime(item.transaction_date)}</Text>
            {item.is_imported ? (
              <><Text style={styles.dateTime}> • </Text><Text style={styles.imported}>{item.import_source}</Text></>
            ) : null}
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.amount}>{formatCurrency(Number(item.amount))}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Text style={styles.headerSubtitle}>{filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transactions..."
            placeholderTextColor={Colors.dark.textSecondary}
          />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><X size={20} color={Colors.dark.textSecondary} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, dateFilter !== 'all' && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Filter size={20} color={dateFilter !== 'all' ? Colors.dark.primary : Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {dateFilter !== 'all' && (
        <View style={styles.activeBadgeRow}>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>
              {activeLabel}{dateFilter === 'custom' && customFrom && customTo ? `: ${customFrom} → ${customTo}` : ''}
            </Text>
            <TouchableOpacity onPress={clearFilter}><X size={14} color={Colors.dark.primary} /></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Filter by Date</Text>

            {filterLabels.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterOption, dateFilter === f.key && styles.filterOptionSelected]}
                onPress={() => handleFilterSelect(f.key)}
              >
                <Text style={[styles.filterOptionText, dateFilter === f.key && styles.filterOptionTextSelected]}>{f.label}</Text>
                {dateFilter === f.key && <View style={styles.filterDot} />}
              </TouchableOpacity>
            ))}

            {dateFilter === 'custom' && (
              <View style={styles.customRange}>
                <Text style={styles.customLabel}>From</Text>
                {/* Native date input rendered via web */}
                <View style={styles.dateInputWrapper}>
                  <input
                    type="date"
                    value={pendingFrom}
                    onChange={(e) => setPendingFrom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#0A0A0A',
                      color: '#FFFFFF',
                      border: '1px solid #333333',
                      borderRadius: '12px',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </View>
                <Text style={styles.customLabel}>To</Text>
                <View style={styles.dateInputWrapper}>
                  <input
                    type="date"
                    value={pendingTo}
                    onChange={(e) => setPendingTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#0A0A0A',
                      color: '#FFFFFF',
                      border: '1px solid #333333',
                      borderRadius: '12px',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.applyButton, (!pendingFrom || !pendingTo) && styles.applyButtonDisabled]}
                  onPress={applyCustomRange}
                  disabled={!pendingFrom || !pendingTo}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || dateFilter !== 'all' ? 'Try adjusting your search or filters' : 'Add your first expense to get started'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, backgroundColor: Colors.dark.surface },
  headerTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary },
  searchSection: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: Typography.sizes.md, color: Colors.dark.text, paddingVertical: Spacing.md },
  filterButton: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, justifyContent: 'center', alignItems: 'center' },
  filterButtonActive: { borderColor: Colors.dark.primary },
  activeBadgeRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.dark.surfaceLight, borderRadius: BorderRadius.full, paddingVertical: 6, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.dark.primary, alignSelf: 'flex-start' },
  activeBadgeText: { fontSize: Typography.sizes.xs, color: Colors.dark.primary, fontWeight: Typography.weights.semibold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: 48 },
  modalTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.lg },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  filterOptionSelected: {},
  filterOptionText: { fontSize: Typography.sizes.md, color: Colors.dark.textSecondary },
  filterOptionTextSelected: { color: Colors.dark.primary, fontWeight: Typography.weights.bold },
  filterDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.dark.primary },
  customRange: { marginTop: Spacing.md },
  customLabel: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  dateInputWrapper: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  applyButton: { backgroundColor: Colors.dark.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  applyButtonDisabled: { opacity: 0.4 },
  applyButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.dark.background },
  listContent: { padding: Spacing.lg },
  expenseCard: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  expenseMain: { flexDirection: 'row' },
  categoryIndicator: { width: 4, borderRadius: BorderRadius.full, marginRight: Spacing.md },
  expenseInfo: { flex: 1 },
  merchant: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.dark.text, marginBottom: 2 },
  category: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary, marginBottom: 4 },
  description: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary, marginBottom: 4 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center' },
  dateTime: { fontSize: Typography.sizes.xs, color: Colors.dark.textSecondary },
  imported: { fontSize: Typography.sizes.xs, color: Colors.dark.primary, fontWeight: Typography.weights.semibold },
  expenseRight: { alignItems: 'flex-end', justifyContent: 'center' },
  amount: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.dark.text, marginBottom: Spacing.xs },
  emptySubtext: { fontSize: Typography.sizes.sm, color: Colors.dark.textSecondary, textAlign: 'center' },
});