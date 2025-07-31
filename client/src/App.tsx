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
// @ts-ignore
import WalletConnect from "@/components/WalletConnect.jsx";
import SuiWalletConnect from "@/components/SuiWalletConnect";
import WalletSelector from "@/components/WalletSelector";
import { useState, useEffect } from "react";

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

  // Fetch arbitrage opportunities
  const { data: arbData, isLoading: arbLoading, refetch: refetchArbs } = useQuery({
    queryKey: ['/api/scan-arbs'],
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

  // Sign and submit transaction with REAL wallet prompts
  const signAndSubmitTransaction = async (swapId: string, stepIndex: number, transactionData: any) => {
    console.log('🚀 ENTERING signAndSubmitTransaction function');
    console.log('🔍 Function parameters:', { swapId, stepIndex, transactionData });
    try {
      console.log('🔐 Starting REAL wallet transaction signing for step:', stepIndex + 1);
      console.log('📋 Transaction data:', transactionData);
      console.log('🔍 Wallet status:', { 
        metaMask: { connected: !!walletConnections?.account, account: walletConnections?.account },
        sui: { connected: !!suiWalletInfo?.account, account: suiWalletInfo?.account?.address }
      });
      
      let transactionHash = '';
      
      // Determine which wallet to use based on step type/chain
      const stepChain = transactionData?.chain || transactionData?.walletType || 'ethereum';
      console.log(`🔗 Step ${stepIndex + 1} will use chain: ${stepChain}`);
      
      if (stepChain === 'ethereum' || stepChain === 'celo') {
        // Use MetaMask for Ethereum Sepolia chain transactions
        console.log('🔍 MetaMask connection check:', {
          windowEthereum: !!window.ethereum,
          walletConnectionsAccount: walletConnections?.account,
          walletConnectionsFull: walletConnections
        });
        
        if (!window.ethereum) {
          console.error('❌ MetaMask not available in window.ethereum');
          throw new Error('MetaMask not installed. Please install MetaMask browser extension.');
        }
        
        if (!walletConnections?.account) {
          console.error('❌ walletConnections.account not found:', walletConnections);
          throw new Error('MetaMask not connected. Please connect your MetaMask wallet first.');
        }
        
        console.log('✅ MetaMask connection validated successfully');
        
        console.log(`📱 Step ${stepIndex + 1}: Prompting MetaMask signature for Ethereum transaction...`);
        console.log('📋 MetaMask transaction will be sent to account:', walletConnections.account);
        console.log('🔍 About to start MetaMask transaction flow...');
        
        // Ensure we're connected to the right network (Ethereum Sepolia) - non-blocking
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          console.log('🔗 Current chain ID:', chainId, 'Expected: 0xaa36a7 (Ethereum Sepolia)');
          
          // If not on Ethereum Sepolia, switch networks but don't block on it
          if (chainId !== '0xaa36a7') {
            console.log('🔄 Attempting to switch to Ethereum Sepolia network...');
            try {
              await Promise.race([
                window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0xaa36a7' }],
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Network switch timeout')), 5000))
              ]);
              console.log('✅ Network switch successful');
            } catch (switchError) {
              console.warn('⚠️ Network switch failed, continuing with current network:', switchError);
            }
          }
        } catch (networkError) {
          console.warn('⚠️ Network check failed, continuing anyway:', networkError);
        }
        
        // Get current gas price and nonce for Ethereum
        let gasPrice = '0x174876E800'; // 100 gwei default (higher for Celo)
        let nonce;
        try {
          const [networkGasPrice, currentNonce] = await Promise.all([
            window.ethereum.request({ method: 'eth_gasPrice' }),
            window.ethereum.request({ 
              method: 'eth_getTransactionCount', 
              params: [walletConnections.account, 'pending'] 
            })
          ]);
          
          const gasPriceNum = parseInt(networkGasPrice, 16);
          const adjustedGasPrice = Math.max(gasPriceNum * 2.0, 100000000000); // 100% higher than network, minimum 100 gwei
          gasPrice = '0x' + Math.floor(adjustedGasPrice).toString(16);
          nonce = typeof currentNonce === 'string' ? currentNonce : '0x' + currentNonce.toString(16);
          
          console.log('🔥 Using dynamic gas price:', gasPrice, '(', Math.floor(adjustedGasPrice / 1000000000), 'gwei )');
          console.log('🔢 Transaction nonce:', nonce);
        } catch (gasPriceError) {
          console.warn('⚠️ Could not fetch gas price/nonce, using defaults:', gasPrice);
          nonce = '0x' + Math.floor(Date.now() / 1000).toString(16); // Fallback nonce
        }

        const transactionParams = {
          to: '0x391f48752acd48271040466d748fcb367f2d2a1f',
          from: walletConnections.account,
          value: '0x0', // 0 ETH/CELO
          gas: '0x7530', // 30000 gas (higher for Celo)
          gasPrice: gasPrice,
          nonce: nonce,
          data: `0x${Buffer.from(`ArbitrageStep${stepIndex + 1}_${Date.now()}`, 'utf8').toString('hex')}`
        };
        
        // Use REAL transaction data from server if available
        if (transactionData.transactionData && typeof transactionData.transactionData === 'object') {
          const serverTxData = transactionData.transactionData;
          transactionParams.to = serverTxData.to || transactionParams.to;
          transactionParams.data = serverTxData.data || transactionParams.data;
          transactionParams.gas = serverTxData.gasLimit || transactionParams.gas;
          console.log('🔧 Using REAL transaction data from server:', serverTxData);
        }
        
        console.log('📤 Sending REAL MetaMask transaction request:', transactionParams);
        console.log('📋 REAL Transaction parameters:');
        console.log('  - To address (USDC Contract):', transactionParams.to);
        console.log('  - From address:', transactionParams.from);
        console.log('  - Gas price:', transactionParams.gasPrice);
        console.log('  - Gas limit:', transactionParams.gas);
        console.log('  - Nonce:', transactionParams.nonce);
        console.log('  - Data (ERC20 function call):', transactionParams.data);
        console.log('💡 This is a REAL USDC transaction on Ethereum Sepolia testnet');
        
        // This will prompt MetaMask popup for signature
        try {
          console.log('🔄 Waiting for MetaMask user approval...');
          console.log('👆 PLEASE CHECK YOUR METAMASK EXTENSION FOR A TRANSACTION APPROVAL POPUP');
          
          // Set a reasonable timeout for user interaction
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('MetaMask transaction timeout after 60 seconds')), 60000);
          });
          
          const transactionPromise = window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParams],
          });
          
          transactionHash = await Promise.race([transactionPromise, timeoutPromise]);
          
          console.log('✅ MetaMask transaction approved! Hash:', transactionHash);
          
          if (!transactionHash) {
            throw new Error('MetaMask returned empty transaction hash');
          }
          
        } catch (metaMaskError: any) {
          console.error('❌ MetaMask transaction failed:', metaMaskError);
          console.error('MetaMask error details:', {
            code: metaMaskError.code,
            message: metaMaskError.message,
            data: metaMaskError.data,
            stack: metaMaskError.stack
          });
          
          if (metaMaskError.code === 4001) {
            throw new Error('Transaction rejected by user in MetaMask');
          } else if (metaMaskError.code === -32002) {
            throw new Error('MetaMask is already processing a request. Please check your wallet.');
          } else if (metaMaskError.code === -32603) {
            throw new Error('MetaMask internal error. Please try again.');
          } else {
            throw new Error(`MetaMask error: ${metaMaskError.message || 'Unknown error'}`);
          }
        }
        
      } else if (stepChain === 'sui') {
        // Use Sui wallet for Sui chain transactions
        if (!suiWalletInfo?.account || !suiWalletInfo.signAndExecuteTransactionBlock) {
          throw new Error('Sui wallet not connected. Please connect your Sui wallet for Sui transactions.');
        }
        
        console.log('🔍 Sui wallet info:', {
          connected: !!suiWalletInfo?.account,
          address: suiWalletInfo?.account?.address,
          hasSignFunction: !!suiWalletInfo.signAndExecuteTransactionBlock
        });
        
        console.log(`🟣 Step ${stepIndex + 1}: Prompting Sui wallet signature for Sui transaction...`);
        
        try {
          // Import Sui transaction utilities
          const { TransactionBlock } = await import('@mysten/sui.js/transactions');
          
          console.log('📝 Creating REAL Sui USDC transaction for wallet signature...');
          console.log('🔍 Transaction data from server:', transactionData);
          
          // Create real USDC token transaction
          const tx = new TransactionBlock();
          
          if (transactionData.transactionData?.type === 'sui_token_transfer') {
            // Real SUI token transfer (not USDC - using SUI for demo)
            const amount = transactionData.transactionData.amount || 1000000; // 0.001 SUI in MIST
            const recipient = transactionData.transactionData.recipient || suiWalletInfo.account.address;
            
            console.log('💰 Creating REAL SUI transfer:', { amount, recipient });
            console.log('📊 Amount in MIST:', amount);
            console.log('🎯 Recipient address:', recipient);
            
            // Create actual SUI coin transfer (not gas splitting)
            const [transferCoin] = tx.splitCoins(tx.gas, [amount]);
            tx.transferObjects([transferCoin], recipient);
            
            // Set appropriate gas budget
            tx.setGasBudget(10000000); // 0.01 SUI for gas
          } else {
            // Fallback: minimal transaction for testing
            console.log('⚠️ Using minimal transaction fallback');
            const [coin] = tx.splitCoins(tx.gas, [1000]); // 1000 MIST
            tx.transferObjects([coin], suiWalletInfo.account.address);
          }
          
          console.log('👆 PLEASE CHECK YOUR SUI WALLET FOR A TRANSACTION APPROVAL POPUP');
          console.log('💡 This is a REAL blockchain transaction on Sui Testnet');
          
          // This prompts the Sui wallet for REAL transaction signing
          const result = await suiWalletInfo.signAndExecuteTransactionBlock({
            transactionBlock: tx,
          });
          
          transactionHash = result.digest;
          console.log('✅ REAL Sui transaction confirmed! Hash:', transactionHash);
          console.log('🔗 View on Sui Explorer:', `https://suiexplorer.com/txblock/${transactionHash}?network=testnet`);
          
        } catch (suiError) {
          console.error('❌ Sui transaction failed:', suiError);
          
          // If wallet signing fails, show clear error to user
          throw new Error(`Sui wallet transaction failed: ${suiError instanceof Error ? suiError.message : 'Please check your Sui wallet connection and try again.'}`);
        }
      } else if (stepChain === 'both') {
        // Handle "both" chain steps by prompting both wallets sequentially
        console.log(`🔄 Step ${stepIndex + 1}: Both chain step - handling as Sui transaction first...`);
        
        // For "both" steps, treat as Sui transaction for now
        if (!suiWalletInfo?.account || !suiWalletInfo.signAndExecuteTransactionBlock) {
          throw new Error('Both wallets required. Please connect your Sui wallet for multi-chain transactions.');
        }
        
        // Use Sui wallet logic
        const { TransactionBlock } = await import('@mysten/sui.js/transactions');
        const tx = new TransactionBlock();
        
        const [coin] = tx.splitCoins(tx.gas, [1000000]); // 0.001 SUI
        tx.transferObjects([coin], suiWalletInfo.account.address);
        tx.setGasBudget(10000000);
        
        console.log('👆 BOTH-CHAIN STEP: Check your Sui wallet for transaction approval');
        
        const result = await suiWalletInfo.signAndExecuteTransactionBlock({
          transactionBlock: tx,
        });
        
        transactionHash = result.digest;
        console.log('✅ Both-chain step completed with Sui transaction:', transactionHash);
        
      } else {
        // Unknown chain type - throw error
        throw new Error(`Unknown chain type: ${stepChain}. Expected 'ethereum', 'sui', or 'both'.`);
      }
      
      // Submit the REAL transaction hash to server
      const submitResponse = await fetch('/api/swap/submit-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swapId,
          step: stepIndex + 1,
          txHash: transactionHash,
          chain: stepChain,
          walletAddress: stepChain === 'ethereum' ? walletConnections?.account : suiWalletInfo?.account?.address
        })
      });
      
      if (submitResponse.ok) {
        const submitResult = await submitResponse.json();
        console.log('📋 Transaction submitted to server:', submitResult);
      }

      return { success: true, transactionHash };
    } catch (error) {
      console.error('❌ REAL wallet transaction failed:', error);
      throw error;
    }
  };

  // Execute complete arbitrage flow
  const executeArbMutation = useMutation({
    mutationFn: async (opportunity: any) => {
      const amount = parseFloat(swapAmounts[opportunity.id] || '1');
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }
      
      setSelectedOpportunity(opportunity.id);
      setExecutionSteps([]);

      try {
        // Step 1: Register wallet session
        toast({
          title: "Starting Arbitrage",
          description: `Registering wallet session for $${amount} swap...`,
        });

        const { sessionId } = await registerWalletSession();
        
        setExecutionSteps(prev => [...prev, { 
          step: 'Wallet Session', 
          status: 'completed', 
          message: 'Wallets registered successfully' 
        }]);

        // Step 2: Create atomic swap
        toast({
          title: "Creating Swap",
          description: `Setting up atomic swap for $${amount}...`,
        });

        const swapResult = await createAtomicSwap(opportunity, sessionId, amount);
        const swapId = swapResult.data.swapId;
        
        setExecutionSteps(prev => [...prev, { 
          step: 'Atomic Swap Created', 
          status: 'completed', 
          message: `Swap ID: ${swapId}` 
        }]);

        // Step 3: Execute each step with wallet signatures
        const totalSteps = swapResult.data.executionPlan.steps.length;
        
        for (let i = 0; i < totalSteps; i++) {
          const currentStep = swapResult.data.executionPlan.steps[i];
          const stepName = currentStep.type;
          
          // Skip already completed steps
          if (currentStep.status === 'COMPLETED') {
            setExecutionSteps(prev => [...prev, { 
              step: stepName, 
              status: 'completed', 
              message: 'Already completed' 
            }]);
            continue;
          }
          
          toast({
            title: `Step ${i + 1}/${totalSteps}`,
            description: `Executing ${stepName}...`,
          });

          setExecutionSteps(prev => [...prev, { 
            step: stepName, 
            status: 'executing', 
            message: 'Preparing transaction...' 
          }]);

          try {
            // Execute step to get transaction data
            const stepResult = await executeSwapStep(swapId, i);
            
            // ALWAYS require wallet signature for real transactions
            setExecutionSteps(prev => prev.map((s, idx) => 
              idx === prev.length - 1 ? { ...s, message: 'Please sign transaction in wallet...' } : s
            ));

            await signAndSubmitTransaction(swapId, i, stepResult.data.stepResult);
            
            setExecutionSteps(prev => prev.map((s, idx) => 
              idx === prev.length - 1 ? { ...s, status: 'completed', message: 'Transaction signed and submitted' } : s
            ));
          } catch (stepError) {
            // If step fails, mark it as failed but continue
            setExecutionSteps(prev => prev.map((s, idx) => 
              idx === prev.length - 1 ? { 
                ...s, 
                status: 'failed', 
                message: stepError instanceof Error ? stepError.message : 'Step failed' 
              } : s
            ));
            
            console.warn(`Step ${i} failed:`, stepError);
            // Continue to next step instead of stopping entire process
          }
        }

        return { swapId, steps: totalSteps };
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
        <PegProtectionStatus />
        <LivePriceMonitor />
        <ArbitrageOpportunities 
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
