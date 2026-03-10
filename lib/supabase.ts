import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Expense = {
  id: string;
  user_id: string | null;
  amount: number;
  category: string;
  merchant: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
  is_imported: boolean;
  import_source: string | null;
};

export const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills',
  'Health',
  'Others',
] as const;

export type Category = typeof CATEGORIES[number];