import { useMarketStats } from "@/hooks/use-arbitrage";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Percent, Bot, CheckCircle } from "lucide-react";

export function PortfolioOverview() {
  const { data: stats, isLoading } = useMarketStats();

  const metrics = [
    {
      title: "Active Opportunities",
      value: stats?.activeOpportunities || 0,
      change: "+2 from yesterday",
      icon: TrendingUp,
      color: "text-emerald-400",
    },
    {
      title: "Avg Spread",
      value: `${stats?.avgSpread || "0.00"}%`,
      change: "Last 24h",
      icon: Percent,
      color: "text-yellow-400",
    },
    {
      title: "Executed Today",
      value: stats?.executedToday || 0,
      change: `+$${stats?.todayProfit || "0.00"} profit`,
      icon: Bot,
      color: "text-blue-400",
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate || "0.0"}%`,
      change: "Last 7 days",
      icon: CheckCircle,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-400">{metric.title}</h4>
              <metric.icon className={`h-5 w-5 ${metric.color}`} />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-slate-50 font-mono mb-1">
                {metric.value}
              </div>
            )}
            <div className="text-xs text-slate-400">{metric.change}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
