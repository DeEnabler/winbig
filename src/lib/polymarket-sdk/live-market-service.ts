
// src/lib/polymarket-sdk/live-market-service.ts
import { ClobClient } from '@polymarket/clob-client';
import { Wallet, providers as EthersProviders } from 'ethers'; // Using ethers v5
import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys } from './generate-wallet-and-keys';
import type { AuthResult, EphemeralCredentialManagerInterface, LiveMarket, NetworkConfig } from './types';
import { NETWORKS } from './types';

export class LiveMarketService {
  private clobClient: ClobClient | null = null;
  private wallet: Wallet | null = null;
  private credentialManager?: EphemeralCredentialManagerInterface;
  private currentNetwork: NetworkConfig = NETWORKS.polygon; // Default to Polygon mainnet

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
      // console.log('✅ Using existing authenticated CLOB client.'); // Less verbose
      return;
    }

    let authResult: AuthResult;

    if (this.credentialManager) {
      console.log(`🚀 Using EphemeralCredentialManager to get/refresh credentials for network: ${this.currentNetwork.name}`);
      authResult = await this.credentialManager.getCredentials(this.currentNetwork.name === NETWORKS.polygon.name ? 'polygon' : 'amoy');
      if (!authResult.success) {
         console.error('❌ Failed to get credentials via EphemeralCredentialManager. Falling back to direct generation.', authResult.error);
         authResult = this.currentNetwork.name === NETWORKS.polygon.name ? await generateMainnetWalletAndKeys() : await generateTestnetWalletAndKeys();
      } else {
        console.log('✅ Credentials successfully retrieved via EphemeralCredentialManager.');
      }
    } else {
      console.warn('🤔 No EphemeralCredentialManager provided to LiveMarketService. Generating new wallet and credentials directly (less efficient).');
      authResult = this.currentNetwork.name === NETWORKS.polygon.name ? await generateMainnetWalletAndKeys() : await generateTestnetWalletAndKeys();
    }

    if (!authResult.success || !authResult.wallet || !authResult.credentials) {
      throw new Error(`❌ Failed to generate/retrieve wallet and credentials for LiveMarketService. Error: ${authResult.error}`);
    }

    const provider = new EthersProviders.JsonRpcProvider(this.currentNetwork.rpcUrl);
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

  async getLiveMarkets(limit: number = 20, category?: string): Promise<LiveMarket[]> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("CLOB Client not initialized in getLiveMarkets");
    }

    const internalFetchLimit = Math.max(limit, 50); // Fetch a larger pool for better filtering
    console.log(`📊 Fetching up to ${internalFetchLimit} raw markets internally. Network: ${this.currentNetwork.name}, Category: ${category || 'All'}. Final user limit: ${limit}`);
    
    const marketDataPayload = await this.clobClient.getMarkets();
    
    const allRawMarkets = marketDataPayload.data || [];
    console.log(`Raw markets received from API: ${allRawMarkets.length}`);

    const now = new Date();
    
    // Primary Filter: Active, Not Closed, Ends in the future
    let filteredMarkets = allRawMarkets.filter((market: any) => {
      if (typeof market.active !== 'boolean' || typeof market.closed !== 'boolean') {
        return false;
      }
      if (!market.end_date_iso) {
          return false;
      }
      const endDate = new Date(market.end_date_iso);
      if (isNaN(endDate.getTime())) {
          return false;
      }
      return market.active === true && market.closed === false && endDate > now;
    });
    console.log(`Markets after primary filter (active & !closed & future-dated): ${filteredMarkets.length}`);

    // Fallback Filter: If no markets from primary, try active markets that ended recently
    if (filteredMarkets.length === 0) {
      console.log('⚠️ No markets from primary filter. Applying fallback: active & recently ended (within 7 days).');
      filteredMarkets = allRawMarkets.filter(market => {
        if (typeof market.active !== 'boolean' || !market.active) { // Must be active
            return false;
        }
        if (!market.end_date_iso) { // Must have an end date for this fallback
            return false;
        }
        const endDate = new Date(market.end_date_iso);
        if (isNaN(endDate.getTime())) {
            return false;
        }
        const daysSinceEnd = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
        // Include if active and ended within the last 7 days (closed status doesn't matter here as long as it was active)
        return daysSinceEnd <= 7 && daysSinceEnd >= 0; // daysSinceEnd >= 0 ensures it's in the past
      });
      console.log(`Markets after fallback filter (active & recently ended): ${filteredMarkets.length}`);
    }
    
    // Debugging: Log first 5 markets that pass any filtering or from raw if none pass
    const marketsToLog = filteredMarkets.length > 0 ? filteredMarkets : allRawMarkets;
    console.log('🔍 DEBUG: Analyzing first few markets (either filtered or raw if filter yielded 0)...');
    marketsToLog.slice(0, 5).forEach((market: any, index: number) => {
      console.log(`\n📊 Market ${index + 1} (ID: ${market.condition_id || 'N/A'}):`);
      console.log(`  Question: ${market.question}`);
      console.log(`  Active: ${market.active} (Type: ${typeof market.active})`);
      console.log(`  Closed: ${market.closed} (Type: ${typeof market.closed})`);
      console.log(`  End Date ISO: ${market.end_date_iso}`);
      if (market.end_date_iso) {
        const endDate = new Date(market.end_date_iso);
        console.log(`  Parsed End Date: ${!isNaN(endDate.getTime()) ? endDate.toISOString() : 'Invalid Date'}`);
        console.log(`  Is Valid Date: ${!isNaN(endDate.getTime())}`);
        console.log(`  Condition (endDate > now): ${!isNaN(endDate.getTime()) && endDate > now}`);
      } else {
        console.log(`  ❌ No end_date_iso field!`);
      }
       const passesPrimary = market.active === true && market.closed === false && market.end_date_iso && new Date(market.end_date_iso) > now;
       console.log(`  Would pass primary filter: ${passesPrimary}`);
    });
    console.log(`\n⏰ Current time for filter comparison: ${now.toISOString()}`);


    let categoryFilteredMarkets = filteredMarkets;
    if (category) {
      categoryFilteredMarkets = filteredMarkets.filter((market: any) => 
        market.category?.toLowerCase() === category.toLowerCase()
      );
      console.log(`Markets after category ('${category}') filtering: ${categoryFilteredMarkets.length}`);
    }

    const liveMarketsResult: LiveMarket[] = categoryFilteredMarkets.map((market: any) => ({
      id: market.condition_id,
      question: market.question,
      yesPrice: 0.50, 
      noPrice: 0.50,  
      category: market.category || "General",
      endsAt: market.end_date_iso ? new Date(market.end_date_iso) : undefined,
    }));
    
    console.log(`✅ Mapped ${liveMarketsResult.length} markets. Applying final user limit of ${limit}.`);
    return liveMarketsResult.slice(0, limit);
  }

  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("CLOB Client not initialized in getMarketDetails");
    }

    console.log(`🔍 Fetching details for market ID (conditionId): ${marketId} on ${this.currentNetwork.name}`);
    
    const marketsListPayload = await this.clobClient.getMarkets();
    const marketInfo = marketsListPayload.data.find((m: any) => m.condition_id === marketId);

    if (!marketInfo) {
        console.warn(`❓ Market info not found for market ID ${marketId} in getMarkets() list.`);
    }
    
    const orderbook = await this.clobClient.getOrderBook(marketId);
    
    if (!orderbook || !orderbook.bids || !orderbook.asks) {
        console.warn(`❓ No orderbook data found for market ${marketId}`);
        if (!marketInfo) return null; 
        return { 
            id: marketId,
            question: marketInfo.question,
            yesPrice: 0.50,
            noPrice: 0.50,
            category: marketInfo.category || "General",
            endsAt: marketInfo.end_date_iso ? new Date(marketInfo.end_date_iso) : undefined,
        };
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
