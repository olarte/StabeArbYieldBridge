import { useQuery } from "@tanstack/react-query";
import { Portfolio, Transaction, ChainStatus } from "@shared/schema";

export function usePortfolio() {
  return useQuery<Portfolio>({
    queryKey: ["/api/portfolio"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useTransactions(limit = 10) {
  return useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

export function useChainStatuses() {
  return useQuery<ChainStatus[]>({
    queryKey: ["/api/chains/status"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
