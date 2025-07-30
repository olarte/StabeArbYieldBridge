import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
// @ts-ignore
import WalletConnect from "@/components/WalletConnect.jsx";
import { useState, useEffect } from "react";

// TypeScript interfaces for better type safety
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

// Peg Protection Status Component
function PegProtectionStatus() {
  const { data: pegData, isLoading: pegLoading } = useQuery({
    queryKey: ['/api/oracle/peg-status'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const pegStatus: PegStatus = pegData as PegStatus || {};

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🛡️ Peg Protection Status
          <Badge variant={pegStatus?.safety?.safe ? "default" : "destructive"}>
            {pegStatus?.safety?.safe ? "SAFE" : "MONITORING"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time stablecoin peg monitoring across multiple data sources
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pegLoading ? (
          <div className="flex justify-center py-4">Loading peg status...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Celo Chainlink</div>
              <div className="text-lg font-bold">
                ${pegStatus?.chainlinkFeeds?.celo?.price?.toFixed(4) || 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Ethereum Chainlink</div>
              <div className="text-lg font-bold">
                ${pegStatus?.chainlinkFeeds?.ethereum?.price?.toFixed(4) || 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Uniswap V3</div>
              <div className="text-lg font-bold">
                ${pegStatus?.dexPrices?.celoUniswap?.toFixed(4) || 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Cetus DEX</div>
              <div className="text-lg font-bold">
                ${pegStatus?.dexPrices?.suiCetus?.toFixed(4) || 'N/A'}
              </div>
            </div>
          </div>
        )}
        {pegStatus?.safety?.alerts && pegStatus.safety.alerts.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Alerts:</div>
            {pegStatus.safety.alerts.map((alert, index) => (
              <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                • {alert}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Swap Results History Component
function SwapResultsHistory({ swapResults }: { swapResults: SwapResult[] }) {
  if (swapResults.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Recent Swap History
          <Badge variant="secondary">{swapResults.length} Results</Badge>
        </CardTitle>
        <CardDescription>
          Latest arbitrage execution results and transaction status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {swapResults.slice(0, 5).map((result) => (
            <div key={result.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="font-medium">{result.opportunity.pair}</div>
                <div className="text-sm text-muted-foreground">
                  {result.opportunity.direction} • {result.opportunity.profitPercent} profit
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(result.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="text-right space-y-1">
                <Badge variant={
                  result.status === 'COMPLETED' ? 'default' : 
                  result.status === 'FAILED' ? 'destructive' : 'secondary'
                }>
                  {result.status}
                </Badge>
                {result.error && (
                  <div className="text-xs text-red-500 max-w-40 truncate">
                    {result.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Arbitrage Opportunities Component
function ArbitrageOpportunities() {
  const { toast } = useToast();
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);

  // Fetch arbitrage opportunities
  const { data: arbData, isLoading: arbLoading, refetch: refetchArbs } = useQuery({
    queryKey: ['/api/scan-arbs'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Execute arbitrage mutation
  const executeArbMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      setSelectedOpportunity(opportunityId);
      const response = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId, amount: 100 })
      });
      if (!response.ok) throw new Error('Failed to execute arbitrage');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Arbitrage Executed",
        description: `Transaction submitted: ${data.txHash?.slice(0, 10)}...`,
      });
      setSelectedOpportunity(null);
      refetchArbs();
    },
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setSelectedOpportunity(null);
    },
  });

  const opportunities = (arbData as any)?.data?.opportunities || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔄 Live Arbitrage Opportunities
          <Badge variant="secondary">{opportunities.length} Active</Badge>
        </CardTitle>
        <CardDescription>
          Real-time arbitrage opportunities between Uniswap V3 (Celo) and Cetus (Sui)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {arbLoading ? (
          <div className="flex justify-center py-8">Loading opportunities...</div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No arbitrage opportunities available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Pair</TableHead>
                <TableHead>Uniswap V3 Price</TableHead>
                <TableHead>Cetus Price</TableHead>
                <TableHead>Spread</TableHead>
                <TableHead>Est. Profit</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp: any) => (
                <TableRow key={opp.id}>
                  <TableCell className="font-medium">
                    {opp.assetPairFrom} → {opp.assetPairTo}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>${Number(opp.uniswapPrice).toFixed(6)}</span>
                      <span className="text-xs text-muted-foreground">Celo</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>${Number(opp.competitorPrice).toFixed(6)}</span>
                      <span className="text-xs text-muted-foreground">Sui</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={Number(opp.currentSpread) > 0.5 ? "default" : "secondary"}>
                      {Number(opp.currentSpread).toFixed(2)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">
                    ${Number(opp.estimatedProfit).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      opp.confidence === 'high' ? 'default' : 
                      opp.confidence === 'medium' ? 'secondary' : 'outline'
                    }>
                      {opp.confidence}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm"
                      onClick={() => executeArbMutation.mutate(opp.id)}
                      disabled={executeArbMutation.isPending || selectedOpportunity === opp.id}
                      className="w-full"
                    >
                      {executeArbMutation.isPending && selectedOpportunity === opp.id 
                        ? "Executing..." 
                        : "Execute"
                      }
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Live Price Monitor Component
function LivePriceMonitor() {
  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ['/api/uniswap/price/cUSD-USDC'],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const { data: cetusData, isLoading: cetusLoading } = useQuery({
    queryKey: ['/api/cetus/price/USDC-USDY'],
    refetchInterval: 3000,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">🦄 Uniswap V3 (Celo)</CardTitle>
          <CardDescription>cUSD/USDC Price Feed</CardDescription>
        </CardHeader>
        <CardContent>
          {priceLoading ? (
            <div className="animate-pulse">Loading...</div>
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                ${(priceData as any)?.data?.price?.token0ToToken1 ? Number((priceData as any).data.price.token0ToToken1).toFixed(6) : '1.000000'}
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {(priceData as any)?.data?.price?.formatted || '1 cUSD = 1.000000 USDC'}
              </div>
              <Badge variant="outline" className="text-xs">
                Celo Alfajores Testnet
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">🌊 Cetus DEX (Sui)</CardTitle>
          <CardDescription>USDC/USDY Price Feed</CardDescription>
        </CardHeader>
        <CardContent>
          {cetusLoading ? (
            <div className="animate-pulse">Loading...</div>
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                ${(cetusData as any)?.data?.price?.token0ToToken1 ? Number((cetusData as any).data.price.token0ToToken1).toFixed(6) : '1.000000'}
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {(cetusData as any)?.data?.price?.formatted || '1 USDC = 1.000000 USDY'}
              </div>
              <Badge variant="outline" className="text-xs">
                Sui Devnet
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Arbitrage Trading Page
function ArbitrageTradingPage() {
  const [swapResults, setSwapResults] = useState<SwapResult[]>([]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold">StableArbYieldBridge</h1>
          <p className="text-muted-foreground">
            Multi-chain DeFi arbitrage platform for Celo and Sui networks
          </p>
        </div>

        <WalletConnect />
        <PegProtectionStatus />
        <LivePriceMonitor />
        <ArbitrageOpportunities />
        <SwapResultsHistory swapResults={swapResults} />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={ArbitrageTradingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
