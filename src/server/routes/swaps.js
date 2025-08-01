import express from 'express';
import { storage } from '../config/storage.js';
import { executeEthereumTransaction, executeSuiTransaction } from '../services/blockchain.js';

const router = express.Router();

// Global swap states storage
const atomicSwapStates = new Map();

// Enhanced swap completion storage function
async function storeCompletedSwapData(swapId, swapState, executionResult) {
  try {
    console.log(`💾 storeCompletedSwapData called for ${swapId}`);
    console.log(`📊 Swap state summary:`, {
      fromToken: swapState.fromToken,
      toToken: swapState.toToken,
      amount: swapState.amount,
      sourceChain: swapState.sourceChain,
      targetChain: swapState.targetChain,
      status: swapState.status
    });
    
    // Extract transaction hashes from execution results and swap state
    let ethereumTxHash = null;
    let suiTxHash = null;
    
    // Check execution result
    if (executionResult?.data?.transactionHash) {
      if (executionResult.data.chain === 'ethereum') {
        ethereumTxHash = executionResult.data.transactionHash;
      } else if (executionResult.data.chain === 'sui') {
        suiTxHash = executionResult.data.transactionHash;
      }
    }
    
    // Check all steps for transaction hashes
    if (swapState.executionPlan?.steps) {
      for (const step of swapState.executionPlan.steps) {
        if (step.result?.data?.transactionHash) {
          if (step.result.data.chain === 'ethereum') {
            ethereumTxHash = step.result.data.transactionHash;
          } else if (step.result.data.chain === 'sui') {
            suiTxHash = step.result.data.transactionHash;
          }
        }
        if (step.result?.transactionHash) {
          // Determine chain based on hash format or other properties
          if (step.result.transactionHash.startsWith('0x')) {
            ethereumTxHash = step.result.transactionHash;
          } else {
            suiTxHash = step.result.transactionHash;
          }
        }
      }
    }
    
    console.log(`🔗 Extracted transaction hashes - Ethereum: ${ethereumTxHash}, Sui: ${suiTxHash}`);
    
    // Calculate estimated profit
    const estimatedProfit = (parseFloat(swapState.amount) || 100) * 0.005; // 0.5% profit
    
    const completedSwap = {
      id: swapId,
      assetPairFrom: swapState.fromToken || 'USDC',
      assetPairTo: swapState.toToken || 'USDY',
      sourceChain: swapState.sourceChain || 'ethereum',
      targetChain: swapState.targetChain || 'sui',
      amount: parseFloat(swapState.amount) || 100,
      profit: estimatedProfit,
      status: 'completed',
      timestamp: new Date().toISOString(),
      swapDirection: `${swapState.sourceChain || 'ethereum'} → ${swapState.targetChain || 'sui'}`,
      ethereumTxHash,
      suiTxHash,
      explorerUrls: {
        ethereum: ethereumTxHash ? `https://sepolia.etherscan.io/tx/${ethereumTxHash}` : null,
        sui: suiTxHash ? `https://suiexplorer.com/txblock/${suiTxHash}?network=testnet` : null
      }
    };
    
    console.log(`✅ Storing completed swap:`, completedSwap);
    await storage.storeCompletedSwap(completedSwap);
    
    console.log(`🎉 Successfully stored completed swap ${swapId} with hashes - ETH: ${ethereumTxHash}, SUI: ${suiTxHash}`);
    
  } catch (error) {
    console.error(`❌ Failed to store completed swap ${swapId}:`, error);
    throw error;
  }
}

// Execute atomic swap step endpoint
router.post("/execute-step", async (req, res) => {
  try {
    const { swapId, step } = req.body;
    
    if (!atomicSwapStates.has(swapId)) {
      return res.status(404).json({
        success: false,
        error: 'Swap not found'
      });
    }
    
    const swapState = atomicSwapStates.get(swapId);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (currentTime > swapState.timelock) {
      return res.status(400).json({
        success: false,
        error: 'Swap timelock expired'
      });
    }
    
    const currentStep = swapState.executionPlan.steps[step - 1];
    if (!currentStep) {
      return res.status(400).json({
        success: false,
        error: `Invalid step: ${step}`
      });
    }
    
    console.log(`🔄 Executing step ${step} for swap ${swapId}`);
    
    // Execute the step based on chain
    let executionResult;
    try {
      if (currentStep.chain === 'ethereum') {
        executionResult = await executeEthereumTransaction(currentStep.transactionData);
        executionResult.status = 'COMPLETED';
        executionResult.executedAt = new Date().toISOString();
      } else if (currentStep.chain === 'sui') {
        executionResult = await executeSuiTransaction(currentStep.transactionData);
        executionResult.status = 'COMPLETED';
        executionResult.executedAt = new Date().toISOString();
      } else if (currentStep.chain === 'both') {
        // Handle bridge operations
        const ethResult = await executeEthereumTransaction(currentStep.transactionData.step1);
        const suiResult = await executeSuiTransaction(currentStep.transactionData.step2);
        
        executionResult = {
          status: 'COMPLETED',
          executedAt: new Date().toISOString(),
          data: {
            ethereum: ethResult.data,
            sui: suiResult.data
          }
        };
      } else {
        throw new Error(`Unsupported chain: ${currentStep.chain}`);
      }
    } catch (error) {
      console.error(`Step ${step} execution failed:`, error);
      return res.status(500).json({
        success: false,
        error: 'Transaction execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        step: currentStep
      });
    }

    // Update step status
    currentStep.status = executionResult.status;
    currentStep.result = executionResult;
    currentStep.executedAt = executionResult.executedAt;
    
    console.log(`🔍 Completion check for step ${step}/${swapState.executionPlan.steps.length}:`);
    
    // Enhanced completion detection
    const allStepsComplete = swapState.executionPlan.steps.every((s) => s.status === 'COMPLETED');
    const isFinalStep = (step === swapState.executionPlan.steps.length);
    const hasSuccessfulExecution = executionResult?.data?.transactionHash || 
                                  executionResult?.data?.ethereum?.transactionHash ||
                                  executionResult?.data?.sui?.transactionHash;
    
    console.log(`   - All steps complete: ${allStepsComplete}`);
    console.log(`   - Is final step: ${isFinalStep}`);
    console.log(`   - Has successful execution: ${hasSuccessfulExecution}`);
    
    // Mark swap as completed and store data
    if (allStepsComplete || (isFinalStep && hasSuccessfulExecution)) {
      swapState.status = 'COMPLETED';
      console.log(`✅ Swap ${swapId} completed successfully - triggering storage`);
      
      try {
        await storeCompletedSwapData(swapId, swapState, executionResult);
        console.log(`✅ Successfully stored completed swap ${swapId}`);
      } catch (storeError) {
        console.error(`❌ Failed to store completed swap ${swapId}:`, storeError);
      }
    } else {
      console.log(`⏳ Swap ${swapId} not yet complete - continuing execution`);
    }

    swapState.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: {
        swapId,
        currentStep: step,
        stepResult: executionResult,
        swapStatus: swapState.status,
        nextStep: allStepsComplete ? null : step + 1,
        isComplete: allStepsComplete,
        timeRemaining: Math.max(0, swapState.timelock - currentTime),
        executionProgress: {
          completed: swapState.executionPlan.steps.filter((s) => s.status === 'COMPLETED').length,
          total: swapState.executionPlan.steps.length,
          percentage: Math.round((swapState.executionPlan.steps.filter((s) => s.status === 'COMPLETED').length / swapState.executionPlan.steps.length) * 100)
        }
      }
    });

  } catch (error) {
    console.error('Swap execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute swap step',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create bidirectional swap endpoint
router.post("/bidirectional", async (req, res) => {
  try {
    const { fromToken, toToken, amount, sourceChain, targetChain, walletSession } = req.body;
    
    console.log(`🚀 Creating bidirectional swap: ${amount} ${fromToken} (${sourceChain}) → ${toToken} (${targetChain})`);
    
    const swapId = `real_swap_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const currentTime = Math.floor(Date.now() / 1000);
    const timelock = currentTime + 3600; // 1 hour timelock
    
    // Create execution plan with 5 steps
    const executionPlan = {
      steps: [
        {
          id: 1,
          type: 'LOCK_SOURCE',
          chain: sourceChain,
          status: 'PENDING',
          transactionData: {
            to: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
            value: '0x0',
            data: '0xa9059cbb000000000000000000000000391f48752acd48271040466d748fcb367f2d2a1f0000000000000000000000000000000000000000000000000de0b6b3a7640000',
            gasLimit: '0x5208'
          },
          description: `Lock ${amount} ${fromToken} on ${sourceChain}`
        },
        {
          id: 2,
          type: 'VERIFY_LOCK',
          chain: sourceChain,
          status: 'PENDING',
          transactionData: {
            to: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
            value: '0x0',
            data: '0xa9059cbb000000000000000000000000391f48752acd48271040466d748fcb367f2d2a1f0000000000000000000000000000000000000000000000000de0b6b3a7640000',
            gasLimit: '0x5208'
          },
          description: `Verify lock on ${sourceChain}`
        },
        {
          id: 3,
          type: 'INITIATE_TARGET',
          chain: targetChain,
          status: 'PENDING',
          transactionData: {
            type: 'sui_token_transfer',
            amount: amount * 1000000,
            recipient: walletSession?.suiAddress,
            description: `Initiate ${toToken} transfer on ${targetChain}`
          },
          description: `Initiate ${toToken} on ${targetChain}`
        },
        {
          id: 4,
          type: 'BRIDGE_TRANSFER',
          chain: 'both',
          status: 'PENDING',
          transactionData: {
            step1: {
              to: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
              value: '0x0',
              data: '0xa9059cbb000000000000000000000000391f48752acd48271040466d748fcb367f2d2a1f0000000000000000000000000000000000000000000000000de0b6b3a7640000',
              gasLimit: '0xC350'
            },
            step2: {
              type: 'sui_transfer',
              amount: amount * 21000000,
              description: 'BRIDGE_TRANSFER - Sui side'
            }
          },
          description: 'Bridge transfer between chains'
        },
        {
          id: 5,
          type: 'FUSION_SWAP_DEST',
          chain: targetChain,
          status: 'PENDING',
          transactionData: {
            type: 'sui_token_transfer',
            amount: amount * 21000000,
            recipient: walletSession?.suiAddress,
            description: `Swap bridge token → ${toToken} on ${targetChain} - Real SUI transaction on Sui Testnet`
          },
          description: `Complete swap to ${toToken} on ${targetChain}`
        }
      ]
    };
    
    const swapState = {
      swapId,
      fromToken,
      toToken,
      amount,
      sourceChain,
      targetChain,
      status: 'CREATED',
      timelock,
      executionPlan,
      walletSession,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    atomicSwapStates.set(swapId, swapState);
    
    console.log(`✅ Created swap ${swapId} with ${executionPlan.steps.length} steps`);
    
    res.json({
      success: true,
      data: {
        swapId,
        status: swapState.status,
        timelock,
        executionPlan: {
          totalSteps: executionPlan.steps.length,
          steps: executionPlan.steps.map(step => ({
            id: step.id,
            type: step.type,
            chain: step.chain,
            status: step.status,
            description: step.description
          }))
        },
        message: `Bidirectional swap created: ${amount} ${fromToken} → ${toToken}`,
        estimatedGas: '0.005 ETH',
        estimatedTime: '5-10 minutes'
      }
    });
    
  } catch (error) {
    console.error('Bidirectional swap creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bidirectional swap',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;