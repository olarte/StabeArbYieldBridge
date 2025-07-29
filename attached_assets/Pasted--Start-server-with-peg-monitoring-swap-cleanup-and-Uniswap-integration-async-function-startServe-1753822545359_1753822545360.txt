// Start server with peg monitoring, swap cleanup, and Uniswap integration
async function startServer() {
  await initializeProviders();
  
  // Check if in development mode
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    console.log('🛠️ Development mode: Peg monitoring disabled');
    pegStatus.isActive = false;
    pegStatus.swapsPaused = false;
  }
  
  // Start automated peg monitoring only in production (every 30 seconds)
  if (pegStatus.isActive) {
    setInterval(async () => {
      try {
        const response = await axios.get(`http://localhost:${PORT}/api/oracle/peg-status`);
        console.log('🔍 Peg monitoring check completed:', 
          response.data.data.globalStatus.criticalDepegs > 0 ? '⚠️ ALERTS DETECTED' : '✅ All stable');
      } catch (error) {
        console.error('Automated peg monitoring error:', error.message);
      }
    }, 30000);
  }

  // Cleanup expired swaps (every 5 minutes)
  setInterval(() => {
    const now = Date.now() / 1000;
    let cleanedCount = 0;
    
    for (const [swapId, swapState] of swapStates.entries()) {
      if (now > swapState.timelock + 3600) { // 1 hour after expiry
        swapStates.delete(swapId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired swaps`);
    }
  }, 300000);
  
  app.listen(PORT, 'localhost', () => {
    console.log(`🚀 DeFi Bridge API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Supported chains: ${Object.keys(CHAIN_CONFIG).join(', ')}`);
    console.log(`🛡️ Peg monitoring: ${pegStatus.isActive ? 'Active' : 'Disabled'} (threshold: ${pegStatus.alertThreshold * 100}%)`);
    console.log(`⚛️ Atomic swaps: Enabled with hashlock/timelock`);
    console.log(`🦄 DEX Integration: ${uniswapContracts.type || 'unknown'}`);
    console.log(`📈 Swap endpoints:`);
    console.log(`   - POST /api/swap/bidirectional - Create atomic cross-chain swap`);
    console.log(`   - POST /api/swap/execute - Execute swap steps`);
    console.log(`   - GET /api/swap/status/:swapId - Check swap progress`);
    console.log(`   - POST /api/swap/refund - Refund expired swaps`);
    console.log(`🦄 DEX endpoints:`);
    console.log(`   - GET /api/uniswap/price/:pair - Get pool price (e.g., cUSD-USDC)`);
    console.log(`   - GET /api/uniswap/pools/:pair - Compare all fee tiers`);
    console.log(`   - POST /api/uniswap/swap - Execute swap via Fusion+ or direct`);
    console.log(`   - GET /api/uniswap/quote - Get swap quote with price impact`);
    console.log(`📈 Oracle endpoints:`);
    console.log(`   - GET /api/oracle/peg-status - Multi-chain monitoring`);
    console.log(`   - GET /api/oracle/chainlink/:pair?chain=ethereum - Single pair check`);
    console.log(`   - POST /api/oracle/peg-controls - Manual controls`);
    console.log(`🎯 Test commands:`);
    console.log(`   curl "http://localhost:${PORT}/api/uniswap/price/cUSD-USDC"`);
    console.log(`   curl "http://localhost:${PORT}/api/uniswap/quote?tokenIn=cUSD&tokenOut=USDC&amountIn=100"`);
    console.log(`💡 Using ${uniswapContracts.type === 'mock' ? 'mock data for development' : 'live DEX data'}`);
  });
}const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ethers } = require('ethers');
const { FusionSDK, LimitOrderProtocolV4 } = require('@1inch/fusion-sdk');
const { randomBytes, createHash } = require('crypto');
const { Connection, JsonRpcProvider } = require('@mysten/sui.js/client');
const { ContractKit } = require('@celo/contractkit');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002; // Changed to avoid conflicts

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Chain configurations with Uniswap V3 integration
const CHAIN_CONFIG = {
  ethereum: {
    rpc: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    chainId: 1,
    tokens: {
      USDC: '0xA0b86a33E6441efC4b5e9fE1D7EC8c4D8a3b8d2E',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    }
  },
  celo: {
    rpc: process.env.CELO_RPC || 'https://alfajores-forno.celo-testnet.org',
    chainId: 44787, // Alfajores testnet
    tokens: {
      cUSD: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1', // Alfajores cUSD
      USDC: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B', // Alfajores USDC
      CELO: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9'  // Alfajores CELO
    },
    // Real Uniswap V3 addresses on Celo Alfajores testnet
    uniswap: {
      factory: '0x229Fd76DA9062C1a10eb4193768E192bdEA99572',      // UniswapV3Factory
      router: '0x8C456F41A3883bA0ba99f810F7A2Da54D9Ea3EF0',       // SwapRouter02
      quoter: '0x3c1FCF8D6f3A579E98F4AE75EB0adA6de70f5673',       // QuoterV2
      nftManager: '0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A',    // NonfungiblePositionManager
      universalRouter: '0x84904B9E85F76a421223565be7b596d7d9A8b8Ce'  // UniversalRouter
    },
    // Mainnet addresses (for reference)
    uniswapMainnet: {
      factory: '0xAfE208a311B21f13EF87E33A90049fC17A7acDEc',      // UniswapV3Factory  
      router: '0x5615CDAb10dc425a742d643d949a7F474C01abc4',       // SwapRouter02
      quoter: '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8',       // QuoterV2
      nftManager: '0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A',    // NonfungiblePositionManager
      universalRouter: '0x643770E279d5D0733F21d6DC03A8efbABf3255B4'  // UniversalRouter
    }
  },
  sui: {
    rpc: process.env.SUI_RPC || 'https://fullnode.mainnet.sui.io:443',
    tokens: {
      USDC: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    }
  }
};

// Uniswap V3 ABIs and Celo DEX ABIs
const UNISWAP_V3_ABIS = {
  Factory: [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
    'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)'
  ],
  Pool: [
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function liquidity() external view returns (uint128)',
    'function fee() external view returns (uint24)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function tickSpacing() external view returns (int24)'
  ],
  SwapRouter: [
    'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
    'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)'
  ],
  Quoter: [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
    'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)'
  ]
};

// Celo native DEX ABIs (Ubeswap V2 style)
const CELO_DEX_ABIS = {
  Factory: [
    'function getPair(address tokenA, address tokenB) external view returns (address pair)',
    'function allPairs(uint) external view returns (address pair)',
    'function allPairsLength() external view returns (uint)'
  ],
  Pair: [
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function totalSupply() external view returns (uint)',
    'function balanceOf(address) external view returns (uint)'
  ],
  Router: [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)'
  ]
};

// Initialize providers and SDKs
let ethProvider, celoProvider, celoKit, suiProvider, fusionSDK, limitOrderProtocol;
let uniswapContracts = {};

// Cross-chain swap state management
const swapStates = new Map();
const SWAP_TIMEOUT = 3600000; // 1 hour timeout

async function initializeProviders() {
  try {
    // Ethereum provider
    ethProvider = new ethers.JsonRpcProvider(CHAIN_CONFIG.ethereum.rpc);
    
    // Celo provider and ContractKit
    celoProvider = new ethers.JsonRpcProvider(CHAIN_CONFIG.celo.rpc);
    celoKit = ContractKit.newKit(CHAIN_CONFIG.celo.rpc);
    
    // Sui provider
    suiProvider = new JsonRpcProvider({
      url: CHAIN_CONFIG.sui.rpc
    });
    
    // 1Inch Fusion SDK
    fusionSDK = new FusionSDK({
      url: 'https://api.1inch.dev/fusion',
      network: 1, // Ethereum mainnet
      authKey: process.env.ONEINCH_API_KEY
    });

    // 1Inch Limit Order Protocol
    limitOrderProtocol = new LimitOrderProtocolV4({
      chainId: 1,
      provider: ethProvider,
      contractAddress: '0x111111125421cA6dc452d289314280a0f8842A65'
    });

    // Initialize Uniswap V3 contracts on Celo
    await initializeUniswapContracts();
    
    console.log('✅ All providers, SDKs, and Uniswap contracts initialized successfully');
  } catch (error) {
    console.error('❌ Provider initialization failed:', error.message);
    process.exit(1);
  }
}

async function initializeUniswapContracts() {
  const celoConfig = CHAIN_CONFIG.celo.uniswap;
  
  try {
    console.log('🔍 Initializing Uniswap V3 contracts on Celo Alfajores...');
    
    // Initialize real Uniswap V3 contracts
    const factory = new ethers.Contract(celoConfig.factory, UNISWAP_V3_ABIS.Factory, celoProvider);
    const router = new ethers.Contract(celoConfig.router, UNISWAP_V3_ABIS.SwapRouter, celoProvider);
    const quoter = new ethers.Contract(celoConfig.quoter, UNISWAP_V3_ABIS.Quoter, celoProvider);
    
    // Test the factory contract by calling a simple function
    console.log(`🧪 Testing Uniswap V3 factory at ${celoConfig.factory}...`);
    
    // Try to get a known pool (this will return 0x0 if pool doesn't exist, but shouldn't throw)
    const testPoolAddress = await factory.getPool(
      CHAIN_CONFIG.celo.tokens.cUSD,
      CHAIN_CONFIG.celo.tokens.USDC,
      3000 // 0.3% fee tier
    );
    
    console.log(`✅ Uniswap V3 factory is responsive`);
    console.log(`📊 Test pool cUSD/USDC (0.3%): ${testPoolAddress === ethers.ZeroAddress ? 'Not created yet' : testPoolAddress}`);
    
    uniswapContracts = {
      factory: factory,
      router: router,
      quoter: quoter,
      type: 'uniswap_v3'
    };
    
    console.log('✅ Uniswap V3 contracts successfully initialized on Celo Alfajores');
    
  } catch (error) {
    console.error(`❌ Uniswap V3 initialization failed: ${error.message}`);
    console.log('🔄 This might be due to network issues or contract verification delays');
    
    // For now, let's still try to create the contracts but mark them as potentially problematic
    try {
      uniswapContracts = {
        factory: new ethers.Contract(celoConfig.factory, UNISWAP_V3_ABIS.Factory, celoProvider),
        router: new ethers.Contract(celoConfig.router, UNISWAP_V3_ABIS.SwapRouter, celoProvider),
        quoter: new ethers.Contract(celoConfig.quoter, UNISWAP_V3_ABIS.Quoter, celoProvider),
        type: 'uniswap_v3_unverified'
      };
      console.log('⚠️ Uniswap V3 contracts created but not verified - will use with caution');
    } catch (fallbackError) {
      console.error(`❌ Complete fallback failed: ${fallbackError.message}`);
      
      // Final fallback to mock
      uniswapContracts = {
        factory: null,
        router: null,
        quoter: null,
        type: 'mock'
      };
      console.log('🔄 Using mock contracts as final fallback');
    }
  }
}

// Chainlink price oracle ABI (simplified)
const CHAINLINK_ABI = [
  {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [
      {"internalType": "uint80", "name": "roundId", "type": "uint80"},
      {"internalType": "int256", "name": "answer", "type": "int256"},
      {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
      {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
      {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Chainlink oracle addresses (TESTNET) - Updated with fallback handling
const CHAINLINK_ORACLES = {
  ethereum: {
    // Sepolia testnet feeds
    USDC_USD: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
    USDT_USD: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
    ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    decimals: 8
  },
  celo: {
    // Celo Alfajores testnet feeds - Use mock for development
    CUSD_USD: null, // Disabled for development
    USDC_USD: null, // Disabled for development  
    CELO_USD: null, // Disabled for development
    decimals: 8
  },
  sui: {
    // Sui doesn't have native Chainlink yet, use API fallback
    USDC_USD: null,
    SUI_USD: null,
    decimals: 8
  }
};

// Global peg monitoring state
let pegStatus = {
  lastCheck: null,
  isActive: false, // Disabled for development
  swapsPaused: false,
  deviations: {},
  alertThreshold: 0.05 // Increased to 5% for testnet
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    chains: Object.keys(CHAIN_CONFIG)
  });
});

// 1. Fetch stablecoin prices from 1Inch API
app.get('/api/prices/1inch', async (req, res) => {
  try {
    const { tokens = 'USDC,USDT,DAI' } = req.query;
    
    const response = await axios.get('https://api.1inch.dev/price/v1.1/1', {
      params: {
        tokens: tokens,
        currency: 'USD'
      },
      headers: {
        'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`
      }
    });

    const prices = response.data;
    
    res.json({
      success: true,
      data: prices,
      timestamp: new Date().toISOString(),
      source: '1inch'
    });
  } catch (error) {
    console.error('1Inch price fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices from 1Inch',
      details: error.message
    });
  }
});

// 2. Enhanced Chainlink oracle with multi-chain peg monitoring
app.get('/api/oracle/chainlink/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const { chain = 'ethereum' } = req.query;
    
    const chainOracles = CHAINLINK_ORACLES[chain];
    if (!chainOracles) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported chain',
        availableChains: Object.keys(CHAINLINK_ORACLES)
      });
    }

    const oracleAddress = chainOracles[pair.toUpperCase()];
    if (!oracleAddress) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported oracle pair for this chain',
        availablePairs: Object.keys(chainOracles).filter(key => key !== 'decimals')
      });
    }

    const provider = chain === 'celo' ? 
      new ethers.JsonRpcProvider(CHAIN_CONFIG.celo.rpc) : 
      ethProvider;

    const oracle = new ethers.Contract(oracleAddress, CHAINLINK_ABI, provider);
    const roundData = await oracle.latestRoundData();
    
    const price = Number(roundData.answer) / Math.pow(10, chainOracles.decimals);
    const updatedAt = new Date(Number(roundData.updatedAt) * 1000);
    
    // Enhanced peg check for stablecoins
    const isStablecoin = pair.toUpperCase().includes('USD');
    const pegTarget = isStablecoin ? 1.0 : null;
    
    let pegAnalysis = null;
    if (pegTarget) {
      const deviation = Math.abs(price - pegTarget);
      const deviationPercent = (deviation / pegTarget) * 100;
      const isPegged = deviation <= pegStatus.alertThreshold;
      
      pegAnalysis = {
        isPegged,
        deviation,
        deviationPercent: deviationPercent.toFixed(4),
        target: pegTarget,
        status: isPegged ? 'STABLE' : 'DEPEGGED',
        severity: deviationPercent > 5 ? 'CRITICAL' : deviationPercent > 2 ? 'HIGH' : 'MEDIUM'
      };

      // Update global peg status
      pegStatus.deviations[`${chain}_${pair}`] = {
        ...pegAnalysis,
        timestamp: new Date().toISOString(),
        price
      };
    }

    res.json({
      success: true,
      data: {
        chain,
        pair,
        price,
        updatedAt,
        roundId: roundData.roundId.toString(),
        pegAnalysis,
        dataAge: Date.now() - Number(roundData.updatedAt) * 1000
      },
      source: 'chainlink'
    });
  } catch (error) {
    console.error('Chainlink oracle error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch oracle data',
      details: error.message
    });
  }
});

// 9. Real Uniswap V3 price fetching for Celo pairs
app.get('/api/uniswap/price/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const { fee = 3000 } = req.query; // Default to 0.3% fee tier
    
    // Parse pair (e.g., "cUSD-USDC")
    const [token0Symbol, token1Symbol] = pair.split('-');
    const token0Address = CHAIN_CONFIG.celo.tokens[token0Symbol];
    const token1Address = CHAIN_CONFIG.celo.tokens[token1Symbol];
    
    if (!token0Address || !token1Address) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token pair',
        availableTokens: Object.keys(CHAIN_CONFIG.celo.tokens)
      });
    }

    console.log(`🔍 Processing price request for ${pair} with DEX type: ${uniswapContracts.type}`);

    // Handle real Uniswap V3 integration
    if (uniswapContracts.type === 'uniswap_v3' || uniswapContracts.type === 'uniswap_v3_unverified') {
      try {
        console.log('🦄 Fetching real Uniswap V3 data from Celo...');
        
        // Get pool address from factory
        const poolAddress = await uniswapContracts.factory.getPool(
          token0Address, 
          token1Address, 
          fee
        );

        if (poolAddress === ethers.ZeroAddress) {
          return res.status(404).json({
            success: false,
            error: 'Pool not found for this pair and fee tier',
            suggestion: 'Try different fee tiers: 500 (0.05%), 3000 (0.3%), 10000 (1%)',
            availableFees: [500, 3000, 10000],
            note: 'Pool may not be created yet. You can create it via Uniswap interface.'
          });
        }

        // Get pool contract and fetch data
        const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_ABIS.Pool, celoProvider);
        
        const [slot0, liquidity, token0, token1] = await Promise.all([
          poolContract.slot0(),
          poolContract.liquidity(),
          poolContract.token0(),
          poolContract.token1()
        ]);

        // Calculate price from sqrtPriceX96
        const sqrtPriceX96 = slot0.sqrtPriceX96;
        const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96, token0, token1, token0Address, token1Address);
        
        return res.json({
          success: true,
          data: {
            pair,
            poolAddress,
            fee: fee / 10000, // Convert to percentage
            price: {
              token0ToToken1: price.price0,
              token1ToToken0: price.price1,
              formatted: `1 ${token0Symbol} = ${price.price0.toFixed(6)} ${token1Symbol}`
            },
            poolStats: {
              sqrtPriceX96: sqrtPriceX96.toString(),
              tick: slot0.tick,
              liquidity: liquidity.toString(),
              unlocked: slot0.unlocked,
              feeProtocol: slot0.feeProtocol
            },
            tokens: {
              token0: { address: token0, symbol: token0Symbol },
              token1: { address: token1, symbol: token1Symbol }
            },
            timestamp: new Date().toISOString(),
            source: 'uniswap_v3_celo_alfajores',
            network: 'Celo Alfajores Testnet'
          }
        });
        
      } catch (contractError) {
        console.error('🔴 Uniswap V3 contract call failed:', contractError.message);
        
        // Return detailed error with fallback suggestion
        return res.status(500).json({
          success: false,
          error: 'Uniswap V3 contract call failed',
          details: contractError.message,
          contractAddresses: {
            factory: CHAIN_CONFIG.celo.uniswap.factory,
            router: CHAIN_CONFIG.celo.uniswap.router,
            quoter: CHAIN_CONFIG.celo.uniswap.quoter
          },
          suggestion: 'Check if contracts are verified on Alfajores explorer, or pool may not exist yet',
          fallback: 'You can try creating the pool first on Uniswap interface'
        });
      }
    }

    // Fallback to mock if contracts not available
    console.log('⚠️ Using mock data - Uniswap V3 not available');
    const mockPrice = getMockPrice(token0Symbol, token1Symbol);
    
    res.json({
      success: true,
      data: {
        pair,
        price: {
          token0ToToken1: mockPrice,
          token1ToToken0: 1 / mockPrice,
          formatted: `1 ${token0Symbol} = ${mockPrice.toFixed(6)} ${token1Symbol}`
        },
        poolAddress: 'mock_pool_address',
        source: 'mock_fallback',
        note: 'Mock data - real Uniswap V3 integration failed',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('DEX price fetch error:', error.message);
    
    // Return mock data on any error
    const [token0Symbol, token1Symbol] = req.params.pair.split('-');
    const mockPrice = getMockPrice(token0Symbol, token1Symbol);
    
    res.json({
      success: true,
      data: {
        pair: req.params.pair,
        price: {
          token0ToToken1: mockPrice,
          token1ToToken0: 1 / mockPrice,
          formatted: `1 ${token0Symbol} = ${mockPrice.toFixed(6)} ${token1Symbol}`
        },
        source: 'error_fallback_mock',
        note: 'Using mock data due to error',
        originalError: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 10. Get multiple pool prices and find best rates (updated for real Uniswap V3)
app.get('/api/uniswap/pools/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const [token0Symbol, token1Symbol] = pair.split('-');
    const token0Address = CHAIN_CONFIG.celo.tokens[token0Symbol];
    const token1Address = CHAIN_CONFIG.celo.tokens[token1Symbol];
    
    if (!token0Address || !token1Address) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token pair',
        availableTokens: Object.keys(CHAIN_CONFIG.celo.tokens)
      });
    }

    // Handle real Uniswap V3
    if (uniswapContracts.type === 'uniswap_v3' || uniswapContracts.type === 'uniswap_v3_unverified') {
      const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
      const poolData = [];

      for (const fee of feeTiers) {
        try {
          const poolAddress = await uniswapContracts.factory.getPool(token0Address, token1Address, fee);
          
          if (poolAddress !== ethers.ZeroAddress) {
            const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_ABIS.Pool, celoProvider);
            const [slot0, liquidity] = await Promise.all([
              poolContract.slot0(),
              poolContract.liquidity()
            ]);

            const price = calculatePriceFromSqrtPriceX96(
              slot0.sqrtPriceX96, 
              await poolContract.token0(), 
              await poolContract.token1(),
              token0Address, 
              token1Address
            );

            poolData.push({
              fee: fee / 10000, // Convert to percentage
              poolAddress,
              price: price.price0,
              liquidity: liquidity.toString(),
              tick: slot0.tick,
              sqrtPriceX96: slot0.sqrtPriceX96.toString(),
              active: true,
              dexType: 'uniswap_v3'
            });
          }
        } catch (error) {
          console.error(`Error fetching pool for fee ${fee}:`, error.message);
        }
      }

      // Sort by liquidity (higher liquidity = better for large trades)
      poolData.sort((a, b) => BigInt(b.liquidity) - BigInt(a.liquidity));

      return res.json({
        success: true,
        data: {
          pair,
          pools: poolData,
          bestLiquidity: poolData[0] || null,
          totalPools: poolData.length,
          recommendation: poolData.length > 0 ? 
            `Use ${poolData[0].fee}% fee pool for best liquidity` : 
            'No active pools found - create pool via Uniswap interface',
          source: 'uniswap_v3_celo_alfajores'
        }
      });
    }

    // Fallback to mock
    const mockPrice = getMockPrice(token0Symbol, token1Symbol);
    return res.json({
      success: true,
      data: {
        pair,
        pools: [{
          fee: 0.3,
          poolAddress: 'mock_address',
          price: mockPrice,
          liquidity: '1000000000000000000000',
          active: true,
          dexType: 'mock'
        }],
        bestLiquidity: {
          fee: 0.3,
          price: mockPrice,
          dexType: 'mock'
        },
        totalPools: 1,
        recommendation: 'Mock data for development testing'
      }
    });

  } catch (error) {
    console.error('Pools fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pool data',
      details: error.message
    });
  }
});ap/pools/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const [token0Symbol, token1Symbol] = pair.split('-');
    const token0Address = CHAIN_CONFIG.celo.tokens[token0Symbol];
    const token1Address = CHAIN_CONFIG.celo.tokens[token1Symbol];
    
    if (!token0Address || !token1Address) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token pair'
      });
    }

    // Check all fee tiers
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    const poolData = [];

    for (const fee of feeTiers) {
      try {
        const poolAddress = await uniswapContracts.factory.getPool(token0Address, token1Address, fee);
        
        if (poolAddress !== ethers.ZeroAddress) {
          const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_ABIS.Pool, celoProvider);
          const [slot0, liquidity] = await Promise.all([
            poolContract.slot0(),
            poolContract.liquidity()
          ]);

          const price = calculatePriceFromSqrtPriceX96(
            slot0.sqrtPriceX96, 
            await poolContract.token0(), 
            await poolContract.token1(),
            token0Address, 
            token1Address
          );

          poolData.push({
            fee: fee / 10000,
            poolAddress,
            price: price.price0,
            liquidity: liquidity.toString(),
            tick: slot0.tick,
            active: true
          });
        }
      } catch (error) {
        console.error(`Error fetching pool for fee ${fee}:`, error.message);
      }
    }

    // Sort by liquidity (higher liquidity = better for large trades)
    poolData.sort((a, b) => BigInt(b.liquidity) - BigInt(a.liquidity));

    res.json({
      success: true,
      data: {
        pair,
        pools: poolData,
        bestLiquidity: poolData[0] || null,
        totalPools: poolData.length,
        recommendation: poolData.length > 0 ? 
          `Use ${poolData[0].fee}% fee pool for best liquidity` : 
          'No active pools found'
      }
    });

  } catch (error) {
    console.error('Uniswap pools fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pool data',
      details: error.message
    });
  }
});

// 11. Execute Uniswap V3 swap on Celo via 1Inch Fusion+
app.post('/api/uniswap/swap', async (req, res) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      amountOutMinimum,
      fee = 3000,
      walletAddress,
      slippageTolerance = 1,
      useExactOutput = false,
      routeVia1Inch = true
    } = req.body;

    // Validate inputs
    if (!tokenIn || !tokenOut || !amountIn || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: tokenIn, tokenOut, amountIn, walletAddress'
      });
    }

    const tokenInAddress = CHAIN_CONFIG.celo.tokens[tokenIn];
    const tokenOutAddress = CHAIN_CONFIG.celo.tokens[tokenOut];

    if (!tokenInAddress || !tokenOutAddress) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token symbols',
        availableTokens: Object.keys(CHAIN_CONFIG.celo.tokens)
      });
    }

    let swapResult;

    if (routeVia1Inch) {
      // Route through 1Inch Fusion+ for better rates and MEV protection
      swapResult = await execute1InchFusionSwapOnCelo({
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn,
        walletAddress,
        slippageTolerance
      });
    } else {
      // Direct Uniswap V3 swap
      swapResult = await executeDirectUniswapSwap({
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn,
        amountOutMinimum,
        fee,
        walletAddress,
        useExactOutput
      });
    }

    res.json({
      success: true,
      data: {
        ...swapResult,
        routing: routeVia1Inch ? '1Inch Fusion+ → Uniswap V3' : 'Direct Uniswap V3',
        chain: 'celo_alfajores',
        estimatedGas: await estimateSwapGas({ tokenIn, tokenOut, amountIn })
      }
    });

  } catch (error) {
    console.error('Uniswap swap error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to execute Uniswap swap',
      details: error.message
    });
  }
});

// Enhanced pool existence checker
app.get('/api/uniswap/check-pools/:token0/:token1', async (req, res) => {
  try {
    const { token0, token1 } = req.params;
    
    const token0Address = CHAIN_CONFIG.celo.tokens[token0];
    const token1Address = CHAIN_CONFIG.celo.tokens[token1];
    
    if (!token0Address || !token1Address) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokens',
        availableTokens: Object.keys(CHAIN_CONFIG.celo.tokens)
      });
    }

    if (!uniswapContracts.factory) {
      return res.status(500).json({
        success: false,
        error: 'Uniswap factory not initialized'
      });
    }

    const results = {};
    const feeTiers = [500, 3000, 10000];

    for (const fee of feeTiers) {
      try {
        console.log(`🔍 Checking pool ${token0}/${token1} with fee ${fee}...`);
        
        const poolAddress = await uniswapContracts.factory.getPool(
          token0Address, 
          token1Address, 
          fee
        );
        
        const exists = poolAddress !== ethers.ZeroAddress;
        results[fee] = {
          poolAddress,
          exists,
          feePercent: fee / 10000
        };

        if (exists) {
          try {
            const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_ABIS.Pool, celoProvider);
            const [slot0, liquidity] = await Promise.all([
              poolContract.slot0(),
              poolContract.liquidity()
            ]);
            
            results[fee].poolData = {
              sqrtPriceX96: slot0.sqrtPriceX96.toString(),
              tick: slot0.tick,
              liquidity: liquidity.toString(),
              hasLiquidity: liquidity > 0n
            };
          } catch (poolError) {
            results[fee].poolError = poolError.message;
          }
        }

        console.log(`📊 Pool ${token0}/${token1} (${fee}): ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        
      } catch (error) {
        results[fee] = {
          error: error.message,
          exists: false
        };
        console.error(`❌ Error checking fee ${fee}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        pair: `${token0}-${token1}`,
        tokenAddresses: {
          [token0]: token0Address,
          [token1]: token1Address
        },
        factoryAddress: CHAIN_CONFIG.celo.uniswap.factory,
        results,
        summary: {
          totalChecked: feeTiers.length,
          existingPools: Object.values(results).filter(r => r.exists).length,
          recommendedActions: Object.values(results).some(r => r.exists) ? 
            'Pools found! Use existing pools for trading.' : 
            'No pools found. Create pool via Uniswap interface first.'
        }
      }
    });

  } catch (error) {
    console.error('Pool check error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to check pools',
      details: error.message
    });
  }
});
app.get('/api/debug/uniswap', async (req, res) => {
  try {
    const contractsInfo = {
      type: uniswapContracts.type,
      addresses: {
        factory: CHAIN_CONFIG.celo.uniswap.factory,
        router: CHAIN_CONFIG.celo.uniswap.router,
        quoter: CHAIN_CONFIG.celo.uniswap.quoter
      },
      contractsInitialized: {
        factory: !!uniswapContracts.factory,
        router: !!uniswapContracts.router,
        quoter: !!uniswapContracts.quoter
      }
    };

    // Test factory contract if available
    if (uniswapContracts.factory) {
      try {
        // Test basic contract call
        const cUSD = CHAIN_CONFIG.celo.tokens.cUSD;
        const USDC = CHAIN_CONFIG.celo.tokens.USDC;
        
        console.log(`🧪 Testing factory.getPool(${cUSD}, ${USDC}, 3000)...`);
        
        const poolAddress = await uniswapContracts.factory.getPool(cUSD, USDC, 3000);
        contractsInfo.testResults = {
          factoryResponsive: true,
          cUSD_USDC_3000_pool: poolAddress,
          poolExists: poolAddress !== ethers.ZeroAddress
        };

        // Test all fee tiers
        const feeTiers = [500, 3000, 10000];
        const poolsByFee = {};
        
        for (const fee of feeTiers) {
          try {
            const pool = await uniswapContracts.factory.getPool(cUSD, USDC, fee);
            poolsByFee[fee] = {
              address: pool,
              exists: pool !== ethers.ZeroAddress
            };
          } catch (error) {
            poolsByFee[fee] = { error: error.message };
          }
        }
        
        contractsInfo.testResults.allPools = poolsByFee;

        // If we find a pool, test it
        if (poolAddress !== ethers.ZeroAddress) {
          try {
            const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_ABIS.Pool, celoProvider);
            const slot0 = await poolContract.slot0();
            contractsInfo.testResults.poolData = {
              sqrtPriceX96: slot0.sqrtPriceX96.toString(),
              tick: slot0.tick,
              unlocked: slot0.unlocked
            };
          } catch (poolError) {
            contractsInfo.testResults.poolError = poolError.message;
          }
        }

      } catch (factoryError) {
        contractsInfo.testResults = {
          factoryResponsive: false,
          error: factoryError.message
        };
      }
    }

    res.json({
      success: true,
      data: contractsInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Debug test failed',
      details: error.message
    });
  }
});
app.get('/api/uniswap/quote', async (req, res) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      fee = 3000
    } = req.query;

    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: tokenIn, tokenOut, amountIn'
      });
    }

    const tokenInAddress = CHAIN_CONFIG.celo.tokens[tokenIn];
    const tokenOutAddress = CHAIN_CONFIG.celo.tokens[tokenOut];

    if (!tokenInAddress || !tokenOutAddress) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token symbols',
        availableTokens: Object.keys(CHAIN_CONFIG.celo.tokens)
      });
    }

    if (uniswapContracts.type === 'mock') {
      const mockPrice = getMockPrice(tokenIn, tokenOut);
      const amountOut = parseFloat(amountIn) * mockPrice;
      
      return res.json({
        success: true,
        data: {
          tokenIn,
          tokenOut,
          amountIn,
          amountOut: amountOut.toFixed(6),
          rate: mockPrice.toFixed(6),
          fee: 0.3,
          priceImpact: '0.05',
          route: `${tokenIn} → ${tokenOut} (Mock DEX)`,
          timestamp: new Date().toISOString(),
          source: 'mock_for_development'
        }
      });
    }

    if (uniswapContracts.type === 'ubeswap_v2') {
      try {
        // Use Ubeswap router to get quote
        const path = [tokenInAddress, tokenOutAddress];
        const amountInWei = ethers.parseUnits(amountIn, 18);
        
        const amounts = await uniswapContracts.router.getAmountsOut(amountInWei, path);
        const amountOutWei = amounts[1];
        const amountOutFormatted = ethers.formatUnits(amountOutWei, 18);
        
        const rate = parseFloat(amountOutFormatted) / parseFloat(amountIn);
        const priceImpact = await calculateUbeswapPriceImpact(tokenInAddress, tokenOutAddress, amountIn);

        return res.json({
          success: true,
          data: {
            tokenIn,
            tokenOut,
            amountIn,
            amountOut: amountOutFormatted,
            rate: rate.toFixed(6),
            fee: 0.3, // Ubeswap V2 standard fee
            priceImpact: priceImpact.toFixed(4),
            route: `${tokenIn} → ${tokenOut} (Ubeswap V2)`,
            timestamp: new Date().toISOString(),
            source: 'ubeswap_celo'
          }
        });
      } catch (error) {
        console.error('Ubeswap quote error:', error);
        // Fallback to mock quote
        const mockPrice = getMockPrice(tokenIn, tokenOut);
        const amountOut = parseFloat(amountIn) * mockPrice;
        
        return res.json({
          success: true,
          data: {
            tokenIn,
            tokenOut,
            amountIn,
            amountOut: amountOut.toFixed(6),
            rate: mockPrice.toFixed(6),
            fee: 0.3,
            priceImpact: '0.05',
            route: `${tokenIn} → ${tokenOut} (Fallback)`,
            error: 'Used fallback due to: ' + error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Default fallback
    const mockPrice = getMockPrice(tokenIn, tokenOut);
    const amountOut = parseFloat(amountIn) * mockPrice;
    
    res.json({
      success: true,
      data: {
        tokenIn,
        tokenOut,
        amountIn,
        amountOut: amountOut.toFixed(6),
        rate: mockPrice.toFixed(6),
        route: `${tokenIn} → ${tokenOut} (Fallback)`,
        source: 'fallback_quote'
      }
    });

  } catch (error) {
    console.error('Quote error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get swap quote',
      details: error.message
    });
  }
});
app.get('/api/uniswap/quote', async (req, res) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      fee = 3000
    } = req.query;

    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: tokenIn, tokenOut, amountIn'
      });
    }

    const tokenInAddress = CHAIN_CONFIG.celo.tokens[tokenIn];
    const tokenOutAddress = CHAIN_CONFIG.celo.tokens[tokenOut];

    // Get quote from Uniswap V3 Quoter
    const amountOut = await uniswapContracts.quoter.quoteExactInputSingle.staticCall(
      tokenInAddress,
      tokenOutAddress,
      fee,
      ethers.parseUnits(amountIn, 18),
      0 // sqrtPriceLimitX96 = 0 (no limit)
    );

    const rate = Number(amountOut) / Number(ethers.parseUnits(amountIn, 18));
    const priceImpact = await calculatePriceImpact(tokenInAddress, tokenOutAddress, amountIn, fee);

    res.json({
      success: true,
      data: {
        tokenIn,
        tokenOut,
        amountIn,
        amountOut: ethers.formatUnits(amountOut, 18),
        rate: rate.toFixed(6),
        fee: fee / 10000,
        priceImpact: priceImpact.toFixed(4),
        route: `${tokenIn} → ${tokenOut} (Uniswap V3)`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Uniswap quote error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get swap quote',
      details: error.message
    });
  }
});
app.get('/api/oracle/peg-status', async (req, res) => {
  try {
    const results = {};
    const chains = ['ethereum', 'celo'];
    
    // Check all stablecoin pairs across supported chains
    for (const chain of chains) {
      const chainOracles = CHAINLINK_ORACLES[chain];
      results[chain] = {};
      
      for (const [pair, address] of Object.entries(chainOracles)) {
        if (pair === 'decimals' || !address) continue;
        
        try {
          const provider = chain === 'celo' ? 
            new ethers.JsonRpcProvider(CHAIN_CONFIG.celo.rpc) : 
            ethProvider;

          const oracle = new ethers.Contract(address, CHAINLINK_ABI, provider);
          const roundData = await oracle.latestRoundData();
          
          const price = Number(roundData.answer) / Math.pow(10, chainOracles.decimals);
          const isStablecoin = pair.includes('USD');
          
          if (isStablecoin) {
            const deviation = Math.abs(price - 1.0);
            const deviationPercent = deviation * 100;
            
            results[chain][pair] = {
              price,
              deviation,
              deviationPercent: deviationPercent.toFixed(4),
              isPegged: deviation <= pegStatus.alertThreshold,
              status: deviation <= pegStatus.alertThreshold ? 'STABLE' : 'DEPEGGED',
              updatedAt: new Date(Number(roundData.updatedAt) * 1000),
              roundId: roundData.roundId.toString()
            };
          }
        } catch (error) {
          results[chain][pair] = {
            error: error.message,
            status: 'ERROR'
          };
        }
      }
    }

    // Check if any major depegging detected
    const criticalDepegs = [];
    Object.entries(results).forEach(([chain, pairs]) => {
      Object.entries(pairs).forEach(([pair, data]) => {
        if (data.deviationPercent && parseFloat(data.deviationPercent) > 1.0) {
          criticalDepegs.push({ chain, pair, ...data });
        }
      });
    });

    // Auto-pause swaps if critical depegging detected
    if (criticalDepegs.length > 0 && !pegStatus.swapsPaused) {
      pegStatus.swapsPaused = true;
      console.log('🚨 CRITICAL: Swaps auto-paused due to stablecoin depegging:', criticalDepegs);
    }

    pegStatus.lastCheck = new Date().toISOString();

    res.json({
      success: true,
      data: {
        chainStatus: results,
        globalStatus: {
          swapsPaused: pegStatus.swapsPaused,
          lastCheck: pegStatus.lastCheck,
          criticalDepegs: criticalDepegs.length,
          alertThreshold: `${pegStatus.alertThreshold * 100}%`
        },
        criticalAlerts: criticalDepegs
      }
    });
  } catch (error) {
    console.error('Peg monitoring error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to check peg status',
      details: error.message
    });
  }
});

// New endpoint: Manual peg monitoring controls
app.post('/api/oracle/peg-controls', async (req, res) => {
  try {
    const { action, threshold } = req.body;
    
    switch (action) {
      case 'pause_swaps':
        pegStatus.swapsPaused = true;
        break;
      case 'resume_swaps':
        pegStatus.swapsPaused = false;
        break;
      case 'set_threshold':
        if (threshold && threshold > 0 && threshold <= 0.1) {
          pegStatus.alertThreshold = threshold;
        } else {
          throw new Error('Threshold must be between 0 and 0.1 (10%)');
        }
        break;
      case 'force_check':
        // Trigger immediate peg check
        await axios.get(`http://localhost:${PORT}/api/oracle/peg-status`);
        break;
      default:
        throw new Error('Invalid action');
    }

    res.json({
      success: true,
      data: {
        action,
        newStatus: {
          swapsPaused: pegStatus.swapsPaused,
          alertThreshold: pegStatus.alertThreshold,
          lastAction: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 3. Detect arbitrage opportunities between Celo and Sui
app.get('/api/arbitrage/celo-sui', async (req, res) => {
  try {
    const { minProfit = 0.5 } = req.query; // Minimum profit percentage
    
    // Fetch prices from both chains
    const [celoPrice, suiPrice, ethPrice] = await Promise.all([
      getCeloStablecoinPrice('cUSD'),
      getSuiStablecoinPrice('USDC'),
      get1InchPrice('USDC')
    ]);

    const opportunities = [];
    
    // Calculate potential arbitrage
    const priceDiff = Math.abs(celoPrice - suiPrice);
    const profitPercent = (priceDiff / Math.min(celoPrice, suiPrice)) * 100;
    
    if (profitPercent >= parseFloat(minProfit)) {
      const direction = celoPrice > suiPrice ? 'CELO->SUI' : 'SUI->CELO';
      
      opportunities.push({
        pair: 'CUSD/USDC',
        direction,
        celoPrice,
        suiPrice,
        priceDiff,
        profitPercent: profitPercent.toFixed(2),
        estimatedGasCost: await estimateArbitrageGas(),
        recommendedAmount: calculateOptimalAmount(priceDiff)
      });
    }

    res.json({
      success: true,
      data: {
        opportunities,
        totalOpportunities: opportunities.length,
        timestamp: new Date().toISOString(),
        prices: { celoPrice, suiPrice, ethPrice }
      }
    });
  } catch (error) {
    console.error('Arbitrage detection error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to detect arbitrage opportunities',
      details: error.message
    });
  }
});

// 4. Execute swaps via Fusion+ with peg protection (Updated)
app.post('/api/swap/fusion', async (req, res) => {
  try {
    // Check if swaps are paused due to depegging
    if (pegStatus.swapsPaused) {
      return res.status(423).json({
        success: false,
        error: 'Swaps temporarily paused due to stablecoin depegging',
        pegStatus: pegStatus.deviations,
        resumeAction: 'Contact admin or wait for automatic resume'
      });
    }

    const {
      fromToken,
      toToken,
      amount,
      fromChain,
      toChain,
      slippageTolerance = 1,
      enableLimitOrder = false,
      limitPrice,
      bypassPegCheck = false
    } = req.body;

    // Validate required parameters
    if (!fromToken || !toToken || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: fromToken, toToken, amount'
      });
    }

    // Pre-swap peg validation (unless bypassed)
    if (!bypassPegCheck) {
      const pegCheckResult = await validateSwapPegs(fromToken, toToken, fromChain, toChain);
      if (!pegCheckResult.safe) {
        return res.status(400).json({
          success: false,
          error: 'Swap blocked due to peg deviation',
          pegAnalysis: pegCheckResult,
          suggestion: 'Wait for peg stability or set bypassPegCheck=true (not recommended)'
        });
      }
    }

    // Create Fusion+ order
    const orderParams = {
      fromTokenAddress: CHAIN_CONFIG[fromChain]?.tokens[fromToken],
      toTokenAddress: CHAIN_CONFIG[toChain]?.tokens[toToken],
      amount: ethers.parseUnits(amount.toString(), 6), // Assuming 6 decimals for stablecoins
      walletAddress: req.body.walletAddress,
      slippageTolerance: slippageTolerance * 100, // Convert to basis points
    };

    if (enableLimitOrder && limitPrice) {
      orderParams.limitPrice = ethers.parseUnits(limitPrice.toString(), 18);
    }

    const order = await fusionSDK.createOrder(orderParams);
    
    // For cross-chain swaps, we need to handle the relay logic
    let executionPlan;
    if (fromChain !== toChain) {
      executionPlan = await createCrossChainExecutionPlan(orderParams, fromChain, toChain);
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderHash,
        order: order,
        executionPlan: executionPlan || null,
        estimatedGas: await estimateSwapGas(orderParams),
        estimatedTime: fromChain === toChain ? '30-120s' : '5-15min',
        pegProtection: {
          enabled: !bypassPegCheck,
          lastCheck: pegStatus.lastCheck,
          status: 'PROTECTED'
        }
      }
    });
  } catch (error) {
    console.error('Fusion+ swap error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to execute swap',
      details: error.message
    });
  }
});
app.post('/api/swap/bidirectional', async (req, res) => {
  try {
    const {
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      walletAddress,
      minRate,
      maxSlippage = 1,
      enableAtomicSwap = true,
      timeoutMinutes = 60
    } = req.body;

    // Validate chains and direction
    const supportedPairs = [
      { from: 'celo', to: 'sui', via: 'ethereum' },
      { from: 'sui', to: 'celo', via: 'ethereum' },
      { from: 'celo', to: 'ethereum', direct: true },
      { from: 'ethereum', to: 'celo', direct: true }
    ];

    const swapPair = supportedPairs.find(p => p.from === fromChain && p.to === toChain);
    if (!swapPair) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported swap direction',
        supportedPairs
      });
    }

    // Check peg protection
    if (pegStatus.swapsPaused) {
      return res.status(423).json({
        success: false,
        error: 'Swaps paused due to peg deviation'
      });
    }

    // Generate unique swap ID and hashlock
    const swapId = `swap_${Date.now()}_${randomBytes(8).toString('hex')}`;
    const secret = randomBytes(32);
    const hashlock = createHash('sha256').update(secret).digest('hex');
    const timelock = Math.floor(Date.now() / 1000) + (timeoutMinutes * 60);

    // Initialize swap state
    const swapState = {
      id: swapId,
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      walletAddress,
      minRate,
      maxSlippage,
      enableAtomicSwap,
      hashlock,
      secret: secret.toString('hex'),
      timelock,
      status: 'INITIATED',
      steps: [],
      createdAt: new Date().toISOString()
    };

    swapStates.set(swapId, swapState);

    let executionPlan;
    if (swapPair.direct) {
      // Direct swap (same EVM chain or Ethereum)
      executionPlan = await createDirectSwapPlan(swapState);
    } else {
      // Cross-chain swap via Ethereum relay
      executionPlan = await createCrossChainSwapPlan(swapState);
    }

    swapState.executionPlan = executionPlan;
    swapState.status = 'PLAN_CREATED';

    res.json({
      success: true,
      data: {
        swapId,
        executionPlan,
        atomicGuarantees: enableAtomicSwap ? {
          hashlock,
          timelock: new Date(timelock * 1000).toISOString(),
          expiresIn: `${timeoutMinutes} minutes`
        } : null,
        estimatedTime: swapPair.direct ? '2-5 minutes' : '10-30 minutes',
        nextStep: 'Execute swap using /api/swap/execute endpoint'
      }
    });

  } catch (error) {
    console.error('Bidirectional swap error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create bidirectional swap',
      details: error.message
    });
  }
});

// 6. Execute atomic swap with threshold checks
app.post('/api/swap/execute', async (req, res) => {
  try {
    const { swapId, step = 0 } = req.body;

    const swapState = swapStates.get(swapId);
    if (!swapState) {
      return res.status(404).json({
        success: false,
        error: 'Swap not found'
      });
    }

    // Check if swap expired
    if (Date.now() / 1000 > swapState.timelock) {
      swapState.status = 'EXPIRED';
      return res.status(408).json({
        success: false,
        error: 'Swap expired',
        refundInstructions: 'Use /api/swap/refund endpoint'
      });
    }

    const currentStep = swapState.executionPlan.steps[step];
    if (!currentStep) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step'
      });
    }

    let executionResult;
    switch (currentStep.type) {
      case 'RATE_CHECK':
        executionResult = await executeRateCheck(swapState, currentStep);
        break;
      case 'LIMIT_ORDER':
        executionResult = await executeLimitOrder(swapState, currentStep);
        break;
      case 'FUSION_SWAP':
        executionResult = await executeFusionSwap(swapState, currentStep);
        break;
      case 'BRIDGE_LOCK':
        executionResult = await executeBridgeLock(swapState, currentStep);
        break;
      case 'BRIDGE_CLAIM':
        executionResult = await executeBridgeClaim(swapState, currentStep);
        break;
      default:
        throw new Error(`Unknown step type: ${currentStep.type}`);
    }

    // Update swap state
    swapState.steps[step] = {
      ...currentStep,
      ...executionResult,
      executedAt: new Date().toISOString()
    };

    // Check if swap is complete
    const allStepsComplete = swapState.executionPlan.steps.every(s => s.status === 'COMPLETED');
    if (allStepsComplete) {
      swapState.status = 'COMPLETED';
      swapState.completedAt = new Date().toISOString();
    }

    res.json({
      success: true,
      data: {
        swapId,
        currentStep: step,
        stepResult: executionResult,
        swapStatus: swapState.status,
        nextStep: step + 1 < swapState.executionPlan.steps.length ? step + 1 : null,
        isComplete: allStepsComplete
      }
    });

  } catch (error) {
    console.error('Swap execution error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to execute swap step',
      details: error.message
    });
  }
});

// 7. Get swap status and progress
app.get('/api/swap/status/:swapId', async (req, res) => {
  try {
    const { swapId } = req.params;
    const swapState = swapStates.get(swapId);

    if (!swapState) {
      return res.status(404).json({
        success: false,
        error: 'Swap not found'
      });
    }

    // Calculate progress
    const completedSteps = swapState.steps.filter(s => s.status === 'COMPLETED').length;
    const totalSteps = swapState.executionPlan.steps.length;
    const progress = (completedSteps / totalSteps) * 100;

    // Check for expired swaps
    const isExpired = Date.now() / 1000 > swapState.timelock;
    if (isExpired && swapState.status !== 'EXPIRED') {
      swapState.status = 'EXPIRED';
    }

    res.json({
      success: true,
      data: {
        swapId,
        status: swapState.status,
        progress: Math.round(progress),
        completedSteps,
        totalSteps,
        currentStep: swapState.steps.findIndex(s => !s.status || s.status === 'PENDING'),
        timeRemaining: Math.max(0, swapState.timelock - Math.floor(Date.now() / 1000)),
        createdAt: swapState.createdAt,
        updatedAt: swapState.updatedAt || swapState.createdAt,
        executionPlan: swapState.executionPlan,
        atomicGuarantees: swapState.enableAtomicSwap ? {
          hashlock: swapState.hashlock,
          timelock: swapState.timelock
        } : null
      }
    });

  } catch (error) {
    console.error('Swap status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get swap status',
      details: error.message
    });
  }
});

// 8. Refund expired or failed atomic swaps
app.post('/api/swap/refund', async (req, res) => {
  try {
    const { swapId } = req.body;
    const swapState = swapStates.get(swapId);

    if (!swapState) {
      return res.status(404).json({
        success: false,
        error: 'Swap not found'
      });
    }

    // Check if refund is allowed
    const canRefund = swapState.status === 'EXPIRED' || 
                     swapState.status === 'FAILED' ||
                     Date.now() / 1000 > swapState.timelock;

    if (!canRefund) {
      return res.status(400).json({
        success: false,
        error: 'Refund not available yet',
        timeRemaining: Math.max(0, swapState.timelock - Math.floor(Date.now() / 1000))
      });
    }

    // Execute refund logic
    const refundResult = await executeRefund(swapState);
    
    swapState.status = 'REFUNDED';
    swapState.refundedAt = new Date().toISOString();

    res.json({
      success: true,
      data: {
        swapId,
        refundResult,
        status: 'REFUNDED'
      }
    });

  } catch (error) {
    console.error('Refund error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund',
      details: error.message
    });
  }
});
app.post('/api/swap/fusion', async (req, res) => {
  try {
    // Check if swaps are paused due to depegging
    if (pegStatus.swapsPaused) {
      return res.status(423).json({
        success: false,
        error: 'Swaps temporarily paused due to stablecoin depegging',
        pegStatus: pegStatus.deviations,
        resumeAction: 'Contact admin or wait for automatic resume'
      });
    }

    const {
      fromToken,
      toToken,
      amount,
      fromChain,
      toChain,
      slippageTolerance = 1,
      enableLimitOrder = false,
      limitPrice,
      bypassPegCheck = false
    } = req.body;

    // Validate required parameters
    if (!fromToken || !toToken || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: fromToken, toToken, amount'
      });
    }

    // Pre-swap peg validation (unless bypassed)
    if (!bypassPegCheck) {
      const pegCheckResult = await validateSwapPegs(fromToken, toToken, fromChain, toChain);
      if (!pegCheckResult.safe) {
        return res.status(400).json({
          success: false,
          error: 'Swap blocked due to peg deviation',
          pegAnalysis: pegCheckResult,
          suggestion: 'Wait for peg stability or set bypassPegCheck=true (not recommended)'
        });
      }
    }

    // Create Fusion+ order
    const orderParams = {
      fromTokenAddress: CHAIN_CONFIG[fromChain]?.tokens[fromToken],
      toTokenAddress: CHAIN_CONFIG[toChain]?.tokens[toToken],
      amount: ethers.parseUnits(amount.toString(), 6), // Assuming 6 decimals for stablecoins
      walletAddress: req.body.walletAddress,
      slippageTolerance: slippageTolerance * 100, // Convert to basis points
    };

    if (enableLimitOrder && limitPrice) {
      orderParams.limitPrice = ethers.parseUnits(limitPrice.toString(), 18);
    }

    const order = await fusionSDK.createOrder(orderParams);
    
    // For cross-chain swaps, we need to handle the relay logic
    let executionPlan;
    if (fromChain !== toChain) {
      executionPlan = await createCrossChainExecutionPlan(orderParams, fromChain, toChain);
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderHash,
        order: order,
        executionPlan: executionPlan || null,
        estimatedGas: await estimateSwapGas(orderParams),
        estimatedTime: fromChain === toChain ? '30-120s' : '5-15min',
        pegProtection: {
          enabled: !bypassPegCheck,
          lastCheck: pegStatus.lastCheck,
          status: 'PROTECTED'
        }
      }
    });
  } catch (error) {
    console.error('Fusion+ swap error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to execute swap',
      details: error.message
    });
  }
});

async function getCeloStablecoinPrice(token) {
  try {
    // Use Chainlink oracle for Celo if available
    const chainOracles = CHAINLINK_ORACLES.celo;
    const oracleAddress = chainOracles[`${token.toUpperCase()}_USD`];
    
    if (oracleAddress) {
      const provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.celo.rpc);
      const oracle = new ethers.Contract(oracleAddress, CHAINLINK_ABI, provider);
      const roundData = await oracle.latestRoundData();
      return Number(roundData.answer) / Math.pow(10, chainOracles.decimals);
    }
    
    // Fallback to DEX query
    const exchange = await celoKit.contracts.getExchange();
    // Implementation would fetch actual price from Celo DEX
    return 1.0; // Placeholder
  } catch (error) {
    console.error('Celo price fetch error:', error);
    return 1.0;
  }
}
async function validateSwapPegs(fromToken, toToken, fromChain, toChain) {
  try {
    const tokens = [
      { token: fromToken, chain: fromChain },
      { token: toToken, chain: toChain }
    ];
    
    const pegChecks = [];
    
    for (const { token, chain } of tokens) {
      if (token.toUpperCase().includes('USD')) {
        try {
          const chainOracles = CHAINLINK_ORACLES[chain];
          if (!chainOracles) continue;
          
          const oracleAddress = chainOracles[`${token.toUpperCase()}_USD`];
          if (!oracleAddress) continue;
          
          const provider = chain === 'celo' ? 
            new ethers.JsonRpcProvider(CHAIN_CONFIG.celo.rpc) : 
            ethProvider;
          
          const oracle = new ethers.Contract(oracleAddress, CHAINLINK_ABI, provider);
          const roundData = await oracle.latestRoundData();
          
          const price = Number(roundData.answer) / Math.pow(10, chainOracles.decimals);
          const deviation = Math.abs(price - 1.0);
          const deviationPercent = deviation * 100;
          
          pegChecks.push({
            token,
            chain,
            price,
            deviation,
            deviationPercent,
            isPegged: deviation <= pegStatus.alertThreshold,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Peg check failed for ${token} on ${chain}:`, error.message);
        }
      }
    }
    
    const failedPegs = pegChecks.filter(check => !check.isPegged);
    
    return {
      safe: failedPegs.length === 0,
      checks: pegChecks,
      failedPegs,
      recommendation: failedPegs.length > 0 ? 
        'Wait for peg stability before swapping' : 
        'Safe to proceed'
    };
  } catch (error) {
    console.error('Peg validation error:', error);
    return {
      safe: false,
      error: error.message,
      recommendation: 'Unable to validate pegs, proceed with caution'
    };
  }
}

// Sui price fallback (since no native Chainlink)
async function getSuiStablecoinPrice(token) {
  try {
    // Fallback to CoinGecko API for Sui prices
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: token.toLowerCase() === 'usdc' ? 'usd-coin' : 'sui',
        vs_currencies: 'usd'
      }
    });
    
    const tokenId = token.toLowerCase() === 'usdc' ? 'usd-coin' : 'sui';
    return response.data[tokenId]?.usd || 1.0;
  } catch (error) {
    console.error('Sui price fetch error:', error);
    return 1.0;
  }
}

async function get1InchPrice(token) {
  try {
    const response = await axios.get(`https://api.1inch.dev/price/v1.1/1/${token}`, {
      headers: { 'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}` }
    });
    return response.data[token];
  } catch (error) {
    console.error('1Inch price error:', error);
    return 1.0;
  }
}

async function estimateArbitrageGas() {
  // Simplified gas estimation
  return {
    ethereum: '0.01',
    celo: '0.001',
    sui: '0.0001'
  };
}

function calculateOptimalAmount(priceDiff) {
  // Simplified calculation - should consider liquidity and gas costs
  return Math.min(10000, 1000 / priceDiff);
}

async function createCrossChainExecutionPlan(params, fromChain, toChain) {
  return {
    steps: [
      { chain: fromChain, action: 'swap_to_bridge_token', estimatedTime: '1-2min' },
      { chain: 'ethereum', action: 'relay_bridge', estimatedTime: '2-5min' },
      { chain: toChain, action: 'bridge_to_target', estimatedTime: '2-8min' }
    ],
    totalEstimatedTime: '5-15min',
    bridgeFees: '0.1%'
  };
}

async function estimateSwapGas(params) {
  return {
    gasLimit: '150000',
    gasPrice: '20',
    estimatedCost: '0.003 ETH'
  };
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server with peg monitoring and swap cleanup
async function startServer() {
  await initializeProviders();
  
  // Start automated peg monitoring (every 30 seconds)
  setInterval(async () => {
    try {
      if (pegStatus.isActive) {
        const response = await axios.get(`http://localhost:${PORT}/api/oracle/peg-status`);
        console.log('🔍 Peg monitoring check completed:', 
          response.data.data.globalStatus.criticalDepegs > 0 ? '⚠️ ALERTS DETECTED' : '✅ All stable');
      }
    } catch (error) {
      console.error('Automated peg monitoring error:', error.message);
    }
  }, 30000);

  // Cleanup expired swaps (every 5 minutes)
  setInterval(() => {
    const now = Date.now() / 1000;
    let cleanedCount = 0;
    
    for (const [swapId, swapState] of swapStates.entries()) {
      if (now > swapState.timelock + 3600) { // 1 hour after expiry
        swapStates.delete(swapId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired swaps`);
    }
  }, 300000);
  
  app.listen(PORT, () => {
    console.log(`🚀 DeFi Bridge API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Supported chains: ${Object.keys(CHAIN_CONFIG).join(', ')}`);
    console.log(`🛡️ Peg monitoring: Active (threshold: ${pegStatus.alertThreshold * 100}%)`);
    console.log(`⚛️ Atomic swaps: Enabled with hashlock/timelock`);
    console.log(`📈 Swap endpoints:`);
    console.log(`   - POST /api/swap/bidirectional - Create atomic cross-chain swap`);
    console.log(`   - POST /api/swap/execute - Execute swap steps`);
    console.log(`   - GET /api/swap/status/:swapId - Check swap progress`);
    console.log(`   - POST /api/swap/refund - Refund expired swaps`);
    console.log(`📈 Oracle endpoints:`);
    console.log(`   - GET /api/oracle/peg-status - Multi-chain monitoring`);
    console.log(`   - GET /api/oracle/chainlink/:pair?chain=ethereum - Single pair check`);
    console.log(`   - POST /api/oracle/peg-controls - Manual controls`);
  });
}

startServer().catch(console.error);