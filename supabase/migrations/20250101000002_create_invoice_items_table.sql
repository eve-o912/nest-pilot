-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can access invoice items through their invoices)
CREATE POLICY "Users can view their own invoice items"
ON invoice_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own invoice items"
ON invoice_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own invoice items"
ON invoice_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own invoice items"
ON invoice_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
