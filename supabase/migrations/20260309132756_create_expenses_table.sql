/*
  # Create expenses table for personal budgeting app

  1. New Tables
    - `expenses`
      - `id` (uuid, primary key) - Unique identifier for each expense
      - `user_id` (uuid, nullable) - For future multi-user support
      - `amount` (decimal) - Expense amount in INR
      - `category` (text) - Category: Food, Transport, Shopping, Entertainment, Bills, Health, Others
      - `merchant` (text) - Merchant name or location
      - `description` (text, nullable) - Additional notes about the expense
      - `transaction_date` (timestamptz) - When the expense occurred
      - `created_at` (timestamptz) - When the record was created
      - `is_imported` (boolean) - Whether this was imported from Gmail UPI
      - `import_source` (text, nullable) - Source of import: GPay, PhonePe, Paytm
  
  2. Security
    - Enable RLS on `expenses` table
    - Add policy for authenticated users (for future auth implementation)
    - For now, allow all operations for development
  
  3. Indexes
    - Index on transaction_date for faster date-based queries
    - Index on category for faster category filtering
*/

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  amount decimal(12, 2) NOT NULL,
  category text NOT NULL,
  merchant text NOT NULL,
  description text,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_imported boolean DEFAULT false,
  import_source text,
  CONSTRAINT valid_category CHECK (category IN ('Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Others'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_date ON expenses(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (for development without auth)
-- In production, you'd want to restrict this to authenticated users
CREATE POLICY "Allow all operations for development"
  ON expenses
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users"
  ON expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);