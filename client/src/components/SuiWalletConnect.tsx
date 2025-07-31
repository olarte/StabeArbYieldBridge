import React, { useState, useEffect } from 'react';
import {
  WalletProvider,
  useWallet,
  ConnectButton,
  ConnectModal,
  useAccountBalance,
} from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';
import { suiClient, formatSuiAddress, mistToSui } from '../utils/sui';
import './SuiWalletConnect.css';

// Debug logging
console.log('SuiWalletConnect: Component loaded');

// Enhanced wallet detection logging
if (typeof window !== 'undefined') {
  console.log('Window.sui available:', !!(window as any).sui);
  console.log('Window.ethereum available:', !!(window as any).ethereum);
  console.log('Window.suiet available:', !!(window as any).suiet);
  console.log('Window.martian available:', !!(window as any).martian);
  console.log('Sui-related keys:', Object.keys(window).filter(k => k.toLowerCase().includes('sui')));
  console.log('Wallet-related keys:', Object.keys(window).filter(k => 
    k.toLowerCase().includes('wallet') || 
    k.toLowerCase().includes('metamask') || 
    k.toLowerCase().includes('phantom') ||
    k.toLowerCase().includes('coinbase')
  ));
}

// Inner component that uses wallet hooks
const SuiWalletContent: React.FC<{ onWalletChange?: (walletInfo: any) => void }> = ({ onWalletChange }) => {
  const {
    connected,
    account,
    disconnect,
    connecting,
    select,
    chain,
    signAndExecuteTransactionBlock,
  } = useWallet();
  
  const wallet = (useWallet() as any).wallet;

  const { balance } = useAccountBalance();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [accountObjects, setAccountObjects] = useState<any[]>([]);
  const [loadingObjects, setLoadingObjects] = useState<boolean>(false);
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);

  // Check for installed wallets only once on mount
  useEffect(() => {
    let isSubscribed = true;
    
    const checkWalletExtensions = () => {
      if (!isSubscribed) return;
      
      console.log('SuiWallet: Checking for installed wallets...');
      const detectedWallets: any[] = [];
      
      if (typeof window !== 'undefined') {
        console.log('SuiWallet: Comprehensive wallet scan starting...');
        
        // Check for standard Sui wallets
        const walletChecks = [
          { key: 'sui', name: 'Sui Wallet (Official)' },
          { key: 'suiet', name: 'Suiet Wallet' },
          { key: 'suietWallet', name: 'Suiet Wallet (suietWallet)' },
          { key: 'SuietWallet', name: 'Suiet Wallet (SuietWallet)' },
          { key: 'martian', name: 'Martian Wallet' },
          { key: 'suiWallet', name: 'Sui Wallet (suiWallet)' },
          { key: 'wallet', name: 'Generic Wallet' },
          { key: 'ethereum', name: 'Ethereum (MetaMask-like)' },
          { key: 'keplr', name: 'Keplr Wallet' },
          { key: 'phantom', name: 'Phantom Wallet' },
          { key: 'coinbase', name: 'Coinbase Wallet' },
          { key: 'okxwallet', name: 'OKX Wallet' },
          { key: 'BitKeep', name: 'BitKeep Wallet' },
          { key: 'trustWallet', name: 'Trust Wallet' },
          { key: 'binance', name: 'Binance Wallet' }
        ];
        
        walletChecks.forEach(({ key, name }) => {
          if ((window as any)[key]) {
            const walletObj = (window as any)[key];
            
            // Check if this wallet supports Sui
            let suiSupport = false;
            try {
              if (walletObj.isSui || walletObj.sui || (walletObj.signAndExecuteTransactionBlock) || 
                  (walletObj.features && walletObj.features.includes && walletObj.features.includes('sui')) ||
                  (walletObj.name && walletObj.name.toLowerCase().includes('sui'))) {
                suiSupport = true;
              }
            } catch (e) {
              // Silent fail for wallet inspection
            }
            
            detectedWallets.push({ 
              name: `${name} (${key})${suiSupport ? ' ✓SUI' : ''}`, 
              detected: true, 
              key, 
              suiSupport 
            });
            console.log(`SuiWallet: Found ${name} at window.${key}`, {
              type: typeof walletObj,
              isSui: walletObj.isSui,
              hasSui: !!walletObj.sui,
              hasSignMethod: !!walletObj.signAndExecuteTransactionBlock,
              name: walletObj.name,
              suiSupport
            });
          }
        });
        
        // Check for wallet standard interfaces
        const standardChecks = [
          '__sui_wallet_standard_interface__',
          'ethereum',
          'solana',
          'aptos'
        ];
        
        standardChecks.forEach(standardKey => {
          if ((window as any)[standardKey]) {
            detectedWallets.push({ name: `${standardKey} Standard`, detected: true, key: standardKey });
            console.log(`SuiWallet: Found standard interface ${standardKey}`);
          }
        });
        
        // Scan all window keys for wallet-related objects
        const windowKeys = Object.keys(window);
        console.log('SuiWallet: Total window keys count:', windowKeys.length);
        console.log('SuiWallet: Sample window keys:', windowKeys.slice(0, 30));
        
        // Enhanced Suiet-specific detection with additional methods
        const suietVariations = [
          'suiet', 'Suiet', 'SUIET', 'suietWallet', 'SuietWallet',
          // Additional patterns Suiet might use
          '__SUIET__', 'window.suietWallet', 'suietProvider'
        ];
        
        suietVariations.forEach(variation => {
          if ((window as any)[variation]) {
            const suietObj = (window as any)[variation];
            console.log(`SuiWallet: Found Suiet variation at window.${variation}:`, suietObj);
            detectedWallets.push({ 
              name: `Suiet Wallet (${variation}) ✓SUI`, 
              detected: true, 
              key: variation,
              suiSupport: true 
            });
          }
        });
        
        // Additional Suiet detection: Check for wallet standard implementation
        if (typeof window !== 'undefined' && (window as any).addEventListener) {
          // Listen for wallet events that Suiet might dispatch
          const checkSuietEvent = () => {
            const walletStandard = (window as any)['wallet-standard:app-ready'];
            if (walletStandard) {
              console.log('SuiWallet: Wallet standard detected, checking for Suiet...');
            }
          };
          checkSuietEvent();
        }
        
        // Look for wallet-related keys
        const walletPatterns = ['wallet', 'sui', 'coin', 'crypto', 'web3', 'ethereum', 'metamask'];
        windowKeys.forEach(key => {
          const lowerKey = key.toLowerCase();
          walletPatterns.forEach(pattern => {
            if (lowerKey.includes(pattern) && !detectedWallets.find(w => w.key === key)) {
              const walletObj = (window as any)[key];
              if (walletObj && typeof walletObj === 'object') {
                detectedWallets.push({ name: `${key} (pattern match)`, detected: true, key });
                console.log(`SuiWallet: Found wallet pattern ${key}:`, typeof walletObj);
              }
            }
          });
        });
      }
      
      return detectedWallets;
    };
    
    // Initial check
    const initialWallets = checkWalletExtensions() || [];
    console.log('SuiWallet: Initial scan detected wallets:', initialWallets);
    setAvailableWallets(initialWallets);
    
    // Delayed check for wallets that inject after page load
    const delayedCheck = setTimeout(() => {
      if (!isSubscribed) return;
      
      console.log('SuiWallet: Running delayed wallet detection...');
      const delayedWallets = checkWalletExtensions() || [];
      console.log('SuiWallet: Delayed scan detected wallets:', delayedWallets);
      
      // Only update if we found new wallets to prevent infinite loops
      if (delayedWallets.length > initialWallets.length) {
        console.log('SuiWallet: Found additional wallets after delay');
        setAvailableWallets(delayedWallets);
      }
    }, 2000);
    
    // Check if any wallet is installed
    if (initialWallets.length === 0) {
      console.warn('SuiWallet: No wallets detected in initial scan. Running delayed check...');
    } else {
      console.log('SuiWallet: Found', initialWallets.length, 'wallet(s) in initial scan');
    }
    
    return () => {
      isSubscribed = false;
      clearTimeout(delayedCheck);
    };
  }, []);

  // Get account objects (coins, NFTs, etc.)
  const getAccountObjects = async () => {
    if (!account?.address) return;
    
    setLoadingObjects(true);
    try {
      const objects = await suiClient.getOwnedObjects({
        owner: account.address,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
        },
      });
      setAccountObjects(objects.data || []);
    } catch (error) {
      console.error('Failed to fetch account objects:', error);
    } finally {
      setLoadingObjects(false);
    }
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (account?.address) {
      try {
        await navigator.clipboard.writeText(account.address);
        // You could add a toast notification here
        console.log('Address copied to clipboard');
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  };

  // Disconnect wallet
  const handleDisconnect = async () => {
    try {
      await disconnect();
      setAccountObjects([]);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  useEffect(() => {
    if (connected && account?.address) {
      getAccountObjects();
    }
  }, [connected, account?.address]);

  // Notify parent component when wallet state changes (only when actually connected)
  useEffect(() => {
    if (onWalletChange && connected && account?.address) {
      console.log('🟣 Sui wallet state updated:', {
        connected,
        address: account?.address,
        balance: balance?.toString()
      });
      onWalletChange({
        connected,
        account,
        balance,
        wallet,
        signAndExecuteTransactionBlock
      });
    }
  }, [connected, account?.address, balance?.totalBalance]);

  if (!connected) {
    return (
      <div className="sui-wallet-connect">
        <div className="connect-card">
          <h3>🟦 Connect Sui Wallet</h3>
          <p>Connect your Sui wallet to trade on Sui Testnet</p>
          
          {/* Wallet detection status */}
          <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Wallet Status:</strong>
            </div>
            {availableWallets.length > 0 ? (
              <div>
                <div style={{ color: '#4CAF50', marginBottom: '8px' }}>
                  ✅ {availableWallets.length} wallet(s) detected
                </div>
                <div style={{ fontSize: '12px', color: '#E0E0E0' }}>
                  {availableWallets.map((w, i) => (
                    <div key={i} style={{ marginBottom: '4px' }}>
                      • {w.name} {w.suiSupport ? '(Sui Compatible)' : '(Check Sui support)'}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: '#FF9800' }}>
                ⚠️ No Sui wallet extensions detected. 
                <br /><strong>If you have Suiet installed:</strong>
                <br />• Refresh this page after ensuring Suiet is enabled
                <br />• Try using the "📱 Connect Sui (Built-in)" button below
                <br />
                <br /><strong>Or install a Sui wallet:</strong>
                <br />• <a href="https://chrome.google.com/webstore/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd" target="_blank" style={{ color: '#64B5F6' }}>Suiet Wallet (Recommended)</a>
                <br />• <a href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil" target="_blank" style={{ color: '#64B5F6' }}>Sui Wallet</a>
                <br />• <a href="https://phantom.app/" target="_blank" style={{ color: '#64B5F6' }}>Phantom Wallet</a>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => {
              console.log('SuiWallet: Button clicked, opening modal');
              console.log('SuiWallet: Available wallets:', availableWallets);
              
              // Enhanced Suiet detection for debugging
              if (typeof window !== 'undefined') {
                console.log('SuiWallet: Checking for Suiet specifically...');
                console.log('window.suiet:', (window as any).suiet);
                console.log('window.suietWallet:', (window as any).suietWallet);
                console.log('window.SuietWallet:', (window as any).SuietWallet);
                
                // Enhanced Suiet debugging
                const allKeys = Object.getOwnPropertyNames(window);
                const suietKeys = allKeys.filter(k => k.toLowerCase().includes('suiet'));
                console.log('SuiWallet: Suiet-related keys in window:', suietKeys);
                
                // Check document for Suiet-related elements
                const suietElements = document.querySelectorAll('[id*="suiet"], [class*="suiet"]');
                console.log('SuiWallet: Suiet DOM elements:', suietElements.length);
                
                // Check for extension manifest
                if ((window as any).chrome && (window as any).chrome.runtime) {
                  console.log('SuiWallet: Chrome runtime available');
                  try {
                    // Check if Suiet extension is available
                    const extensionCheck = (window as any).chrome.runtime.getManifest;
                    if (extensionCheck) {
                      console.log('SuiWallet: Can access extension manifest');
                    }
                  } catch (e) {
                    console.log('SuiWallet: Cannot access extension details');
                  }
                }
                
                // Try alternative Suiet detection methods
                console.log('SuiWallet: Checking alternative Suiet patterns...');
                const alternativeChecks = ['__suiet__', 'suietProvider', 'SuietProvider'];
                alternativeChecks.forEach(check => {
                  if ((window as any)[check]) {
                    console.log(`SuiWallet: Found alternative Suiet at window.${check}`);
                  }
                });
              }
              
              setShowModal(true);
            }}
            disabled={connecting || availableWallets.length === 0}
            className="connect-btn sui"
          >
            {connecting ? '🔄 Connecting...' : availableWallets.length === 0 ? '❌ No Wallets Found' : '🟦 Connect Sui Wallet'}
          </button>
          
          {/* Alternative: Use built-in ConnectButton */}
          <div style={{ marginTop: '10px' }}>
            {availableWallets.length > 0 ? (
              <ConnectButton 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📱 Connect Sui (Built-in)
              </ConnectButton>
            ) : (
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  color: '#999',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'not-allowed',
                  textAlign: 'center',
                }}
              >
                ❌ Built-in Connect (No Wallet)
              </div>
            )}
          </div>

          <div className="supported-networks">
            <small>Connected to: Sui Testnet</small>
            <div className="network-list">
              <span className="network-badge sui">🟦 Sui Testnet</span>
            </div>
          </div>

          {/* Connect Modal */}
          <ConnectModal
            open={showModal}
            onOpenChange={(open) => {
              console.log('SuiWallet: Modal state changed:', open);
              setShowModal(open);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="sui-wallet-connected">
      <div className="wallet-info">
        <div className="wallet-header">
          <h3>✅ Sui Wallet Connected</h3>
          <button onClick={handleDisconnect} className="disconnect-btn">
            🔌 Disconnect
          </button>
        </div>

        <div className="account-info">
          <div className="account-row">
            <span className="label">Wallet:</span>
            <span className="wallet-name">
              {wallet?.name || 'Unknown'} 
              {wallet?.icon && (
                <img 
                  src={wallet.icon} 
                  alt={wallet.name} 
                  className="wallet-icon"
                />
              )}
            </span>
          </div>

          <div className="account-row">
            <span className="label">Address:</span>
            <span className="address" title={account?.address}>
              {formatSuiAddress(account?.address || '')}
            </span>
            <button 
              onClick={copyAddress}
              className="copy-btn"
              title="Copy address"
            >
              📋
            </button>
          </div>

          <div className="account-row">
            <span className="label">Network:</span>
            <span className="network supported">
              {chain?.name || 'Sui Devnet'}
            </span>
          </div>

          {balance !== undefined && balance !== null && (
            <div className="account-row">
              <span className="label">Balance:</span>
              <span className="balance">
                {mistToSui(balance.toString())} SUI
              </span>
            </div>
          )}
        </div>

        {/* Account Objects */}
        <div className="account-objects">
          <div className="objects-header">
            <h4>🪙 Account Assets</h4>
            <button 
              onClick={getAccountObjects}
              disabled={loadingObjects}
              className="refresh-btn"
            >
              {loadingObjects ? '🔄' : '🔄 Refresh'}
            </button>
          </div>

          {loadingObjects ? (
            <div className="loading">Loading assets...</div>
          ) : accountObjects.length > 0 ? (
            <div className="objects-list">
              {accountObjects.slice(0, 5).map((obj, index) => (
                <div key={index} className="object-item">
                  <div className="object-type">
                    {obj.data?.type?.split('::').pop() || 'Unknown'}
                  </div>
                  <div className="object-id">
                    {formatSuiAddress(obj.data?.objectId || '')}
                  </div>
                </div>
              ))}
              {accountObjects.length > 5 && (
                <div className="more-objects">
                  +{accountObjects.length - 5} more objects
                </div>
              )}
            </div>
          ) : (
            <div className="no-objects">No objects found</div>
          )}
        </div>

        {/* Network Info */}
        <div className="network-info">
          <h4>🌐 Network Details</h4>
          <div className="network-details">
            <div>Chain: {chain?.name || 'Sui Devnet'}</div>
            <div>RPC: {chain?.rpcUrl || 'https://fullnode.devnet.sui.io'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component with provider
const SuiWalletConnect: React.FC<{ onWalletChange?: (walletInfo: any) => void }> = ({ onWalletChange }) => {
  return (
    <WalletProvider>
      <SuiWalletContent onWalletChange={onWalletChange} />
    </WalletProvider>
  );
};

export default SuiWalletConnect;