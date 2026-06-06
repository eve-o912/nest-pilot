import { Sparkles, TrendingUp, AlertTriangle, Wallet, Target } from "lucide-react";

interface AIInsightCardProps {
  type: "revenue" | "profit" | "risk" | "recommendation";
  title: string;
  content: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function AIInsightCard({ type, title, content, trend, trendValue }: AIInsightCardProps) {
  const getIcon = () => {
    switch (type) {
      case "revenue":
        return <TrendingUp className="h-5 w-5" />;
      case "profit":
        return <Wallet className="h-5 w-5" />;
      case "risk":
        return <AlertTriangle className="h-5 w-5" />;
      case "recommendation":
        return <Target className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "revenue":
        return "bg-green-500/10 border-green-500/20";
      case "profit":
        return "bg-blue-500/10 border-blue-500/20";
      case "risk":
        return "bg-red-500/10 border-red-500/20";
      case "recommendation":
        return "bg-[#F59E0B]/10 border-[#F59E0B]/20";
      default:
        return "bg-gray-500/10 border-gray-500/20";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "revenue":
        return "text-green-500";
      case "profit":
        return "text-blue-500";
      case "risk":
        return "text-red-500";
      case "recommendation":
        return "text-[#F59E0B]";
      default:
        return "text-gray-500";
    }
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-green-500";
    if (trend === "down") return "text-red-500";
    return "text-gray-500";
  };

  return (
    <div className={`rounded-lg border p-3 ${getBackgroundColor()}`}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={getIconColor()}>{getIcon()}</span>
          <h3 className="font-semibold text-xs">{title}</h3>
        </div>
        {trend && trendValue && (
          <span className={`text-[10px] font-medium ${getTrendColor()}`}>
            {trend === "up" ? "+" : trend === "down" ? "-" : ""}{trendValue}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-700 leading-tight">{content}</p>
      <div className="mt-2 flex items-center gap-0.5 text-[10px] text-gray-500">
        <Sparkles className="h-2.5 w-2.5" style={{ color: "#F59E0B" }} />
        <span>Manikka</span>
      </div>
    </div>
  );
}
