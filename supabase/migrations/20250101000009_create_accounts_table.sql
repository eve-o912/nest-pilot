-- Create accounts table (chart of accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL
    CHECK (type IN ('asset','liability','equity','revenue','expense')),
  parent_code text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own accounts"
ON accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
ON accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);

-- Create function to seed default chart of accounts for new users
CREATE OR REPLACE FUNCTION seed_default_accounts(user_uuid uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO accounts (user_id, code, name, type) VALUES
    (user_uuid, '1000', 'Cash', 'asset'),
    (user_uuid, '1010', 'M-Pesa Account', 'asset'),
    (user_uuid, '1100', 'Accounts Receivable', 'asset'),
    (user_uuid, '1200', 'Inventory', 'asset'),
    (user_uuid, '2000', 'Accounts Payable', 'liability'),
    (user_uuid, '3000', 'Owner''s Equity', 'equity'),
    (user_uuid, '4000', 'Sales Revenue', 'revenue'),
    (user_uuid, '5000', 'Cost of Goods Sold', 'expense'),
    (user_uuid, '6000', 'Rent Expense', 'expense'),
    (user_uuid, '6010', 'Salaries Expense', 'expense'),
    (user_uuid, '6020', 'Transport Expense', 'expense'),
    (user_uuid, '6030', 'Utilities Expense', 'expense'),
    (user_uuid, '6040', 'Marketing Expense', 'expense'),
    (user_uuid, '6050', 'Miscellaneous Expense', 'expense')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
