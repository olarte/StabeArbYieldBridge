import React, { useState, useEffect } from 'react';
import './WalletConnect.css';

const CHAIN_CONFIG = {
  11155111: { chainName: 'Ethereum Sepolia', currency: 'ETH' },
  44787: { chainName: 'Celo Alfajores', currency: 'CELO' } // Legacy support
};

const WalletConnect = ({ onWalletChange }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(null);

  // Connect specifically to MetaMask for Ethereum Sepolia
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed!');
      return;
    }

    // Force MetaMask selection
    let provider = window.ethereum;
    
    // If multiple providers exist, prioritize MetaMask
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      const metamask = window.ethereum.providers.find(p => p.isMetaMask && !p.isPhantom);
      if (metamask) {
        provider = metamask;
        console.log('Using MetaMask provider specifically for Ethereum Sepolia');
      }
    } else if (window.ethereum.isPhantom) {
      // If only Phantom is available, warn user
      alert('Phantom detected, but MetaMask is recommended for Ethereum network. Please install MetaMask for the best experience.');
      return;
    }

    setConnecting(true);
    try {
      // Force user to select MetaMask if multiple wallets exist
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });
      const chainId = await provider.request({
        method: 'eth_chainId',
      });
      
      setAccount(accounts[0]);
      setChainId(parseInt(chainId, 16));
      
      // Notify parent component of wallet change
      if (onWalletChange) {
        onWalletChange({
          account: accounts[0],
          chainId: parseInt(chainId, 16),
          balance: null
        });
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
    setBalance(null);
    
    // Notify parent component of wallet disconnect
    if (onWalletChange) {
      onWalletChange({
        account: null,
        chainId: null,
        balance: null
      });
    }
  };

  // Switch to Ethereum Sepolia only
  const handleNetworkSwitch = async (targetChainId) => {
    // Only allow Ethereum Sepolia (11155111)
    if (targetChainId !== 11155111) {
      alert('Only Ethereum Sepolia testnet is supported. Please switch to Ethereum Sepolia.');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
      });
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added to wallet, add Ethereum Sepolia
        try {
          const sepoliaConfig = {
            chainId: '0xaa36a7',
            chainName: 'Ethereum Sepolia',
            nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/']
          };
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [sepoliaConfig],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
      console.error('Failed to switch network:', error);
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

  // Check if current network is supported (Ethereum Sepolia only)
  const isNetworkSupported = () => {
    return chainId === 11155111; // Only Ethereum Sepolia
  };

  // Format address for display
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          disconnectWallet();
        }
      };

      const handleChainChanged = (chainId) => {
        setChainId(parseInt(chainId, 16));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

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
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({
              method: 'eth_chainId',
            });
            setAccount(accounts[0]);
            setChainId(parseInt(chainId, 16));
          }
        } catch (error) {
          console.log('Auto-connect failed:', error);
        }
      }
    };
    connectOnLoad();
  }, []);

  if (!account) {
    return (
      <div className="wallet-connect">
        <div className="connect-card">
          <h3>🦊 Connect Your Wallet</h3>
          <p>Connect MetaMask to start trading on Ethereum & Sui networks</p>
          <button 
            onClick={connectWallet} 
            disabled={connecting}
            className="connect-btn"
          >
            {connecting ? '🔄 Connecting...' : '🦊 Connect MetaMask'}
          </button>
          <div className="supported-networks">
            <small>Supported Network:</small>
            <div className="network-list">
              <span className="network-badge ethereum">🔵 Ethereum Sepolia Testnet</span>
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
                {balance} ETH
              </span>
            </div>
          )}
        </div>

        {/* Network Switch Button - Ethereum Sepolia Only */}
        {!isNetworkSupported() && (
          <div className="network-switcher">
            <h4>🌐 Switch Network</h4>
            <div className="network-buttons">
              <button
                onClick={() => handleNetworkSwitch(11155111)}
                className="network-btn ethereum"
              >
                🔵 Switch to Ethereum Sepolia
              </button>
            </div>
          </div>
        )}

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