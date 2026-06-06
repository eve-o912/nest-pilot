-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'credit')),
  mpesa_reference TEXT,
  notes TEXT,
  sent_via TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on receipt_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);

-- Create index on business_id for filtering by business
CREATE INDEX IF NOT EXISTS idx_receipts_business_id ON receipts(business_id);

-- Create index on customer_id for filtering by customer
CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON receipts(customer_id);

-- Create index on created_at for date range queries
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

-- Create index on payment_method for filtering
CREATE INDEX IF NOT EXISTS idx_receipts_payment_method ON receipts(payment_method);

-- Function to generate next receipt number for a business
CREATE OR REPLACE FUNCTION generate_receipt_number(business_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  last_number TEXT;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get the last receipt number for this business
  SELECT receipt_number INTO last_number
  FROM receipts
  WHERE business_id = business_uuid
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_number IS NULL THEN
    -- First receipt for this business
    next_number := 1;
  ELSE
    -- Extract number from last receipt (format: NP-0001)
    next_number := CAST(SPLIT_PART(last_number, '-', 2) AS INTEGER) + 1;
  END IF;

  -- Format as NP-0001, NP-0002, etc.
  formatted_number := 'NP-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own business receipts
CREATE POLICY "Users can view own business receipts"
  ON receipts FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert receipts for their business
CREATE POLICY "Users can insert receipts for own business"
  ON receipts FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update receipts for their business
CREATE POLICY "Users can update receipts for own business"
  ON receipts FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete receipts for their business
CREATE POLICY "Users can delete receipts for own business"
  ON receipts FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
