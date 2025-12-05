import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.');
}

// Create Supabase client with wallet authentication context
export const createSupabaseClient = (walletAddress?: string) => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // We use wallet authentication, not Supabase auth
    },
    global: {
      headers: walletAddress 
        ? { 'X-Wallet-Address': walletAddress.toLowerCase() }
        : {},
    },
  });

  // Set wallet address in session for RLS policies
  if (walletAddress) {
    client.rpc('set_wallet_context', { wallet: walletAddress.toLowerCase() });
  }

  return client;
};

// Default client without wallet context (for public queries)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// Database types
export interface Profile {
  id: string;
  wallet_address: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  twitter_handle?: string;
  discord_handle?: string;
  website_url?: string;
  created_at: string;
  updated_at: string;
}

export interface NFT {
  id: string;
  token_id: number;
  contract_address: string;
  owner_address: string;
  creator_address: string;
  name: string;
  description?: string;
  image_url: string;
  metadata_url: string;
  metadata_json?: any;
  royalty_percentage?: number;
  created_at: string;
  updated_at: string;
  minted_at?: string;
  last_transfer_at?: string;
  price?: string; // Price from active listing (if any)
  listing_id?: number; // Listing ID (if any)
}

export interface Listing {
  id: string;
  listing_id: number;
  nft_id: string;
  seller_address: string;
  price: string;
  token_address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sold_at?: string;
  cancelled_at?: string;
}

export interface Sale {
  id: string;
  nft_id?: string;
  listing_id: number;
  seller_address: string;
  buyer_address: string;
  price: string;
  token_address: string;
  transaction_hash: string;
  sold_at: string;
}

export interface Favorite {
  id: string;
  user_address: string;
  nft_id: string;
  created_at: string;
}

export interface Collection {
  id: string;
  contract_address: string;
  name: string;
  symbol?: string;
  description?: string;
  banner_url?: string;
  avatar_url?: string;
  total_supply: number;
  total_volume: string;
  floor_price?: string;
  created_at: string;
  updated_at: string;
}

// API functions for profiles
export async function getProfile(walletAddress: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function upsertProfile(
  profile: Partial<Profile> & { wallet_address: string },
  authenticatedWallet: string
): Promise<Profile | null> {
  // CRITICAL SECURITY CHECK: Verify wallet matches
  if (profile.wallet_address.toLowerCase() !== authenticatedWallet.toLowerCase()) {
    console.error('Security violation: Wallet mismatch', {
      profileWallet: profile.wallet_address,
      authenticatedWallet: authenticatedWallet
    });
    throw new Error('Cannot edit profile: wallet address mismatch');
  }
  
  // Create client with wallet context for RLS
  const client = createSupabaseClient(profile.wallet_address);

  const { data, error } = await client
    .from('profiles')
    .upsert({
      ...profile,
      wallet_address: profile.wallet_address.toLowerCase(),
    }, {
      onConflict: 'wallet_address',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting profile:', error);
    return null;
  }

  return data;
}

// API functions for NFTs
export async function getNFTs(filters?: {
  owner?: string;
  creator?: string;
  limit?: number;
  offset?: number;
}): Promise<NFT[]> {
  let query = supabase
    .from('nfts')
    .select(`
      *,
      listings!left(
        listing_id,
        price,
        is_active
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.owner) {
    query = query.eq('owner_address', filters.owner.toLowerCase());
  }

  if (filters?.creator) {
    query = query.eq('creator_address', filters.creator.toLowerCase());
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching NFTs:', error);
    return [];
  }

  // Process data to extract active listing price
  const nftsWithPrice = (data || []).map((nft: any) => {
    const activeListings = nft.listings?.filter((l: any) => l.is_active) || [];
    const activeListing = activeListings[0]; // Get first active listing
    
    return {
      ...nft,
      price: activeListing?.price,
      listing_id: activeListing?.listing_id,
      listings: undefined, // Remove the nested listings array
    };
  });

  return nftsWithPrice;
}

export async function getNFTById(id: string): Promise<NFT | null> {
  const { data, error } = await supabase
    .from('nfts')
    .select(`
      *,
      listings!left(
        listing_id,
        price,
        is_active
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching NFT:', error);
    return null;
  }

  // Process data to extract active listing price
  const activeListings = (data as any).listings?.filter((l: any) => l.is_active) || [];
  const activeListing = activeListings[0];

  return {
    ...data,
    price: activeListing?.price,
    listing_id: activeListing?.listing_id,
    listings: undefined,
  };
}

export async function getNFTByTokenId(contractAddress: string, tokenId: number): Promise<NFT | null> {
  const { data, error } = await supabase
    .from('nfts')
    .select('*')
    .eq('contract_address', contractAddress.toLowerCase())
    .eq('token_id', tokenId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching NFT by token ID:', error);
    return null;
  }

  return data;
}

// API function to index/create NFT after minting
export async function indexNFT(params: {
  tokenId: number;
  contractAddress: string;
  ownerAddress: string;
  creatorAddress: string;
  name: string;
  description?: string;
  imageUrl: string;
  metadataUrl: string;
  metadataJson?: any;
  royaltyPercentage?: number;
}): Promise<NFT | null> {
  // Call API route which uses service role key
  try {
    const response = await fetch('/api/nfts/index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ NFT indexed successfully:', data)
    return data
  } catch (error: any) {
    console.error('Failed to index NFT:', error.message)
    throw error
  }
}

// API functions for listings
export async function getActiveListings(filters?: {
  limit?: number;
  offset?: number;
  minPrice?: string;
  maxPrice?: string;
}): Promise<(Listing & { nft: NFT })[]> {
  let query = supabase
    .from('listings')
    .select('*, nft:nfts(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching listings:', error);
    return [];
  }

  return data || [];
}

// API function to index/create listing after creation on-chain
export async function indexListing(params: {
  listingId: number;
  nftId: string;
  sellerAddress: string;
  price: string;
  tokenAddress: string;
}): Promise<Listing | null> {
  const client = createSupabaseClient(params.sellerAddress);

  const { data, error } = await client
    .from('listings')
    .insert({
      listing_id: params.listingId,
      nft_id: params.nftId,
      seller_address: params.sellerAddress.toLowerCase(),
      price: params.price,
      token_address: params.tokenAddress.toLowerCase(),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error indexing listing:', error);
    return null;
  }

  console.log('✅ Listing indexed successfully:', data);
  return data;
}

// API functions for favorites
export async function getFavorites(userAddress: string): Promise<(Favorite & { nft: NFT })[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*, nft:nfts(*)')
    .eq('user_address', userAddress.toLowerCase())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }

  return data || [];
}

export async function addFavorite(userAddress: string, nftId: string): Promise<boolean> {
  const client = createSupabaseClient(userAddress);
  
  const { error } = await client
    .from('favorites')
    .insert({
      user_address: userAddress.toLowerCase(),
      nft_id: nftId,
    });

  if (error) {
    console.error('Error adding favorite:', error);
    return false;
  }

  return true;
}

export async function removeFavorite(userAddress: string, nftId: string): Promise<boolean> {
  const client = createSupabaseClient(userAddress);
  
  const { error } = await client
    .from('favorites')
    .delete()
    .eq('user_address', userAddress.toLowerCase())
    .eq('nft_id', nftId);

  if (error) {
    console.error('Error removing favorite:', error);
    return false;
  }

  return true;
}

export async function isFavorite(userAddress: string, nftId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_address', userAddress.toLowerCase())
    .eq('nft_id', nftId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking favorite:', error);
    return false;
  }

  return !!data;
}

// API functions for sales history
export async function getSalesHistory(filters?: {
  nftId?: string;
  buyer?: string;
  seller?: string;
  limit?: number;
}): Promise<Sale[]> {
  let query = supabase
    .from('sales')
    .select('*')
    .order('sold_at', { ascending: false });

  if (filters?.nftId) {
    query = query.eq('nft_id', filters.nftId);
  }

  if (filters?.buyer) {
    query = query.eq('buyer_address', filters.buyer.toLowerCase());
  }

  if (filters?.seller) {
    query = query.eq('seller_address', filters.seller.toLowerCase());
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sales history:', error);
    return [];
  }

  return data || [];
}

// Search function
export async function searchNFTs(searchTerm: string, limit = 20): Promise<NFT[]> {
  const { data, error } = await supabase
    .from('nfts')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching NFTs:', error);
    return [];
  }

  return data || [];
}
