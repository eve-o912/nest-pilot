-- ============================================================================
-- FEATURE 1: PURCHASE ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier_name text NOT NULL,
  delivery_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','received','cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, po_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own POs"
  ON purchase_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own POs"
  ON purchase_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own POs"
  ON purchase_orders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own POs"
  ON purchase_orders FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can access their PO items"
  ON purchase_order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM purchase_orders WHERE id = po_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert their PO items"
  ON purchase_order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM purchase_orders WHERE id = po_id AND user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_po_user_id ON purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase_order_items(po_id);

-- Function to auto-generate PO number
CREATE OR REPLACE FUNCTION generate_po_number(user_uuid uuid)
RETURNS text AS $$
DECLARE
  count int;
BEGIN
  SELECT COUNT(*) + 1 INTO count FROM purchase_orders WHERE user_id = user_uuid;
  RETURN 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(count::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FEATURE 2: DOUBLE-ENTRY BOOKKEEPING (enhance existing accounts/journal tables)
-- ============================================================================

-- Create trigger for updated_at on accounts
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure journal_entries has proper RLS for updates/deletes
DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;

CREATE POLICY "Users can update their own journal entries"
  ON journal_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own journal entries"
  ON journal_entries FOR DELETE USING (auth.uid() = user_id);

-- Ensure journal_entry_lines has full RLS
DROP POLICY IF EXISTS "Users can update their own journal entry lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "Users can delete their own journal entry lines" ON journal_entry_lines;

CREATE POLICY "Users can update their own journal entry lines"
  ON journal_entry_lines FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own journal entry lines"
  ON journal_entry_lines FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FEATURE 4: PAYROLL PROCESSING
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  id_number text NOT NULL,
  job_title text,
  gross_salary numeric NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','terminated')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, id_number)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft','processed','paid')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS payslips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  gross_salary numeric NOT NULL,
  paye numeric DEFAULT 0,
  nssf_employee numeric DEFAULT 0,
  nhif numeric DEFAULT 0,
  housing_levy_employee numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  net_pay numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own employees"
  ON employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own employees"
  ON employees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own employees"
  ON employees FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their payroll runs"
  ON payroll_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their payroll runs"
  ON payroll_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their payroll runs"
  ON payroll_runs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their payslips"
  ON payslips FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payroll_runs WHERE payroll_runs.id = payslips.payroll_run_id AND payroll_runs.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_user_id ON payroll_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(user_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_run_id ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips(employee_id);

-- ============================================================================
-- FEATURE 5: PROJECTS & TIME BILLING
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id),
  name text NOT NULL,
  description text,
  billing_type text NOT NULL CHECK (billing_type IN ('fixed','hourly')),
  budget_amount numeric,
  hourly_rate numeric,
  status text DEFAULT 'active' CHECK (status IN ('active','completed','cancelled','on_hold')),
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  hours numeric NOT NULL,
  description text,
  hourly_rate numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','invoiced','paid')),
  invoice_id uuid REFERENCES invoices(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can access their project time entries"
  ON time_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert their time entries"
  ON time_entries FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can access their project milestones"
  ON project_milestones FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON project_milestones(project_id);

-- ============================================================================
-- UTILITY FUNCTIONS FOR AUTO-POSTING JOURNAL ENTRIES
-- ============================================================================

-- Function to post a simple debit/credit transaction
CREATE OR REPLACE FUNCTION post_transaction_journal(
  p_user_id uuid,
  p_description text,
  p_debit_account_code text,
  p_credit_account_code text,
  p_amount numeric,
  p_reference text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_journal_id uuid;
  v_debit_account_id uuid;
  v_credit_account_id uuid;
BEGIN
  -- Get or create the journal entry
  INSERT INTO journal_entries (user_id, description, reference, source, source_id)
  VALUES (p_user_id, p_description, p_reference, p_source, p_source_id)
  RETURNING id INTO v_journal_id;

  -- Get debit and credit account IDs
  SELECT id INTO v_debit_account_id FROM accounts 
  WHERE user_id = p_user_id AND code = p_debit_account_code LIMIT 1;
  
  SELECT id INTO v_credit_account_id FROM accounts 
  WHERE user_id = p_user_id AND code = p_credit_account_code LIMIT 1;

  -- If accounts don't exist, create them
  IF v_debit_account_id IS NULL THEN
    INSERT INTO accounts (user_id, code, name, type)
    VALUES (p_user_id, p_debit_account_code, p_debit_account_code, 'asset')
    RETURNING id INTO v_debit_account_id;
  END IF;

  IF v_credit_account_id IS NULL THEN
    INSERT INTO accounts (user_id, code, name, type)
    VALUES (p_user_id, p_credit_account_code, p_credit_account_code, 'asset')
    RETURNING id INTO v_credit_account_id;
  END IF;

  -- Post debit entry
  INSERT INTO journal_entry_lines (journal_entry_id, account_code, account_name, debit, credit)
  VALUES (v_journal_id, p_debit_account_code, p_debit_account_code, p_amount, 0);

  -- Post credit entry
  INSERT INTO journal_entry_lines (journal_entry_id, account_code, account_name, debit, credit)
  VALUES (v_journal_id, p_credit_account_code, p_credit_account_code, 0, p_amount);

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql;
