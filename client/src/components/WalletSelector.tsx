import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WalletConnect from './WalletConnect.jsx';
import SuiWalletConnect from './SuiWalletConnect';

// TypeScript interfaces
declare global {
  interface Window {
    ethereum?: any;
    phantom?: any;
  }
}

interface WalletInfo {
  name: string;
  icon: string;
  description: string;
  network: string;
  detected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  account?: string;
}

interface WalletSelectorProps {
  onWalletChange?: (walletType: 'ethereum' | 'sui', walletInfo: any) => void;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({ onWalletChange }) => {
  const [walletStates, setWalletStates] = useState<{
    ethereum: WalletInfo;
    sui: WalletInfo;
  }>({
    ethereum: {
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect to Ethereum Sepolia testnet',
      network: 'Ethereum Sepolia',
      detected: false,
      connectionStatus: 'disconnected'
    },
    sui: {
      name: 'Phantom Wallet',
      icon: '👻',
      description: 'Connect to Sui Testnet',
      network: 'Sui Testnet',
      detected: false,
      connectionStatus: 'disconnected'
    }
  });

  const [selectedTab, setSelectedTab] = useState<'ethereum' | 'sui'>('ethereum');

  // Detect available wallets
  useEffect(() => {
    const detectWallets = () => {
      // More specific wallet detection to avoid conflicts
      const ethereumDetected = typeof window !== 'undefined' && 
                          !!window.ethereum && 
                          !window.ethereum.isPhantom; // Exclude Phantom's ethereum provider
      
      const suiDetected = typeof window !== 'undefined' && (
        !!window.phantom?.sui || // Phantom with Sui support
        !!window.sui || // Official Sui wallet
        !!window.suiet // Suiet wallet
      );

      setWalletStates(prev => ({
        ...prev,
        ethereum: { ...prev.ethereum, detected: ethereumDetected },
        sui: { ...prev.sui, detected: suiDetected }
      }));
    };

    detectWallets();
    
    // Re-detect after a delay for wallets that inject later
    const timeout = setTimeout(detectWallets, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Handle wallet state changes from child components
  const handleEthereumWalletChange = (walletInfo: any) => {
    setWalletStates(prev => ({
      ...prev,
      ethereum: {
        ...prev.ethereum,
        connectionStatus: walletInfo.account ? 'connected' : 'disconnected',
        account: walletInfo.account
      }
    }));
    
    if (onWalletChange) {
      onWalletChange('ethereum', walletInfo);
    }
  };

  const handleSuiWalletChange = (walletInfo: any) => {
    setWalletStates(prev => ({
      ...prev,
      sui: {
        ...prev.sui,
        connectionStatus: walletInfo.connected ? 'connected' : 'disconnected',
        account: walletInfo.account?.address
      }
    }));
    
    if (onWalletChange) {
      onWalletChange('sui', walletInfo);
    }
  };

  const getConnectionBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">Connected</Badge>;
      case 'connecting':
        return <Badge variant="secondary">Connecting...</Badge>;
      default:
        return <Badge variant="outline">Not Connected</Badge>;
    }
  };

  const bothWalletsConnected = walletStates.ethereum.connectionStatus === 'connected' && 
                              walletStates.sui.connectionStatus === 'connected';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔗 Wallet Selection Center
          {bothWalletsConnected && (
            <Badge variant="default" className="bg-green-600">
              ✅ Both Wallets Ready
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your wallets to execute cross-chain arbitrage swaps
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Wallet Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🦊</span>
                <div>
                  <div className="font-medium">{walletStates.ethereum.name}</div>
                  <div className="text-sm text-muted-foreground">{walletStates.ethereum.network}</div>
                </div>
              </div>
              {getConnectionBadge(walletStates.ethereum.connectionStatus)}
            </div>
            {walletStates.ethereum.account && (
              <div className="text-xs text-muted-foreground font-mono">
                {walletStates.ethereum.account.slice(0, 6)}...{walletStates.ethereum.account.slice(-4)}
              </div>
            )}
            {!walletStates.ethereum.detected && (
              <div className="text-xs text-red-500 mt-1">
                ⚠️ MetaMask not detected
              </div>
            )}
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👻</span>
                <div>
                  <div className="font-medium">{walletStates.sui.name}</div>
                  <div className="text-sm text-muted-foreground">{walletStates.sui.network}</div>
                </div>
              </div>
              {getConnectionBadge(walletStates.sui.connectionStatus)}
            </div>
            {walletStates.sui.account && (
              <div className="text-xs text-muted-foreground font-mono">
                {walletStates.sui.account.slice(0, 6)}...{walletStates.sui.account.slice(-4)}
              </div>
            )}
            {!walletStates.sui.detected && (
              <div className="text-xs text-red-500 mt-1">
                ⚠️ Phantom Wallet not detected
              </div>
            )}
          </div>
        </div>

        {/* Wallet Connection Tabs */}
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'ethereum' | 'sui')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ethereum" className="flex items-center gap-2">
              🦊 Connect Ethereum Wallet
              {walletStates.ethereum.connectionStatus === 'connected' && <span className="w-2 h-2 bg-green-500 rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="sui" className="flex items-center gap-2">
              👻 Connect Sui Wallet
              {walletStates.sui.connectionStatus === 'connected' && <span className="w-2 h-2 bg-green-500 rounded-full" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ethereum" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🦊 MetaMask Wallet</CardTitle>
                <CardDescription>
                  Connect to Ethereum Sepolia testnet for USDC/USDT trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!walletStates.ethereum.detected ? (
                  <div className="text-center p-6">
                    <div className="text-4xl mb-4">🦊</div>
                    <h3 className="text-lg font-medium mb-2">MetaMask Required</h3>
                    <p className="text-muted-foreground mb-4">
                      Please install MetaMask browser extension to connect to Ethereum Sepolia network
                    </p>
                    {window.ethereum?.isPhantom && (
                      <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Phantom detected, but MetaMask is recommended for Ethereum. 
                          Install MetaMask for the best experience.
                        </p>
                      </div>
                    )}
                    <Button asChild>
                      <a 
                        href="https://metamask.io/download/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Install MetaMask
                      </a>
                    </Button>
                  </div>
                ) : (
                  <WalletConnect onWalletChange={handleEthereumWalletChange} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sui" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">👻 Phantom Wallet</CardTitle>
                <CardDescription>
                  Connect to Sui Testnet for USDC/USDY trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!walletStates.sui.detected ? (
                  <div className="text-center p-6">
                    <div className="text-4xl mb-4">👻</div>
                    <h3 className="text-lg font-medium mb-2">Phantom Wallet Required</h3>
                    <p className="text-muted-foreground mb-4">
                      Please install Phantom browser extension with Sui support
                    </p>
                    <Button asChild>
                      <a 
                        href="https://phantom.app/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Install Phantom
                      </a>
                    </Button>
                  </div>
                ) : (
                  <SuiWalletConnect onWalletChange={handleSuiWalletChange} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Trading Readiness Status */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚡</span>
            <h4 className="font-medium">Trading Status</h4>
          </div>
          
          {bothWalletsConnected ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-medium">Ready for arbitrage trading!</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Connect both wallets to enable one-click swap execution</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Progress: {walletStates.ethereum.connectionStatus === 'connected' ? '1' : '0'}/2 wallets connected
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletSelector;