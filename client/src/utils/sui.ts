import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';

// Sui network configurations
export const SUI_NETWORKS = {
  devnet: {
    name: 'Sui Devnet',
    url: getFullnodeUrl('devnet'),
    chainId: 'sui:devnet',
  },
  testnet: {
    name: 'Sui Testnet', 
    url: getFullnodeUrl('testnet'),
    chainId: 'sui:testnet',
  },
  mainnet: {
    name: 'Sui Mainnet',
    url: getFullnodeUrl('mainnet'),
    chainId: 'sui:mainnet',
  },
};

// Create Sui client for testnet
export const suiClient = new SuiClient({
  url: SUI_NETWORKS.testnet.url,
});

// Format Sui address for display
export const formatSuiAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Convert MIST to SUI
export const mistToSui = (mist: string | number): string => {
  const mistBigInt = typeof mist === 'string' ? BigInt(mist) : BigInt(mist);
  return (Number(mistBigInt) / 1_000_000_000).toFixed(4);
};