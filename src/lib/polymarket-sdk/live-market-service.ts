
// src/lib/polymarket-sdk/live-market-service.ts
import { ClobClient } from '@polymarket/clob-client';
import { Wallet, providers as EthersProviders } from 'ethers'; // Using ethers v5
import type { AuthResult, EphemeralCredentialManagerInterface, LiveMarket, NetworkConfig } from './types';
import { NETWORKS } from './types';
import fetch from 'node-fetch';

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
    if (marketData.active !== true || marketData.closed === true) {
      return false;
    }
    const endDateIso = marketData.end_date_iso || marketData.endDate;
    if (!endDateIso) return false;
    try {
      const endDate = new Date(endDateIso);
      return !isNaN(endDate.getTime()) && endDate > new Date();
    } catch (e) {
      return false;
    }
  }

  private deduplicateRawMarketCandidates(candidates: RawMarketCandidate[]): RawMarketCandidate[] {
    const seen = new Set();
    return candidates.filter(candidate => {
      const id = candidate.rawMarket.condition_id || candidate.rawMarket.id; // Gamma uses 'id', CLOB uses 'condition_id'
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  private async fetchGammaMarkets(limit: number, volumeParams?: { volume_num_min?: number, volume_num_max?: number }): Promise<any[]> {
    const params = new URLSearchParams({
      active: 'true',
      closed: 'false',
      limit: limit.toString(),
      order_by: 'volume', // Corrected from 'order'
      sort_by: 'desc', // Corrected from 'ascending'
      end_date_min: new Date().toISOString(),
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
      return Array.isArray(data) ? data : (data.data || []); // data.data for paginated Gamma responses
    } catch (error) {
      console.error(`[LiveMarketService] Error fetching from Gamma API:`, error);
      return [];
    }
  }

  private async _fetchAndMapMarketWithAccuratePrice(
    rawMarketData: any,
    source: 'gamma' | 'clob'
  ): Promise<LiveMarket | null> {
    await this.ensureAuthenticatedClient();
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

    if (source === 'gamma') {
      try {
        const clobTokenIdsString = rawMarketData.clobTokenIds;
        const outcomesString = rawMarketData.outcomes;

        if (typeof clobTokenIdsString === 'string' && typeof outcomesString === 'string') {
          const clobTokenIdsArray: string[] = JSON.parse(clobTokenIdsString);
          const outcomesArray: string[] = JSON.parse(outcomesString);

          if (Array.isArray(clobTokenIdsArray) && Array.isArray(outcomesArray) && clobTokenIdsArray.length === outcomesArray.length && clobTokenIdsArray.length > 0) {
            const yesOutcomeIndex = outcomesArray.findIndex(o => o?.toLowerCase() === 'yes');
            if (yesOutcomeIndex !== -1 && clobTokenIdsArray[yesOutcomeIndex]) {
              yesTokenId = clobTokenIdsArray[yesOutcomeIndex];
              console.log(`[LiveMarketService] Gamma market ${marketId}: Found YES token ID ${yesTokenId} via clobTokenIds and outcomes.`);
            } else {
              console.warn(`[LiveMarketService] Gamma market ${marketId}: "Yes" outcome not found or index mismatch. Outcomes: ${outcomesString}, Token IDs: ${clobTokenIdsString}`);
            }
          } else {
            console.warn(`[LiveMarketService] Gamma market ${marketId}: clobTokenIds or outcomes are not valid arrays or mismatched length. Outcomes: ${outcomesString}, Token IDs: ${clobTokenIdsString}`);
          }
        } else {
          console.warn(`[LiveMarketService] Gamma market ${marketId}: clobTokenIds or outcomes field not a string or missing. clobTokenIds type: ${typeof clobTokenIdsString}, outcomes type: ${typeof outcomesString}`);
        }
      } catch (parseError) {
        console.error(`[LiveMarketService] Gamma market ${marketId}: Error parsing clobTokenIds or outcomes. Error: ${parseError}`, rawMarketData);
      }
    } else if (source === 'clob') {
      const yesToken = rawMarketData.tokens?.find((t: any) => t.outcome?.toLowerCase() === 'yes');
      if (yesToken && yesToken.token_id) {
        yesTokenId = yesToken.token_id;
        console.log(`[LiveMarketService] CLOB market ${marketId}: Found YES token ID ${yesTokenId} via tokens array.`);
      } else {
         console.warn(`[LiveMarketService] CLOB market ${marketId}: Could not find YES token_id in tokens array. Tokens:`, rawMarketData.tokens);
      }
    }

    if (!yesTokenId) {
      console.warn(`[LiveMarketService] Could not determine YES token_id for market ${marketId}. Source: ${source}. Skipping price fetch.`);
      return null;
    }

    let yesPriceNum: number;
    try {
      const priceResponse = await this.clobClient.getPrice(yesTokenId, "buy");
      if (!priceResponse || typeof priceResponse.price !== 'string') {
        console.warn(`[LiveMarketService] Invalid price response for YES token ${yesTokenId} (Market ID: ${marketId}):`, priceResponse);
        return null;
      }
      yesPriceNum = parseFloat(priceResponse.price);
      if (isNaN(yesPriceNum)) {
        console.warn(`[LiveMarketService] Parsed price is NaN for YES token ${yesTokenId}, market ${marketId}. Original: ${priceResponse.price}`);
        return null;
      }
      yesPriceNum = Math.max(0.01, Math.min(0.99, yesPriceNum));
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

    const rawMarketCandidates: RawMarketCandidate[] = [];

    console.log("[LiveMarketService] Fetching high-volume markets from Gamma (volume >= 50000)...");
    const highVolumeGamma = await this.fetchGammaMarkets(limit * 2, { volume_num_min: 50000 });
    rawMarketCandidates.push(...highVolumeGamma.map(m => ({ rawMarket: m, source: 'gamma' as 'gamma' })));
    console.log(`[LiveMarketService] Found ${highVolumeGamma.length} raw high-volume markets from Gamma.`);

    let uniqueFilteredCandidates = this.deduplicateRawMarketCandidates(rawMarketCandidates)
                                     .filter(candidate => this.isValidMarket(candidate.rawMarket));

    if (uniqueFilteredCandidates.length < limit) {
      const neededMoreMedium = (limit - uniqueFilteredCandidates.length) * 2;
      if (neededMoreMedium > 0) {
        console.log(`[LiveMarketService] Fetching medium-volume markets from Gamma (10k <= volume < 50k), need candidates for ${limit - uniqueFilteredCandidates.length}...`);
        const mediumVolumeGamma = await this.fetchGammaMarkets(neededMoreMedium, { volume_num_min: 10000, volume_num_max: 49999 });
        rawMarketCandidates.push(...mediumVolumeGamma.map(m => ({ rawMarket: m, source: 'gamma' as 'gamma' })));
        console.log(`[LiveMarketService] Found ${mediumVolumeGamma.length} raw medium-volume markets from Gamma.`);
        uniqueFilteredCandidates = this.deduplicateRawMarketCandidates(rawMarketCandidates)
                                       .filter(candidate => this.isValidMarket(candidate.rawMarket));
      }
    }

    if (uniqueFilteredCandidates.length < limit) {
      const neededMoreSampling = (limit - uniqueFilteredCandidates.length) * 2;
      if (neededMoreSampling > 0) {
        console.log(`[LiveMarketService] Fetching sampling markets from CLOB, need candidates for ${limit - uniqueFilteredCandidates.length}...`);
        try {
          const samplingResponse = await this.clobClient.getSamplingMarkets("");
          const samplingMarkets = samplingResponse?.data || [];
          rawMarketCandidates.push(...samplingMarkets.map((m: any) => ({ rawMarket: m, source: 'clob' as 'clob' })));
          console.log(`[LiveMarketService] Found ${samplingMarkets.length} raw sampling markets from CLOB.`);
          uniqueFilteredCandidates = this.deduplicateRawMarketCandidates(rawMarketCandidates)
                                         .filter(candidate => this.isValidMarket(candidate.rawMarket));
        } catch (error) {
          console.error("[LiveMarketService] Error fetching sampling markets from CLOB:", error);
        }
      }
    }
    
    console.log(`[LiveMarketService] Total ${uniqueFilteredCandidates.length} unique and valid raw candidates gathered.`);

    if (uniqueFilteredCandidates.length === 0) {
      console.warn("[LiveMarketService] ⚠️ No valid markets found after all fetching and filtering attempts.");
      return [];
    }

    const marketsToPrice = uniqueFilteredCandidates.slice(0, limit); // Price only up to the user limit
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
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("[LiveMarketService] CLOB Client not initialized in getMarketDetails");
    }
    console.log(`[LiveMarketService] Getting details for market ID: ${marketId} on ${this.currentNetwork.name}`);
    
    let rawMarketData: any = null;
    let source: 'gamma' | 'clob' = 'gamma';

    try {
        const gammaUrl = `https://gamma-api.polymarket.com/markets/${marketId}`;
        const gammaResponse = await fetch(gammaUrl, { headers: {"User-Agent": "ViralBetApp/1.0"} });
        if (gammaResponse.ok) {
            rawMarketData = await gammaResponse.json();
            console.log(`[LiveMarketService] Successfully fetched full market data from Gamma for ${marketId}`);
        } else {
             console.warn(`[LiveMarketService] Failed to fetch from Gamma for ${marketId} (${gammaResponse.status}). Will try CLOB getMarkets.`);
        }
    } catch (e) {
        console.warn("[LiveMarketService] Error fetching full market details from Gamma API. Will try CLOB getMarkets.", e);
    }

    if (!rawMarketData) {
        source = 'clob';
        console.log(`[LiveMarketService] Attempting to find market ${marketId} via CLOB getMarkets() call.`);
        try {
            const marketsListPayload = await this.clobClient.getMarkets({market_slugs: [marketId]});
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
    
    return this._fetchAndMapMarketWithAccuratePrice(rawMarketData, source);
  }
}
