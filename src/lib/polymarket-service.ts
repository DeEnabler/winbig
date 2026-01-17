// src/lib/polymarket-service.ts
// Service for fetching and syncing Polymarket profile data

const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';
const POLYMARKET_DATA_API = 'https://data-api.polymarket.com';

// ============================================
// TYPES
// ============================================

export interface PolymarketPublicProfile {
  proxyWallet: string;
  name?: string;
  pseudonym?: string;
  bio?: string;
  profileImage?: string;
  xUsername?: string;
  verifiedBadge?: boolean;
  displayUsernamePublic?: boolean;
  createdAt?: string;
}

export interface PolymarketPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: string;
  avgPrice: string;
  initialValue: string;
  currentValue: string;
  cashPnl: string;
  percentPnl: string;
  realizedPnl: string;
  percentRealizedPnl: string;
  title: string;
  slug: string;
  outcome: string;
  endDate: string;
  redeemable?: boolean;
  mergeable?: boolean;
  curPrice?: string;
  icon?: string;
}

export interface PolymarketActivity {
  type: 'TRADE' | 'SPLIT' | 'MERGE' | 'REDEEM' | string;
  timestamp: string;
  asset: string;
  conditionId: string;
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
  transactionHash: string;
  title: string;
  slug: string;
  outcome: string;
  icon?: string;
}

export interface PolymarketValue {
  user: string;
  value: string;
}

export interface MirroredProfile {
  polymarket_address: string;
  polymarket_username?: string;
  display_name?: string;
  pseudonym?: string;
  bio?: string;
  profile_image_url?: string;
  x_username?: string;
  is_verified: boolean;
  display_username_public: boolean;
  joined_at?: string;
  portfolio_value: number;
  total_positions: number;
  total_trades: number;
  total_pnl: number;
  total_pnl_percent: number;
  realized_pnl: number;
  unrealized_pnl: number;
  positions_won: number;
  positions_lost: number;
  win_rate: number;
  total_volume_traded: number;
  positions: PolymarketPosition[];
  activity: PolymarketActivity[];
  raw_profile_data?: PolymarketPublicProfile;
}

// ============================================
// API FETCHERS
// ============================================

/**
 * Resolve a Polymarket username to wallet address
 */
export async function resolvePolymarketUsername(username: string): Promise<string | null> {
  try {
    // Remove @ if present
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    
    // Use public search to resolve username -> wallet
    const response = await fetch(
      `${POLYMARKET_GAMMA_API}/public-search?q=${encodeURIComponent(cleanUsername)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      console.error('Failed to resolve username:', response.status);
      return null;
    }

    const data = await response.json();

    // The public-search endpoint can return different shapes; handle common cases.
    const candidates: any[] = [];
    if (Array.isArray(data)) {
      candidates.push(...data);
    } else if (data?.profiles && Array.isArray(data.profiles)) {
      candidates.push(...data.profiles);
    } else if (data?.users && Array.isArray(data.users)) {
      candidates.push(...data.users);
    } else if (data?.results && Array.isArray(data.results)) {
      candidates.push(...data.results);
    } else if (data) {
      candidates.push(data);
    }

    for (const item of candidates) {
      const handle = item?.pseudonym || item?.username || item?.xUsername || item?.name;
      const address = item?.proxyWallet || item?.address || item?.wallet || item?.walletAddress;
      if (address && handle && String(handle).toLowerCase() === cleanUsername.toLowerCase()) {
        return address;
      }
    }

    // Fallback: return first address-like value if present
    for (const item of candidates) {
      const address = item?.proxyWallet || item?.address || item?.wallet || item?.walletAddress;
      if (address) return address;
    }

    // Fallback: parse Polymarket profile page __NEXT_DATA__ for proxyWallet
    const fallbackAddress = await resolveFromProfilePage(cleanUsername);
    return fallbackAddress;
  } catch (error) {
    console.error('Error resolving Polymarket username:', error);
    return null;
  }
}

/**
 * Fallback: resolve username by parsing Polymarket profile page HTML
 */
async function resolveFromProfilePage(username: string): Promise<string | null> {
  try {
    const url = `https://polymarket.com/@${encodeURIComponent(username)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'text/html' },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const marker = '<script id="__NEXT_DATA__" type="application/json"';
    const start = html.indexOf(marker);
    if (start === -1) {
      return null;
    }
    const scriptStart = html.indexOf('>', start);
    const scriptEnd = html.indexOf('</script>', scriptStart);
    if (scriptStart === -1 || scriptEnd === -1) {
      return null;
    }
    const jsonText = html.slice(scriptStart + 1, scriptEnd);
    const data = JSON.parse(jsonText);

    // Walk the JSON to find a profile-like object with proxyWallet
    const stack: any[] = [data];
    while (stack.length) {
      const node = stack.pop();
      if (node && typeof node === 'object') {
        if (node.proxyWallet && typeof node.proxyWallet === 'string') {
          return node.proxyWallet;
        }
        if (Array.isArray(node)) {
          for (const item of node) stack.push(item);
        } else {
          for (const value of Object.values(node)) stack.push(value);
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error resolving from profile page:', error);
    return null;
  }
}

/**
 * Fetch public profile from Polymarket Gamma API
 */
export async function fetchPolymarketProfile(address: string): Promise<PolymarketPublicProfile | null> {
  try {
    console.log('📡 Fetching Polymarket profile for:', address);
    
    const response = await fetch(
      `${POLYMARKET_GAMMA_API}/public-profile?address=${encodeURIComponent(address)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Profile not found on Polymarket');
        return null;
      }
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Polymarket profile fetched:', data.pseudonym || address);
    return data;
  } catch (error) {
    console.error('Error fetching Polymarket profile:', error);
    return null;
  }
}

/**
 * Fetch positions from Polymarket Data API
 */
export async function fetchPolymarketPositions(address: string): Promise<PolymarketPosition[]> {
  try {
    console.log('📡 Fetching Polymarket positions for:', address);
    
    const response = await fetch(
      `${POLYMARKET_DATA_API}/positions?user=${address}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Polymarket positions API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data?.length || 0} positions from Polymarket`);
    return data || [];
  } catch (error) {
    console.error('Error fetching Polymarket positions:', error);
    return [];
  }
}

/**
 * Fetch activity from Polymarket Data API
 */
export async function fetchPolymarketActivity(address: string, limit: number = 50): Promise<PolymarketActivity[]> {
  try {
    console.log('📡 Fetching Polymarket activity for:', address);
    
    const response = await fetch(
      `${POLYMARKET_DATA_API}/activity?user=${address}&limit=${limit}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Polymarket activity API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data?.length || 0} activity items from Polymarket`);
    return data || [];
  } catch (error) {
    console.error('Error fetching Polymarket activity:', error);
    return [];
  }
}

/**
 * Fetch portfolio value from Polymarket Data API
 */
export async function fetchPolymarketValue(address: string): Promise<number> {
  try {
    console.log('📡 Fetching Polymarket portfolio value for:', address);
    
    const response = await fetch(
      `${POLYMARKET_DATA_API}/value?user=${address}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Polymarket value API error: ${response.status}`);
    }

    const data: PolymarketValue = await response.json();
    const value = parseFloat(data.value) || 0;
    console.log(`✅ Portfolio value: $${value.toFixed(2)}`);
    return value;
  } catch (error) {
    console.error('Error fetching Polymarket value:', error);
    return 0;
  }
}

// ============================================
// PROFILE AGGREGATION
// ============================================

/**
 * Fetch complete Polymarket profile with all data
 */
export async function fetchCompletePolymarketProfile(
  addressOrUsername: string
): Promise<MirroredProfile | null> {
  try {
    let address = addressOrUsername;
    
    // If it looks like a username, resolve it first
    if (!addressOrUsername.startsWith('0x')) {
      const cleanIdentifier = addressOrUsername.startsWith('@')
        ? addressOrUsername.substring(1)
        : addressOrUsername;
      const resolved = await resolvePolymarketUsername(cleanIdentifier);
      if (!resolved) {
        console.log('Could not resolve Polymarket username:', addressOrUsername);
        return null;
      }
      address = resolved;
    }

    console.log('📊 Fetching complete Polymarket profile for:', address);

    // Fetch all data in parallel
    const [profile, positions, activity, portfolioValue] = await Promise.all([
      fetchPolymarketProfile(address),
      fetchPolymarketPositions(address),
      fetchPolymarketActivity(address),
      fetchPolymarketValue(address),
    ]);

    if (!profile && positions.length === 0 && activity.length === 0) {
      console.log('No data found for address:', address);
      return null;
    }

    // Calculate P&L metrics from positions
    let totalPnl = 0;
    let realizedPnl = 0;
    let unrealizedPnl = 0;
    let totalInitialValue = 0;
    let positionsWon = 0;
    let positionsLost = 0;
    let totalVolume = 0;

    for (const pos of positions) {
      const cashPnl = parseFloat(pos.cashPnl) || 0;
      const realized = parseFloat(pos.realizedPnl) || 0;
      const initialValue = parseFloat(pos.initialValue) || 0;
      
      totalPnl += cashPnl;
      realizedPnl += realized;
      totalInitialValue += initialValue;
      
      if (cashPnl > 0) positionsWon++;
      else if (cashPnl < 0) positionsLost++;
    }

    unrealizedPnl = totalPnl - realizedPnl;
    
    // Calculate total volume from activity
    for (const act of activity) {
      if (act.type === 'TRADE') {
        const size = parseFloat(act.size) || 0;
        const price = parseFloat(act.price) || 0;
        totalVolume += size * price;
      }
    }

    const totalPositions = positions.length;
    const winRate = totalPositions > 0 
      ? (positionsWon / (positionsWon + positionsLost)) * 100 
      : 0;
    const totalPnlPercent = totalInitialValue > 0 
      ? (totalPnl / totalInitialValue) * 100 
      : 0;

    const mirroredProfile: MirroredProfile = {
      polymarket_address: address.toLowerCase(),
      polymarket_username: profile?.pseudonym || undefined,
      display_name: profile?.name || profile?.pseudonym || undefined,
      pseudonym: profile?.pseudonym || undefined,
      bio: profile?.bio || undefined,
      profile_image_url: profile?.profileImage || undefined,
      x_username: profile?.xUsername || undefined,
      is_verified: profile?.verifiedBadge || false,
      display_username_public: profile?.displayUsernamePublic !== false,
      joined_at: profile?.createdAt || undefined,
      portfolio_value: portfolioValue,
      total_positions: totalPositions,
      total_trades: activity.filter(a => a.type === 'TRADE').length,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      realized_pnl: realizedPnl,
      unrealized_pnl: unrealizedPnl,
      positions_won: positionsWon,
      positions_lost: positionsLost,
      win_rate: winRate,
      total_volume_traded: totalVolume,
      positions,
      activity,
      raw_profile_data: profile || undefined,
    };

    console.log('✅ Complete profile assembled:', {
      address,
      username: mirroredProfile.polymarket_username,
      portfolioValue: mirroredProfile.portfolio_value,
      positions: mirroredProfile.total_positions,
      trades: mirroredProfile.total_trades,
    });

    return mirroredProfile;
  } catch (error) {
    console.error('Error fetching complete Polymarket profile:', error);
    return null;
  }
}

// ============================================
// KNOWN PROFILES (for demo/sampling)
// ============================================

/**
 * List of interesting Polymarket profiles to sample
 */
export const SAMPLE_POLYMARKET_PROFILES = [
  { username: 'ascetic0x', description: 'Example high-volume trader' },
  { username: 'Theo', description: 'Polymarket team member' },
  { username: 'Shayne', description: 'Active trader' },
];

/**
 * Fetch multiple profiles for sampling
 */
export async function fetchSampleProfiles(): Promise<MirroredProfile[]> {
  const profiles: MirroredProfile[] = [];
  
  for (const sample of SAMPLE_POLYMARKET_PROFILES) {
    try {
      const profile = await fetchCompletePolymarketProfile(sample.username);
      if (profile) {
        profiles.push(profile);
      }
    } catch (error) {
      console.error(`Error fetching sample profile ${sample.username}:`, error);
    }
  }
  
  return profiles;
}
