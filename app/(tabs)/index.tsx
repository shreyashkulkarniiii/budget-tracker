import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, type Expense } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { TrendingUp, TrendingDown, Calendar, Wallet } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    avgDaily: 0,
  });

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (expenses: Expense[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayTotal = expenses
      .filter((e) => new Date(e.transaction_date) >= todayStart)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const weekTotal = expenses
      .filter((e) => new Date(e.transaction_date) >= weekStart)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const monthTotal = expenses
      .filter((e) => new Date(e.transaction_date) >= monthStart)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const daysInMonth = now.getDate();
    const avgDaily = monthTotal / daysInMonth;

    setStats({
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      avgDaily,
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [])
  );

  useEffect(() => {
    fetchExpenses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const recentExpenses = expenses.slice(0, 5);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budget Tracker</Text>
        <Text style={styles.headerSubtitle}>Track your expenses</Text>
      </View>

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
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardLarge]}>
            <View style={styles.statIconContainer}>
              <Wallet size={24} color={Colors.dark.primary} />
            </View>
            <Text style={styles.statLabel}>Today's Spend</Text>
            <Text style={styles.statValueLarge}>{formatCurrency(stats.today)}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardSmall]}>
              <View style={styles.statIconContainer}>
                <Calendar size={20} color={Colors.dark.primary} />
              </View>
              <Text style={styles.statLabelSmall}>This Week</Text>
              <Text style={styles.statValueSmall}>{formatCurrency(stats.week)}</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSmall]}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={20} color={Colors.dark.primary} />
              </View>
              <Text style={styles.statLabelSmall}>This Month</Text>
              <Text style={styles.statValueSmall}>{formatCurrency(stats.month)}</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardMedium]}>
            <View style={styles.statIconContainer}>
              <TrendingDown size={20} color={Colors.dark.primary} />
            </View>
            <Text style={styles.statLabel}>Average Daily Spend</Text>
            <Text style={styles.statValue}>{formatCurrency(stats.avgDaily)}</Text>
          </View>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {recentExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first expense to get started
              </Text>
            </View>
          ) : (
            recentExpenses.map((expense) => (
              <View key={expense.id} style={styles.transactionCard}>
                <View
                  style={[
                    styles.categoryDot,
                    {
                      backgroundColor:
                        Colors.dark.categories[
                          expense.category as keyof typeof Colors.dark.categories
                        ],
                    },
                  ]}
                />
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionMerchant}>{expense.merchant}</Text>
                  <Text style={styles.transactionCategory}>{expense.category}</Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.transactionAmount}>
                    {formatCurrency(Number(expense.amount))}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(expense.transaction_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
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
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statCardLarge: {
    marginBottom: Spacing.md,
  },
  statCardSmall: {
    flex: 1,
  },
  statCardMedium: {
    width: '100%',
  },
  statIconContainer: {
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  statLabelSmall: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
  statValueLarge: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.primary,
  },
  statValueSmall: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
  recentSection: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
  },
  emptyState: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
  },
});
