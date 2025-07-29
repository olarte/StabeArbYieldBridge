import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TradingAgent, InsertTradingAgent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useTradingAgents() {
  return useQuery<TradingAgent[]>({
    queryKey: ["/api/agents"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useActiveTradingAgents() {
  return useQuery<TradingAgent[]>({
    queryKey: ["/api/agents/active"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useCreateTradingAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agent: InsertTradingAgent) => {
      const response = await apiRequest("POST", "/api/agents", agent);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market/stats"] });
    },
  });
}

export function useUpdateTradingAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TradingAgent> }) => {
      const response = await apiRequest("PATCH", `/api/agents/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/active"] });
    },
  });
}

export function useDeleteTradingAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market/stats"] });
    },
  });
}
