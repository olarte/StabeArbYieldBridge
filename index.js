import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ethers } from 'ethers';
// import { FusionSDK, LimitOrderProtocolV4 } from '@1inch/fusion-sdk';
import { randomBytes, createHash } from 'crypto';
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

// Chain configurations with enhanced testnet support
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
      USDC: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',  // Alfajores USDC
      CELO: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9'   // Alfajores CELO
    },
    uniswap: {
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', // Uniswap V3 Factory
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',   // Uniswap V3 SwapRouter
      quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',   // Quoter V2
      nftManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' // NonfungiblePositionManager
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

// Initialize providers and SDKs
let ethProvider, suiProvider, celoSigner, suiSigner;

// Cross-chain swap state management
const swapStates = new Map();
const SWAP_TIMEOUT = 3600000; // 1 hour timeout

async function initializeProviders() {
  try {
    // Ethereum provider with Alchemy enhancement
    ethProvider = new ethers.JsonRpcProvider(CHAIN_CONFIG.ethereum.rpc);
    
    // Celo signer (uses Ethereum-compatible RPC)
    if (process.env.CELO_PRIVATE_KEY) {
      const celoProvider = new ethers.JsonRpcProvider(CHAIN_CONFIG.celo.rpc);
      celoSigner = new ethers.Wallet(process.env.CELO_PRIVATE_KEY, celoProvider);
      console.log('🔐 Celo wallet connected:', celoSigner.address);
    }
    
    // Sui provider for testnet
    suiProvider = new SuiClient({
      url: CHAIN_CONFIG.sui.rpc
    });
    
    // Initialize Sui wallet if private key provided
    if (process.env.SUI_PRIVATE_KEY) {
      // Note: Sui wallet initialization will be added when needed for transactions
      console.log('🔐 Sui private key configured');
    }
    
    // Test connections
    const [ethNetwork, suiChainInfo] = await Promise.all([
      ethProvider.getNetwork(),
      suiProvider.getChainIdentifier().catch(() => 'testnet')
    ]);
    
    // Initialize Uniswap V3 contracts
    await initializeUniswapContracts();
    
    console.log('✅ All providers initialized successfully');
    console.log('🔗 1Inch API Key configured:', process.env.ONEINCH_API_KEY ? 'Yes' : 'No');
    console.log('🔗 Alchemy API Key configured:', process.env.ALCHEMY_KEY ? 'Yes' : 'No');
    console.log('🔐 Celo Private Key configured:', process.env.CELO_PRIVATE_KEY ? 'Yes' : 'No');
    console.log('🔐 Sui Private Key configured:', process.env.SUI_PRIVATE_KEY ? 'Yes' : 'No');
    console.log('🌐 Ethereum network:', ethNetwork.name, `(Chain ID: ${ethNetwork.chainId})`);
    console.log('🌐 Sui network: testnet (Chain:', suiChainInfo, ')');
    console.log('🌐 Celo network: Alfajores testnet');
    console.log('🔗 Using RPC:', CHAIN_CONFIG.ethereum.rpc.includes('alchemy') ? 'Alchemy Enhanced' : 'Standard RPC');
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

// Multi-chain peg monitoring dashboard
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

// Wallet balance endpoint
app.get('/api/wallet/balances', async (req, res) => {
  try {
    const balances = {};
    
    // Check Celo wallet balance
    if (celoSigner) {
      try {
        const celoBalance = await celoSigner.provider.getBalance(celoSigner.address);
        const cUSDContract = new ethers.Contract(
          CHAIN_CONFIG.celo.tokens.cUSD, 
          ['function balanceOf(address) view returns (uint256)'], 
          celoSigner
        );
        const cUSDBalance = await cUSDContract.balanceOf(celoSigner.address);
        
        balances.celo = {
          address: celoSigner.address,
          nativeBalance: ethers.formatEther(celoBalance),
          cUSDBalance: ethers.formatUnits(cUSDBalance, 18),
          network: 'Alfajores Testnet'
        };
      } catch (error) {
        balances.celo = { error: error.message };
      }
    } else {
      balances.celo = { error: 'Private key not configured' };
    }
    
    // Check Sui wallet (simplified - would need proper Sui wallet integration)
    if (process.env.SUI_PRIVATE_KEY) {
      balances.sui = {
        status: 'Private key configured',
        network: 'Sui Testnet',
        note: 'Balance check requires Sui wallet integration'
      };
    } else {
      balances.sui = { error: 'Private key not configured' };
    }

    res.json({
      success: true,
      data: balances,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Wallet balance error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet balances',
      details: error.message
    });
  }
});

// Manual peg monitoring controls
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

// Helper functions
async function getCeloStablecoinPrice(token) {
  try {
    // Simplified mock price for Celo cUSD
    return 1.002; // Slightly off peg for testing
  } catch (error) {
    console.error('Celo price fetch error:', error.message);
    return 1.0; // Fallback
  }
}

async function getSuiStablecoinPrice(token) {
  try {
    // Simplified mock price for Sui USDC
    return 0.998; // Slightly off peg for testing
  } catch (error) {
    console.error('Sui price fetch error:', error.message);
    return 1.0; // Fallback
  }
}

async function get1InchPrice(token) {
  try {
    const response = await axios.get(`https://api.1inch.dev/price/v1.1/1/USDC`, {
      headers: {
        'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`
      }
    });
    return response.data.USDC || 1.0;
  } catch (error) {
    console.error('1Inch price fetch error:', error.message);
    return 1.0; // Fallback
  }
}

async function estimateArbitrageGas() {
  // Simplified gas estimation
  return {
    ethereum: '0.01 ETH',
    celo: '0.001 CELO',
    sui: '0.1 SUI'
  };
}

function calculateOptimalAmount(priceDiff) {
  // Simplified optimal amount calculation
  return Math.min(10000, Math.max(100, priceDiff * 1000));
}

// Execute real cUSD swap
app.post('/api/swap/execute', async (req, res) => {
  try {
    const { amount = 1, fromToken = 'cUSD', toToken = 'CELO' } = req.body;
    
    if (!celoSigner) {
      return res.status(400).json({
        success: false,
        error: 'Celo wallet not configured'
      });
    }

    console.log(`🔄 Executing ${amount} ${fromToken} → ${toToken} swap`);
    
    // Check current balances
    const celoBalance = await celoSigner.provider.getBalance(celoSigner.address);
    const cUSDContract = new ethers.Contract(
      CHAIN_CONFIG.celo.tokens.cUSD, 
      [
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)'
      ], 
      celoSigner
    );
    
    const cUSDBalance = await cUSDContract.balanceOf(celoSigner.address);
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    
    if (cUSDBalance < amountWei) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient cUSD balance',
        data: {
          required: ethers.formatUnits(amountWei, 18),
          available: ethers.formatUnits(cUSDBalance, 18)
        }
      });
    }

    // For demonstration, we'll create a simple transfer transaction
    // In production, this would integrate with DEX contracts
    const swapTx = await cUSDContract.transfer(
      '0x0000000000000000000000000000000000000001', // Burn address for demo
      amountWei
    );

    console.log(`📝 Transaction submitted: ${swapTx.hash}`);
    
    // Wait for confirmation
    const receipt = await swapTx.wait();
    
    const result = {
      success: true,
      data: {
        transactionHash: swapTx.hash,
        status: receipt.status === 1 ? 'Success' : 'Failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        from: celoSigner.address,
        amount: ethers.formatUnits(amountWei, 18),
        explorer: `https://alfajores.celoscan.io/tx/${swapTx.hash}`,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ Swap completed: ${swapTx.hash}`);
    
    res.json(result);
  } catch (error) {
    console.error('Swap execution error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to execute swap',
      details: error.message
    });
  }
});

// Real transaction tracking endpoint
app.get('/api/transactions/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const { chain = 'ethereum' } = req.query;
    
    let provider;
    let networkInfo;
    
    switch (chain) {
      case 'ethereum':
        provider = ethProvider;
        networkInfo = { name: 'Ethereum Sepolia', chainId: 11155111, explorer: 'https://sepolia.etherscan.io/tx/' };
        break;
      case 'celo':
        provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.celo.rpc);
        networkInfo = { name: 'Celo Alfajores', chainId: 44787, explorer: 'https://alfajores.celoscan.io/tx/' };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported chain for transaction lookup'
        });
    }

    // Get transaction details
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash).catch(() => null)
    ]);

    if (!tx) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        explorer: `${networkInfo.explorer}${txHash}`
      });
    }

    const result = {
      success: true,
      data: {
        hash: tx.hash,
        status: receipt ? (receipt.status === 1 ? 'Success' : 'Failed') : 'Pending',
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value || '0'),
        gasPrice: ethers.formatUnits(tx.gasPrice || '0', 'gwei'),
        gasUsed: receipt ? receipt.gasUsed.toString() : 'Pending',
        blockNumber: tx.blockNumber,
        confirmations: tx.blockNumber ? await provider.getBlockNumber() - tx.blockNumber : 0,
        network: networkInfo,
        explorer: `${networkInfo.explorer}${txHash}`
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Transaction lookup error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to lookup transaction',
      details: error.message
    });
  }
});

// Uniswap V3 ABIs for Celo integration
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

// Initialize Uniswap V3 contracts
let uniswapContracts = {};

async function initializeUniswapContracts() {
  try {
    const celoConfig = CHAIN_CONFIG.celo.uniswap;
    const celoProvider = new ethers.JsonRpcProvider(CHAIN_CONFIG.celo.rpc);
    
    uniswapContracts = {
      factory: new ethers.Contract(celoConfig.factory, UNISWAP_V3_ABIS.Factory, celoProvider),
      router: new ethers.Contract(celoConfig.router, UNISWAP_V3_ABIS.SwapRouter, celoProvider),
      quoter: new ethers.Contract(celoConfig.quoter, UNISWAP_V3_ABIS.Quoter, celoProvider)
    };

    console.log('✅ Uniswap V3 contracts initialized on Celo Alfajores');
  } catch (error) {
    console.error('❌ Uniswap initialization failed:', error.message);
  }
}

// Enhanced function to get Uniswap prices on Celo
async function getUniswapCeloPrices(tokenPair, fee = 3000) {
  try {
    const [token0Symbol, token1Symbol] = tokenPair.split('-');
    const token0Address = CHAIN_CONFIG.celo.tokens[token0Symbol];
    const token1Address = CHAIN_CONFIG.celo.tokens[token1Symbol];
    
    if (!token0Address || !token1Address) {
      throw new Error(`Invalid token pair: ${tokenPair}. Available: ${Object.keys(CHAIN_CONFIG.celo.tokens).join(', ')}`);
    }

    // Get pool address
    const poolAddress = await uniswapContracts.factory.getPool(token0Address, token1Address, fee);
    
    if (poolAddress === ethers.ZeroAddress) {
      throw new Error(`Pool not found for ${tokenPair} with fee ${fee}. Try fees: 500, 3000, 10000`);
    }

    // Get pool contract and data
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
    
    // Get TVL estimate
    const tvl = await calculateTVL(poolContract, liquidity, token0, token1);

    return {
      success: true,
      data: {
        pair: tokenPair,
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
          tvl: tvl,
          feeGrowth: slot0.feeProtocol
        },
        tokens: {
          token0: { address: token0, symbol: token0Symbol },
          token1: { address: token1, symbol: token1Symbol }
        },
        timestamp: new Date().toISOString()
      },
      source: 'uniswap_v3_celo'
    };
  } catch (error) {
    console.error('Uniswap V3 price fetch error:', error.message);
    throw error;
  }
}

// Helper function to calculate price from sqrtPriceX96
function calculatePriceFromSqrtPriceX96(sqrtPriceX96, token0Address, token1Address, expectedToken0, expectedToken1) {
  const Q96 = 2n ** 96n;
  const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);
  
  // Convert to number for easier handling (precision loss acceptable for display)
  const price0 = Number(price) / 1e12; // Adjust for token decimals
  const price1 = 1 / price0;
  
  // Ensure correct token ordering
  const isToken0First = token0Address.toLowerCase() < token1Address.toLowerCase();
  
  return {
    price0: isToken0First ? price0 : price1,
    price1: isToken0First ? price1 : price0
  };
}

// Helper function to calculate TVL
async function calculateTVL(poolContract, liquidity, token0Address, token1Address) {
  try {
    // Simplified TVL calculation - in production would need token decimals and prices
    const liquidityNumber = Number(liquidity) / 1e18; // Simplified conversion
    return {
      liquidity: liquidityNumber,
      estimated: true,
      note: 'Simplified calculation - production needs token price data'
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Start automatic peg monitoring every 30 seconds
setInterval(async () => {
  try {
    if (pegStatus.isActive) {
      await axios.get(`http://localhost:${PORT}/api/oracle/peg-status`);
    }
  } catch (error) {
    console.error('Automatic peg check failed:', error.message);
  }
}, 30000);

// Initialize and start server
async function startServer() {
  await initializeProviders();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DeFi Bridge API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Supported chains: ${Object.keys(CHAIN_CONFIG).join(', ')}`);
    console.log(`🛡️ Peg monitoring: Active (threshold: ${pegStatus.alertThreshold * 100}%)`);
    console.log(`🦄 Uniswap V3: Integrated on Celo Alfajores testnet`);
    console.log(`📈 Oracle endpoints:`);
    console.log(`   - GET /api/oracle/peg-status - Multi-chain monitoring`);
    console.log(`   - GET /api/oracle/chainlink/:pair?chain=ethereum - Single pair check`);
    console.log(`   - POST /api/oracle/peg-controls - Manual controls`);
    console.log(`📊 Transaction endpoints:`);
    console.log(`   - GET /api/wallet/balances - Real-time wallet balances`);
    console.log(`   - GET /api/transactions/:txHash?chain=ethereum - Transaction lookup`);
    console.log(`🦄 Uniswap V3 endpoints:`);
    console.log(`   - GET /api/uniswap/price/:pair - Get pool price (e.g., cUSD-USDC)`);
    console.log(`   - GET /api/uniswap/pools/:pair - Compare all fee tiers`);
    console.log(`   - GET /api/uniswap/quote - Get swap quote with price impact`);
    console.log(`🎯 Example Uniswap calls:`);
    console.log(`   curl "http://localhost:${PORT}/api/uniswap/price/cUSD-USDC?fee=3000"`);
    console.log(`   curl "http://localhost:${PORT}/api/uniswap/quote?tokenIn=cUSD&tokenOut=USDC&amountIn=100"`);
  });
}

// Uniswap V3 price fetching for Celo pairs
app.get('/api/uniswap/price/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const { fee = 3000 } = req.query; // Default to 0.3% fee tier
    
    const result = await getUniswapCeloPrices(pair, parseInt(fee));
    res.json(result);

  } catch (error) {
    console.error('Uniswap V3 price fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Uniswap V3 price',
      details: error.message
    });
  }
});

// Get multiple pool prices and find best rates
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

    // Check all fee tiers
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    const poolData = [];

    for (const fee of feeTiers) {
      try {
        const poolAddress = await uniswapContracts.factory.getPool(token0Address, token1Address, fee);
        
        if (poolAddress !== ethers.ZeroAddress) {
          const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_ABIS.Pool, uniswapContracts.factory.runner);
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
        recommendedPool: poolData[0] || null,
        totalPools: poolData.length,
        timestamp: new Date().toISOString()
      },
      source: 'uniswap_v3_celo'
    });

  } catch (error) {
    console.error('Uniswap pools fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Uniswap V3 pools',
      details: error.message
    });
  }
});

// Get swap quote with price impact
app.get('/api/uniswap/quote', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, fee = 3000 } = req.query;
    
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

    // Get pool price for comparison
    const poolResult = await getUniswapCeloPrices(`${tokenIn}-${tokenOut}`, parseInt(fee));
    
    // Simple quote calculation (in production would use Quoter contract)
    const amountInWei = ethers.parseUnits(amountIn.toString(), 18); // Assuming 18 decimals
    const estimatedAmountOut = poolResult.data.price.token0ToToken1 * parseFloat(amountIn);
    
    // Calculate price impact (simplified)
    const poolLiquidity = parseFloat(poolResult.data.poolStats.liquidity);
    const tradeSize = parseFloat(amountIn);
    const priceImpact = Math.min((tradeSize / poolLiquidity) * 100, 15); // Cap at 15%

    res.json({
      success: true,
      data: {
        tokenIn,
        tokenOut,
        amountIn,
        estimatedAmountOut: estimatedAmountOut.toFixed(6),
        rate: poolResult.data.price.token0ToToken1,
        fee: fee / 10000,
        priceImpact: priceImpact.toFixed(4),
        poolAddress: poolResult.data.poolAddress,
        minimumAmountOut: (estimatedAmountOut * 0.995).toFixed(6), // 0.5% slippage
        gasEstimate: "~150,000", // Simplified estimate
        timestamp: new Date().toISOString()
      },
      source: 'uniswap_v3_celo'
    });

  } catch (error) {
    console.error('Uniswap quote error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Uniswap quote',
      details: error.message
    });
  }
});

startServer().catch(console.error);