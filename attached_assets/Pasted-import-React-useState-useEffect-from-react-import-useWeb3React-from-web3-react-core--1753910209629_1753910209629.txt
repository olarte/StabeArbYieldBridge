import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { injectedConnector, switchNetwork, CHAIN_CONFIG } from '../utils/web3';
import './WalletConnect.css';

const WalletConnect = () => {
  const { activate, deactivate, account, chainId, active, error } = useWeb3React();
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(null);

  // Connect to MetaMask
  const connectWallet = async () => {
    setConnecting(true);
    try {
      await activate(injectedConnector);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    deactivate();
    setBalance(null);
  };

  // Switch to specific network
  const handleNetworkSwitch = async (targetChainId) => {
    const success = await switchNetwork(targetChainId);
    if (!success) {
      alert(`Failed to switch to ${CHAIN_CONFIG[targetChainId]?.chainName}`);
    }
  };

  // Get wallet balance
  const getBalance = async () => {
    if (account && window.ethereum) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [account, 'latest'],
        });
        const balanceInEth = parseFloat(parseInt(balance, 16) / 1e18).toFixed(4);
        setBalance(balanceInEth);
      } catch (error) {
        console.error('Failed to get balance:', error);
      }
    }
  };

  // Get current network name
  const getCurrentNetwork = () => {
    if (!chainId) return 'Unknown';
    return CHAIN_CONFIG[chainId]?.chainName || `Chain ID: ${chainId}`;
  };

  // Check if current network is supported
  const isNetworkSupported = () => {
    return chainId && (chainId === 44787 || chainId === 11155111);
  };

  // Format address for display
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    if (account) {
      getBalance();
    }
  }, [account, chainId]);

  // Auto-connect on page load if previously connected
  useEffect(() => {
    const connectOnLoad = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        try {
          await activate(injectedConnector);
        } catch (error) {
          console.log('Auto-connect failed:', error);
        }
      }
    };
    connectOnLoad();
  }, [activate]);

  if (error) {
    return (
      <div className="wallet-error">
        <h3>❌ Connection Error</h3>
        <p>{error.message}</p>
        <button onClick={connectWallet} className="retry-btn">
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="wallet-connect">
        <div className="connect-card">
          <h3>🦊 Connect Your Wallet</h3>
          <p>Connect MetaMask to start trading on Celo & Ethereum</p>
          <button 
            onClick={connectWallet} 
            disabled={connecting}
            className="connect-btn"
          >
            {connecting ? '🔄 Connecting...' : '🦊 Connect MetaMask'}
          </button>
          <div className="supported-networks">
            <small>Supported Networks:</small>
            <div className="network-list">
              <span className="network-badge celo">🟡 Celo Alfajores</span>
              <span className="network-badge ethereum">🔵 Ethereum Sepolia</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connected">
      <div className="wallet-info">
        <div className="wallet-header">
          <h3>✅ Wallet Connected</h3>
          <button onClick={disconnectWallet} className="disconnect-btn">
            🔌 Disconnect
          </button>
        </div>
        
        <div className="account-info">
          <div className="account-row">
            <span className="label">Address:</span>
            <span className="address" title={account}>
              {formatAddress(account)}
            </span>
            <button 
              onClick={() => navigator.clipboard.writeText(account)}
              className="copy-btn"
              title="Copy address"
            >
              📋
            </button>
          </div>
          
          <div className="account-row">
            <span className="label">Network:</span>
            <span className={`network ${isNetworkSupported() ? 'supported' : 'unsupported'}`}>
              {getCurrentNetwork()}
              {!isNetworkSupported() && ' ⚠️'}
            </span>
          </div>
          
          {balance && (
            <div className="account-row">
              <span className="label">Balance:</span>
              <span className="balance">
                {balance} {chainId === 44787 ? 'CELO' : 'ETH'}
              </span>
            </div>
          )}
        </div>

        {/* Network Switch Buttons */}
        <div className="network-switcher">
          <h4>🌐 Switch Network</h4>
          <div className="network-buttons">
            <button
              onClick={() => handleNetworkSwitch(44787)}
              disabled={chainId === 44787}
              className={`network-btn celo ${chainId === 44787 ? 'active' : ''}`}
            >
              🟡 Celo Alfajores
            </button>
            <button
              onClick={() => handleNetworkSwitch(11155111)}
              disabled={chainId === 11155111}
              className={`network-btn ethereum ${chainId === 11155111 ? 'active' : ''}`}
            >
              🔵 Ethereum Sepolia
            </button>
          </div>
        </div>

        {!isNetworkSupported() && (
          <div className="network-warning">
            ⚠️ Please switch to a supported network to use the bridge
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnect;