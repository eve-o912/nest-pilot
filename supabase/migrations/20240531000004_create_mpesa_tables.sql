-- Create mpesa_settings table
CREATE TABLE IF NOT EXISTS mpesa_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcode TEXT,
  account_reference TEXT,
  c2b_registered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Enable Row Level Security on mpesa_settings
ALTER TABLE mpesa_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mpesa_settings
CREATE POLICY "Users can view their own mpesa_settings"
  ON mpesa_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mpesa_settings"
  ON mpesa_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mpesa_settings"
  ON mpesa_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mpesa_settings"
  ON mpesa_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS mpesa_settings_user_id_idx ON mpesa_settings(user_id);
CREATE INDEX IF NOT EXISTS mpesa_settings_shortcode_idx ON mpesa_settings(shortcode);

-- Create mpesa_transactions table
CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mpesa_receipt_no TEXT NOT NULL,
  transaction_type TEXT,
  amount NUMERIC NOT NULL,
  phone_number TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  bill_ref_number TEXT,
  org_account_balance NUMERIC,
  transaction_time TIMESTAMPTZ NOT NULL,
  raw_payload JSONB,
  matched BOOLEAN DEFAULT false,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, mpesa_receipt_no)
);

-- Enable Row Level Security on mpesa_transactions
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mpesa_transactions
CREATE POLICY "Users can view their own mpesa_transactions"
  ON mpesa_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mpesa_transactions"
  ON mpesa_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mpesa_transactions"
  ON mpesa_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mpesa_transactions"
  ON mpesa_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS mpesa_transactions_user_id_idx ON mpesa_transactions(user_id);
CREATE INDEX IF NOT EXISTS mpesa_transactions_receipt_no_idx ON mpesa_transactions(mpesa_receipt_no);
CREATE INDEX IF NOT EXISTS mpesa_transactions_transaction_time_idx ON mpesa_transactions(transaction_time);
CREATE INDEX IF NOT EXISTS mpesa_transactions_matched_idx ON mpesa_transactions(matched);
CREATE INDEX IF NOT EXISTS mpesa_transactions_transaction_id_idx ON mpesa_transactions(transaction_id);

-- Enable realtime on mpesa_transactions for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE mpesa_transactions;
