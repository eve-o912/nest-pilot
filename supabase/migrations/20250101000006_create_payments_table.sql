-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  invoice_id uuid REFERENCES invoices(id),
  amount numeric NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'mpesa'
    CHECK (payment_method IN ('cash','mpesa','bank','card','cheque')),
  reference text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own payments"
ON payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments"
ON payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments"
ON payments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments"
ON payments FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
