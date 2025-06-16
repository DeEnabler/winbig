
import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { generateTestnetWalletAndKeys } from './generate-wallet-and-keys';
import type { AuthResult, EphemeralCredentialManagerInterface, LiveMarket, NetworkConfig } from './types'; // Assuming types.ts is in the same directory
import { NETWORKS } from './types';

export class LiveMarketService {
  private clobClient: ClobClient | null = null;
  private wallet: Wallet | null = null;
  private credentialManager?: EphemeralCredentialManagerInterface;
  private currentNetwork: NetworkConfig = NETWORKS.amoy; // Default to Amoy

  constructor(credentialManager?: EphemeralCredentialManagerInterface, network: 'amoy' | 'polygon' = 'amoy') {
    this.credentialManager = credentialManager;
    this.currentNetwork = NETWORKS[network];
    if (!this.currentNetwork) {
        console.error(\`Invalid network specified: \${network}, defaulting to Amoy.\`);
        this.currentNetwork = NETWORKS.amoy;
    }
  }

  private async ensureAuthenticatedClient(): Promise<void> {
    if (this.clobClient) {
      console.log('✅ Using existing authenticated CLOB client.');
      return;
    }

    let authResult: AuthResult;

    if (this.credentialManager) {
      console.log('🚀 Using EphemeralCredentialManager to get/refresh credentials for network:', this.currentNetwork.name);
      const creds = await this.credentialManager.getCredentials(this.currentNetwork.name === NETWORKS.polygon.name ? 'polygon' : 'amoy');
      if (!creds.success || !creds.wallet || !creds.credentials) {
        console.error('❌ Failed to get credentials via EphemeralCredentialManager. Falling back to direct generation.', creds.error);
        // Fallback to direct generation if manager fails
        authResult = await generateTestnetWalletAndKeys(); // Consider which network to use for fallback
      } else {
        authResult = creds;
        console.log('✅ Credentials successfully retrieved via EphemeralCredentialManager.');
      }
    } else {
      console.warn('🤔 No EphemeralCredentialManager provided to LiveMarketService. Generating new wallet and credentials directly (less efficient). This might happen if used outside of the intended Firebase Function context without a manager.');
      authResult = await generateTestnetWalletAndKeys(); // Defaulting to testnet if no manager
    }

    if (!authResult.success || !authResult.wallet || !authResult.credentials) {
      throw new Error('❌ Failed to generate/retrieve wallet and credentials for LiveMarketService.');
    }

    this.wallet = new Wallet(authResult.wallet.privateKey);

    this.clobClient = new ClobClient(
      this.currentNetwork.clobUrl,
      this.currentNetwork.chainId,
      this.wallet,
      {
        key: authResult.credentials.key,
        secret: authResult.credentials.secret,
        passphrase: authResult.credentials.passphrase,
      }
    );

    console.log(\`✅ New authenticated CLOB client created successfully for \${this.currentNetwork.name}.\`);
  }

  async getLiveMarkets(limit: number = 20, category?: string): Promise<LiveMarket[]> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("CLOB Client not initialized in getLiveMarkets");
    }

    console.log(\`📊 Fetching up to \${limit} live markets. Category: \${category || 'All'}\`);
    
    // The getMarkets method in clob-client might not directly support category filtering.
    // Filtering by category usually happens on the Polymarket GQL API, not directly in CLOB.
    // For now, we fetch all and then could filter client-side if categories were available in market data.
    // Or the backend API endpoint would need to query Polymarket's GQL for category-specific markets.
    // The current ClobClient().getMarkets() returns a structure that needs to be mapped.
    const marketDataPayload = await this.clobClient.getMarkets(); // Fetches all markets from CLOB.
    
    // Assuming marketDataPayload.data is an array of markets
    const allMarkets = marketDataPayload.data || [];

    const liveMarkets: LiveMarket[] = allMarkets.map((market: any) => ({
      id: market.condition_id, // Corrected mapping
      question: market.question,
      // Yes/No prices require fetching orderbook for each market
      // This is inefficient to do for a list here.
      // The API should ideally provide this or we fetch for a single market.
      // For a list, we'll use placeholders or simplified logic.
      yesPrice: 0.50, // Placeholder - requires individual orderbook fetch
      noPrice: 0.50,  // Placeholder
      category: market.category || "General", // Assuming category might be present
      endsAt: market.end_date_iso ? new Date(market.end_date_iso) : undefined, // Assuming end_date_iso
    }));
    
    let filteredMarkets = liveMarkets;
    if (category) {
        console.log(\`Filtering for category: \${category}\`);
        filteredMarkets = liveMarkets.filter(market => market.category?.toLowerCase() === category.toLowerCase());
    }


    console.log(\`✅ Retrieved \${filteredMarkets.length} live markets after filtering (limit \${limit}).\`);
    return filteredMarkets.slice(0, limit);
  }

  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("CLOB Client not initialized in getMarketDetails");
    }

    console.log(\`🔍 Fetching details for market ID (conditionId): \${marketId}\`);
    
    // First, get general market info (like question, category)
    // ClobClient().getMarket(conditionId) might be the method
    // For now, let's assume we need orderbook for prices
    // And general info might come from a different source or be passed in.

    const orderbook = await this.clobClient.getOrderBook(marketId);
    
    if (!orderbook || !orderbook.bids || !orderbook.asks) {
        console.warn(\`❓ No orderbook data found for market \${marketId}\`);
        return null;
    }

    // Simplified price calculation from orderbook (mid-price)
    // Bids are sorted high to low, Asks low to high
    const bestBid = orderbook.bids[0] ? parseFloat(orderbook.bids[0].price) : null; // Price for YES
    const bestAsk = orderbook.asks[0] ? parseFloat(orderbook.asks[0].price) : null; // Price for YES

    let yesPrice = 0.5; // Default
    if (bestBid !== null && bestAsk !== null) {
        yesPrice = (bestBid + bestAsk) / 2;
    } else if (bestBid !== null) {
        yesPrice = bestBid; // Or some adjustment
    } else if (bestAsk !== null) {
        yesPrice = bestAsk; // Or some adjustment
    }
    
    yesPrice = Math.max(0.01, Math.min(0.99, yesPrice)); // Clamp price

    // Fetch market details to get the question (ClobClient().getMarkets() returns conditionId, question, etc)
    // This is inefficient here. Ideally, question comes from a list or is passed.
    // Let's simulate fetching it for now or assume it's known.
    const marketsList = await this.clobClient.getMarkets();
    const marketInfo = marketsList.data.find((m: any) => m.condition_id === marketId);

    return {
      id: marketId,
      question: marketInfo ? marketInfo.question : 'Question not found for this ID',
      yesPrice: parseFloat(yesPrice.toFixed(2)),
      noPrice: parseFloat((1 - yesPrice).toFixed(2)),
      category: marketInfo ? marketInfo.category : "General",
      endsAt: marketInfo && marketInfo.end_date_iso ? new Date(marketInfo.end_date_iso) : undefined,
    };
  }
}
