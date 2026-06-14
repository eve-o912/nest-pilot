import { useStore, formatKES } from "@/lib/store";
import { AlertTriangle, TrendingUp, Calendar, Filter } from "lucide-react";
import { useState } from "react";

interface Anomaly {
  id: string;
  type: "spike" | "unusual" | "recurring";
  category: string;
  amount: number;
  expectedAmount: number;
  date: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export function ExpenseAnomalyAlerts() {
  const transactions = useStore((s) => s.transactions);

  // Detect anomalies from transactions
  const detectAnomalies = (): Anomaly[] => {
    const anomalies: Anomaly[] = [];
    
    // Group expenses by category
    const categoryExpenses = new Map<string, number[]>();
    transactions
      .filter(t => t.type === "out")
      .forEach(t => {
        const category = t.tags[0] || "uncategorized";
        const amounts = categoryExpenses.get(category) || [];
        amounts.push(t.amount);
        categoryExpenses.set(category, amounts);
      });

    // Detect spikes (amounts > 2x average for category)
    categoryExpenses.forEach((amounts, category) => {
      const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const max = Math.max(...amounts);
      
      if (max > avg * 2) {
        const spikeTxn = transactions.find(t => t.type === "out" && t.amount === max);
        if (spikeTxn) {
          anomalies.push({
            id: spikeTxn.id,
            type: "spike",
            category,
            amount: max,
            expectedAmount: avg,
            date: spikeTxn.date,
            description: spikeTxn.description,
            severity: max > avg * 3 ? "high" : "medium",
          });
        }
      }
    });

    // Detect unusual large transactions (> KES 100K)
    transactions
      .filter(t => t.type === "out" && t.amount > 100000)
      .forEach(t => {
        if (!anomalies.find(a => a.id === t.id)) {
          anomalies.push({
            id: t.id,
            type: "unusual",
            category: t.tags[0] || "uncategorized",
            amount: t.amount,
            expectedAmount: 50000,
            date: t.date,
            description: t.description,
            severity: t.amount > 200000 ? "high" : "medium",
          });
        }
      });

    // Mock anomalies for demo
    if (anomalies.length === 0) {
      anomalies.push(
        {
          id: "1",
          type: "spike",
          category: "#utilities",
          amount: 82000,
          expectedAmount: 48000,
          date: new Date().toISOString(),
          description: "AWS - Load testing",
          severity: "medium",
        },
        {
          id: "2",
          type: "unusual",
          category: "#restock",
          amount: 150000,
          expectedAmount: 75000,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: "Bulk inventory purchase",
          severity: "high",
        }
      );
    }

    return anomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const [anomalies] = useState<Anomaly[]>(detectAnomalies());
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const filteredAnomalies = filter === "all" 
    ? anomalies 
    : anomalies.filter(a => a.severity === filter);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 bg-red-50 dark:bg-red-950/20";
      case "medium": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20";
      case "low": return "text-blue-600 bg-blue-50 dark:bg-blue-950/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "spike": return <TrendingUp className="h-4 w-4" />;
      case "unusual": return <AlertTriangle className="h-4 w-4" />;
      case "recurring": return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Expense Anomalies</h2>
          <p className="text-sm text-muted-foreground">
            {anomalies.length} anomalies detected in your expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="h-9 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          >
            <option value="all">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            High Severity
          </p>
          <p className="text-2xl font-bold text-red-600">
            {anomalies.filter(a => a.severity === "high").length}
          </p>
        </div>
        <div className="border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Medium Severity
          </p>
          <p className="text-2xl font-bold text-yellow-600">
            {anomalies.filter(a => a.severity === "medium").length}
          </p>
        </div>
        <div className="border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Total Impact
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatKES(anomalies.reduce((sum, a) => sum + (a.amount - a.expectedAmount), 0))}
          </p>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        {filteredAnomalies.map((anomaly) => (
          <div key={anomaly.id} className="border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-sm p-2 ${getSeverityColor(anomaly.severity)}`}>
                  {getTypeIcon(anomaly.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{anomaly.description}</span>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${getSeverityColor(anomaly.severity)}`}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {anomaly.category} • {new Date(anomaly.date).toLocaleDateString('en-KE')}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-foreground font-medium">{formatKES(anomaly.amount)}</span>
                    <span className="text-muted-foreground">
                      Expected: {formatKES(anomaly.expectedAmount)}
                    </span>
                    <span className="text-red-600">
                      +{formatKES(anomaly.amount - anomaly.expectedAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {anomaly.severity === "high" && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Recommendation:</span> Review this expense. 
                  {anomaly.type === "spike" ? " This is significantly higher than your average for this category." : " This is an unusually large transaction."}
                </p>
              </div>
            )}
          </div>
        ))}

        {filteredAnomalies.length === 0 && (
          <div className="border border-border bg-card p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No anomalies found</p>
          </div>
        )}
      </div>
    </div>
  );
}
