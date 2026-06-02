-- Create quotation_items table
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric NOT NULL,
  total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can access quotation items through their quotations)
CREATE POLICY "Users can view their own quotation items"
ON quotation_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_items.quotation_id
    AND quotations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own quotation items"
ON quotation_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_items.quotation_id
    AND quotations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own quotation items"
ON quotation_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_items.quotation_id
    AND quotations.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_items.quotation_id
    AND quotations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own quotation items"
ON quotation_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_items.quotation_id
    AND quotations.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
