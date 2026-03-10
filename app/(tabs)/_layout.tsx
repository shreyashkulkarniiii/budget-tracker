import { Tabs } from 'expo-router';
import { Hop as Home, CirclePlus as PlusCircle, ChartBar as BarChart3, List, CalendarDays } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

// iPhone home indicator is 34px. PWA on iPhone doesn't expose safe area
// via JS, so we hardcode a comfortable bottom padding.
const BOTTOM_PAD = 30;
const TAB_HEIGHT = 60 + BOTTOM_PAD;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.dark.surface,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
          height: TAB_HEIGHT,
          paddingBottom: BOTTOM_PAD,
          paddingTop: 10,
        },
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <PlusCircle size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <BarChart3 size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <List size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="monthly"
        options={{
          title: 'Monthly',
          tabBarIcon: ({ color }) => <CalendarDays size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}