import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArbitrageOpportunity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { MarketStats } from "@/lib/types";

export function useArbitrageOpportunities() {
  return useQuery<ArbitrageOpportunity[]>({
    queryKey: ["/api/arbitrage/opportunities"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useMarketStats() {
  return useQuery<MarketStats>({
    queryKey: ["/api/market/stats"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useExecuteArbitrage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ opportunityId, amount }: { opportunityId: string; amount: number }) => {
      const response = await apiRequest("POST", "/api/arbitrage/execute", {
        opportunityId,
        amount,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/arbitrage/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market/stats"] });
    },
  });
}
