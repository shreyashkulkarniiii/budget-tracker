import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, type Expense, CATEGORIES, type Category } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Search, ListFilter as Filter, Trash2, X } from 'lucide-react-native';

export default function History() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [showFilters, setShowFilters] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [])
  );

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [searchQuery, selectedCategory, expenses]);

  const filterExpenses = () => {
    let filtered = [...expenses];

    if (searchQuery) {
      filtered = filtered.filter(
        (expense) =>
          expense.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.amount.toString().includes(searchQuery)
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((expense) => expense.category === selectedCategory);
    }

    setFilteredExpenses(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const handleDelete = async (id: string, merchant: string) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${merchant}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('expenses').delete().eq('id', id);
              if (error) throw error;
              fetchExpenses();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
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
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseMain}>
        <View
          style={[
            styles.categoryIndicator,
            {
              backgroundColor:
                Colors.dark.categories[item.category as keyof typeof Colors.dark.categories],
            },
          ]}
        />
        <View style={styles.expenseInfo}>
          <Text style={styles.merchant}>{item.merchant}</Text>
          <Text style={styles.category}>{item.category}</Text>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.dateTimeRow}>
            <Text style={styles.dateTime}>{formatDate(item.transaction_date)}</Text>
            <Text style={styles.dateTime}> • </Text>
            <Text style={styles.dateTime}>{formatTime(item.transaction_date)}</Text>
            {item.is_imported && (
              <>
                <Text style={styles.dateTime}> • </Text>
                <Text style={styles.imported}>{item.import_source}</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.amount}>{formatCurrency(Number(item.amount))}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id, item.merchant)}
          >
            <Trash2 size={18} color={Colors.dark.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Text style={styles.headerSubtitle}>
          {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
        </Text>
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
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilters}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategory === 'All' && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === 'All' && styles.filterChipTextSelected,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  selectedCategory === category && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <View
                  style={[
                    styles.filterDot,
                    {
                      backgroundColor:
                        Colors.dark.categories[
                          category as keyof typeof Colors.dark.categories
                        ],
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === category && styles.filterChipTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Add your first expense to get started'}
            </Text>
          </View>
        }
      />
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
  searchSection: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.dark.text,
    paddingVertical: Spacing.md,
  },
  filterButton: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  categoryFilters: {
    gap: Spacing.sm,
  },
  filterChip: {
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
  filterChipSelected: {
    backgroundColor: Colors.dark.surfaceLight,
    borderColor: Colors.dark.primary,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  filterChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  filterChipTextSelected: {
    color: Colors.dark.text,
    fontWeight: Typography.weights.semibold,
  },
  listContent: {
    padding: Spacing.lg,
  },
  expenseCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  expenseMain: {
    flexDirection: 'row',
  },
  categoryIndicator: {
    width: 4,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  expenseInfo: {
    flex: 1,
  },
  merchant: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  category: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  description: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTime: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
  },
  imported: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.primary,
    fontWeight: Typography.weights.semibold,
  },
  expenseRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  amount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
});
