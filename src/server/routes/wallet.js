import express from 'express';

const router = express.Router();

// Wallet connection endpoint
router.post('/connect', async (req, res) => {
  try {
    const { walletType, address, chainId } = req.body;
    
    console.log(`🔗 Wallet connection: ${walletType} - ${address} (Chain: ${chainId})`);
    
    // Validate wallet connection
    if (!address || address.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }
    
    res.json({
      success: true,
      data: {
        walletType,
        address,
        chainId,
        connectedAt: new Date().toISOString(),
        balance: {
          USDC: 10.0,
          USDT: 0.0,
          DAI: 0.0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to connect wallet'
    });
  }
});

export default router;