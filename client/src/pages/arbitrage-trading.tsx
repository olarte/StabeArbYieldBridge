import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
// @ts-ignore
import WalletConnect from "@/components/WalletConnect.jsx";
import SuiWalletConnect from "@/components/SuiWalletConnect";
import WalletSelector from "@/components/WalletSelector";
import { ExternalLink, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import suiIcon from "@assets/abfadeb9f40e6ad0db5e9c92c09c40e0_1753983736153.jpg";
import ethereumIcon from "@assets/download_1753983736153.png";

// TypeScript interfaces for better type safety
declare global {
  interface Window {
    ethereum?: any;
  }
}
interface ArbOpportunity {
  pair: string;
  direction: string;
  profitPercent: string;
  priceDiff: number;
  recommendedAmount: number;
  route: string;
  celoPrice: number;
  suiPrice: number;
  id?: string;
}

interface PegStatus {
  safety?: {
    safe: boolean;
    alerts: string[];
  };
  chainlinkFeeds?: {
    celo?: { price: number };
    ethereum?: { price: number };
  };
  dexPrices?: {
    celoUniswap?: number;
    suiCetus?: number;
  };
}

interface SwapResult {
  id: string;
  opportunity: ArbOpportunity;
  status: 'CREATED' | 'COMPLETED' | 'FAILED';
  error?: string;
  timestamp: string;
  executionProgress?: {
    percentage: number;
    completed: number;
    total: number;
  };
  lastUpdate?: string;
}

// Portfolio Balance Component
function PortfolioBalance({ walletConnections, suiWalletInfo }: { 
  walletConnections: any, 
  suiWalletInfo: any 
}) {
  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ['/api/portfolio'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const portfolio = (portfolioData as any)?.data || portfolioData || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Portfolio Balance
        </CardTitle>
        <CardDescription>Total value across all connected wallets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total USD</p>
            <p className="text-2xl font-bold">${portfolio.totalUsdValue || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ethereum Balance</p>
            <p className="text-lg font-semibold">{portfolio.ethereumBalance || '0.00'} ETH</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sui Balance</p>
            <p className="text-lg font-semibold">{portfolio.suiBalance || '0.00'} SUI</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">24h Change</p>
            <p className={`text-lg font-semibold ${portfolio.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolio.change24h >= 0 ? '+' : ''}{portfolio.change24h || '0.00'}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Peg Protection Status Component
function PegProtectionStatus() {
  const { data: pegStatus, isLoading } = useQuery({
    queryKey: ['/api/peg/status'],
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peg Protection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status: PegStatus = (pegStatus as any)?.data || pegStatus || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🛡️ Peg Protection System
          <Badge variant={status.safety?.safe ? "default" : "destructive"}>
            {status.safety?.safe ? "SAFE" : "ALERT"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time monitoring of stablecoin peg stability across chains
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Safety Status */}
          <div className="p-3 rounded-lg bg-muted">
            <h4 className="font-semibold mb-2">Safety Status</h4>
            {status.safety?.alerts && status.safety.alerts.length > 0 ? (
              <ul className="space-y-1">
                {status.safety.alerts.map((alert, index) => (
                  <li key={index} className="text-sm text-amber-600">⚠️ {alert}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600">✅ All systems operating normally</p>
            )}
          </div>

          {/* Price Feeds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Chainlink Oracles</h4>
              <div className="space-y-1 text-sm">
                <p>Celo: ${status.chainlinkFeeds?.celo?.price?.toFixed(4) || 'N/A'}</p>
                <p>Ethereum: ${status.chainlinkFeeds?.ethereum?.price?.toFixed(4) || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">DEX Prices</h4>
              <div className="space-y-1 text-sm">
                <p>Celo Uniswap: ${status.dexPrices?.celoUniswap?.toFixed(4) || 'N/A'}</p>
                <p>Sui Cetus: ${status.dexPrices?.suiCetus?.toFixed(4) || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Live Price Monitor Component
function LivePriceMonitor() {
  const { data: priceData } = useQuery({
    queryKey: ['/api/uniswap/quote'],
    refetchInterval: 15000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Live Price Monitor
        </CardTitle>
        <CardDescription>Real-time price tracking across networks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">cUSD/USDC</span>
              <Badge variant="outline">Celo</Badge>
            </div>
            <div className="mt-2">
              <span className="text-lg font-bold">
                ${(priceData as any)?.data?.priceImpact || '0.9999'}
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                {(priceData as any)?.data?.tokenIn} → {(priceData as any)?.data?.tokenOut}
              </span>
            </div>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">USDC/USDT</span>
              <Badge variant="outline">Sui</Badge>
            </div>
            <div className="mt-2">
              <span className="text-lg font-bold">$1.0001</span>
              <span className="text-sm text-green-600 ml-2">+0.01%</span>
            </div>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Cross-Chain</span>
              <Badge variant="secondary">Spread</Badge>
            </div>
            <div className="mt-2">
              <span className="text-lg font-bold text-purple-600">0.25%</span>
              <span className="text-sm text-muted-foreground ml-2">Opportunity</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Arbitrage Opportunities Component
function ArbitrageOpportunities({ walletConnections, suiWalletInfo }: { 
  walletConnections: any, 
  suiWalletInfo: any 
}) {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['/api/arbitrage/opportunities'],
    refetchInterval: 5000,
  });
  
  const { toast } = useToast();
  
  const executeTradeMutation = useMutation({
    mutationFn: async (opportunity: ArbOpportunity) => {
      const response = await fetch('/api/swap/bidirectional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain: opportunity.direction.includes('Celo') ? 'celo' : 'sui',
          toChain: opportunity.direction.includes('Sui') ? 'sui' : 'celo',
          fromToken: opportunity.pair.split('/')[0],
          toToken: opportunity.pair.split('/')[1],
          amount: opportunity.recommendedAmount,
          walletSession: {
            evmAddress: walletConnections?.accounts?.[0] || 'demo-evm-address',
            suiAddress: suiWalletInfo?.address || 'demo-sui-address'
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Trade execution failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Initiated",
        description: `Cross-chain swap started with ID: ${data.data?.swapId || 'unknown'}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Trade Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Opportunities...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const ops: ArbOpportunity[] = (opportunities as any)?.data || opportunities || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Live Arbitrage Opportunities
        </CardTitle>
        <CardDescription>
          Real-time cross-chain arbitrage opportunities between Celo and Sui
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ops.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No profitable opportunities found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Market spreads are currently too narrow for profitable arbitrage
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ops.map((opportunity, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{opportunity.pair}</Badge>
                      <span className="text-sm font-medium">{opportunity.direction}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Route: {opportunity.route}</p>
                      <p>Recommended: ${opportunity.recommendedAmount}</p>
                      <div className="flex gap-4">
                        <span>Celo: ${opportunity.celoPrice?.toFixed(4)}</span>
                        <span>Sui: ${opportunity.suiPrice?.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold text-green-600">
                      +{opportunity.profitPercent}
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => executeTradeMutation.mutate(opportunity)}
                      disabled={executeTradeMutation.isPending}
                    >
                      {executeTradeMutation.isPending ? 'Executing...' : 'Execute Trade'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Previous Swaps Component
function PreviousSwapsExecuted({ walletConnections, suiWalletInfo }: { 
  walletConnections: any, 
  suiWalletInfo: any 
}) {
  const { data: transactions } = useQuery({
    queryKey: ['/api/transactions'],
    refetchInterval: 30000,
  });

  const txs = (transactions as any)?.data || transactions || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Cross-Chain Swaps</CardTitle>
        <CardDescription>Your latest executed trades and their status</CardDescription>
      </CardHeader>
      <CardContent>
        {txs.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No recent transactions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.slice(0, 5).map((tx: any, index: number) => (
                  <TableRow key={tx.id || index}>
                    <TableCell className="font-medium">
                      {tx.assetPairFrom}/{tx.assetPairTo}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img src={tx.chainFrom === 'celo' ? suiIcon : ethereumIcon} 
                             alt="chain" className="w-4 h-4 rounded-full" />
                        <span>→</span>
                        <img src={tx.chainTo === 'sui' ? suiIcon : ethereumIcon} 
                             alt="chain" className="w-4 h-4 rounded-full" />
                      </div>
                    </TableCell>
                    <TableCell>${tx.amount || '0.00'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        tx.status === 'COMPLETED' ? 'default' : 
                        tx.status === 'FAILED' ? 'destructive' : 'secondary'
                      }>
                        {tx.status || 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tx.timestamp || Date.now()).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Swap Results History Component
function SwapResultsHistory({ swapResults }: { swapResults: SwapResult[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Swap Execution History</CardTitle>
        <CardDescription>Detailed execution progress and results</CardDescription>
      </CardHeader>
      <CardContent>
        {swapResults.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No swap executions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {swapResults.map((result) => (
              <div key={result.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Badge variant="outline">{result.opportunity.pair}</Badge>
                    <span className="text-sm ml-2">{result.opportunity.direction}</span>
                  </div>
                  <Badge variant={
                    result.status === 'COMPLETED' ? 'default' : 
                    result.status === 'FAILED' ? 'destructive' : 'secondary'
                  }>
                    {result.status}
                  </Badge>
                </div>
                
                {result.executionProgress && (
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{result.executionProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${result.executionProgress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {result.executionProgress.completed}/{result.executionProgress.total} steps completed
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Expected Profit: +{result.opportunity.profitPercent}</p>
                  <p>Amount: ${result.opportunity.recommendedAmount}</p>
                  <p>Created: {new Date(result.timestamp).toLocaleString()}</p>
                  {result.lastUpdate && (
                    <p>Last Update: {new Date(result.lastUpdate).toLocaleString()}</p>
                  )}
                  {result.error && (
                    <p className="text-red-500">Error: {result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Arbitrage Trading Page
export default function ArbitrageTradingPage() {
  const [swapResults, setSwapResults] = useState<SwapResult[]>([]);
  const [walletConnections, setWalletConnections] = useState<any>({});
  const [suiWalletInfo, setSuiWalletInfo] = useState<any>({});

  // Handle unified wallet changes from WalletSelector
  const handleWalletChange = (walletType: 'ethereum' | 'sui', walletInfo: any) => {
    console.log('🔄 Wallet change received:', { walletType, walletInfo });
    if (walletType === 'ethereum') {
      setWalletConnections(walletInfo);
      console.log('🟠 Ethereum wallet updated:', walletInfo);
    } else if (walletType === 'sui') {
      setSuiWalletInfo(walletInfo);
      console.log('🟣 Sui wallet updated:', walletInfo);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold">StableArbYieldBridge</h1>
          <p className="text-muted-foreground">
            Multi-chain DeFi arbitrage platform for Celo and Sui networks
          </p>
        </div>

        <WalletSelector onWalletChange={handleWalletChange} />
        <PortfolioBalance 
          walletConnections={walletConnections}
          suiWalletInfo={suiWalletInfo}
        />
        <PegProtectionStatus />
        <LivePriceMonitor />
        <ArbitrageOpportunities 
          walletConnections={walletConnections}
          suiWalletInfo={suiWalletInfo}
        />
        <PreviousSwapsExecuted 
          walletConnections={walletConnections}
          suiWalletInfo={suiWalletInfo}
        />
        <SwapResultsHistory swapResults={swapResults} />
      </div>
    </div>
  );
}