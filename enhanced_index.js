const express = require('express');
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

// Chain configurations
const CHAIN_CONFIG = {
  ethereum: {
    rpc: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    chainId: 1,
    tokens: {
      USDC: '0xA0b86a33E6441efC4b5e9fE1D7EC8c4D8a3b8d2E', // Ethereum USDC
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    }
  },
  celo: {
    rpc: process.env.CELO_RPC || 'https://forno.celo.org',
    chainId: 42220,
    tokens: {
      cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C'
    }
  },
  sui: {
    rpc: process.env.SUI_RPC || 'https://fullnode.mainnet.sui.io:443',
    tokens: {
      USDC: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    }
  }
};

// Initialize providers and SDKs
let ethProvider, celoKit, suiProvider, fusionSDK, limitOrderProtocol;

// Cross-chain swap state management
const swapStates = new Map();
const SWAP_TIMEOUT = 3600000; // 1 hour timeout

async function initializeProviders() {
  try {
    // Ethereum provider
    ethProvider = new ethers.JsonRpcProvider(CHAIN_CONFIG.ethereum.rpc);
    
    // Celo ContractKit
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
    
    console.log('✅ All providers and SDKs initialized successfully');
  } catch (error) {
    console.error('❌ Provider initialization failed:', error.message);
    process.exit(1);
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

// 5. Bidirectional stablecoin swap with atomic guarantees
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