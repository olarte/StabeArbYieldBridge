export interface MarketStats {
  activeOpportunities: number;
  avgSpread: string;
  executedToday: number;
  todayProfit: string;
  successRate: string;
  activeAgents: number;
}

export interface WalletInfo {
  address: string;
  isConnected: boolean;
  chains: string[];
}

export interface PriceSpreadData {
  timestamp: string;
  spread: number;
  asset: string;
}
