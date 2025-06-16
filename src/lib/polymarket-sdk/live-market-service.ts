
import { ClobClient } from '@polymarket/clob-client';
import { Wallet, providers as EthersProviders } from 'ethers'; // Using ethers v5
import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys } from './generate-wallet-and-keys';
import type { AuthResult, EphemeralCredentialManagerInterface, LiveMarket, NetworkConfig } from './types'; 
import { NETWORKS } from './types';

export class LiveMarketService {
  private clobClient: ClobClient | null = null;
  private wallet: Wallet | null = null;
  private credentialManager?: EphemeralCredentialManagerInterface;
  private currentNetwork: NetworkConfig = NETWORKS.amoy;

  constructor(credentialManager?: EphemeralCredentialManagerInterface, network: 'amoy' | 'polygon' = 'amoy') {
    this.credentialManager = credentialManager;
    this.currentNetwork = NETWORKS[network];
    if (!this.currentNetwork) {
        console.error(`Invalid network specified: ${network}, defaulting to Amoy.`);
        this.currentNetwork = NETWORKS.amoy;
    }
  }

  private async ensureAuthenticatedClient(): Promise<void> {
    if (this.clobClient && this.wallet) {
      console.log('✅ Using existing authenticated CLOB client.');
      return;
    }

    let authResult: AuthResult;

    if (this.credentialManager) {
      console.log('🚀 Using EphemeralCredentialManager to get/refresh credentials for network:', this.currentNetwork.name);
      const creds = await this.credentialManager.getCredentials(this.currentNetwork.name === NETWORKS.polygon.name ? 'polygon' : 'amoy');
      if (!creds.success || !creds.wallet || !creds.credentials) {
        console.error('❌ Failed to get credentials via EphemeralCredentialManager. Falling back to direct generation.', creds.error);
        authResult = this.currentNetwork.name === NETWORKS.polygon.name ? await generateMainnetWalletAndKeys() : await generateTestnetWalletAndKeys();
      } else {
        authResult = creds;
        console.log('✅ Credentials successfully retrieved via EphemeralCredentialManager.');
      }
    } else {
      console.warn('🤔 No EphemeralCredentialManager provided to LiveMarketService. Generating new wallet and credentials directly (less efficient).');
      authResult = this.currentNetwork.name === NETWORKS.polygon.name ? await generateMainnetWalletAndKeys() : await generateTestnetWalletAndKeys();
    }

    if (!authResult.success || !authResult.wallet || !authResult.credentials) {
      throw new Error('❌ Failed to generate/retrieve wallet and credentials for LiveMarketService.');
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

  async getLiveMarkets(limit: number = 50, category?: string): Promise<LiveMarket[]> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("CLOB Client not initialized in getLiveMarkets");
    }

    console.log(`📊 Fetching markets. Network: ${this.currentNetwork.name}, Category: ${category || 'All'}, Max results before filter: up to client default`);
    
    const marketDataPayload = await this.clobClient.getMarkets(); 
    
    const allRawMarkets = marketDataPayload.data || [];
    console.log(`Raw markets received: ${allRawMarkets.length}`);

    const now = new Date();
    const filteredRawMarkets = allRawMarkets.filter((market: any) => {
      if (!market.end_date_iso || market.active !== true || market.closed !== false) {
        return false;
      }
      const endDate = new Date(market.end_date_iso);
      if (endDate <= now) {
        return false;
      }
      // Category filter
      if (category) {
        return market.category?.toLowerCase() === category.toLowerCase();
      }
      return true;
    });
    
    console.log(`Markets after active/closed/future filtering (and category if specified): ${filteredRawMarkets.length}`);

    const liveMarkets: LiveMarket[] = filteredRawMarkets.map((market: any) => ({
      id: market.condition_id, 
      question: market.question,
      yesPrice: 0.50, // Placeholder, actual price fetching is a separate concern
      noPrice: 0.50,  // Placeholder
      category: market.category || "General", 
      endsAt: new Date(market.end_date_iso), 
    }));
    
    console.log(`✅ Mapped ${liveMarkets.length} active markets. Applying limit of ${limit}.`);
    return liveMarkets.slice(0, limit);
  }

  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    await this.ensureAuthenticatedClient();
    if (!this.clobClient) {
        throw new Error("CLOB Client not initialized in getMarketDetails");
    }

    console.log(`🔍 Fetching details for market ID (conditionId): ${marketId}`);
    
    const orderbook = await this.clobClient.getOrderBook(marketId);
    
    if (!orderbook || !orderbook.bids || !orderbook.asks) {
        console.warn(`❓ No orderbook data found for market ${marketId}`);
        return null;
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
