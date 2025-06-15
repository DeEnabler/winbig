import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';

// Import your API routes
import { getActiveMarkets, getMarketQuotes } from './lib/polymarket';
import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys, generateFromExistingKey } from './lib/generate-wallet-and-keys';

const app = express();

// Enable CORS for all routes
app.use(cors({ origin: true }));

// Parse JSON bodies
app.use(express.json());

// Market discovery endpoint
app.get('/api/markets/discover', async (req, res) => {
  try {
    const markets = await getActiveMarkets();
    res.json(markets);
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch markets',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Market quotes endpoint
app.get('/api/markets/quotes', async (req, res) => {
  try {
    const { marketId } = req.query;
    
    if (!marketId || typeof marketId !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid marketId parameter' 
      });
    }
    
    const quotes = await getMarketQuotes(marketId);
    res.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quotes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Wallet and API key generation endpoints
app.post('/api/wallet/generate', async (req, res) => {
  try {
    const { network, privateKey } = req.body;
    
    let result;
    if (privateKey) {
      // Generate from existing private key
      result = await generateFromExistingKey(privateKey, network || 'amoy');
    } else if (network === 'mainnet' || network === 'polygon') {
      // Generate mainnet wallet
      result = await generateMainnetWalletAndKeys();
    } else {
      // Generate testnet wallet (default)
      result = await generateTestnetWalletAndKeys();
    }
    
    if (result.success) {
      res.json({
        success: true,
        wallet: {
          address: result.wallet.address,
          // Note: Never return private key in production!
          privateKey: result.wallet.privateKey
        },
        credentials: result.credentials,
        network: network || 'testnet'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Wallet generation failed'
      });
    }
  } catch (error) {
    console.error('Error generating wallet:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate wallet',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'polymarket-api'
  });
});

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app); 