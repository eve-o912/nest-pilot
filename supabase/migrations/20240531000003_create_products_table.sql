-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  buying_price NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  low_stock_alert INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only SELECT their own rows
CREATE POLICY "Users can view their own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only INSERT their own rows
CREATE POLICY "Users can insert their own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own rows
CREATE POLICY "Users can update their own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only DELETE their own rows
CREATE POLICY "Users can delete their own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS products_user_id_idx ON products(user_id);
CREATE INDEX IF NOT EXISTS products_current_stock_idx ON products(current_stock);

-- Add product_id and quantity columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quantity INTEGER;

-- Create index for product_id in transactions
CREATE INDEX IF NOT EXISTS transactions_product_id_idx ON transactions(product_id);
