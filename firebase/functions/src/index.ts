
import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';

import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys, generateFromExistingKey } from './lib/generate-wallet-and-keys';
import { LiveMarketService } from './lib/live-market-service';
// EphemeralCredentialManager is used internally by LiveMarketService
// import { EphemeralCredentialManager } from './lib/credential-manager';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Wallet Generation Endpoint (primarily for setup/testing, not direct user calls in WinBig)
app.post('/api/wallet/generate', async (req, res) => {
  try {
    const { network, privateKey } = req.body; 
    
    let result;
    if (privateKey && typeof privateKey === 'string') {
      result = await generateFromExistingKey(privateKey, network === 'polygon' ? 'polygon' : 'amoy');
    } else if (network === 'polygon' || network === 'mainnet') { // Accept 'mainnet' as alias for 'polygon'
      result = await generateMainnetWalletAndKeys();
    } else { 
      result = await generateTestnetWalletAndKeys(); // Default to amoy/testnet
    }
    
    if (result.success) {
      res.json({
        success: true,
        wallet: {
          address: result.wallet.address,
          // IMPORTANT: In a real production app, NEVER return the privateKey to the client
          // This is returned here for backend setup/dev purposes as per original structure
          privateKey: result.wallet.privateKey 
        },
        credentials: result.credentials,
        networkUsed: result.wallet.address ? (network === 'polygon' || network === 'mainnet' ? 'polygon' : 'amoy') : 'unknown'
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

// Live Market Odds Endpoint
app.get('/api/markets/live-odds/:category?', async (req, res) => {
  try {
    const { category } = req.params;
    const limitQuery = req.query.limit;
    const limit = limitQuery ? parseInt(limitQuery as string, 10) : 10;

    if (isNaN(limit) || limit <= 0) {
        return res.status(400).json({ success: false, error: "Invalid 'limit' parameter." });
    }

    // LiveMarketService now uses EphemeralCredentialManager internally
    const marketService = new LiveMarketService();
    
    let markets;
    if (category) {
      markets = await marketService.getMarketsByCategory(category, limit);
    } else {
      // If no category, maybe fetch trending or a default set
      markets = await marketService.getTrendingMarkets(limit); 
    }
    
    res.json({
      success: true,
      markets: markets.map(market => ({
        id: market.id,
        question: market.question,
        category: market.category,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        volume24h: market.volume24h,
        deadline: market.deadline, 
        liquidity: market.liquidity,
        imageUrl: market.imageUrl,
        description: market.description,
      }))
    });
  } catch (error) {
    console.error('Error fetching live odds:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch live odds',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Credential Status Endpoint (for debugging/monitoring ephemeral credentials)
app.get('/api/admin/credential-status', async (req, res) => {
  try {
    // This should be protected in a real app (e.g., admin auth middleware)
    const marketService = new LiveMarketService(); // Instantiates EphemeralCredentialManager
    const status = marketService.getCredentialStatus();
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error fetching credential status:', error);
    res.status(500).json({ success: false, error: 'Failed to get credential status' });
  }
});

// Endpoint to manually refresh credentials (for debugging)
app.post('/api/admin/refresh-credentials', async (req, res) => {
  try {
    // This should be protected
    const { network } = req.body; // 'testnet' or 'mainnet'
    if (network !== 'testnet' && network !== 'mainnet') {
      return res.status(400).json({ success: false, error: "Invalid network. Use 'testnet' or 'mainnet'." });
    }
    const marketService = new LiveMarketService();
    await marketService.refreshCredentials(network);
    res.json({ success: true, message: `Credentials for ${network} refreshed.` });
  } catch (error) {
    console.error('Error refreshing credentials:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh credentials' });
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
