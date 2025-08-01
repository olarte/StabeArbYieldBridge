export const CHAIN_CONFIG = {
  ethereum: {
    chainId: 11155111, // Sepolia
    name: 'Ethereum Sepolia',
    rpc: process.env.ALCHEMY_KEY 
      ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
      : 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    tokens: {
      USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
      USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
      WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574'
    },
    uniswapV3: {
      factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
      router: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
      quoter: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
    }
  },
  sui: {
    chainId: 'sui:testnet',
    name: 'Sui Testnet',
    rpc: 'https://fullnode.testnet.sui.io',
    blockExplorer: 'https://suiexplorer.com',
    tokens: {
      USDC: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      USDY: '0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY'
    },
    cetus: {
      package: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
      global_config: '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f'
    }
  }
};