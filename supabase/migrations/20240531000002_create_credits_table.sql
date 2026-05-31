-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  amount_owed NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only SELECT their own rows
CREATE POLICY "Users can view their own credits"
  ON credits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only INSERT their own rows
CREATE POLICY "Users can insert their own credits"
  ON credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own rows
CREATE POLICY "Users can update their own credits"
  ON credits FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only DELETE their own rows
CREATE POLICY "Users can delete their own credits"
  ON credits FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS credits_user_id_idx ON credits(user_id);
CREATE INDEX IF NOT EXISTS credits_status_idx ON credits(status);
CREATE INDEX IF NOT EXISTS credits_due_date_idx ON credits(due_date);

-- Create function to auto-calculate status
CREATE OR REPLACE FUNCTION calculate_credit_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount_paid = 0 THEN
    NEW.status := 'unpaid';
  ELSIF NEW.amount_paid > 0 AND NEW.amount_paid < NEW.amount_owed THEN
    NEW.status := 'partial';
  ELSIF NEW.amount_paid >= NEW.amount_owed THEN
    NEW.status := 'paid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate status on insert/update
CREATE TRIGGER auto_calculate_credit_status
  BEFORE INSERT OR UPDATE ON credits
  FOR EACH ROW
  EXECUTE FUNCTION calculate_credit_status();
