import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { generateTestnetWalletAndKeys } from './generate-wallet-and-keys';
import { NETWORKS } from './types';

// Define a simpler interface for the market data we need
export interface LiveMarket {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  // Add other relevant fields like volume, liquidity, deadline
}

export class LiveMarketService {
  private clobClient: ClobClient | null = null;
  private wallet: Wallet | null = null;

  constructor() {
    // Initialization is now handled in ensureAuthenticatedClient
  }

  /**
   * Ensures an authenticated CLOB client is available.
   * If not, it generates a new wallet and credentials and initializes the client.
   */
  private async ensureAuthenticatedClient(): Promise<void> {
    if (this.clobClient) {
      console.log('✅ Using existing authenticated client.');
      return;
    }

    console.log('🚀 No authenticated client found. Generating new wallet and credentials...');
    const authResult = await generateTestnetWalletAndKeys();

    if (!authResult.success || !authResult.credentials) {
      throw new Error('Failed to generate wallet and credentials for LiveMarketService.');
    }

    // Create a wallet instance for the clob client
    this.wallet = new Wallet(authResult.wallet.privateKey);

    // Initialize the CLOB client with the new credentials
    this.clobClient = new ClobClient(
      NETWORKS.amoy.clobUrl,
      NETWORKS.amoy.chainId,
      this.wallet,
      {
        key: authResult.credentials.key,
        secret: authResult.credentials.secret,
        passphrase: authResult.credentials.passphrase,
      }
    );

    console.log('✅ New authenticated client created successfully.');
  }

  /**
   * Fetches live markets using the authenticated client.
   */
  async getLiveMarkets(limit: number = 20): Promise<LiveMarket[]> {
    await this.ensureAuthenticatedClient();

    console.log(`📊 Fetching up to ${limit} live markets...`);
    // The getMarkets method returns a paginated payload.
    const marketData = await this.clobClient!.getMarkets();

    const liveMarkets: LiveMarket[] = marketData.data.map((market: any) => ({
      id: market.conditionId,
      question: market.question,
      // You'll need to fetch the price for each market, e.g., using getOrderBook
      yesPrice: 0.5, // Placeholder
      noPrice: 0.5,  // Placeholder
    }));

    return liveMarkets.slice(0, limit);
  }

  /**
   * Fetches detailed information for a single market.
   */
  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    await this.ensureAuthenticatedClient();

    console.log(`🔍 Fetching details for market: ${marketId}`);
    // Correct method is getOrderBook
    const orderbook = await this.clobClient!.getOrderBook(marketId);
    
    // This is a simplified price calculation. You'll need to adapt this.
    const bestBid = orderbook.bids[0]?.price;
    const bestAsk = orderbook.asks[0]?.price;

    if (!bestBid || !bestAsk) {
        return null;
    }

    const yesPrice = (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;

    return {
      id: marketId,
      question: 'Fetch question from getMarket() or pass in', // Placeholder
      yesPrice: yesPrice,
      noPrice: 1 - yesPrice,
    };
  }
} 