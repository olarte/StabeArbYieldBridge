import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ethers } from 'ethers';
// import { FusionSDK } from '@1inch/fusion-sdk';
import { SuiClient } from '@mysten/sui.js/client';
// import { ContractKit } from '@celo/contractkit';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// Chain configurations with enhanced Alchemy RPC support
const CHAIN_CONFIG = {
  ethereum: {
    rpc: process.env.ALCHEMY_KEY ? 
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}` : 
      process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    chainId: 11155111, // Sepolia testnet
    tokens: {
      USDC: '0xA0b86a33E6441efC4b5e9fE1D7EC8c4D8a3b8d2E', // Sepolia USDC
      USDT: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7'  // Sepolia USDT
    }
  },
  celo: {
    rpc: process.env.CELO_RPC || 'https://alfajores-forno.celo-testnet.org',
    chainId: 44787, // Alfajores testnet
    tokens: {
      cUSD: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',  // Alfajores cUSD
      USDC: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B'   // Alfajores USDC
    }
  },
  sui: {
    rpc: process.env.SUI_RPC || 'https://fullnode.testnet.sui.io:443',
    chainId: 'testnet',
    tokens: {
      USDC: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    }
  }
};

// Initialize providers
let ethProvider, suiProvider;

async function initializeProviders() {
  try {
    // Ethereum provider with Alchemy enhancement
    ethProvider = new ethers.JsonRpcProvider(CHAIN_CONFIG.ethereum.rpc);
    
    // Sui provider for testnet
    suiProvider = new SuiClient({
      url: CHAIN_CONFIG.sui.rpc
    });
    
    // Test connections
    const [ethNetwork, suiChainInfo] = await Promise.all([
      ethProvider.getNetwork(),
      suiProvider.getChainIdentifier().catch(() => 'testnet')
    ]);
    
    console.log('✅ All providers initialized successfully');
    console.log('🔗 1Inch API Key configured:', process.env.ONEINCH_API_KEY ? 'Yes' : 'No');
    console.log('🔗 Alchemy API Key configured:', process.env.ALCHEMY_KEY ? 'Yes' : 'No');
    console.log('🌐 Ethereum network:', ethNetwork.name, `(Chain ID: ${ethNetwork.chainId})`);
    console.log('🌐 Sui network: testnet (Chain:', suiChainInfo, ')');
    console.log('🌐 Celo network: Alfajores testnet (RPC ready)');
    console.log('🔗 Using RPC:', CHAIN_CONFIG.ethereum.rpc.includes('alchemy') ? 'Alchemy Enhanced' : 'Standard RPC');
    console.log('🔗 Sui testnet RPC:', CHAIN_CONFIG.sui.rpc);
  } catch (error) {
    console.error('❌ Provider initialization failed:', error.message);
    // Don't exit on initialization errors, just log them
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

// Chainlink oracle addresses (TESTNET)
const CHAINLINK_ORACLES = {
  ethereum: {
    // Sepolia testnet feeds
    USDC_USD: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
    USDT_USD: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
    ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    decimals: 8
  },
  celo: {
    // Celo Alfajores testnet feeds
    CUSD_USD: '0x022F9dCC73C5Fb43F2b4eF2EF9ad3eDD1D853946', 
    USDC_USD: '0x99d865Ed50D2C32c1493896810FA386c1Ce81D91',
    CELO_USD: '0x87d61b8c8f5B8A8fcB6983c5c0d15Dc2689A7F4b',
    decimals: 8
  },
  sui: {
    // Sui doesn't have native Chainlink yet, use Pyth or API fallback
    USDC_USD: null, // Will use API fallback
    SUI_USD: null,
    decimals: 8
  }
};

// Global peg monitoring state
let pegStatus = {
  lastCheck: null,
  isActive: true,
  swapsPaused: false,
  deviations: {},
  alertThreshold: 0.01 // 1%
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

// New endpoint: Multi-chain peg monitoring dashboard
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

// 4. Execute swaps via Fusion+ with peg protection
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

// Enhanced helper functions with multi-chain oracle support
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
    
    // Fallback to DEX query (simplified)
    return 1.0001; // Simulated price with slight variation
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

// Start server with peg monitoring
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
  
  app.listen(PORT, () => {
    console.log(`🚀 DeFi Bridge API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Supported chains: ${Object.keys(CHAIN_CONFIG).join(', ')}`);
    console.log(`🛡️ Peg monitoring: Active (threshold: ${pegStatus.alertThreshold * 100}%)`);
    console.log(`📈 Oracle endpoints:`);
    console.log(`   - GET /api/oracle/peg-status - Multi-chain monitoring`);
    console.log(`   - GET /api/oracle/chainlink/:pair?chain=ethereum - Single pair check`);
    console.log(`   - POST /api/oracle/peg-controls - Manual controls`);
  });
}

startServer().catch(console.error);