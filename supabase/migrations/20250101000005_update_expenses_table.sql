-- Update expenses table to match Phase 1 schema
-- This migration updates the existing expenses table structure

-- Check if expenses table exists and update it
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'expenses') THEN
        -- Add missing columns if they don't exist
        ALTER TABLE expenses 
        ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
        ADD COLUMN IF NOT EXISTS description text,
        ADD COLUMN IF NOT EXISTS amount numeric NOT NULL,
        ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE,
        ADD COLUMN IF NOT EXISTS receipt_url text,
        ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash'
            CHECK (payment_method IN ('cash','mpesa','bank','card')),
        ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved'
            CHECK (status IN ('pending','approved','rejected'));
        
        -- Enable RLS
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
        DROP POLICY IF EXISTS "Users can insert expenses" ON expenses;
        DROP POLICY IF EXISTS "Users can update expenses" ON expenses;
        DROP POLICY IF EXISTS "Users can delete expenses" ON expenses;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own expenses"
        ON expenses FOR SELECT
        USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own expenses"
        ON expenses FOR INSERT
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own expenses"
        ON expenses FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own expenses"
        ON expenses FOR DELETE
        USING (auth.uid() = user_id);
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
        CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
    ELSE
        -- Create expenses table if it doesn't exist
        CREATE TABLE expenses (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid REFERENCES auth.users(id) NOT NULL,
          category text NOT NULL DEFAULT 'other',
          description text,
          amount numeric NOT NULL,
          date date DEFAULT CURRENT_DATE,
          receipt_url text,
          payment_method text DEFAULT 'cash'
            CHECK (payment_method IN ('cash','mpesa','bank','card')),
          status text DEFAULT 'approved'
            CHECK (status IN ('pending','approved','rejected')),
          created_at timestamptz DEFAULT now()
        );
        
        -- Enable RLS
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own expenses"
        ON expenses FOR SELECT
        USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own expenses"
        ON expenses FOR INSERT
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own expenses"
        ON expenses FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own expenses"
        ON expenses FOR DELETE
        USING (auth.uid() = user_id);
        
        -- Create indexes
        CREATE INDEX idx_expenses_user_id ON expenses(user_id);
        CREATE INDEX idx_expenses_category ON expenses(category);
        CREATE INDEX idx_expenses_date ON expenses(date);
        CREATE INDEX idx_expenses_status ON expenses(status);
    END IF;
END $$;
