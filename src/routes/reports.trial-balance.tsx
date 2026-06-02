import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/reports/trial-balance")({
  component: TrialBalance,
  head: () => ({
    meta: [
      { title: "Trial Balance — Nest Pilot" },
      { name: "description", content: "Debit and credit balances report." },
    ],
  }),
});

function TrialBalance() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch accounts with their balances
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('account_type', { ascending: true });

      // Calculate debit and credit balances
      const debitAccounts: any[] = [];
      const creditAccounts: any[] = [];
      let totalDebits = 0;
      let totalCredits = 0;

      (accounts || []).forEach((account: any) => {
        const balance = account.balance || 0;
        
        // Assets and Expenses have debit balances
        if (account.account_type === 'asset' || account.account_type === 'expense') {
          debitAccounts.push(account);
          totalDebits += balance;
        } 
        // Liabilities, Equity, and Revenue have credit balances
        else if (account.account_type === 'liability' || account.account_type === 'equity' || account.account_type === 'revenue') {
          creditAccounts.push(account);
          totalCredits += balance;
        }
      });

      setData({
        debitAccounts,
        creditAccounts,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching trial balance:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Trial Balance</h2>
        <p className="text-sm text-muted-foreground">Debit and credit balances</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Balance Check */}
          <div className={`bg-white rounded-xl border p-6 shadow-sm ${data.isBalanced ? 'border-[#10B981]' : 'border-[#EF4444]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${data.isBalanced ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Balance Check</h3>
            </div>
            <p className={`text-sm ${data.isBalanced ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {data.isBalanced ? 'Trial balance is balanced' : 'Trial balance is not balanced'}
            </p>
          </div>

          {/* Trial Balance Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Account</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 text-right font-medium">Debit</th>
                  <th className="px-6 py-3 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {data.debitAccounts.map((account: any) => (
                  <tr key={account.id} className="border-b border-[#E2E8F0]">
                    <td className="px-6 py-3 text-sm font-medium text-foreground">{account.name}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground capitalize">{account.account_type}</td>
                    <td className="px-6 py-3 text-right font-mono text-sm text-foreground">{formatKES(account.balance || 0)}</td>
                    <td className="px-6 py-3 text-right font-mono text-sm text-muted-foreground">—</td>
                  </tr>
                ))}
                {data.creditAccounts.map((account: any) => (
                  <tr key={account.id} className="border-b border-[#E2E8F0]">
                    <td className="px-6 py-3 text-sm font-medium text-foreground">{account.name}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground capitalize">{account.account_type}</td>
                    <td className="px-6 py-3 text-right font-mono text-sm text-muted-foreground">—</td>
                    <td className="px-6 py-3 text-right font-mono text-sm text-foreground">{formatKES(account.balance || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC]">
                  <td className="px-6 py-3 font-semibold text-foreground">Total</td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-foreground">{formatKES(data.totalDebits)}</td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-foreground">{formatKES(data.totalCredits)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-muted-foreground">
          No data available
        </div>
      )}
    </div>
  );
}
