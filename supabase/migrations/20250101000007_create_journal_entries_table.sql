-- Create journal_entries table (accounting engine)
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date DEFAULT CURRENT_DATE,
  description text NOT NULL,
  reference text,
  source text,
  source_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own journal entries"
ON journal_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
ON journal_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source_id ON journal_entries(source_id);
