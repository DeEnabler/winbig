
// src/lib/polymarket-sdk/live-market-service.ts
import { ClobClient } from '@polymarket/clob-client';
import { Wallet, providers as EthersProviders } from 'ethers'; // Using ethers v5
import type { AuthResult, EphemeralCredentialManagerInterface, LiveMarket, NetworkConfig } from './types';
import { NETWORKS } from './types';
import fetch from 'node-fetch';

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

  private deduplicateMarkets(markets: any[]): any[] {
    const seen = new Set();
    return markets.filter(market => {
      const id = market.condition_id || market.conditionId || market.id; // CLOB uses condition_id or conditionId, Gamma uses id
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  private isValidMarket(market: any, source: 'clob' | 'gamma'): boolean {
    if (!market || typeof market !== 'object') return false;
    if (market.active !== true || market.closed !== false) {
        return false;
    }
    const endDateIso = source === 'gamma' ? market.endDate : market.end_date_iso;
    if (!endDateIso) return false;

    try {
        const endDate = new Date(endDateIso);
        if (isNaN(endDate.getTime())) return false;
        return endDate > new Date(); // Must be in the future
    } catch (e) {
        return false;
    }
  }

  private mapMarketToLiveMarket(market: any, source: 'clob' | 'gamma'): LiveMarket | null {
    if (!market) return null;
    const now = new Date();
    let yesPrice = 0.50;
    let noPrice = 0.50;
    let marketId = source === 'gamma' ? market.id : (market.condition_id || market.conditionId);

    if (!marketId) return null; // Cannot map without an ID

    if (source === 'gamma' && market.outcomes && Array.isArray(market.outcomes) && market.outcomes.length >= 2) {
        const yesOutcome = market.outcomes.find((o: any) => o.name?.toLowerCase() === 'yes');
        const noOutcome = market.outcomes.find((o: any) => o.name?.toLowerCase() === 'no');
        if (yesOutcome && typeof yesOutcome.price === 'number') yesPrice = yesOutcome.price;
        if (noOutcome && typeof noOutcome.price === 'number') noPrice = noOutcome.price;

        if (yesOutcome && typeof yesOutcome.price === 'number' && !(noOutcome && typeof noOutcome.price === 'number')) noPrice = 1 - yesPrice;
        else if (!(yesOutcome && typeof yesOutcome.price === 'number') && noOutcome && typeof noOutcome.price === 'number') yesPrice = 1 - noPrice;

    } else if (source === 'clob' && market.price_yes !== undefined && market.price_no !== undefined) {
        // Assuming sampling markets might sometimes provide direct prices (optimistic)
        yesPrice = parseFloat(market.price_yes);
        noPrice = parseFloat(market.price_no);
    }


    const endDateIso = source === 'gamma' ? market.endDate : market.end_date_iso;
    let endsAtDate;
    try {
        if (endDateIso) endsAtDate = new Date(endDateIso);
    } catch (e) { /* ignore invalid date */ }


    return {
      id: marketId,
      question: market.question || "N/A",
      yesPrice: parseFloat(Math.max(0.01, Math.min(0.99, yesPrice)).toFixed(2)),
      noPrice: parseFloat(Math.max(0.01, Math.min(0.99, 1 - yesPrice)).toFixed(2)), // Ensure noPrice is derived if only yesPrice is good
      category: market.category || "General",
      endsAt: endsAtDate,
    };
  }

  private async fetchGammaMarkets(limit: number, volumeParams?: { volume_num_min?: number, volume_num_max?: number }): Promise<any[]> {
    const params = new URLSearchParams({
      active: 'true',
      closed: 'false',
      limit: limit.toString(),
      order_by: 'volume', // Corrected from 'order'
      sort_by: 'desc',   // Corrected from 'ascending'
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
      return Array.isArray(data) ? data : (data.data || []); // Gamma might return {data: []} or just []
    } catch (error) {
      console.error(`[LiveMarketService] Error fetching from Gamma API:`, error);
      return [];
    }
  }

  async getLiveMarkets(limit: number = 10): Promise<LiveMarket[]> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) throw new Error("[LiveMarketService] CLOB Client not initialized.");

    let combinedMarkets: any[] = [];
    let marketsFromSource: LiveMarket[] = [];

    console.log(`[LiveMarketService] Starting market fetch. Desired limit: ${limit}`);

    // 1. High-volume markets from Gamma
    console.log("[LiveMarketService] Fetching high-volume markets from Gamma (volume >= 50000)...");
    let highVolumeGamma = await this.fetchGammaMarkets(limit * 2, { volume_num_min: 50000 });
    highVolumeGamma = highVolumeGamma.filter(market => this.isValidMarket(market, 'gamma'));
    combinedMarkets.push(...highVolumeGamma.map(m => ({ ...m, _source: 'gamma' })));
    console.log(`[LiveMarketService] Found ${highVolumeGamma.length} valid high-volume markets from Gamma.`);

    // 2. Medium-volume markets from Gamma (if needed)
    if (this.deduplicateMarkets(combinedMarkets).length < limit) {
      const needed = limit - this.deduplicateMarkets(combinedMarkets).length;
      if (needed > 0) {
        console.log(`[LiveMarketService] Fetching medium-volume markets from Gamma (10k <= volume < 50k), need ${needed}...`);
        let mediumVolumeGamma = await this.fetchGammaMarkets(needed * 2, { volume_num_min: 10000, volume_num_max: 49999 });
        mediumVolumeGamma = mediumVolumeGamma.filter(market => this.isValidMarket(market, 'gamma'));
        combinedMarkets.push(...mediumVolumeGamma.map(m => ({ ...m, _source: 'gamma' })));
        console.log(`[LiveMarketService] Found ${mediumVolumeGamma.length} valid medium-volume markets from Gamma.`);
      }
    }

    // 3. Sampling markets from CLOB (as last resort if still needed)
    if (this.deduplicateMarkets(combinedMarkets).length < limit) {
        const needed = limit - this.deduplicateMarkets(combinedMarkets).length;
        if (needed > 0) {
            console.log(`[LiveMarketService] Fetching sampling markets from CLOB, need ${needed}...`);
            try {
                const samplingResponse = await this.clobClient.getSamplingMarkets("");
                let samplingMarkets = (samplingResponse?.data || []).filter((market: any) => this.isValidMarket(market, 'clob'));
                combinedMarkets.push(...samplingMarkets.map(m => ({...m, _source: 'clob'})));
                console.log(`[LiveMarketService] Found ${samplingMarkets.length} valid sampling markets from CLOB.`);
            } catch (error) {
                console.error("[LiveMarketService] Error fetching sampling markets from CLOB:", error);
            }
        }
    }
    
    const deduplicatedRawMarkets = this.deduplicateMarkets(combinedMarkets);
    console.log(`[LiveMarketService] Total ${deduplicatedRawMarkets.length} unique valid markets gathered before final mapping.`);

    marketsFromSource = deduplicatedRawMarkets
        .map(market => this.mapMarketToLiveMarket(market, market._source))
        .filter(market => market !== null) as LiveMarket[];

    const finalResult = marketsFromSource.slice(0, limit);
    console.log(`[LiveMarketService] Returning ${finalResult.length} markets to API route.`);
    if(finalResult.length === 0) {
        console.warn("[LiveMarketService] ⚠️ No live markets found after all fetching and filtering attempts.");
    }
    return finalResult;
  }

  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("[LiveMarketService] CLOB Client not initialized in getMarketDetails");
    }

    console.log(`[LiveMarketService] Fetching details for market ID (conditionId): ${marketId} on ${this.currentNetwork.name}`);
    
    try {
        const gammaUrl = `https://gamma-api.polymarket.com/markets/${marketId}`;
        const gammaResponse = await fetch(gammaUrl);
        if (gammaResponse.ok) {
            const marketData = await gammaResponse.json();
            if (marketData) {
                const mapped = this.mapMarketToLiveMarket(marketData, 'gamma');
                if (mapped) return mapped;
            }
        }
    } catch (e) {
        console.warn("[LiveMarketService] Failed to fetch market details from Gamma API, falling back to CLOB order book.", e);
    }

    try {
        const orderbook = await this.clobClient.getOrderBook(marketId);
        if (!orderbook || !orderbook.bids || !orderbook.asks) {
            console.warn(`[LiveMarketService] No orderbook data found for market ${marketId} via CLOB.`);
            const marketsListPayload = await this.clobClient.getMarkets();
            const marketInfo = marketsListPayload.data.find((m: any) => (m.condition_id || m.conditionId) === marketId);
            return marketInfo ? this.mapMarketToLiveMarket(marketInfo, 'clob') : null;
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

        const marketsListPayload = await this.clobClient.getMarkets(); 
        const marketInfo = marketsListPayload.data.find((m: any) => (m.condition_id || m.conditionId) === marketId);

        if (!marketInfo) return null;

        return {
            id: marketId,
            question: marketInfo.question || 'Question not found',
            yesPrice: parseFloat(yesPrice.toFixed(2)),
            noPrice: parseFloat((1 - yesPrice).toFixed(2)),
            category: marketInfo.category || "General",
            endsAt: marketInfo.end_date_iso ? new Date(marketInfo.end_date_iso) : undefined,
        };
    } catch (error) {
        console.error(`[LiveMarketService] Error fetching CLOB market details for ${marketId}:`, error);
        return null;
    }
  }
}
