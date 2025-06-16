
import { ClobClient } from '@polymarket/clob-client';
// Use EthersV5Wallet for ClobClient
import { Wallet as EthersV5Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider as EthersV5JsonRpcProvider } from '@ethersproject/providers';
import { generateTestnetWalletAndKeys } from './generate-wallet-and-keys';
import type { AuthResult, EphemeralCredentialManagerInterface, LiveMarket, NetworkConfig } from './types'; 
import { NETWORKS } from './types';

export class LiveMarketService {
  private clobClient: ClobClient | null = null;
  private wallet: EthersV5Wallet | null = null; // Changed to EthersV5Wallet
  private credentialManager?: EphemeralCredentialManagerInterface;
  private currentNetwork: NetworkConfig = NETWORKS.amoy; // Default to Amoy

  constructor(credentialManager?: EphemeralCredentialManagerInterface, network: 'amoy' | 'polygon' = 'amoy') {
    this.credentialManager = credentialManager;
    this.currentNetwork = NETWORKS[network];
    if (!this.currentNetwork) {
        console.error(`Invalid network specified: ${network}, defaulting to Amoy.`);
        this.currentNetwork = NETWORKS.amoy;
    }
  }

  private async ensureAuthenticatedClient(): Promise<void> {
    if (this.clobClient && this.wallet) { // Also check for wallet
      console.log('✅ Using existing authenticated CLOB client.');
      return;
    }

    let authResult: AuthResult;

    if (this.credentialManager) {
      console.log('🚀 Using EphemeralCredentialManager to get/refresh credentials for network:', this.currentNetwork.name);
      const creds = await this.credentialManager.getCredentials(this.currentNetwork.name === NETWORKS.polygon.name ? 'polygon' : 'amoy');
      if (!creds.success || !creds.wallet || !creds.credentials) {
        console.error('❌ Failed to get credentials via EphemeralCredentialManager. Falling back to direct generation.', creds.error);
        authResult = await generateTestnetWalletAndKeys(); 
      } else {
        authResult = creds;
        console.log('✅ Credentials successfully retrieved via EphemeralCredentialManager.');
      }
    } else {
      console.warn('🤔 No EphemeralCredentialManager provided to LiveMarketService. Generating new wallet and credentials directly (less efficient).');
      authResult = await generateTestnetWalletAndKeys(); 
    }

    if (!authResult.success || !authResult.wallet || !authResult.credentials) {
      throw new Error('❌ Failed to generate/retrieve wallet and credentials for LiveMarketService.');
    }

    // Create an ethers v5 wallet instance for ClobClient
    const provider = new EthersV5JsonRpcProvider(this.currentNetwork.rpcUrl);
    this.wallet = new EthersV5Wallet(authResult.wallet.privateKey, provider);

    this.clobClient = new ClobClient(
      this.currentNetwork.clobUrl,
      this.currentNetwork.chainId,
      this.wallet, // This is now an EthersV5Wallet instance
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

    console.log(`📊 Fetching up to ${limit} live markets. Category: ${category || 'All'}`);
    
    const marketDataPayload = await this.clobClient.getMarkets(); 
    
    const allMarkets = marketDataPayload.data || [];

    const liveMarkets: LiveMarket[] = allMarkets.map((market: any) => ({
      id: market.condition_id, 
      question: market.question,
      yesPrice: 0.50, 
      noPrice: 0.50,  
      category: market.category || "General", 
      endsAt: market.end_date_iso ? new Date(market.end_date_iso) : undefined, 
    }));
    
    let filteredMarkets = liveMarkets;
    if (category) {
        console.log(`Filtering for category: ${category}`);
        filteredMarkets = liveMarkets.filter(market => market.category?.toLowerCase() === category.toLowerCase());
    }

    console.log(`✅ Retrieved ${filteredMarkets.length} live markets after filtering (limit ${limit}).`);
    return filteredMarkets.slice(0, limit);
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
