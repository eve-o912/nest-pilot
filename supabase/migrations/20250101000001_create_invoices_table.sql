-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  customer_id uuid REFERENCES customers(id),
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','partial','overdue','cancelled')),
  subtotal numeric DEFAULT 0,
  vat_rate numeric DEFAULT 16,
  vat_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  amount_due numeric GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own invoices"
ON invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
ON invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
ON invoices FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
ON invoices FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
