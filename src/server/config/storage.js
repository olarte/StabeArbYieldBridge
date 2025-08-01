// In-memory storage for completed swaps
class SwapStorage {
  constructor() {
    this.completedSwaps = [];
    
    // Initialize with demo data to ensure Previous Swaps table has data
    this.completedSwaps.push({
      id: `demo_swap_${Date.now()}`,
      assetPairFrom: 'DAI',
      assetPairTo: 'USDY',
      sourceChain: 'ethereum',
      targetChain: 'sui',
      amount: 92.15,
      profit: 0.4669455567244451,
      status: 'completed',
      timestamp: new Date().toISOString(),
      swapDirection: 'ethereum → sui',
      ethereumTxHash: '0x58028ff52d90394c00b9562cca6ab2e84a60e4acd149f14d15870c0260e13b1c',
      suiTxHash: 'BfPgmrKC4tAufGbq83rN3DzvSRHH4ggkK7jwEo5gkBKt',
      explorerUrls: {
        ethereum: 'https://sepolia.etherscan.io/tx/0x58028ff52d90394c00b9562cca6ab2e84a60e4acd149f14d15870c0260e13b1c',
        sui: 'https://suiexplorer.com/txblock/BfPgmrKC4tAufGbq83rN3DzvSRHH4ggkK7jwEo5gkBKt?network=testnet'
      }
    });
  }

  async storeCompletedSwap(swapData) {
    console.log('💾 Storing completed swap:', swapData.id);
    this.completedSwaps.push(swapData);
    return swapData;
  }

  async getCompletedSwaps(ethereumAddress, suiAddress) {
    // Return all swaps if addresses are provided (for demo purposes)
    if (ethereumAddress || suiAddress) {
      return this.completedSwaps;
    }
    return [];
  }

  // Placeholder methods for compatibility
  async createArbitrageOpportunity(data) {
    return { id: `arb_${Date.now()}`, ...data };
  }

  async getActiveArbitrageOpportunities() {
    return [];
  }

  async getActiveTradingAgents() {
    return [];
  }

  async getTransactions(limit) {
    return this.completedSwaps.slice(-limit);
  }
}

export const storage = new SwapStorage();