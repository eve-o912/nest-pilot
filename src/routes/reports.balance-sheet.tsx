import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Scale } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/reports/balance-sheet")({
  component: BalanceSheet,
  head: () => ({
    meta: [
      { title: "Balance Sheet — Nest Pilot" },
      { name: "description", content: "Assets, liabilities, and equity report." },
    ],
  }),
});

function BalanceSheet() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchBalanceSheet();
  }, []);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch accounts and their balances from journal entries
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);

      // Calculate balances based on account type
      const assets = (accounts || []).filter((a: any) => a.account_type === 'asset');
      const liabilities = (accounts || []).filter((a: any) => a.account_type === 'liability');
      const equity = (accounts || []).filter((a: any) => a.account_type === 'equity');

      const totalAssets = assets.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
      const totalLiabilities = liabilities.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
      const totalEquity = equity.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

      setData({
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Balance Sheet</h2>
        <p className="text-sm text-muted-foreground">Assets, liabilities, and equity</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10B981]/15 text-[#10B981]">
                <Scale className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Assets</h3>
            </div>
            <div className="space-y-2 mb-4">
              {data.assets.map((account: any) => (
                <div key={account.id} className="flex justify-between py-2">
                  <span className="text-foreground">{account.name}</span>
                  <span className="font-mono text-foreground">{formatKES(account.balance || 0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#E2E8F0] pt-4 flex justify-between">
              <span className="font-semibold text-foreground">Total Assets</span>
              <span className="font-mono font-bold text-[#10B981]">{formatKES(data.totalAssets)}</span>
            </div>
          </div>

          {/* Liabilities */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EF4444]/15 text-[#EF4444]">
                <Scale className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Liabilities</h3>
            </div>
            <div className="space-y-2 mb-4">
              {data.liabilities.map((account: any) => (
                <div key={account.id} className="flex justify-between py-2">
                  <span className="text-foreground">{account.name}</span>
                  <span className="font-mono text-foreground">{formatKES(account.balance || 0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#E2E8F0] pt-4 flex justify-between">
              <span className="font-semibold text-foreground">Total Liabilities</span>
              <span className="font-mono font-bold text-[#EF4444]">{formatKES(data.totalLiabilities)}</span>
            </div>
          </div>

          {/* Equity */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6]/15 text-[#3B82F6]">
                <Scale className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Equity</h3>
            </div>
            <div className="space-y-2 mb-4">
              {data.equity.map((account: any) => (
                <div key={account.id} className="flex justify-between py-2">
                  <span className="text-foreground">{account.name}</span>
                  <span className="font-mono text-foreground">{formatKES(account.balance || 0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#E2E8F0] pt-4 flex justify-between">
              <span className="font-semibold text-foreground">Total Equity</span>
              <span className="font-mono font-bold text-[#3B82F6]">{formatKES(data.totalEquity)}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Balance Check</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Assets</span>
                <span className="font-mono text-foreground">{formatKES(data.totalAssets)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Liabilities + Equity</span>
                <span className="font-mono text-foreground">{formatKES(data.totalLiabilities + data.totalEquity)}</span>
              </div>
              <div className="border-t border-[#E2E8F0] pt-2 flex justify-between">
                <span className="font-semibold text-foreground">Balance</span>
                <span className={`font-mono font-bold ${Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 1 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {formatKES(data.totalAssets - (data.totalLiabilities + data.totalEquity))}
                </span>
              </div>
            </div>
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
