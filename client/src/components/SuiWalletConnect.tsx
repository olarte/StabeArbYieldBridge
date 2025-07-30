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
          
          <button 
            onClick={() => {
              console.log('SuiWallet: Button clicked, opening modal');
              setShowModal(true);
            }}
            disabled={connecting}
            className="connect-btn sui"
          >
            {connecting ? '🔄 Connecting...' : '🟦 Connect Sui Wallet'}
          </button>
          
          {/* Alternative: Use built-in ConnectButton */}
          <div style={{ marginTop: '10px' }}>
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