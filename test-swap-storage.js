// Test swap storage mechanism
import axios from 'axios';

async function testSwapStorage() {
  try {
    console.log('Testing swap storage mechanism...');
    
    // Create a test completed swap with the real transaction hashes from the console logs
    const testSwap = {
      swapId: 'real_swap_1754011618357_ikwerl8n',
      swapState: {
        swapId: 'real_swap_1754011618357_ikwerl8n',
        fromToken: 'USDC',
        toToken: 'USDY',
        amount: 100,
        sourceChain: 'ethereum',
        targetChain: 'sui',
        status: 'COMPLETED',
        walletSession: {
          evmAddress: '0x391f48752acd48271040466d748fcb367f2d2a1f',
          suiAddress: '0x430e58e38673e9d0969bcc34c96b4d362d33515d41f677ac147eaa58892815b5'
        },
        executionPlan: {
          steps: [
            { status: 'COMPLETED', result: { transactionHash: '0xbcd30211c660a9ad89ff32b931dfc4e9cc4a09a86f34612a5da592d002dfcc72' } },
            { status: 'COMPLETED', result: { transactionHash: 'CsHMJjczkoZfbzPd6NgCBa3UjAgePog9ziVh45rMWGnd' } }
          ]
        },
        createdAt: new Date().toISOString()
      },
      executionResult: {
        data: {
          transactionHash: 'CsHMJjczkoZfbzPd6NgCBa3UjAgePog9ziVh45rMWGnd',
          chain: 'sui'
        }
      }
    };
    
    // Call the storeCompletedSwapData endpoint directly
    const response = await axios.post('http://localhost:5000/api/test/store-swap', testSwap);
    console.log('Store swap response:', response.data);
    
    // Check transaction history
    const historyResponse = await axios.post('http://localhost:5000/api/transactions/history', {
      ethereumAddress: '0x391f48752acd48271040466d748fcb367f2d2a1f',
      suiAddress: '0x430e58e38673e9d0969bcc34c96b4d362d33515d41f677ac147eaa58892815b5'
    });
    
    console.log('Transaction history after test:', historyResponse.data);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testSwapStorage();