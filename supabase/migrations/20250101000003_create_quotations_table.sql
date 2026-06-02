-- Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  customer_id uuid REFERENCES customers(id),
  quotation_number text NOT NULL,
  issue_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  total_amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own quotations"
ON quotations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quotations"
ON quotations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotations"
ON quotations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotations"
ON quotations FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);

-- Add updated_at trigger
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
