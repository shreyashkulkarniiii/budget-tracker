import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { supabase, type Expense, CATEGORIES } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

const { width } = Dimensions.get('window');
const chartWidth = width - Spacing.lg * 2;

export default function Analytics() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const getWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekData = Array(7).fill(0);

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.transaction_date);
      const diffDays = Math.floor(
        (today.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 7) {
        const dayIndex = expenseDate.getDay();
        weekData[dayIndex] += Number(expense.amount);
      }
    });

    return {
      labels: days,
      datasets: [
        {
          data: weekData.length > 0 ? weekData : [0],
        },
      ],
    };
  };

  const getCategoryData = () => {
    const categoryTotals: { [key: string]: number } = {};

    CATEGORIES.forEach((cat) => {
      categoryTotals[cat] = 0;
    });

    expenses.forEach((expense) => {
      if (categoryTotals[expense.category] !== undefined) {
        categoryTotals[expense.category] += Number(expense.amount);
      }
    });

    const pieData = Object.entries(categoryTotals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        population: value,
        color:
          Colors.dark.categories[name as keyof typeof Colors.dark.categories],
        legendFontColor: Colors.dark.textSecondary,
        legendFontSize: 12,
      }));

    return pieData.length > 0
      ? pieData
      : [
          {
            name: 'No Data',
            population: 1,
            color: Colors.dark.border,
            legendFontColor: Colors.dark.textSecondary,
            legendFontSize: 12,
          },
        ];
  };

  const getMonthlyTrendData = () => {
    const monthData = Array(12).fill(0);
    const currentYear = new Date().getFullYear();

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.transaction_date);
      if (expenseDate.getFullYear() === currentYear) {
        const month = expenseDate.getMonth();
        monthData[month] += Number(expense.amount);
      }
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    const last6MonthsData = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(months[monthIndex]);
      last6MonthsData.push(monthData[monthIndex]);
    }

    return {
      labels: last6Months,
      datasets: [
        {
          data: last6MonthsData.some((val) => val > 0) ? last6MonthsData : [0],
        },
      ],
    };
  };

  const chartConfig = {
    backgroundColor: Colors.dark.surface,
    backgroundGradientFrom: Colors.dark.surface,
    backgroundGradientTo: Colors.dark.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 217, 177, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(160, 160, 160, ${opacity})`,
    style: {
      borderRadius: BorderRadius.lg,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: Colors.dark.border,
      strokeWidth: 1,
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Visualize your spending</Text>
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
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Weekly Spending</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={getWeeklyData()}
              width={chartWidth}
              height={220}
              yAxisLabel="₹"
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
            />
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Category Breakdown</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={getCategoryData()}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Monthly Trend</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={getMonthlyTrendData()}
              width={chartWidth}
              height={220}
              yAxisLabel="₹"
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(0, 217, 177, ${opacity})`,
              }}
              bezier
              style={styles.chart}
              fromZero
            />
          </View>
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
  chartSection: {
    padding: Spacing.lg,
  },
  chartTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
  },
  chart: {
    borderRadius: BorderRadius.md,
  },
});
