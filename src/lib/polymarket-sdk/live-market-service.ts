
// src/lib/polymarket-sdk/live-market-service.ts
import { ClobClient } from '@polymarket/clob-client';
import { Wallet, providers as EthersProviders } from 'ethers'; // Using ethers v5
import type { AuthResult, EphemeralCredentialManagerInterface, LiveMarket, NetworkConfig } from './types';
import { NETWORKS } from './types';
import fetch from 'node-fetch'; // For making HTTP requests to Gamma API

interface RawMarketCandidate {
  rawMarket: any;
  source: 'gamma' | 'clob';
}

export class LiveMarketService {
  private clobClient: ClobClient | null = null;
  private wallet: Wallet | null = null;
  private credentialManager?: EphemeralCredentialManagerInterface;
  private currentNetwork: NetworkConfig = NETWORKS.polygon;

  constructor(credentialManager?: EphemeralCredentialManagerInterface, network: 'amoy' | 'polygon' = 'polygon') {
    this.credentialManager = credentialManager;
    this.currentNetwork = NETWORKS[network];
    if (!this.currentNetwork) {
        console.warn(`[LiveMarketService] Invalid network specified: ${network}, defaulting to Polygon Mainnet.`);
        this.currentNetwork = NETWORKS.polygon;
    }
    console.log(`[LiveMarketService] Initialized for network: ${this.currentNetwork.name}`);
  }

  private async ensureAuthenticatedClient(): Promise<void> {
    if (this.clobClient && this.wallet) {
      return;
    }

    let authResult: AuthResult;

    if (this.credentialManager) {
      console.log(`[LiveMarketService] Using EphemeralCredentialManager for network: ${this.currentNetwork.name}`);
      authResult = await this.credentialManager.getCredentials(this.currentNetwork.name === NETWORKS.polygon.name ? 'polygon' : 'amoy');
    } else {
      console.warn('[LiveMarketService] No EphemeralCredentialManager. Generating new credentials directly.');
      authResult = this.currentNetwork.name === NETWORKS.polygon.name
        ? await import('./generate-wallet-and-keys').then(mod => mod.generateMainnetWalletAndKeys())
        : await import('./generate-wallet-and-keys').then(mod => mod.generateTestnetWalletAndKeys());
    }

    if (!authResult.success || !authResult.wallet || !authResult.credentials) {
      throw new Error(`[LiveMarketService] Failed to get credentials. Error: ${authResult.error}`);
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
    console.log(`[LiveMarketService] Authenticated CLOB client created for ${this.currentNetwork.name}.`);
  }

  private isValidMarket(marketData: any): boolean {
    if (!marketData || typeof marketData !== 'object') return false;

    // Check active and closed status
    if (marketData.active !== true || marketData.closed === true) {
      return false;
    }

    // Check end date
    const endDateIso = marketData.end_date_iso || marketData.endDate; // Gamma might use 'endDate'
    if (!endDateIso) return false;

    try {
      const endDate = new Date(endDateIso);
      return !isNaN(endDate.getTime()) && endDate > new Date(); // Must be a valid date and in the future
    } catch (e) {
      return false;
    }
  }

  private deduplicateRawMarketCandidates(candidates: RawMarketCandidate[]): RawMarketCandidate[] {
    const seen = new Set();
    return candidates.filter(candidate => {
      const id = candidate.rawMarket.condition_id || candidate.rawMarket.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  private async fetchGammaMarkets(limit: number, volumeParams?: { volume_num_min?: number, volume_num_max?: number }): Promise<any[]> {
    const params = new URLSearchParams({
      active: 'true', // Server-side filter
      closed: 'false', // Server-side filter
      limit: limit.toString(),
      order_by: 'volume',
      sort_by: 'desc',
      end_date_min: new Date().toISOString(), // Server-side filter for future-dated markets
    });

    if (volumeParams?.volume_num_min !== undefined) {
      params.set('volume_num_min', volumeParams.volume_num_min.toString());
    }
    if (volumeParams?.volume_num_max !== undefined) {
      params.set('volume_num_max', volumeParams.volume_num_max.toString());
    }

    const gammaUrl = `https://gamma-api.polymarket.com/markets?${params.toString()}`;
    console.log(`[LiveMarketService] Fetching from Gamma API: ${gammaUrl}`);
    try {
      const response = await fetch(gammaUrl, { headers: {"User-Agent": "ViralBetApp/1.0"} });
      if (!response.ok) {
        console.error(`[LiveMarketService] Gamma API request failed (${response.status}): ${await response.text()}`);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error(`[LiveMarketService] Error fetching from Gamma API:`, error);
      return [];
    }
  }

  private async _fetchAndMapMarketWithAccuratePrice(
    rawMarketData: any,
    source: 'gamma' | 'clob' // Source helps determine how to find token_id if structures differ
  ): Promise<LiveMarket | null> {
    await this.ensureAuthenticatedClient(); // Ensure clobClient is ready
    if (!this.clobClient) {
      console.error("[LiveMarketService] Clob client not available for fetching accurate price.");
      return null;
    }

    const marketId = rawMarketData.condition_id || rawMarketData.id;
    if (!marketId) {
      console.warn("[LiveMarketService] Market missing ID, cannot fetch price.", rawMarketData);
      return null;
    }

    let yesTokenId: string | undefined;
    const tokensArray = rawMarketData.tokens; // CLOB market objects have this directly

    if (Array.isArray(tokensArray) && tokensArray.length >= 1) { // Typically 2 tokens
      const yesToken = tokensArray.find(
        (t: any) => t.outcome?.toLowerCase() === 'yes'
      );
      if (yesToken && yesToken.token_id) {
        yesTokenId = yesToken.token_id;
      }
    } else if (source === 'gamma') {
      // Attempt to find token_id from Gamma structure if 'tokens' array isn't standard
      // This part might need adjustment based on actual Gamma API list response structure for token IDs
      // For now, we'll assume Gamma items might also have a 'tokens' array if they are full objects,
      // or we might need to fetch full market details from Gamma if list items are too lean.
      // If `rawMarketData.clobTokenIds` is available (as per research agent's example)
      // we would need logic to determine which one is the "YES" token.
      // For now, if `tokens` array is missing, we can't reliably get yesTokenId.
      console.warn(`[LiveMarketService] Market ${marketId} from Gamma source missing standard 'tokens' array. clobTokenIds:`, rawMarketData.clobTokenIds);
    }


    if (!yesTokenId) {
      console.warn(`[LiveMarketService] Could not find YES token_id for market ${marketId}. Data:`, rawMarketData);
      return null;
    }

    let yesPriceNum: number;
    try {
      console.log(`[LiveMarketService] Fetching accurate price for YES token ${yesTokenId} (Market ID: ${marketId})`);
      const priceResponse = await this.clobClient.getPrice(yesTokenId, "buy"); // Get best bid for YES token
      if (!priceResponse || typeof priceResponse.price !== 'string') {
        console.warn(`[LiveMarketService] Invalid price response for YES token ${yesTokenId}, market ${marketId}:`, priceResponse);
        return null;
      }
      yesPriceNum = parseFloat(priceResponse.price);
      if (isNaN(yesPriceNum)) {
        console.warn(`[LiveMarketService] Parsed price is NaN for YES token ${yesTokenId}, market ${marketId}. Original: ${priceResponse.price}`);
        return null;
      }
      yesPriceNum = Math.max(0.01, Math.min(0.99, yesPriceNum)); // Clamp price
      console.log(`[LiveMarketService] Accurate YES price for market ${marketId}: ${yesPriceNum}`);
    } catch (error) {
      console.error(`[LiveMarketService] Error fetching price for YES token ${yesTokenId} (market ${marketId}):`, error);
      return null;
    }

    const noPriceNum = 1 - yesPriceNum;
    const endsAtDate = rawMarketData.end_date_iso || rawMarketData.endDate ? new Date(rawMarketData.end_date_iso || rawMarketData.endDate) : undefined;

    return {
      id: marketId,
      question: rawMarketData.question || "N/A",
      yesPrice: parseFloat(yesPriceNum.toFixed(2)),
      noPrice: parseFloat(noPriceNum.toFixed(2)),
      category: rawMarketData.category || "General",
      endsAt: endsAtDate,
    };
  }

  async getLiveMarkets(limit: number = 10): Promise<LiveMarket[]> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) throw new Error("[LiveMarketService] CLOB Client not initialized.");

    let rawMarketCandidates: RawMarketCandidate[] = [];

    // 1. High-volume markets from Gamma
    console.log("[LiveMarketService] Fetching high-volume markets from Gamma (volume >= 50000)...");
    const highVolumeGamma = await this.fetchGammaMarkets(limit * 2, { volume_num_min: 50000 });
    rawMarketCandidates.push(...highVolumeGamma.map(m => ({ rawMarket: m, source: 'gamma' as 'gamma' })));
    console.log(`[LiveMarketService] Found ${highVolumeGamma.length} raw high-volume markets from Gamma.`);

    // 2. Medium-volume markets from Gamma (if needed and not enough high-volume)
    let currentUniqueCount = this.deduplicateRawMarketCandidates(rawMarketCandidates).filter(c => this.isValidMarket(c.rawMarket)).length;
    if (currentUniqueCount < limit) {
      const neededMore = (limit - currentUniqueCount) * 2; // Fetch more to account for filtering
      if (neededMore > 0) {
        console.log(`[LiveMarketService] Fetching medium-volume markets from Gamma (10k <= volume < 50k), need candidates for ${limit - currentUniqueCount}...`);
        const mediumVolumeGamma = await this.fetchGammaMarkets(neededMore, { volume_num_min: 10000, volume_num_max: 49999 });
        rawMarketCandidates.push(...mediumVolumeGamma.map(m => ({ rawMarket: m, source: 'gamma' as 'gamma' })));
        console.log(`[LiveMarketService] Found ${mediumVolumeGamma.length} raw medium-volume markets from Gamma.`);
      }
    }
    
    // 3. Sampling markets from CLOB (as fallback if still needed)
    currentUniqueCount = this.deduplicateRawMarketCandidates(rawMarketCandidates).filter(c => this.isValidMarket(c.rawMarket)).length;
    if (currentUniqueCount < limit) {
      const neededMore = (limit - currentUniqueCount) * 2;
      if (neededMore > 0) {
        console.log(`[LiveMarketService] Fetching sampling markets from CLOB, need candidates for ${limit - currentUniqueCount}...`);
        try {
          const samplingResponse = await this.clobClient.getSamplingMarkets("");
          const samplingMarkets = samplingResponse?.data || [];
          rawMarketCandidates.push(...samplingMarkets.map((m: any) => ({ rawMarket: m, source: 'clob' as 'clob' })));
          console.log(`[LiveMarketService] Found ${samplingMarkets.length} raw sampling markets from CLOB.`);
        } catch (error) {
          console.error("[LiveMarketService] Error fetching sampling markets from CLOB:", error);
        }
      }
    }
    
    const uniqueRawCandidates = this.deduplicateRawMarketCandidates(rawMarketCandidates);
    console.log(`[LiveMarketService] Total ${uniqueRawCandidates.length} unique raw candidates gathered.`);

    const validRawCandidates = uniqueRawCandidates.filter(candidate => this.isValidMarket(candidate.rawMarket));
    console.log(`[LiveMarketService] Found ${validRawCandidates.length} valid raw candidates after filtering.`);

    if (validRawCandidates.length === 0) {
      console.warn("[LiveMarketService] ⚠️ No valid markets found after all fetching and filtering attempts.");
      return [];
    }

    // Fetch accurate prices for the top 'limit' valid candidates
    const marketsToPrice = validRawCandidates.slice(0, limit);
    const pricedMarketsPromises = marketsToPrice.map(candidate =>
      this._fetchAndMapMarketWithAccuratePrice(candidate.rawMarket, candidate.source)
    );
    
    const liveMarkets = (await Promise.all(pricedMarketsPromises)).filter(
      (market): market is LiveMarket => market !== null
    );

    console.log(`[LiveMarketService] Returning ${liveMarkets.length} markets with accurately fetched prices.`);
    return liveMarkets;
  }

  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    // This method fetches details for a SINGLE market, so it *should* make a direct price call.
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("[LiveMarketService] CLOB Client not initialized in getMarketDetails");
    }
    console.log(`[LiveMarketService] Getting details for market ID: ${marketId} on ${this.currentNetwork.name}`);
    
    // First, try to get full market object, which should include the 'tokens' array.
    // Attempt with Gamma API as it might have richer metadata along with token info.
    let rawMarketData: any = null;
    let source: 'gamma' | 'clob' = 'gamma'; // Default assumption

    try {
        const gammaUrl = `https://gamma-api.polymarket.com/markets/${marketId}`;
        console.log(`[LiveMarketService] Fetching full market details from Gamma: ${gammaUrl}`);
        const gammaResponse = await fetch(gammaUrl);
        if (gammaResponse.ok) {
            rawMarketData = await gammaResponse.json();
            console.log(`[LiveMarketService] Successfully fetched full market data from Gamma for ${marketId}`);
        } else {
             console.warn(`[LiveMarketService] Failed to fetch from Gamma for ${marketId} (${gammaResponse.status}). Will try CLOB getMarkets.`);
        }
    } catch (e) {
        console.warn("[LiveMarketService] Error fetching full market details from Gamma API. Will try CLOB getMarkets.", e);
    }

    // If Gamma failed or didn't return data, try to find it in a CLOB getMarkets() list
    // This is less ideal for a single market but acts as a fallback to get basic info + tokens array.
    if (!rawMarketData) {
        source = 'clob';
        console.log(`[LiveMarketService] Attempting to find market ${marketId} via CLOB getMarkets() call.`);
        try {
            // We need to be careful here. getMarkets might return a lot of data.
            // This is not ideal for fetching a single market's details.
            // A better CLOB method for single market *metadata* would be preferable if it exists.
            // For now, let's assume we just need the raw object to find token_id.
            const marketsListPayload = await this.clobClient.getMarkets({market_slugs: [marketId]}); // Try by slug/id
            rawMarketData = marketsListPayload.data.find((m: any) => (m.condition_id || m.id) === marketId);
            if (rawMarketData) {
                 console.log(`[LiveMarketService] Found market ${marketId} via CLOB getMarkets().`);
            } else {
                console.warn(`[LiveMarketService] Market ${marketId} not found via CLOB getMarkets() either.`);
                return null;
            }
        } catch (clobError) {
            console.error(`[LiveMarketService] Error fetching market ${marketId} via CLOB getMarkets():`, clobError);
            return null;
        }
    }
    
    // Now that we have rawMarketData (hopefully with a tokens array), fetch its accurate price.
    return this._fetchAndMapMarketWithAccuratePrice(rawMarketData, source);
  }
}

    