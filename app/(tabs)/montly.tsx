import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, type Expense } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type DayData = {
  date: string;
  total: number;
  transactions: Expense[];
  expanded: boolean;
};

export default function Monthly() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMonthlyExpenses = async () => {
    try {
      const startDate = new Date(currentYear, selectedMonth, 1).toISOString();
      const endDate = new Date(currentYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      const expenses = data || [];

      // Group by day
      const grouped: { [key: string]: Expense[] } = {};
      expenses.forEach((expense) => {
        const date = new Date(expense.transaction_date);
        const dayKey = `${currentYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!grouped[dayKey]) grouped[dayKey] = [];
        grouped[dayKey].push(expense);
      });

      // Build day data array
      const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
      const days: DayData[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayKey = `${currentYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const transactions = grouped[dayKey] || [];
        const total = transactions.reduce((sum, e) => sum + Number(e.amount), 0);
        if (transactions.length > 0) {
          days.push({ date: dayKey, total, transactions, expanded: false });
        }
      }

      const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      setMonthTotal(total);
      setDayData(days);
    } catch (error) {
      console.error('Error fetching monthly expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMonthlyExpenses();
    }, [selectedMonth])
  );

  useEffect(() => {
    fetchMonthlyExpenses();
  }, [selectedMonth]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMonthlyExpenses();
  };

  const toggleDay = (index: number) => {
    setDayData((prev) =>
      prev.map((d, i) => (i === index ? { ...d, expanded: !d.expanded } : d))
    );
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly View</Text>
        <Text style={styles.headerSubtitle}>Day by day breakdown</Text>
      </View>

      {/* Month Selector */}
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={styles.monthSelector}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.monthSelectorText}>{MONTHS[selectedMonth]} {currentYear}</Text>
          {showDropdown ? (
            <ChevronUp size={20} color={Colors.dark.primary} />
          ) : (
            <ChevronDown size={20} color={Colors.dark.primary} />
          )}
        </TouchableOpacity>

        {showDropdown && (
          <View style={styles.dropdown}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {MONTHS.map((month, index) => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.dropdownItem,
                    selectedMonth === index && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedMonth(index);
                    setShowDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedMonth === index && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Month Total */}
      <View style={styles.monthTotalCard}>
        <Text style={styles.monthTotalLabel}>Total for {MONTHS[selectedMonth]}</Text>
        <Text style={styles.monthTotalValue}>{formatCurrency(monthTotal)}</Text>
      </View>

      {/* Day by Day */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
          />
        }
      >
        {dayData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expenses in {MONTHS[selectedMonth]}</Text>
            <Text style={styles.emptySubtext}>Add expenses to see your breakdown</Text>
          </View>
        ) : (
          dayData.map((day, index) => (
            <View key={day.date} style={styles.dayCard}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => toggleDay(index)}
              >
                <View style={styles.dayLeft}>
                  <Text style={styles.dayLabel}>{formatDayLabel(day.date)}</Text>
                  <Text style={styles.dayCount}>
                    {day.transactions.length} transaction{day.transactions.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.dayRight}>
                  <Text style={styles.dayTotal}>{formatCurrency(day.total)}</Text>
                  <ChevronRight
                    size={18}
                    color={Colors.dark.textSecondary}
                    style={{ transform: [{ rotate: day.expanded ? '90deg' : '0deg' }] }}
                  />
                </View>
              </TouchableOpacity>

              {day.expanded && (
                <View style={styles.transactionsList}>
                  {day.transactions.map((t) => (
                    <View key={t.id} style={styles.transactionRow}>
                      <View
                        style={[
                          styles.categoryDot,
                          {
                            backgroundColor:
                              Colors.dark.categories[
                                t.category as keyof typeof Colors.dark.categories
                              ],
                          },
                        ]}
                      />
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionMerchant}>{t.merchant}</Text>
                        <Text style={styles.transactionMeta}>
                          {t.category} • {formatTime(t.transaction_date)}
                        </Text>
                      </View>
                      <Text style={styles.transactionAmount}>
                        {formatCurrency(Number(t.amount))}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
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
  selectorContainer: {
    padding: Spacing.lg,
    zIndex: 100,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  monthSelectorText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
  dropdown: {
    position: 'absolute',
    top: 70,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dropdownScroll: {
    maxHeight: 250,
  },
  dropdownItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  dropdownItemText: {
    fontSize: Typography.sizes.md,
    color: Colors.dark.textSecondary,
  },
  dropdownItemTextSelected: {
    color: Colors.dark.primary,
    fontWeight: Typography.weights.bold,
  },
  monthTotalCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTotalLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  monthTotalValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.primary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  dayCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  dayLeft: {
    flex: 1,
  },
  dayLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  dayCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
  },
  dayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dayTotal: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
  transactionsList: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.dark.text,
  },
  transactionMeta: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
});