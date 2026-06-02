-- Update customers table to match Phase 1 schema
-- This migration updates the existing customers table

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS kra_pin text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS notes text;

-- Update existing customers to have business_name if they only have name
UPDATE customers 
SET business_name = name, 
    contact_name = name
WHERE business_name IS NULL AND name IS NOT NULL;

-- Enable RLS if not already enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;
DROP POLICY IF EXISTS "Users can delete customers" ON customers;

-- Create RLS policies
CREATE POLICY "Users can view their own customers"
ON customers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
ON customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
ON customers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
ON customers FOR DELETE
USING (auth.uid() = user_id);
