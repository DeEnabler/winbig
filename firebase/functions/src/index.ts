
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { LiveMarketService } from './lib/live-market-service';
import { EphemeralCredentialManager } from './lib/credential-manager'; // Added this import

// Initialize the Express app
const app = express();

// Initialize services
const credentialManager = new EphemeralCredentialManager(); // Use the manager
const marketService = new LiveMarketService(credentialManager); // Pass manager to service

// Logging middleware - THIS IS NEW
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.path}, Query: ${JSON.stringify(req.query)}, Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Enable CORS for all routes, which is necessary for frontend calls
app.use(cors({ origin: true }));

// This is the primary endpoint your frontend will call.
// It fetches a list of live markets, optionally filtered by category.
app.get('/markets/live-odds/:category?', async (req: express.Request, res: express.Response) => {
  try {
    const { category } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    console.log(`Fetching live odds. Category: ${category}, Limit: ${limit}`);

    const markets = await marketService.getLiveMarkets(limit, category || undefined); // Pass category

    if (!markets || markets.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No live markets found for the given criteria.',
      });
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      marketCount: markets.length,
      markets: markets,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('❌ Error fetching live market odds:', errorMessage, error); // Log the full error
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live market odds.',
      message: errorMessage,
    });
  }
});

// Wallet and API key generation endpoints (for testing/admin)
app.post('/wallet/generate', async (req: express.Request, res: express.Response) => {
  try {
    const { network: networkParam, privateKey } = req.body;
    const network = (networkParam === 'mainnet' || networkParam === 'polygon') ? 'polygon' : 'amoy';
    
    console.log(`Generating wallet. Network: ${network}, Existing Key Provided: ${!!privateKey}`);
    
    const result = await credentialManager.generateNewCredentials(network, privateKey);
    
    if (result.success && result.wallet && result.credentials) {
      res.json({
        success: true,
        wallet: {
          address: result.wallet.address,
          // Note: Never return private key in production for general use!
          // This endpoint is for admin/testing.
        },
        credentials: {
            key: result.credentials.key,
            // secret: result.credentials.secret, // Avoid returning secret unless absolutely necessary
            // passphrase: result.credentials.passphrase // Avoid returning passphrase
        },
        network: network,
        message: "Credentials generated. See function logs for full details."
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Wallet generation failed during credential manager call'
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during wallet generation';
    console.error('❌ Error generating wallet:', errorMessage, error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate wallet.',
      message: errorMessage
    });
  }
});


// Admin endpoint to check current credential status
app.get('/admin/credential-status', (req, res) => {
  try {
    const status = credentialManager.getCredentialStatus();
    res.status(200).json({ success: true, ...status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error getting credential status:', errorMessage, error);
    res.status(500).json({ success: false, error: 'Failed to get credential status.', message: errorMessage });
  }
});

// Admin endpoint to manually refresh credentials
app.post('/admin/refresh-credentials', async (req, res) => {
  try {
    const { network: networkParam } = req.body;
    const network = (networkParam === 'mainnet' || networkParam === 'polygon') ? 'polygon' : 'amoy';
    console.log(`Attempting to refresh credentials for network: ${network}`);
    await credentialManager.forceRefreshCredentials(network);
    const status = credentialManager.getCredentialStatus();
    res.status(200).json({ success: true, message: `Credentials refreshed for ${network}.`, newStatus: status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error refreshing credentials:', errorMessage, error);
    res.status(500).json({ success: false, error: 'Failed to refresh credentials.', message: errorMessage });
  }
});


// A simple health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  console.log('Health check endpoint hit.');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: "WinBig API is up and running!"
  });
});

// Export the Express app as a Firebase Function named 'api'.
// This is the name you will see in your Firebase console.
export const api = functions.https.onRequest(app);

    