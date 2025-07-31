import { usePortfolio, useChainStatuses } from "@/hooks/use-portfolio";
import { useActiveTradingAgents } from "@/hooks/use-agents";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function Sidebar() {
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();
  const { data: chainStatuses, isLoading: chainsLoading } = useChainStatuses();
  const { data: activeAgents, isLoading: agentsLoading } = useActiveTradingAgents();

  return (
    <aside className="w-80 bg-background border-r border-border p-6 min-h-screen">
      <div className="space-y-6">
        {/* Portfolio Overview */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Portfolio Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Total Balance</span>
                {portfolioLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <span className="font-mono font-semibold text-slate-50">
                    ${portfolio?.totalBalance}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">24h Profit</span>
                {portfolioLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <span className="font-mono font-semibold text-emerald-400">
                    +${portfolio?.dailyProfit}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Active Agents</span>
                {agentsLoading ? (
                  <Skeleton className="h-4 w-8" />
                ) : (
                  <span className="font-mono font-semibold text-slate-50">
                    {activeAgents?.length || 0}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chain Status */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Chain Status</h3>
            <div className="space-y-3">
              {chainsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))
              ) : (
                chainStatuses?.map((chain) => (
                  <div key={chain.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        chain.isOnline 
                          ? chain.latency < 1000 ? 'bg-emerald-400' : 'bg-yellow-400'
                          : 'bg-red-400'
                      }`} />
                      <span className="text-sm text-slate-300">{chain.chainName}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {chain.latency}ms
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Oracle Status */}
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Oracle Status</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-sm text-slate-300">Chainlink</span>
              </div>
              <span className="text-xs text-emerald-400 font-medium">Active</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Last update: <span className="font-mono">2s ago</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
