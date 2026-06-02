import { supabase } from "./supabase";

/**
 * Auto Journal Entry System
 * Automatically posts journal entries for financial transactions
 */

// Account types for journal entries
export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

// Default account codes (can be customized per business)
const DEFAULT_ACCOUNTS = {
  cash: { name: 'Cash', type: AccountType.ASSET, code: '1000' },
  accounts_receivable: { name: 'Accounts Receivable', type: AccountType.ASSET, code: '1100' },
  revenue: { name: 'Sales Revenue', type: AccountType.REVENUE, code: '4000' },
  vat_payable: { name: 'VAT Payable', type: AccountType.LIABILITY, code: '2000' },
  cost_of_goods_sold: { name: 'Cost of Goods Sold', type: AccountType.EXPENSE, code: '5000' },
  expense: { name: 'General Expenses', type: AccountType.EXPENSE, code: '6000' },
};

/**
 * Create journal entry for invoice creation
 * Debit: Accounts Receivable (total amount)
 * Credit: Sales Revenue (subtotal) + VAT Payable (VAT amount)
 */
export async function createInvoiceJournalEntry(invoiceId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) throw new Error('Invoice not found');

    // Get or create accounts
    const accounts = await getOrCreateAccounts(user.id);

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        date: invoice.issue_date,
        description: `Invoice ${invoice.invoice_number} - ${invoice.customers?.business_name || 'Customer'}`,
        reference_type: 'invoice',
        reference_id: invoice.id,
      })
      .select()
      .single();

    if (journalError || !journalEntry) throw new Error('Failed to create journal entry');

    // Create journal entry lines
    const lines = [
      // Debit: Accounts Receivable
      {
        journal_entry_id: journalEntry.id,
        account_id: accounts.accounts_receivable.id,
        debit: invoice.total_amount,
        credit: 0,
        description: 'Accounts Receivable',
      },
      // Credit: Sales Revenue
      {
        journal_entry_id: journalEntry.id,
        account_id: accounts.revenue.id,
        debit: 0,
        credit: invoice.subtotal,
        description: 'Sales Revenue',
      },
      // Credit: VAT Payable
      {
        journal_entry_id: journalEntry.id,
        account_id: accounts.vat_payable.id,
        debit: 0,
        credit: invoice.vat_amount,
        description: 'VAT Payable',
      },
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) throw linesError;

    return { success: true, journalEntry };
  } catch (error) {
    console.error('Error creating invoice journal entry:', error);
    return { success: false, error };
  }
}

/**
 * Create journal entry for payment received
 * Debit: Cash (payment amount)
 * Credit: Accounts Receivable (payment amount)
 */
export async function createPaymentJournalEntry(paymentId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, invoices(invoice_number, customer_id)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) throw new Error('Payment not found');

    // Get or create accounts
    const accounts = await getOrCreateAccounts(user.id);

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        date: payment.payment_date,
        description: `Payment received for Invoice ${payment.invoices?.invoice_number}`,
        reference_type: 'payment',
        reference_id: payment.id,
      })
      .select()
      .single();

    if (journalError || !journalEntry) throw new Error('Failed to create journal entry');

    // Create journal entry lines
    const lines = [
      // Debit: Cash
      {
        journal_entry_id: journalEntry.id,
        account_id: accounts.cash.id,
        debit: payment.amount,
        credit: 0,
        description: 'Cash Received',
      },
      // Credit: Accounts Receivable
      {
        journal_entry_id: journalEntry.id,
        account_id: accounts.accounts_receivable.id,
        debit: 0,
        credit: payment.amount,
        description: 'Accounts Receivable',
      },
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) throw linesError;

    return { success: true, journalEntry };
  } catch (error) {
    console.error('Error creating payment journal entry:', error);
    return { success: false, error };
  }
}

/**
 * Create journal entry for expense creation
 * Debit: Expense Account (expense amount)
 * Credit: Cash (expense amount)
 */
export async function createExpenseJournalEntry(expenseId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch expense details
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) throw new Error('Expense not found');

    // Get or create accounts
    const accounts = await getOrCreateAccounts(user.id);

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        date: expense.date,
        description: `Expense: ${expense.category} - ${expense.description}`,
        reference_type: 'expense',
        reference_id: expense.id,
      })
      .select()
      .single();

    if (journalError || !journalEntry) throw new Error('Failed to create journal entry');

    // Create journal entry lines
    const lines = [
      // Debit: Expense Account
      {
        journal_entry_id: journalEntry.id,
        account_id: accounts.expense.id,
        debit: expense.amount,
        credit: 0,
        description: expense.category,
      },
      // Credit: Cash
      {
        journal_entry_id: journalEntry.id,
        account_id: accounts.cash.id,
        debit: 0,
        credit: expense.amount,
        description: 'Cash Paid',
      },
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) throw linesError;

    return { success: true, journalEntry };
  } catch (error) {
    console.error('Error creating expense journal entry:', error);
    return { success: false, error };
  }
}

/**
 * Get or create default chart of accounts for a user
 */
async function getOrCreateAccounts(userId: string) {
  const accounts: Record<string, any> = {};

  for (const [key, accountDef] of Object.entries(DEFAULT_ACCOUNTS)) {
    // Try to get existing account
    let { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('code', accountDef.code)
      .single();

    // If not found, create it
    if (!account) {
      const { data: newAccount } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: accountDef.name,
          code: accountDef.code,
          account_type: accountDef.type,
          balance: 0,
        })
        .select()
        .single();

      account = newAccount;
    }

    accounts[key as string] = account;
  }

  return accounts;
}

/**
 * Seed default chart of accounts for a new user
 * This should be called when a user signs up
 */
export async function seedDefaultChartOfAccounts(userId: string) {
  try {
    const accounts = Object.entries(DEFAULT_ACCOUNTS).map(([key, accountDef]) => ({
      user_id: userId,
      name: accountDef.name,
      code: accountDef.code,
      account_type: accountDef.type,
      balance: 0,
    }));

    const { error } = await supabase.from('accounts').insert(accounts);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error seeding chart of accounts:', error);
    return { success: false, error };
  }
}
