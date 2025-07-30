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
  console.log('Window.sui available:', !!window.sui);
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
const SuiWalletContent: React.FC = () => {
  const {
    connected,
    account,
    disconnect,
    connecting,
    select,
    chain,
  } = useWallet();
  
  const wallet = (useWallet() as any).wallet;

  const { balance } = useAccountBalance();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [accountObjects, setAccountObjects] = useState<any[]>([]);
  const [loadingObjects, setLoadingObjects] = useState<boolean>(false);
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);

  // Check for installed wallets on component mount
  useEffect(() => {
    console.log('SuiWallet: Checking for installed wallets...');
    
    // Check for common Sui wallet objects in window
    const checkWalletExtensions = () => {
      const detectedWallets = [];
      
      if (typeof window !== 'undefined') {
        console.log('SuiWallet: Comprehensive wallet scan starting...');
        
        // Check for standard Sui wallets
        const walletChecks = [
          { key: 'sui', name: 'Sui Wallet (Official)' },
          { key: 'suiet', name: 'Suiet Wallet' },
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
    const initialWallets = checkWalletExtensions();
    console.log('SuiWallet: Initial scan detected wallets:', initialWallets);
    setAvailableWallets(initialWallets);
    
    // Delayed check for wallets that inject after page load
    const delayedCheck = setTimeout(() => {
      console.log('SuiWallet: Running delayed wallet detection...');
      const delayedWallets = checkWalletExtensions();
      console.log('SuiWallet: Delayed scan detected wallets:', delayedWallets);
      
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
    
    return () => clearTimeout(delayedCheck);
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

  if (!connected) {
    return (
      <div className="sui-wallet-connect">
        <div className="connect-card">
          <h3>🟦 Connect Sui Wallet</h3>
          <p>Connect your Sui wallet to trade on Sui Devnet</p>
          
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
                ⚠️ No Sui wallet extensions detected. Please install:
                <br />• <a href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil" target="_blank" style={{ color: '#64B5F6' }}>Sui Wallet</a>
                <br />• <a href="https://chrome.google.com/webstore/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd" target="_blank" style={{ color: '#64B5F6' }}>Suiet Wallet</a>
                <br />• <a href="https://chrome.google.com/webstore/detail/martian-aptos-wallet/efbglgofoippbgcjepnhiblaibcnclgk" target="_blank" style={{ color: '#64B5F6' }}>Martian Wallet</a>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => {
              console.log('SuiWallet: Button clicked, opening modal');
              console.log('SuiWallet: Available wallets:', availableWallets);
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
            <small>Connected to: Sui Devnet</small>
            <div className="network-list">
              <span className="network-badge sui">🟦 Sui Devnet</span>
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
const SuiWalletConnect: React.FC = () => {
  return (
    <WalletProvider>
      <SuiWalletContent />
    </WalletProvider>
  );
};

export default SuiWalletConnect;