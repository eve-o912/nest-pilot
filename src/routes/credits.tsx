import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { CheckCircle, XCircle, Building2, Phone, Calendar, DollarSign, TrendingUp, Clock, AlertCircle, X, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, subMonths, differenceInMonths } from "date-fns";

interface Lender {
  id: string;
  name: string;
  logo_url: string | null;
  type: 'bank' | 'sacco' | 'microfinance' | 'mobile';
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  repayment_period: string;
  requirements: string[];
  active: boolean;
}

interface CreditApplication {
  id: string;
  user_id: string;
  lender_id: string;
  amount_requested: number;
  purpose: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  financial_snapshot: {
    monthly_revenue: number;
    monthly_expenses: number;
    net_profit: number;
    months_on_platform: number;
    total_transactions: number;
    mpesa_volume: number;
  };
  submitted_at: string | null;
  created_at: string;
}

interface FinancialProfile {
  months_on_platform: number;
  avg_monthly_revenue: number;
  avg_monthly_expenses: number;
  net_profit: number;
  total_transactions: number;
  mpesa_volume: number;
  credit_score: number;
}

export const Route = createFileRoute("/credits")({
  component: Credits,
  head: () => ({
    meta: [
      { title: "Mkopo — Nest Pilot" },
      { name: "description", content: "Credit marketplace for vendors to access loans from partnered lenders." },
    ],
  }),
});

function Credits() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [applications, setApplications] = useState<CreditApplication[]>([]);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedLender, setSelectedLender] = useState<Lender | null>(null);
  const [applicationAmount, setApplicationAmount] = useState('');
  const [applicationPurpose, setApplicationPurpose] = useState('');
  const [agreedToShare, setAgreedToShare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch lenders
      const { data: lendersData } = await supabase
        .from('lenders')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (lendersData) setLenders(lendersData);

      // Fetch user's applications
      const { data: applicationsData } = await supabase
        .from('credit_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (applicationsData) setApplications(applicationsData);

      // Calculate financial profile
      const profile = await calculateFinancialProfile(user.id);
      setFinancialProfile(profile);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialProfile = async (userId: string): Promise<FinancialProfile> => {
    try {
      // Get user creation date for months on platform
      const { data: userData } = await supabase.auth.getUser();
      const userCreatedAt = userData?.user?.created_at;
      const monthsOnPlatform = userCreatedAt 
        ? differenceInMonths(new Date(), new Date(userCreatedAt))
        : 0;

      // Get transactions for last 3 months
      const threeMonthsAgo = subMonths(new Date(), 3);
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', userId)
        .gte('date', threeMonthsAgo.toISOString());

      // Calculate monthly averages
      let totalRevenue = 0;
      let totalExpenses = 0;
      let transactionCount = 0;

      if (transactions) {
        transactions.forEach(t => {
          if (t.type === 'in') {
            totalRevenue += Number(t.amount);
          } else if (t.type === 'out') {
            totalExpenses += Number(t.amount);
          }
          transactionCount++;
        });
      }

      const avgMonthlyRevenue = totalRevenue / 3;
      const avgMonthlyExpenses = totalExpenses / 3;
      const netProfit = avgMonthlyRevenue - avgMonthlyExpenses;

      // Get M-Pesa volume for last 30 days
      const thirtyDaysAgo = subMonths(new Date(), 1);
      const { data: mpesaTransactions } = await supabase
        .from('mpesa_transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      let mpesaVolume = 0;
      if (mpesaTransactions) {
        mpesaTransactions.forEach(t => {
          mpesaVolume += Number(t.amount);
        });
      }

      // Calculate credit score (0-100)
      let creditScore = 0;
      if (monthsOnPlatform >= 3) creditScore += 25;
      if (avgMonthlyRevenue >= 10000) creditScore += 25;
      if (netProfit > 0) creditScore += 25;
      if (transactionCount >= 20) creditScore += 15;
      if (mpesaVolume > 0) creditScore += 10;

      return {
        months_on_platform: monthsOnPlatform,
        avg_monthly_revenue: avgMonthlyRevenue,
        avg_monthly_expenses: avgMonthlyExpenses,
        net_profit: netProfit,
        total_transactions: transactionCount,
        mpesa_volume: mpesaVolume,
        credit_score: Math.min(creditScore, 100)
      };
    } catch (error) {
      console.error('Error calculating financial profile:', error);
      return {
        months_on_platform: 0,
        avg_monthly_revenue: 0,
        avg_monthly_expenses: 0,
        net_profit: 0,
        total_transactions: 0,
        mpesa_volume: 0,
        credit_score: 0
      };
    }
  };

  const checkEligibility = (lender: Lender): boolean => {
    if (!financialProfile) return false;
    
    // Check if user meets lender requirements
    const meetsRevenue = financialProfile.avg_monthly_revenue >= 10000;
    const meetsHistory = financialProfile.months_on_platform >= 3;
    const meetsTransactions = financialProfile.total_transactions >= 20;
    
    return meetsRevenue && meetsHistory && meetsTransactions;
  };

  const handleApplyForLoan = (lender: Lender) => {
    setSelectedLender(lender);
    setApplicationAmount('');
    setApplicationPurpose('');
    setAgreedToShare(false);
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!selectedLender || !financialProfile || !applicationAmount || !applicationPurpose || !agreedToShare) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('credit_applications')
        .insert({
          user_id: user.id,
          lender_id: selectedLender.id,
          amount_requested: parseFloat(applicationAmount),
          purpose: applicationPurpose,
          status: 'submitted',
          financial_snapshot: {
            monthly_revenue: financialProfile.avg_monthly_revenue,
            monthly_expenses: financialProfile.avg_monthly_expenses,
            net_profit: financialProfile.net_profit,
            months_on_platform: financialProfile.months_on_platform,
            total_transactions: financialProfile.total_transactions,
            mpesa_volume: financialProfile.mpesa_volume
          },
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccessMessage(`Application submitted! ${selectedLender.name} will contact you soon.`);
      setShowApplicationModal(false);
      fetchData();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatKES = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getScoreColor = (score: number) => {
    if (score <= 40) return 'text-destructive';
    if (score <= 70) return 'text-warning';
    return 'text-success';
  };

  const getScoreLabel = (score: number) => {
    if (score <= 40) return 'Building';
    if (score <= 70) return 'Growing';
    return 'Strong';
  };

  const getScoreMessage = (score: number) => {
    if (score <= 40) return 'Keep recording daily transactions to build your profile.';
    if (score <= 70) return 'Your profile is growing. You qualify for small loans now.';
    return 'Strong profile! You qualify for larger loans from many lenders.';
  };

  const getStatusBadge = (status: CreditApplication['status']) => {
    const statusMap = {
      draft: { label: 'Draft', className: 'bg-secondary text-secondary-foreground' },
      submitted: { label: 'Submitted', className: 'bg-blue-500 text-white' },
      under_review: { label: 'Under Review', className: 'bg-yellow-500 text-white' },
      approved: { label: 'Approved', className: 'bg-success text-success-foreground' },
      rejected: { label: 'Rejected', className: 'bg-destructive text-destructive-foreground' }
    };
    const s = statusMap[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.className}`}>{s.label}</span>;
  };

  const filteredLenders = useMemo(() => {
    if (filterType === 'all') return lenders;
    return lenders.filter(l => l.type === filterType);
  }, [lenders, filterType]);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pb-16">
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-sm border border-border bg-success/10 p-4 text-success">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="mb-6">
        <h1 className="text-2xl font-semibold">Mkopo</h1>
        <p className="text-sm text-muted-foreground">
          Credit marketplace for vendors to access loans from partnered lenders
        </p>
      </section>

      {/* SECTION 1: Financial Identity Card */}
      {financialProfile && (
        <section className="mb-8">
          <div className="rounded-sm border border-border bg-card p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
              {/* Score Indicator */}
              <div className="flex-shrink-0">
                <div className="relative w-32 h-32 mx-auto md:mx-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-secondary"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${financialProfile.credit_score * 3.52} 352`}
                      className={getScoreColor(financialProfile.credit_score)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${getScoreColor(financialProfile.credit_score)}`}>
                      {financialProfile.credit_score}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className="mt-3 text-center md:text-left">
                  <span className={`text-sm font-semibold ${getScoreColor(financialProfile.credit_score)}`}>
                    {getScoreLabel(financialProfile.credit_score)}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatItem
                  label="Avg Monthly Revenue"
                  value={formatKES(financialProfile.avg_monthly_revenue)}
                  icon={<TrendingUp className="h-4 w-4" />}
                  progress={Math.min((financialProfile.avg_monthly_revenue / 10000) * 100, 100)}
                />
                <StatItem
                  label="Net Profit"
                  value={formatKES(financialProfile.net_profit)}
                  icon={<DollarSign className="h-4 w-4" />}
                  progress={financialProfile.net_profit > 0 ? 100 : 0}
                />
                <StatItem
                  label="Months on Platform"
                  value={financialProfile.months_on_platform.toString()}
                  icon={<Calendar className="h-4 w-4" />}
                  progress={Math.min((financialProfile.months_on_platform / 3) * 100, 100)}
                />
                <StatItem
                  label="Total Transactions"
                  value={financialProfile.total_transactions.toString()}
                  icon={<Clock className="h-4 w-4" />}
                  progress={Math.min((financialProfile.total_transactions / 20) * 100, 100)}
                />
              </div>
            </div>

            {/* Message */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {getScoreMessage(financialProfile.credit_score)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: Lenders Marketplace */}
      <section className="mb-8">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Our Lending Partners</h2>
          <div className="flex flex-wrap gap-2">
            {['all', 'bank', 'sacco', 'mobile', 'microfinance'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={
                  "px-3 py-1.5 text-sm font-medium rounded-sm transition-colors " +
                  (filterType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-secondary")
                }
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLenders.map((lender) => {
            const isEligible = checkEligibility(lender);
            return (
              <div key={lender.id} className="rounded-sm border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-sm bg-secondary flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{lender.name}</h3>
                      <span className="text-xs text-muted-foreground capitalize">{lender.type}</span>
                    </div>
                  </div>
                  {isEligible ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success">
                      <CheckCircle className="h-4 w-4" />
                      You qualify
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      Not yet
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loan range:</span>
                    <span className="font-medium">{formatKES(lender.min_amount)} – {formatKES(lender.max_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interest rate:</span>
                    <span className="font-medium">{lender.interest_rate}% per month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repayment:</span>
                    <span className="font-medium">{lender.repayment_period}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Requirements</p>
                  <ul className="space-y-1">
                    {lender.requirements.slice(0, 3).map((req, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleApplyForLoan(lender)}
                  disabled={!isEligible}
                  className={
                    "w-full py-2.5 text-sm font-semibold rounded-sm transition-colors " +
                    (isEligible
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-secondary text-muted-foreground cursor-not-allowed")
                  }
                >
                  Apply for Loan
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: My Applications */}
      <section>
        <h2 className="text-xl font-semibold mb-4">My Applications</h2>
        {applications.length === 0 ? (
          <div className="rounded-sm border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No loan applications yet</p>
          </div>
        ) : (
          <div className="rounded-sm border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 font-medium">Lender</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const lender = lenders.find(l => l.id === app.lender_id);
                  return (
                    <tr key={app.id} className="border-b border-border">
                      <td className="px-4 py-3 font-medium">{lender?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 font-mono">{formatKES(app.amount_requested)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {app.submitted_at ? format(new Date(app.submitted_at), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-sm text-primary hover:underline">
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Application Modal */}
      {showApplicationModal && selectedLender && financialProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Apply for Loan</h3>
              <button
                onClick={() => setShowApplicationModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3 pb-4 border-b border-border">
              <div className="h-10 w-10 rounded-sm bg-secondary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{selectedLender.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatKES(selectedLender.min_amount)} – {formatKES(selectedLender.max_amount)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount Needed (KES)
                </label>
                <input
                  type="number"
                  value={applicationAmount}
                  onChange={(e) => setApplicationAmount(e.target.value)}
                  min={selectedLender.min_amount}
                  max={selectedLender.max_amount}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder={`${selectedLender.min_amount} - ${selectedLender.max_amount}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Range: {formatKES(selectedLender.min_amount)} – {formatKES(selectedLender.max_amount)}
                </p>
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Loan Purpose
                </label>
                <select
                  value={applicationPurpose}
                  onChange={(e) => setApplicationPurpose(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                >
                  <option value="">Select purpose</option>
                  <option value="Restock">Restock</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Rent">Rent</option>
                  <option value="Expansion">Expansion</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="rounded-sm bg-secondary/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  The following info will be sent to {selectedLender.name}:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg monthly revenue:</span>
                    <span className="font-medium">{formatKES(financialProfile.avg_monthly_revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net profit:</span>
                    <span className="font-medium">{formatKES(financialProfile.net_profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Months on platform:</span>
                    <span className="font-medium">{financialProfile.months_on_platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction count:</span>
                    <span className="font-medium">{financialProfile.total_transactions}</span>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToShare}
                  onChange={(e) => setAgreedToShare(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input"
                />
                <span className="text-xs text-muted-foreground">
                  I agree to share my business data with {selectedLender.name}
                </span>
              </label>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowApplicationModal(false)}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitApplication}
                disabled={!applicationAmount || !applicationPurpose || !agreedToShare || submitting}
                className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatItem({ label, value, icon, progress }: { label: string; value: string; icon: React.ReactNode; progress: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        <span className="font-mono font-semibold text-sm">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
