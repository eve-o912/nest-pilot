import { useState, useEffect } from "react";
import { Calendar, TrendingUp, Wallet, AlertTriangle, Target, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateWeeklyReview } from "@/lib/gemini";
import { formatKES } from "@/lib/store";

interface WeeklyReviewData {
  revenue: number;
  profit: number;
  expenses: number;
  savings: number;
  cashFlow: number;
  passportScore: number;
  keyRisks: string[];
  recommendedActions: string[];
}

export function WeeklyReview() {
  const [reviewData, setReviewData] = useState<WeeklyReviewData | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showFullReview, setShowFullReview] = useState(false);

  useEffect(() => {
    fetchWeeklyReview();
  }, []);

  const fetchWeeklyReview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate dates for this week
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      // Fetch weekly transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", weekStartStr);

      const incomeTransactions = transactions?.filter((t: any) => t.type === "income") || [];
      const expenseTransactions = transactions?.filter((t: any) => t.type === "expense") || [];

      const revenue = incomeTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
      const expenses = expenseTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
      const profit = revenue - expenses;
      const cashFlow = revenue - expenses;

      // Mock savings calculation (would need actual savings data)
      const savings = Math.floor(profit * 0.2);

      // Mock passport score
      const passportScore = 84;

      const businessData = {
        transactions: transactions || [],
        revenue: { daily: revenue / 7, weekly: revenue, monthly: revenue * 4 },
        expenses: expenseTransactions.map((t: any) => ({
          category: t.category || "Other",
          amount: t.amount,
          frequency: "varies",
        })),
        inventory: [],
        financialPassport: {
          score: passportScore,
          revenueConsistency: 87,
          savingsConsistency: 94,
          marginScore: 78,
          loanEligibility: 240000,
        },
        businessName: "Your Business",
        currency: "KES",
      };

      setReviewData({
        revenue,
        profit,
        expenses,
        savings,
        cashFlow,
        passportScore,
        keyRisks: [],
        recommendedActions: [],
      });

      // Generate AI summary
      try {
        const summary = await generateWeeklyReview(businessData);
        setAiSummary(summary);
      } catch (error) {
        console.error("Error generating AI summary:", error);
        setAiSummary("Unable to generate AI summary at this time.");
      }
    } catch (error) {
      console.error("Error fetching weekly review:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-[#F59E0B]" />
          <h3 className="text-lg font-semibold">Weekly Business Review</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#F59E0B]" />
          <h3 className="text-lg font-semibold">Weekly Business Review</h3>
        </div>
        <button
          onClick={() => setShowFullReview(!showFullReview)}
          className="text-sm text-[#00AEEF] hover:underline flex items-center gap-1"
        >
          {showFullReview ? "Show less" : "View full review"}
          <ChevronRight className={`h-4 w-4 transition-transform ${showFullReview ? "rotate-90" : ""}`} />
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs text-gray-500">Revenue</span>
          </div>
          <p className="text-lg font-semibold">{formatKES(reviewData?.revenue || 0)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-gray-500">Profit</span>
          </div>
          <p className="text-lg font-semibold">{formatKES(reviewData?.profit || 0)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-xs text-gray-500">Passport Score</span>
          </div>
          <p className="text-lg font-semibold">{reviewData?.passportScore || 0}/100</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs text-gray-500">Expenses</span>
          </div>
          <p className="text-lg font-semibold">{formatKES(reviewData?.expenses || 0)}</p>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
          <span className="text-xs font-semibold text-gray-600">MANIKKA INSIGHT</span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary || "Generating insights..."}</p>
      </div>

      {/* Full Review (collapsible) */}
      {showFullReview && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold mb-3">Key Metrics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Weekly Revenue</span>
                <span className="font-medium">{formatKES(reviewData?.revenue || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weekly Profit</span>
                <span className="font-medium">{formatKES(reviewData?.profit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weekly Expenses</span>
                <span className="font-medium">{formatKES(reviewData?.expenses || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Savings</span>
                <span className="font-medium">{formatKES(reviewData?.savings || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cash Flow</span>
                <span className="font-medium">{formatKES(reviewData?.cashFlow || 0)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold mb-3">Financial Passport</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Score</span>
                <span className="font-medium">{reviewData?.passportScore || 0}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue Consistency</span>
                <span className="font-medium">87/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Savings Consistency</span>
                <span className="font-medium">94/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Margin Score</span>
                <span className="font-medium">78/100</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold mb-3">Recommended Actions</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <span>Maintain daily deposits to improve revenue consistency</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <span>Increase savings consistency to improve funding eligibility</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <span>Review top expense categories for optimization opportunities</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
