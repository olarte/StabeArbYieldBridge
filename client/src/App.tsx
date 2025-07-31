import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

import SuiWalletConnect from "@/components/SuiWalletConnect";
import WalletSelector from "@/components/WalletSelector";
import { useState, useEffect } from "react";
import { ExternalLink, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
// Icons are now handled inline as emojis for cleaner codebase

// TypeScript interfaces for better type safety
declare global {
  interface Window {
    ethereum?: any;
    suiWallet?: any;
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
    queryKey: ['/api/portfolio/balance', walletConnections?.account, suiWalletInfo?.account?.address],
    queryFn: async () => {
      const ethereumAddress = walletConnections?.account;
      const suiAddress = suiWalletInfo?.account?.address;
      
      const response = await fetch('/api/portfolio/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethereumAddress: ethereumAddress || null,
          suiAddress: suiAddress || null
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio balance: ${response.status}`);
      }
      
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const portfolio = (portfolioData as any)?.data || {};
  const hasWalletData = portfolio.hasWalletData || false;
  const hasConnectedWallets = walletConnections?.account || suiWalletInfo?.account?.address;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Portfolio Balance
          <Badge variant="outline" className="ml-auto">
            Last 7 Days
          </Badge>
        </CardTitle>
        <CardDescription>
          Current balance and weekly performance across all chains
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        ) : !hasConnectedWallets ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-lg text-muted-foreground">
              Connect your wallets to view portfolio balance
            </div>
            <div className="text-sm text-muted-foreground">
              Your real stablecoin balances will be displayed here once connected
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Balance Display */}
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">
                ${portfolio.currentBalance?.toFixed(4) || '0.0000'}
              </div>
              <div className="flex items-center justify-center gap-2">
                {portfolio.weeklyChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={portfolio.weeklyChange > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  ${portfolio.weeklyChange?.toFixed(4) || '0.0000'} 
                  ({portfolio.weeklyChangePercent?.toFixed(3) || '0.000'}%)
                </span>
                <span className="text-sm text-muted-foreground">this week</span>
              </div>
            </div>

            {/* Wallet Connection Status */}
            {!hasWalletData && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="font-medium">Connect wallets to view real balances</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      Portfolio calculations are using historical data. Connect Ethereum and Sui wallets for live balance tracking.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chain Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚫</span>
                  <span className="font-medium">Ethereum Sepolia</span>
                  {walletConnections?.account && (
                    <span className="text-xs text-green-600 font-medium">Connected</span>
                  )}
                </div>
                <div className="text-xl font-bold">
                  ${portfolio.chainBalances?.ethereum?.balance?.toFixed(4) || '0.0000'}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">
                    +${portfolio.chainBalances?.ethereum?.change?.toFixed(4) || '0.0000'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({portfolio.chainBalances?.ethereum?.changePercent?.toFixed(3) || '0.000'}%)
                  </span>
                </div>
                {portfolio.chainBalances?.ethereum?.assets && (
                  <div className="space-y-1 text-xs">
                    <div className="text-muted-foreground font-medium">Assets:</div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between">
                        <span>USDC:</span>
                        <span className="font-mono">{portfolio.chainBalances.ethereum.assets.usdc?.toFixed(4) || '0.0000'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>USDT:</span>
                        <span className="font-mono">{portfolio.chainBalances.ethereum.assets.usdt?.toFixed(4) || '0.0000'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DAI:</span>
                        <span className="font-mono">{portfolio.chainBalances.ethereum.assets.dai?.toFixed(4) || '0.0000'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔷</span>
                  <span className="font-medium">Sui Testnet</span>
                  {suiWalletInfo?.account?.address && (
                    <span className="text-xs text-green-600 font-medium">Connected</span>
                  )}
                </div>
                <div className="text-xl font-bold">
                  ${portfolio.chainBalances?.sui?.balance?.toFixed(4) || '0.0000'}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">
                    +${portfolio.chainBalances?.sui?.change?.toFixed(4) || '0.0000'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({portfolio.chainBalances?.sui?.changePercent?.toFixed(3) || '0.000'}%)
                  </span>
                </div>
                {portfolio.chainBalances?.sui?.assets && (
                  <div className="space-y-1 text-xs">
                    <div className="text-muted-foreground font-medium">Assets:</div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between">
                        <span>USDC:</span>
                        <span className="font-mono">{portfolio.chainBalances.sui.assets.usdc?.toFixed(4) || '0.0000'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>USDY:</span>
                        <span className="font-mono">{portfolio.chainBalances.sui.assets.usdy?.toFixed(4) || '0.0000'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>USDT:</span>
                        <span className="font-mono">{portfolio.chainBalances.sui.assets.usdt?.toFixed(4) || '0.0000'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center space-y-1">
                <div className="text-sm text-muted-foreground">Total Profit</div>
                <div className="text-green-600 font-bold">
                  ${portfolio.performanceMetrics?.totalProfit?.toFixed(4) || '0.0000'}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="font-bold">
                  {portfolio.performanceMetrics?.successRate || 0}%
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm text-muted-foreground">Weekly Trades</div>
                <div className="font-bold">
                  {portfolio.performanceMetrics?.weeklyTrades || 0}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm text-muted-foreground">Best Swap</div>
                <div className="text-green-600 font-bold">
                  ${portfolio.performanceMetrics?.bestSwap?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Peg Protection Status Component
function PegProtectionStatus() {
  const { data: pegData, isLoading: pegLoading } = useQuery({
    queryKey: ['/api/oracle/peg-status'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Extract the actual data from the API response
  const pegStatus: PegStatus = (pegData as any)?.data || {};

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
              <div className="text-sm font-medium text-muted-foreground">Ethereum Price</div>
              <div className="text-lg font-bold">
                ${(pegStatus as any)?.crossChainValidation?.crossChainPrices?.ethereum ? Number((pegStatus as any).crossChainValidation.crossChainPrices.ethereum).toFixed(6) : 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Sui Price</div>
              <div className="text-lg font-bold">
                ${(pegStatus as any)?.crossChainValidation?.crossChainPrices?.sui ? Number((pegStatus as any).crossChainValidation.crossChainPrices.sui).toFixed(6) : 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Chainlink Reference</div>
              <div className="text-lg font-bold">
                ${(pegStatus as any)?.crossChainValidation?.chainlinkReference?.price ? Number((pegStatus as any).crossChainValidation.chainlinkReference.price).toFixed(6) : 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Cross-Chain Deviation</div>
              <div className="text-lg font-bold">
                {(pegStatus as any)?.crossChainValidation?.deviations?.crossChain?.deviation ? (Number((pegStatus as any).crossChainValidation.deviations.crossChain.deviation) * 100).toFixed(3) + '%' : 'N/A'}
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
function ArbitrageOpportunities({ walletConnections, suiWalletInfo }: { 
  walletConnections: any, 
  suiWalletInfo: any 
}) {
  const { toast } = useToast();
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);
  const [executionSteps, setExecutionSteps] = useState<any[]>([]);
  const [swapAmounts, setSwapAmounts] = useState<{ [key: string]: string }>({});

  // Test function for simple Sui transaction
  const testSuiTransaction = async () => {
    if (!suiWalletInfo?.account || !suiWalletInfo.signAndExecuteTransactionBlock) {
      alert('Please connect your Sui wallet first');
      return;
    }
    
    try {
      console.log('🧪 Testing simple Sui transaction...');
      console.log('🔍 Wallet info:', suiWalletInfo);
      console.log('🔍 Account:', suiWalletInfo.account);
      
      const { TransactionBlock } = await import('@mysten/sui.js/transactions');
      
      const tx = new TransactionBlock();
      
      // Set sender
      tx.setSender(suiWalletInfo.account.address);
      
      // Create a simple coin split and transfer back to self
      const [coin] = tx.splitCoins(tx.gas, [1000]); // 1000 MIST = 0.000001 SUI
      tx.transferObjects([coin], suiWalletInfo.account.address);
      
      // Set a reasonable gas budget
      tx.setGasBudget(5000000); // 0.005 SUI
      
      console.log('👆 SIMPLE TEST: Check your Sui wallet for transaction approval');
      console.log('🔍 Transaction to sign:', tx);
      
      // Try signing with different method signatures
      let result;
      try {
        // Method 1: Standard suiet wallet-kit method
        result = await suiWalletInfo.signAndExecuteTransactionBlock({
          transactionBlock: tx,
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
          },
        });
      } catch (firstError) {
        console.log('❌ Method 1 failed, trying alternative...', firstError);
        
        try {
          // Method 2: Without options
          result = await suiWalletInfo.signAndExecuteTransactionBlock({
            transactionBlock: tx,
          });
        } catch (secondError) {
          console.log('❌ Method 2 failed, trying direct call...', secondError);
          
          // Method 3: Direct call if available
          if (suiWalletInfo.signAndExecuteTransaction) {
            result = await suiWalletInfo.signAndExecuteTransaction({ transaction: tx });
          } else {
            throw secondError;
          }
        }
      }
      
      console.log('✅ Simple test transaction successful!', result);
      const txHash = result.digest || result.txHash || result.transactionDigest;
      console.log('🔗 View transaction:', `https://suiexplorer.com/txblock/${txHash}?network=testnet`);
      alert(`Test transaction successful! Hash: ${txHash}`);
      
    } catch (error) {
      console.error('❌ Test transaction failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Fetch arbitrage opportunities with enhanced parameters (demo mode enabled)
  const { data: arbData, isLoading: arbLoading, refetch: refetchArbs } = useQuery({
    queryKey: ['/api/scan-arbs'],
    queryFn: () => 
      fetch('/api/scan-arbs?pairs=USDC-WETH,USDC-USDT,USDC-USDY,WETH-USDT,WETH-USDY,USDT-USDY,USDC-DAI,WETH-DAI,USDT-DAI,DAI-USDY&minSpread=0.01&demo=true')
        .then(res => res.json()),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Register wallet session (simplified - no API call needed)
  const registerWalletSession = async () => {
    // Check for Ethereum wallet (account property)
    const ethereumAccount = walletConnections?.account;
    // Check for Sui wallet (account.address property) 
    const suiAccount = suiWalletInfo?.account?.address;
    
    console.log('🔍 Wallet session debug:', {
      ethereumAccount,
      suiAccount,
      walletConnections,
      suiWalletInfo
    });
    
    if (!ethereumAccount || !suiAccount) {
      throw new Error('Both Ethereum and Sui wallets must be connected');
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Creating wallet session:', {
      sessionId,
      ethereumAddress: ethereumAccount,
      suiAddress: suiAccount
    });
    
    return { sessionId };
  };

  // Create atomic swap
  const createAtomicSwap = async (opportunity: any, sessionId: string, amount: number) => {
    const response = await fetch('/api/swap/bidirectional-real', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromChain: 'ethereum',
        toChain: 'sui', 
        fromToken: 'USDC',
        toToken: 'USDY',
        amount: amount,
        minSpread: 0.01,
        maxSlippage: 0.03,
        sessionId,
        bypassPegProtection: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Swap creation failed:', errorText);
      throw new Error(`Failed to create swap: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Swap creation successful:', result);
    return result;
  };

  // Execute swap step with wallet integration
  const executeSwapStep = async (swapId: string, stepIndex: number) => {
    const response = await fetch('/api/swap/execute-real', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        swapId,
        step: stepIndex,
        useWalletExecution: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Swap step execution failed:', errorText);
      throw new Error(`Failed to execute swap step: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Swap step execution successful:', result);
    return result;
  };

  // Execute transaction steps using backend execution (bypasses wallet interface issues)
  const signAndSubmitTransaction = async (swapId: string, stepIndex: number, transactionData: any) => {
    console.log('🚀 EXECUTING BACKEND TRANSACTION for step:', stepIndex + 1);
    console.log('🔍 Function parameters:', { swapId, stepIndex, transactionData });
    
    try {
      // Determine which chain to use based on step type
      const stepChain = transactionData?.chain || transactionData?.walletType || 'ethereum';
      console.log(`🔗 Step ${stepIndex + 1} will use chain: ${stepChain}`);
      
      // Execute real transaction via backend (bypasses wallet interface issues)
      console.log('🚀 Executing real blockchain transaction via backend...');
      const backendResponse = await fetch('/api/test-real-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: stepChain === 'sui' ? 'sui' : 'ethereum',
          amount: stepChain === 'sui' ? 1000000 : 100000000000000, // 0.001 SUI or 0.0001 ETH
          testType: 'arbitrage_step',
          swapId: swapId,
          stepIndex: stepIndex
        })
      });
      
      if (!backendResponse.ok) {
        throw new Error(`Backend transaction failed: HTTP ${backendResponse.status}`);
      }
      
      const result = await backendResponse.json();
      console.log('✅ Backend transaction successful!', result);
      
      const transactionHash = result.data.transactionHash;
      console.log('🔗 Explorer:', result.data.explorerUrl);
      
      // Submit transaction result back to server
      const submitResponse = await fetch('/api/swap/submit-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swapId,
          stepIndex,
          transactionHash,
          status: 'completed'
        })
      });

      if (submitResponse.ok) {
        const submitResult = await submitResponse.json();
        console.log('📋 Transaction submitted to server:', submitResult);
      }

      return { success: true, transactionHash };
    } catch (error) {
      console.error('❌ Backend transaction failed:', error);
      throw error;
    }
  };

  // Real wallet-based arbitrage execution
  const executeArbMutation = useMutation({
    mutationFn: async (opportunity: any) => {
      const amount = parseFloat(swapAmounts[opportunity.id] || '1');
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }
      
      // Validate both wallets are connected
      if (!walletConnections?.account || !suiWalletInfo?.account?.address) {
        throw new Error('Both Ethereum and Sui wallets must be connected for cross-chain swaps');
      }
      
      setSelectedOpportunity(opportunity.id);
      setExecutionSteps([]);

      try {
        // Step 1: Create wallet-based swap plan
        toast({
          title: "Creating Real Wallet Swap",
          description: `Preparing bidirectional swap for $${amount}...`,
        });

        setExecutionSteps(prev => [...prev, { 
          step: 'Wallet Validation', 
          status: 'completed', 
          message: 'Both wallets connected and validated' 
        }]);

        // Determine swap direction based on opportunity
        const sourceChain = opportunity.direction === 'SUI→ETH' ? 'sui' : 'ethereum';
        const targetChain = opportunity.direction === 'SUI→ETH' ? 'ethereum' : 'sui';

        // Step 2: Create wallet-based swap transactions
        const swapResponse = await fetch('/api/swap/wallet-bidirectional', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceChain,
            targetChain,
            fromToken: opportunity.assetPairFrom,
            toToken: opportunity.assetPairTo,
            amount: amount.toString(),
            ethereumAddress: walletConnections.account,
            suiAddress: suiWalletInfo.account.address,
            swapType: 'direct' // Use direct swaps for now, atomic swaps can be enabled later
          })
        });

        if (!swapResponse.ok) {
          throw new Error(`Failed to create swap plan: ${swapResponse.status}`);
        }

        const swapPlan = await swapResponse.json();
        
        setExecutionSteps(prev => [...prev, { 
          step: 'Swap Plan Created', 
          status: 'completed', 
          message: `${swapPlan.data.transactions.length} transactions prepared` 
        }]);

        // Step 3: Execute each transaction with real wallet signatures
        for (let i = 0; i < swapPlan.data.transactions.length; i++) {
          const transaction = swapPlan.data.transactions[i];
          const stepName = `${transaction.chain.toUpperCase()} Transaction`;
          
          setExecutionSteps(prev => [...prev, { 
            step: stepName, 
            status: 'executing', 
            message: 'Please sign transaction in your wallet...' 
          }]);

          try {
            let txHash = '';
            
            if (transaction.chain === 'ethereum' && transaction.walletType === 'metamask') {
              // Execute Ethereum transaction with MetaMask
              if (!window.ethereum) {
                throw new Error('MetaMask not installed');
              }

              const txParams = {
                to: transaction.transaction.to,
                data: transaction.transaction.data,
                value: transaction.transaction.value || '0x0',
                gas: transaction.transaction.gasLimit || '0x5208'
              };

              toast({
                title: "MetaMask Signature Required",
                description: "Please sign the Ethereum transaction in MetaMask",
              });

              txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [{ ...txParams, from: walletConnections.account }],
              });

              console.log(`✅ Ethereum transaction signed: ${txHash}`);
              
            } else if (transaction.chain === 'sui' && transaction.walletType === 'sui') {
              // Execute Sui transaction with Sui Wallet Kit
              if (!suiWalletInfo?.signAndExecuteTransactionBlock) {
                throw new Error('Sui wallet not connected or does not support transaction signing');
              }

              toast({
                title: "Sui Wallet Signature Required", 
                description: "Please sign the Sui transaction in your wallet",
              });

              // Use the Sui wallet kit's signAndExecuteTransactionBlock method
              const result = await suiWalletInfo.signAndExecuteTransactionBlock({
                transactionBlock: transaction.transaction.transactionBlock,
                account: suiWalletInfo.account,
                chain: 'sui:testnet',
              });

              txHash = result.digest;
              console.log(`✅ Sui transaction signed: ${txHash}`);
            }

            // Update step as completed
            setExecutionSteps(prev => prev.map((s, idx) => 
              s.step === stepName ? { 
                ...s, 
                status: 'completed', 
                message: `Transaction confirmed: ${txHash.slice(0, 10)}...` 
              } : s
            ));

            toast({
              title: "Transaction Confirmed",
              description: `${transaction.chain.toUpperCase()} transaction successful`,
            });

          } catch (walletError) {
            console.error(`${transaction.chain} transaction failed:`, walletError);
            
            setExecutionSteps(prev => prev.map((s, idx) => 
              s.step === stepName ? { 
                ...s, 
                status: 'failed', 
                message: walletError instanceof Error ? walletError.message : 'Transaction failed' 
              } : s
            ));

            throw new Error(`${transaction.chain} transaction failed: ${walletError instanceof Error ? walletError.message : 'Unknown error'}`);
          }
        }

        return { swapId: swapPlan.data.swapId, steps: swapPlan.data.transactions.length };
      } catch (error) {
        console.error('Arbitrage execution failed:', error);
        
        // Add detailed error information to steps
        setExecutionSteps(prev => [...prev, { 
          step: 'Error', 
          status: 'failed', 
          message: error instanceof Error ? error.message : 'Unknown error occurred' 
        }]);
        
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Arbitrage Completed!",
        description: `Swap ${data.swapId} executed successfully with ${data.steps} steps`,
      });
      setSelectedOpportunity(null);
      setExecutionSteps([]);
      refetchArbs();
    },
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setSelectedOpportunity(null);
      setExecutionSteps([]);
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
          Real-time arbitrage opportunities between Uniswap V3 (Ethereum Sepolia) and Cetus (Sui)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Test Transaction Button */}
        <div className="mb-6 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <h3 className="font-medium mb-2">🧪 Real Blockchain Transaction Test</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Test authentic blockchain transactions using configured testnet wallets
          </p>
          <div className="space-x-2">
            <Button 
              onClick={async () => {
                try {
                  console.log('🧪 Testing real blockchain transaction via backend...');
                  
                  const response = await fetch('/api/test-real-transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chain: 'sui',
                      amount: 1000, // 0.000001 SUI
                      testType: 'simple_transfer'
                    })
                  });
                  
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                  }
                  
                  const result = await response.json();
                  console.log('✅ Real transaction successful!', result);
                  
                  alert(`Real blockchain transaction successful!\nHash: ${result.data.transactionHash}\nExplorer: ${result.data.explorerUrl}`);
                } catch (error) {
                  console.error('❌ Real transaction test failed:', error);
                  alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              variant="outline"
              size="sm"
            >
              Test Real Sui Transaction
            </Button>
            <Button 
              onClick={async () => {
                try {
                  console.log('🧪 Testing real Ethereum transaction via backend...');
                  
                  const response = await fetch('/api/test-real-transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chain: 'ethereum',
                      amount: 100000000000000, // 0.0001 ETH in wei
                      testType: 'simple_transfer'
                    })
                  });
                  
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                  }
                  
                  const result = await response.json();
                  console.log('✅ Real Ethereum transaction successful!', result);
                  
                  alert(`Real Ethereum transaction successful!\nHash: ${result.data.transactionHash}\nExplorer: ${result.data.explorerUrl}`);
                } catch (error) {
                  console.error('❌ Real Ethereum transaction test failed:', error);
                  alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              variant="secondary"
              size="sm"
            >
              Test Real Ethereum Transaction
            </Button>
          </div>
        </div>
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
                <TableHead>Swap Direction</TableHead>
                <TableHead>Uniswap V3 Price</TableHead>
                <TableHead>Cetus Price</TableHead>
                <TableHead>Spread</TableHead>
                <TableHead>Est. Profit</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Amount ($)</TableHead>
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
                    <div className="flex items-center gap-2">
                      {opp.source?.includes('Sui') || opp.competitorPrice > opp.uniswapPrice ? (
                        // Sui → Ethereum direction
                        <div className="flex items-center gap-1">
                          <span className="text-base">🔷</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-base">⚫</span>
                        </div>
                      ) : (
                        // Ethereum → Sui direction
                        <div className="flex items-center gap-1">
                          <span className="text-base">⚫</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-base">🔷</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>${(opp.uniswapPrice && !isNaN(Number(opp.uniswapPrice))) ? Number(opp.uniswapPrice).toFixed(6) : 'N/A'}</span>
                      <span className="text-xs text-muted-foreground">Sepolia</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>${(opp.competitorPrice && !isNaN(Number(opp.competitorPrice))) ? Number(opp.competitorPrice).toFixed(6) : 'N/A'}</span>
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
                    <input
                      type="number"
                      placeholder="1.0"
                      min="0.1"
                      step="0.1"
                      value={swapAmounts[opp.id] || ''}
                      onChange={(e) => setSwapAmounts(prev => ({
                        ...prev,
                        [opp.id]: e.target.value
                      }))}
                      className="w-20 text-sm p-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Button 
                        size="sm"
                        onClick={() => {
                          console.log('🔍 Execute button clicked - Wallet states:', {
                            walletConnections,
                            suiWalletInfo,
                            ethereumAccount: walletConnections?.account,
                            suiAccount: suiWalletInfo?.account?.address,
                            amount: swapAmounts[opp.id]
                          });
                          executeArbMutation.mutate(opp);
                        }}
                        disabled={
                          executeArbMutation.isPending || 
                          selectedOpportunity === opp.id ||
                          !walletConnections?.account ||
                          !suiWalletInfo?.account?.address
                        }
                        className="w-full"
                      >
                        {executeArbMutation.isPending && selectedOpportunity === opp.id 
                          ? "Executing..." 
                          : "Execute with Wallets"
                        }
                      </Button>
                      {(!walletConnections?.account || !suiWalletInfo?.account?.address) && (
                        <div className="text-xs text-red-500 text-center">
                          Connect both wallets
                          <div className="text-xs text-gray-400 mt-1">
                            ETH: {walletConnections?.account ? '✅' : '❌'} | 
                            SUI: {suiWalletInfo?.account?.address ? '✅' : '❌'}
                          </div>
                        </div>
                      )}
                      {selectedOpportunity === opp.id && executionSteps.length > 0 && (
                        <div className="text-xs space-y-1">
                          {executionSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${
                                step.status === 'completed' ? 'bg-green-500' :
                                step.status === 'executing' ? 'bg-yellow-500' : 
                                step.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                              }`} />
                              <span className="truncate" title={step.message}>
                                {step.step} {step.status === 'failed' ? '❌' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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



// Previous Swaps Executed Component
function PreviousSwapsExecuted({ 
  walletConnections, 
  suiWalletInfo 
}: { 
  walletConnections: any, 
  suiWalletInfo: any 
}) {
  const { data: swapHistory, isLoading } = useQuery({
    queryKey: ['/api/transactions/history', walletConnections?.account, suiWalletInfo?.account?.address],
    queryFn: async () => {
      const ethereumAddress = walletConnections?.account;
      const suiAddress = suiWalletInfo?.account?.address;
      
      const response = await fetch('/api/transactions/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethereumAddress: ethereumAddress || null,
          suiAddress: suiAddress || null
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction history: ${response.status}`);
      }
      
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const hasConnectedWallets = walletConnections?.account || suiWalletInfo?.account?.address;
  const swapData = (swapHistory as any)?.data || [];
  const hasWalletData = (swapHistory as any)?.hasWalletData || false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔄 Previous Swaps Executed
          <Badge variant="secondary">
            {swapData.length} Completed
          </Badge>
        </CardTitle>
        <CardDescription>
          Historical record of completed cross-chain arbitrage swaps
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : !hasConnectedWallets ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-lg text-muted-foreground">
              Connect your wallets to view transaction history
            </div>
            <div className="text-sm text-muted-foreground">
              Your completed arbitrage swaps will be displayed here once connected
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Pair</TableHead>
                <TableHead>Swap Direction</TableHead>
                <TableHead>Amount Swapped</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Transaction Links</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {swapData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No completed swaps yet. Execute arbitrage opportunities to see history here.
                  </TableCell>
                </TableRow>
              ) : (
                swapData.map((swap: any, index: number) => {
                  // Helper function to shorten transaction hash
                  const shortenHash = (hash: string) => {
                    if (!hash) return '';
                    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
                  };

                  // Helper function to get explorer URL
                  const getExplorerUrl = (hash: string, chain: string) => {
                    if (!hash) return '#';
                    if (chain === 'ethereum') {
                      return `https://sepolia.etherscan.io/tx/${hash}`;
                    } else if (chain === 'sui') {
                      return `https://testnet.suivision.xyz/txblock/${hash}`;
                    }
                    return '#';
                  };

                  return (
                    <TableRow key={swap.id || index}>
                      <TableCell className="font-medium">
                        {swap.assetPairFrom}/{swap.assetPairTo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                            {swap.sourceChain}
                          </span>
                          →
                          <span className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                            {swap.targetChain}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>${Number(swap.amount || 0).toFixed(2)}</TableCell>
                      <TableCell className={Number(swap.profit || 0) > 0 ? "text-green-600 font-medium" : "text-red-600"}>
                        ${Number(swap.profit || 0).toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {swap.ethereumTxHash && (
                            <a
                              href={swap.explorerUrls?.ethereum || `https://sepolia.etherscan.io/tx/${swap.ethereumTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                            >
                              <span className="text-xs text-gray-500">ETH:</span>
                              {shortenHash(swap.ethereumTxHash)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {swap.suiTxHash && (
                            <a
                              href={swap.explorerUrls?.sui || `https://testnet.suivision.xyz/txblock/${swap.suiTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs"
                            >
                              <span className="text-xs text-gray-500">SUI:</span>
                              {shortenHash(swap.suiTxHash)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {/* Fallback for legacy single txHash */}
                          {!swap.ethereumTxHash && !swap.suiTxHash && swap.txHash && (
                            <a
                              href={getExplorerUrl(swap.txHash, swap.sourceChain)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                            >
                              {shortenHash(swap.txHash)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(swap.timestamp || swap.createdAt).toLocaleDateString()} {new Date(swap.timestamp || swap.createdAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={swap.status === 'completed' ? 'default' : swap.status === 'failed' ? 'destructive' : 'secondary'}>
                          {swap.status || 'completed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
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
    queryKey: ['/api/uniswap/price/USDC-WETH'],
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
          <CardTitle className="text-lg">🦄 Uniswap V3 (Sepolia)</CardTitle>
          <CardDescription>USDC/WETH Price Feed</CardDescription>
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
                {(priceData as any)?.data?.price?.formatted || '1 USDC = 1.000000 WETH'}
              </div>
              <Badge variant="outline" className="text-xs">
                Ethereum Sepolia Testnet
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
                Sui Testnet
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
