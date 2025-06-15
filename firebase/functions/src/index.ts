
import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';

// Import your lib functions using relative paths
import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys, generateFromExistingKey } from './lib/generate-wallet-and-keys';
import { LiveMarketService } from './lib/live-market-service';
// CredentialManager is not directly used in API endpoints here, but for setup.
// import { CredentialManager } from './lib/credential-manager';


const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Existing Wallet Generation Endpoint
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
          // For an internal setup step, this might be acceptable if the endpoint is protected.
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

// NEW Endpoint for Live Market Odds
app.get('/api/markets/live-odds/:category?', async (req, res) => {
  try {
    const { category } = req.params; // Optional category from URL path
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    // Retrieve credentials securely stored in Firebase Functions config
    // These should be set via `firebase functions:config:set polymarket.api_key=...` etc.
    // or by using Google Secret Manager.
    const polymarketConfig = functions.config().polymarket;

    if (!polymarketConfig || !polymarketConfig.api_key) {
      console.error('Polymarket API credentials not found in Firebase config.');
      return res.status(500).json({ 
        success: false,
        error: 'API credentials not configured on the server.' 
      });
    }

    const credentials = {
      api_key: polymarketConfig.api_key,
      api_secret: polymarketConfig.api_secret,
      api_passphrase: polymarketConfig.api_passphrase,
      wallet_address: polymarketConfig.wallet_address,
    };

    const marketService = new LiveMarketService(credentials);
    const markets = await marketService.getActiveMarketsWithOdds(category, limit);
    
    res.json({
      success: true,
      markets: markets.map(market => ({
        id: market.id,
        question: market.question,
        category: market.category,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        volume24h: market.volume24h,
        deadline: market.endDate, // Ensure this is named 'deadline' for frontend
        liquidity: market.liquidity,
        imageUrl: market.imageUrl, // Pass along image URL if available
      }))
    });
  } catch (error)
  {
    console.error('Error fetching live odds:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch live odds',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'winbig-firebase-functions'
  });
});

export const api = functions.https.onRequest(app);

// Example of how one might create a one-time setup function for credentials.
// This would be a callable function, not a public HTTP endpoint.
// import { CredentialManager } from './lib/credential-manager';
// export const adminInitializeCredentials = functions.https.onCall(async (data, context) => {
//   // TODO: Add robust authentication to ensure only authorized admins can call this.
//   // Example: Check for a custom claim: context.auth?.token?.admin === true
//   if (!context.auth) { // Basic check, improve for production
//     throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
//   }
//   console.log('Admin request to initialize credentials by UID:', context.auth.uid);
//   try {
//     const result = await CredentialManager.initializePolymarketCredentials();
//     return result;
//   } catch (error) {
//     console.error("Error in adminInitializeCredentials callable function:", error);
//     throw new functions.https.HttpsError('internal', 'Failed to initialize credentials.', error instanceof Error ? error.message : undefined);
//   }
// });
