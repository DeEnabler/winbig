// src/lib/polymarket-sdk/live-market-service.ts
import { ClobClient } from '@polymarket/clob-client';
import { Wallet, providers as EthersProviders } from 'ethers'; // Using ethers v5
import type { AuthResult, EphemeralCredentialManagerInterface, LiveMarket, NetworkConfig } from './types';
import { NETWORKS } from './types';
import fetch from 'node-fetch'; // Ensure node-fetch is available for direct HTTP calls if running in Node.js for API routes

export class LiveMarketService {
  private clobClient: ClobClient | null = null;
  private wallet: Wallet | null = null;
  private credentialManager?: EphemeralCredentialManagerInterface;
  private currentNetwork: NetworkConfig = NETWORKS.polygon;

  constructor(credentialManager?: EphemeralCredentialManagerInterface, network: 'amoy' | 'polygon' = 'polygon') {
    this.credentialManager = credentialManager;
    this.currentNetwork = NETWORKS[network];
    if (!this.currentNetwork) {
        console.warn(`Invalid network specified: ${network}, defaulting to Polygon Mainnet.`);
        this.currentNetwork = NETWORKS.polygon;
    }
    console.log(`LiveMarketService initialized for network: ${this.currentNetwork.name}`);
  }

  private async ensureAuthenticatedClient(): Promise<void> {
    if (this.clobClient && this.wallet) {
      return;
    }

    let authResult: AuthResult;

    if (this.credentialManager) {
      console.log(`🚀 Using EphemeralCredentialManager to get/refresh credentials for network: ${this.currentNetwork.name}`);
      authResult = await this.credentialManager.getCredentials(this.currentNetwork.name === NETWORKS.polygon.name ? 'polygon' : 'amoy');
    } else {
      console.warn('🤔 No EphemeralCredentialManager provided. Generating new credentials directly (less efficient).');
      authResult = this.currentNetwork.name === NETWORKS.polygon.name 
        ? await import('./generate-wallet-and-keys').then(mod => mod.generateMainnetWalletAndKeys())
        : await import('./generate-wallet-and-keys').then(mod => mod.generateTestnetWalletAndKeys());
    }

    if (!authResult.success || !authResult.wallet || !authResult.credentials) {
      throw new Error(`❌ Failed to generate/retrieve wallet and credentials. Error: ${authResult.error}`);
    }

    const provider = new EthersProviders.JsonRpcProvider({
        url: this.currentNetwork.rpcUrl,
        timeout: 30000,
        headers: {"User-Agent": "ViralBetApp/1.0"}
    });
    this.wallet = new Wallet(authResult.wallet.privateKey, provider);

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
    console.log(`✅ New authenticated CLOB client created successfully for ${this.currentNetwork.name}.`);
  }

  private deduplicateMarkets(markets: any[]): any[] {
    const seen = new Set();
    return markets.filter(market => {
      const id = market.condition_id || market.id; // CLOB uses condition_id, Gamma uses id
      if (seen.has(id) || !id) return false;
      seen.add(id);
      return true;
    });
  }

  private mapMarketToLiveMarket(market: any, source: 'clob' | 'gamma'): LiveMarket {
    const now = new Date();
    let yesPrice = 0.50;
    let noPrice = 0.50;

    if (source === 'gamma' && market.outcomes && market.outcomes.length >= 2) {
        const yesOutcome = market.outcomes.find((o: any) => o.name?.toLowerCase() === 'yes');
        const noOutcome = market.outcomes.find((o: any) => o.name?.toLowerCase() === 'no');
        if (yesOutcome && typeof yesOutcome.price === 'number') yesPrice = yesOutcome.price;
        if (noOutcome && typeof noOutcome.price === 'number') noPrice = noOutcome.price;
        // Ensure prices sum to 1 if possible, or adjust if only one is valid
        if (yesOutcome && !noOutcome) noPrice = 1 - yesPrice;
        else if (!yesOutcome && noOutcome) yesPrice = 1 - noPrice;
    }
    // For CLOB sampling markets, price info might not be directly in the list object.
    // It often requires a separate order book fetch per market, which is too slow for a list.
    // So, we'll use placeholders for CLOB if detailed price isn't readily available.

    return {
      id: source === 'gamma' ? market.id : market.condition_id,
      question: market.question,
      yesPrice: parseFloat(Math.max(0.01, Math.min(0.99, yesPrice)).toFixed(2)),
      noPrice: parseFloat(Math.max(0.01, Math.min(0.99, noPrice)).toFixed(2)),
      category: market.category || "General",
      endsAt: market.endDate ? new Date(market.endDate) : (market.end_date_iso ? new Date(market.end_date_iso) : undefined),
    };
  }

  async getLiveMarkets(limit: number = 20, category?: string): Promise<LiveMarket[]> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("CLOB Client not initialized in getLiveMarkets");
    }

    console.log(`📊 Fetching live markets. Network: ${this.currentNetwork.name}, Category: ${category || 'All'}. Target limit: ${limit}`);
    
    let finalMarkets: any[] = [];
    const now = new Date();

    try {
      console.log("Attempting to fetch from clobClient.getSamplingMarkets...");
      const samplingResponse = await this.clobClient.getSamplingMarkets(""); // Empty string for all categories/types
      let samplingMarkets = (samplingResponse?.data || []).filter((market: any) => 
        market.active === true && market.closed === false && market.end_date_iso && new Date(market.end_date_iso) > now
      );
      console.log(`Received ${samplingResponse?.data?.length || 0} markets from getSamplingMarkets, ${samplingMarkets.length} are active & open & future-dated.`);
      finalMarkets.push(...samplingMarkets.map(m => ({...m, _source: 'clob'})));

    } catch (error) {
      console.error("Error fetching from clobClient.getSamplingMarkets:", error);
      // Proceed to Gamma API if sampling markets fail or return too few
    }

    if (finalMarkets.length < limit) {
      console.log(`Sampling markets count (${finalMarkets.length}) is less than limit (${limit}). Fetching from Gamma API.`);
      const gammaLimit = limit - finalMarkets.length; // Fetch remaining needed
      const gammaParams = new URLSearchParams({
        active: 'true',
        closed: 'false',
        limit: gammaLimit.toString(),
        order_by: 'volume', // Corrected from 'order'
        sort_by: 'desc', // Corrected from 'ascending'
        // end_date_min: now.toISOString(), // Ensure markets haven't ended
        // category: category || '', // Add category if provided
      });
      // Remove empty category param
      if(category) gammaParams.set('category', category); else gammaParams.delete('category');
      if(!gammaParams.get('category')) gammaParams.delete('category');


      const gammaUrl = `https://gamma-api.polymarket.com/markets?${gammaParams.toString()}`;
      console.log("Fetching from Gamma API URL:", gammaUrl);

      try {
        const gammaResponse = await fetch(gammaUrl);
        if (!gammaResponse.ok) {
            const errorText = await gammaResponse.text();
            console.error(`Gamma API request failed with status ${gammaResponse.status}: ${errorText}`);
            // Don't throw, just proceed with what we have
        } else {
            const gammaApiMarkets = await gammaResponse.json(); // This is typically an array directly
            console.log(`Received ${gammaApiMarkets?.length || 0} markets from Gamma API.`);
            // Gamma markets are already filtered by active, closed, and end_date_min by the API query (if supported by Gamma)
            // Additional client-side filter for safety/consistency if end_date_min isn't fully reliable from Gamma
            const filteredGammaMarkets = (gammaApiMarkets || []).filter((market: any) => 
                market.active === true && market.closed === false && market.endDate && new Date(market.endDate) > now
            );
            console.log(`Filtered ${filteredGammaMarkets.length} markets from Gamma API response.`);
            finalMarkets.push(...filteredGammaMarkets.map(m => ({...m, _source: 'gamma'})));
        }
      } catch (error) {
        console.error("Error fetching from Gamma API:", error);
        // Proceed with any markets we might have from sampling
      }
    }

    const deduplicatedRawMarkets = this.deduplicateMarkets(finalMarkets);
    console.log(`Total deduplicated markets before mapping: ${deduplicatedRawMarkets.length}`);

    const liveMarketsResult: LiveMarket[] = deduplicatedRawMarkets
      .map(market => this.mapMarketToLiveMarket(market, market._source))
      .slice(0, limit);
    
    console.log(`✅ Mapped and sliced ${liveMarketsResult.length} final markets.`);
    if(liveMarketsResult.length === 0){
      console.warn("⚠️ No live markets found after all fetching and filtering attempts.");
    }
    return liveMarketsResult;
  }

  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("CLOB Client not initialized in getMarketDetails");
    }

    console.log(`🔍 Fetching details for market ID (conditionId): ${marketId} on ${this.currentNetwork.name}`);
    
    // Try Gamma API first for richer details if available
    try {
        const gammaUrl = `https://gamma-api.polymarket.com/markets/${marketId}`;
        const gammaResponse = await fetch(gammaUrl);
        if (gammaResponse.ok) {
            const marketData = await gammaResponse.json();
            if (marketData) {
                return this.mapMarketToLiveMarket(marketData, 'gamma');
            }
        }
    } catch (e) {
        console.warn("Failed to fetch market details from Gamma API, falling back to CLOB order book.", e);
    }

    // Fallback to CLOB order book
    const orderbook = await this.clobClient.getOrderBook(marketId);
    
    if (!orderbook || !orderbook.bids || !orderbook.asks) {
        console.warn(`❓ No orderbook data found for market ${marketId} via CLOB.`);
        // Optionally fetch general market info if orderbook fails
        const marketsListPayload = await this.clobClient.getMarkets();
        const marketInfo = marketsListPayload.data.find((m: any) => m.condition_id === marketId);
        if (!marketInfo) return null;
        return this.mapMarketToLiveMarket(marketInfo, 'clob'); // map with placeholder prices
    }

    const bestBid = orderbook.bids[0] ? parseFloat(orderbook.bids[0].price) : null;
    const bestAsk = orderbook.asks[0] ? parseFloat(orderbook.asks[0].price) : null;

    let yesPrice = 0.5;
    if (bestBid !== null && bestAsk !== null) {
        yesPrice = (bestBid + bestAsk) / 2;
    } else if (bestBid !== null) {
        yesPrice = bestBid;
    } else if (bestAsk !== null) {
        yesPrice = bestAsk;
    }
    yesPrice = Math.max(0.01, Math.min(0.99, yesPrice));

    // Fetch general market info for question, category, endsAt for CLOB path
    const marketsListPayload = await this.clobClient.getMarkets(); // Potentially inefficient
    const marketInfo = marketsListPayload.data.find((m: any) => m.condition_id === marketId);

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
