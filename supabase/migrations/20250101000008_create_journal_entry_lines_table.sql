-- Create journal_entry_lines table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0
);

-- Enable RLS
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can access journal entry lines through their journal entries)
CREATE POLICY "Users can view their own journal entry lines"
ON journal_entry_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM journal_entries
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id
    AND journal_entries.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own journal entry lines"
ON journal_entry_lines FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM journal_entries
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id
    AND journal_entries.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_code ON journal_entry_lines(account_code);
