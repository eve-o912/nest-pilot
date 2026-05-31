-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only SELECT their own rows
CREATE POLICY "Users can view their own expense categories"
  ON expense_categories FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only INSERT their own rows
CREATE POLICY "Users can insert their own expense categories"
  ON expense_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own rows
CREATE POLICY "Users can update their own expense categories"
  ON expense_categories FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only DELETE their own rows
CREATE POLICY "Users can delete their own expense categories"
  ON expense_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS expense_categories_user_id_idx ON expense_categories(user_id);
