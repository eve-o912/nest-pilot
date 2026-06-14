import { formatKES } from "@/lib/store";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface WeeklyMetric {
  label: string;
  current: number;
  previous: number;
  change: number;
  changeType: "positive" | "negative";
}

interface ActionItem {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
}

export function WeeklyFounderReport() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date();

  // Mock weekly metrics
  const metrics: WeeklyMetric[] = [
    {
      label: "Cash Balance",
      current: 4200000,
      previous: 4350000,
      change: -3.4,
      changeType: "negative",
    },
    {
      label: "MRR",
      current: 180000,
      previous: 158000,
      change: 13.9,
      changeType: "positive",
    },
    {
      label: "Monthly Burn",
      current: 467000,
      previous: 455000,
      change: 2.6,
      changeType: "negative",
    },
    {
      label: "Runway",
      current: 9,
      previous: 9.5,
      change: -5.3,
      changeType: "negative",
    },
  ];

  const actionItems: ActionItem[] = [
    {
      priority: "high",
      title: "Start investor conversations",
      description: "With 9 months runway, begin outreach 3-4 months before funding needed. Target October start.",
    },
    {
      priority: "medium",
      title: "Review AWS spending",
      description: "AWS costs spiked 34K this month due to load testing. Consider separating dev/prod tiers.",
    },
    {
      priority: "medium",
      title: "Complete cap table",
      description: "Missing from fundraising data room. Update with current ownership structure.",
    },
    {
      priority: "low",
      title: "Calculate unit economics",
      description: "Investors will want CAC and LTV metrics. Calculate from current customer data.",
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
      case "medium": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900";
      case "low": return "text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="h-4 w-4" />;
      case "medium": return <Clock className="h-4 w-4" />;
      case "low": return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-l-4 border-sky-500 bg-sky-50 dark:bg-sky-950/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sky-900 dark:text-sky-100">Weekly Founder Report</h3>
            <p className="text-sm text-sky-700 dark:text-sky-300">
              {weekStart.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-sky-900 dark:text-sky-100">9 months</p>
            <p className="text-xs text-sky-700 dark:text-sky-300">runway remaining</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Key Metrics This Week</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {metric.label}
              </p>
              <p className="text-2xl font-bold text-foreground">{formatKES(metric.current)}</p>
              <div className={`flex items-center gap-1 text-sm ${
                metric.changeType === "positive" ? "text-green-600" : "text-red-600"
              }`}>
                {metric.changeType === "positive" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(metric.change)}% vs last week
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Executive Summary</h3>
        <div className="space-y-3 text-sm">
          <p className="text-foreground">
            <span className="font-semibold">Runway:</span> You have 9 months of runway at current burn. 
            MRR growth at 14% MoM is strong and puts you on track to reach default alive before funding is needed.
          </p>
          <p className="text-foreground">
            <span className="font-semibold">Growth:</span> MRR increased by KES 22K this week, maintaining healthy growth trajectory. 
            Customer acquisition remains steady with 12 new signups.
          </p>
          <p className="text-foreground">
            <span className="font-semibold">Burn:</span> Monthly burn increased slightly to KES 467K due to one-time AWS load testing costs. 
            Underlying burn remains stable at KES 422K.
          </p>
          <p className="text-foreground">
            <span className="font-semibold">Cash Position:</span> Cash balance decreased by KES 150K this week, 
            primarily due to payroll and the AWS spike. Position remains healthy for current runway.
          </p>
        </div>
      </div>

      {/* Action Items */}
      <div className="border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Action Items</h3>
        <div className="space-y-3">
          {actionItems.map((item, index) => (
            <div
              key={index}
              className={`border rounded-sm p-4 ${getPriorityColor(item.priority).split(' ').slice(1).join(' ')}`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-sm p-2 ${getPriorityColor(item.priority)}`}>
                  {getPriorityIcon(item.priority)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{item.title}</span>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fundraising Status */}
      <div className="border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Fundraising Readiness</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Score</span>
            <span className="text-2xl font-bold text-foreground">72/100</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: '72%' }} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">MRR growth (14% MoM)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Runway (9 months)</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-muted-foreground">Burn multiple (2.6x, target &lt; 2x)</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-muted-foreground">Unit economics (missing)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
