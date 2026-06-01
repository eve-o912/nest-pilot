-- Create lenders table (managed by Nest Pilot admin)
CREATE TABLE IF NOT EXISTS lenders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('bank', 'sacco', 'microfinance', 'mobile')),
  min_amount NUMERIC NOT NULL,
  max_amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  repayment_period TEXT NOT NULL,
  requirements TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS lenders_type_idx ON lenders(type);
CREATE INDEX IF NOT EXISTS lenders_active_idx ON lenders(active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_lenders_updated_at
  BEFORE UPDATE ON lenders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
