import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';

// Supported chain IDs
export const SUPPORTED_CHAIN_IDS = [
  44787,    // Celo Alfajores
  11155111, // Ethereum Sepolia
  1,        // Ethereum Mainnet (optional)
];

// Chain configurations
export const CHAIN_CONFIG = {
  44787: {
    chainName: 'Celo Alfajores Testnet',
    nativeCurrency: {
      name: 'CELO',
      symbol: 'CELO',
      decimals: 18,
    },
    rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
    blockExplorerUrls: ['https://explorer.celo.org/alfajores'],
  },
  11155111: {
    chainName: 'Ethereum Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.infura.io/v3/YOUR_INFURA_KEY'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  },
};

// Injected connector (MetaMask)
export const injectedConnector = new InjectedConnector({
  supportedChainIds: SUPPORTED_CHAIN_IDS,
});

// WalletConnect connector (backup)
export const walletConnectConnector = new WalletConnectConnector({
  rpc: {
    44787: 'https://alfajores-forno.celo-testnet.org',
    11155111: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  },
  chainId: 44787,
  bridge: 'https://bridge.walletconnect.org',
  qrcode: true,
});

// Add network to MetaMask
export const addNetwork = async (chainId) => {
  const config = CHAIN_CONFIG[chainId];
  if (!config) return false;

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${chainId.toString(16)}`,
        chainName: config.chainName,
        nativeCurrency: config.nativeCurrency,
        rpcUrls: config.rpcUrls,
        blockExplorerUrls: config.blockExplorerUrls,
      }],
    });
    return true;
  } catch (error) {
    console.error('Failed to add network:', error);
    return false;
  }
};

// Switch network
export const switchNetwork = async (chainId) => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (error) {
    // Network not added, try to add it
    if (error.code === 4902) {
      return await addNetwork(chainId);
    }
    console.error('Failed to switch network:', error);
    return false;
  }
};