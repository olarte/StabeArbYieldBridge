import { useArbitrageOpportunities, useExecuteArbitrage } from "@/hooks/use-arbitrage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, ArrowRight } from "lucide-react";
import { useState } from "react";

export function OpportunityTable() {
  const { data: opportunities, isLoading, refetch } = useArbitrageOpportunities();
  const executeArbitrage = useExecuteArbitrage();
  const { toast } = useToast();
  const [executingId, setExecutingId] = useState<string | null>(null);

  const handleExecute = async (opportunityId: string, minAmount: string) => {
    setExecutingId(opportunityId);
    try {
      await executeArbitrage.mutateAsync({
        opportunityId,
        amount: parseFloat(minAmount),
      });
      
      toast({
        title: "Trade Executed",
        description: "Arbitrage trade completed successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Failed to execute arbitrage trade",
        variant: "destructive",
      });
    } finally {
      setExecutingId(null);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Opportunities updated",
      variant: "default",
    });
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-50">Live Arbitrage Opportunities</h3>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-400">Live</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="text-slate-400 hover:text-slate-200"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </div>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Asset Pair
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Source → Target
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Spread
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Profit Est.
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Min Amount
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="hover:bg-slate-700/50">
                    <td className="py-4 px-6">
                      <Skeleton className="h-6 w-24" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-8 w-16" />
                    </td>
                  </tr>
                ))
              ) : (
                opportunities?.map((opportunity) => (
                  <tr key={opportunity.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className="flex -space-x-1">
                          <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-slate-800 flex items-center justify-center text-xs text-white font-bold">
                            {opportunity.assetPairFrom.slice(0, 2)}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-slate-800 flex items-center justify-center text-xs text-white font-bold">
                            {opportunity.assetPairTo.slice(0, 2)}
                          </div>
                        </div>
                        <span className="font-mono font-medium text-slate-50">
                          {opportunity.assetPairFrom}/{opportunity.assetPairTo}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-300">{opportunity.sourceChain}</span>
                        <ArrowRight size={12} className="text-slate-500" />
                        <span className="text-sm text-slate-300">{opportunity.targetChain}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono font-semibold text-emerald-400">
                        +{opportunity.spread}%
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono font-semibold text-slate-50">
                        ${opportunity.profitEstimate}
                      </span>
                      <div className="text-xs text-slate-400">per $1000</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-slate-300">${opportunity.minAmount}</span>
                    </td>
                    <td className="py-4 px-6">
                      <Button
                        size="sm"
                        onClick={() => handleExecute(opportunity.id, opportunity.minAmount)}
                        disabled={executingId === opportunity.id}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        {executingId === opportunity.id ? "Executing..." : "Execute"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
