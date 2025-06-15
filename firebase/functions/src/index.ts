import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';

// Import your lib functions using relative paths
import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys, generateFromExistingKey } from './lib/generate-wallet-and-keys';
// Placeholder for market functions if you add them later
// import { getActiveMarkets, getMarketQuotes } from './lib/polymarket'; // Assuming polymarket.ts would be in lib too

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Example: Market discovery endpoint (Placeholder - needs getActiveMarkets implementation)
// app.get('/api/markets/discover', async (req, res) => {
//   try {
//     // const markets = await getActiveMarkets();
//     // res.json(markets);
//     res.status(501).json({ error: 'getActiveMarkets not implemented' });
//   } catch (error) {
//     console.error('Error fetching markets:', error);
//     res.status(500).json({ 
//       error: 'Failed to fetch markets',
//       message: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// Example: Market quotes endpoint (Placeholder - needs getMarketQuotes implementation)
// app.get('/api/markets/quotes', async (req, res) => {
//   try {
//     const { marketId } = req.query;
//     if (!marketId || typeof marketId !== 'string') {
//       return res.status(400).json({ error: 'Missing or invalid marketId parameter' });
//     }
//     // const quotes = await getMarketQuotes(marketId);
//     // res.json(quotes);
//     res.status(501).json({ error: 'getMarketQuotes not implemented' });
//   } catch (error) {
//     console.error('Error fetching quotes:', error);
//     res.status(500).json({ 
//       error: 'Failed to fetch quotes',
//       message: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

app.post('/api/wallet/generate', async (req, res) => {
  try {
    const { network, privateKey } = req.body; // network can be 'amoy' or 'polygon'
    
    let result;
    if (privateKey && typeof privateKey === 'string') {
      result = await generateFromExistingKey(privateKey, network === 'polygon' ? 'polygon' : 'amoy');
    } else if (network === 'polygon') {
      result = await generateMainnetWalletAndKeys();
    } else { // Default to amoy/testnet
      result = await generateTestnetWalletAndKeys();
    }
    
    if (result.success) {
      res.json({
        success: true,
        wallet: {
          address: result.wallet.address,
          // IMPORTANT: In a real production app, NEVER return the privateKey to the client.
          // This is included here based on "Cursor dev" notes but is a security risk.
          privateKey: result.wallet.privateKey 
        },
        credentials: result.credentials,
        network: network || (privateKey ? (network || 'amoy') : 'amoy')
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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'winbig-firebase-functions' // Updated service name
  });
});

export const api = functions.https.onRequest(app);
