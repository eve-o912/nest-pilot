-- Create credit_applications table
CREATE TABLE IF NOT EXISTS credit_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lender_id UUID NOT NULL REFERENCES lenders(id) ON DELETE CASCADE,
  amount_requested NUMERIC NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  financial_snapshot JSONB NOT NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only SELECT their own rows
CREATE POLICY "Users can view their own credit applications"
  ON credit_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only INSERT their own rows
CREATE POLICY "Users can insert their own credit applications"
  ON credit_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own rows
CREATE POLICY "Users can update their own credit applications"
  ON credit_applications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only DELETE their own rows
CREATE POLICY "Users can delete their own credit applications"
  ON credit_applications FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS credit_applications_user_id_idx ON credit_applications(user_id);
CREATE INDEX IF NOT EXISTS credit_applications_lender_id_idx ON credit_applications(lender_id);
CREATE INDEX IF NOT EXISTS credit_applications_status_idx ON credit_applications(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_credit_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_credit_applications_updated_at
  BEFORE UPDATE ON credit_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_applications_updated_at();
