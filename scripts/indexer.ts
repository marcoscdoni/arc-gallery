import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import ArcNFTABI from '../frontend/lib/abis/ArcNFT.json';
import ArcMarketplaceABI from '../frontend/lib/abis/ArcMarketplace.json';

// Load environment variables from frontend/.env.local
config({ path: resolve(__dirname, '../frontend/.env.local') });

// Supabase configuration (use service role key for backend)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Arc Layer 1 RPC and contract addresses
const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const NFT_CONTRACT_ADDRESS = (process.env.NFT_CONTRACT_ADDRESS?.replace(/['"]/g, '') || '0x88FEB9dcDbAbE6f3e2fEdCC643B183Ea061f6402').toLowerCase();
const MARKETPLACE_CONTRACT_ADDRESS = '0x8F2C499F84Df80c02edBeFB93685218562307529';

// USDC uses 18 decimals on Arc Layer 1
const USDC_DECIMALS = 18;
const ARC_CHAIN_ID = 5042002;

// Initialize provider and contracts
const arcNetwork = {
  name: 'arc-testnet',
  chainId: ARC_CHAIN_ID,
};

const provider = new ethers.JsonRpcProvider(RPC_URL, arcNetwork);
const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ArcNFTABI, provider);
const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, ArcMarketplaceABI, provider);

// Fetch and parse metadata from IPFS or R2
async function fetchMetadata(metadataUrl: string): Promise<any> {
  try {
    let gatewayUrl = metadataUrl;
    
    // Convert IPFS URLs to gateway
    if (metadataUrl.startsWith('ipfs://')) {
      gatewayUrl = metadataUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    
    const response = await fetch(gatewayUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}

// Sync listing data from blockchain to database
async function syncListingFromBlockchain(tokenId: number) {
  try {
    // Read listing from blockchain
    const listing = await marketplaceContract.getListing(NFT_CONTRACT_ADDRESS, tokenId);
    
    console.log(`📊 Syncing listing for token ${tokenId}:`, {
      seller: listing.seller,
      price: ethers.formatUnits(listing.price, USDC_DECIMALS),
      active: listing.active,
    });

    // Get NFT from database
    const { data: nft } = await supabase
      .from('nfts')
      .select('id, price, listing_id')
      .eq('contract_address', NFT_CONTRACT_ADDRESS.toLowerCase())
      .eq('token_id', tokenId)
      .single();

    if (!nft) {
      console.error(`NFT ${tokenId} not found in database`);
      return;
    }

    const priceInUSDC = ethers.formatUnits(listing.price, USDC_DECIMALS);

    // Update NFT price
    await supabase
      .from('nfts')
      .update({
        price: listing.active ? priceInUSDC : null,
      })
      .eq('id', nft.id);

    // Deactivate old listings
    if (listing.active) {
      await supabase
        .from('listings')
        .update({ is_active: false })
        .eq('nft_id', nft.id)
        .eq('is_active', true);
    }

    console.log(`✅ Synced listing for token ${tokenId}`);
  } catch (error) {
    console.error(`Error syncing listing for token ${tokenId}:`, error);
  }
}

// Event handlers
async function handleNFTMinted(tokenId: bigint, owner: string, metadataURI: string, event: any) {
  console.log(`NFT Minted: Token ${tokenId} to ${owner}`);

  try {
    // Fetch metadata
    const metadata = await fetchMetadata(metadataURI);
    const imageUrl = metadata?.image?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') || '';

    // Insert NFT into database
    const { error } = await supabase.from('nfts').insert({
      token_id: Number(tokenId),
      contract_address: NFT_CONTRACT_ADDRESS.toLowerCase(),
      owner_address: owner.toLowerCase(),
      creator_address: owner.toLowerCase(), // Creator is the minter
      name: metadata?.name || `NFT #${tokenId}`,
      description: metadata?.description || '',
      image_url: imageUrl,
      metadata_url: metadataURI,
      metadata_json: metadata,
      royalty_percentage: metadata?.attributes?.find((a: any) => a.trait_type === 'Royalty')?.value || 0,
      minted_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error inserting NFT:', error);
    } else {
      console.log(`NFT ${tokenId} indexed successfully`);
    }
  } catch (error) {
    console.error('Error handling NFT minted event:', error);
  }
}

async function handleNFTTransfer(from: string, to: string, tokenId: bigint, event: any) {
  // Skip mint events (from = zero address)
  if (from === ethers.ZeroAddress) return;

  console.log(`NFT Transfer: Token ${tokenId} from ${from} to ${to}`);

  try {
    // Update NFT owner
    const { error } = await supabase
      .from('nfts')
      .update({
        owner_address: to.toLowerCase(),
        last_transfer_at: new Date().toISOString(),
      })
      .eq('contract_address', NFT_CONTRACT_ADDRESS.toLowerCase())
      .eq('token_id', Number(tokenId));

    if (error) {
      console.error('Error updating NFT owner:', error);
    } else {
      console.log(`NFT ${tokenId} owner updated to ${to}`);
    }
  } catch (error) {
    console.error('Error handling NFT transfer event:', error);
  }
}

async function handleListingCreated(
  listingId: bigint,
  seller: string,
  tokenId: bigint,
  price: bigint,
  tokenAddress: string,
  event: any
) {
  console.log(`Listing Created: #${listingId} - Token ${tokenId} for ${ethers.formatUnits(price, USDC_DECIMALS)} USDC`);

  try {
    // Sync from blockchain to ensure accuracy
    await syncListingFromBlockchain(Number(tokenId));

    // Get NFT ID from database
    const { data: nft } = await supabase
      .from('nfts')
      .select('id')
      .eq('contract_address', NFT_CONTRACT_ADDRESS.toLowerCase())
      .eq('token_id', Number(tokenId))
      .single();

    if (!nft) {
      console.error(`NFT ${tokenId} not found in database`);
      return;
    }

    // Insert listing
    const { error } = await supabase.from('listings').insert({
      listing_id: Number(listingId),
      nft_id: nft.id,
      seller_address: seller.toLowerCase(),
      price: ethers.formatUnits(price, USDC_DECIMALS),
      token_address: tokenAddress.toLowerCase(),
      is_active: true,
    });

    if (error) {
      console.error('Error inserting listing:', error);
    } else {
      console.log(`Listing ${listingId} indexed successfully`);
    }
  } catch (error) {
    console.error('Error handling listing created event:', error);
  }
}

async function handleNFTSold(
  listingId: bigint,
  buyer: string,
  seller: string,
  tokenId: bigint,
  price: bigint,
  event: any
) {
  console.log(`NFT Sold: Token ${tokenId} for ${ethers.formatUnits(price, USDC_DECIMALS)} USDC`);

  try {
    // Get NFT ID
    const { data: nft } = await supabase
      .from('nfts')
      .select('id')
      .eq('contract_address', NFT_CONTRACT_ADDRESS.toLowerCase())
      .eq('token_id', Number(tokenId))
      .single();

    // Mark listing as inactive
    await supabase
      .from('listings')
      .update({
        is_active: false,
        sold_at: new Date().toISOString(),
      })
      .eq('listing_id', Number(listingId));

    // Update NFT price to null (no longer listed)
    if (nft) {
      await supabase
        .from('nfts')
        .update({ price: null })
        .eq('id', nft.id);

      // Record sale
      await supabase.from('sales').insert({
        nft_id: nft.id,
        listing_id: Number(listingId),
        seller_address: seller.toLowerCase(),
        buyer_address: buyer.toLowerCase(),
        price: ethers.formatUnits(price, USDC_DECIMALS),
        token_address: ethers.ZeroAddress,
        transaction_hash: event.transactionHash,
      });
    }

    console.log(`Sale recorded for listing ${listingId}`);
  } catch (error) {
    console.error('Error handling NFT sold event:', error);
  }
}

async function handleListingCancelled(listingId: bigint, event: any) {
  console.log(`Listing Cancelled: #${listingId}`);

  try {
    // Get listing to find token ID
    const { data: listing } = await supabase
      .from('listings')
      .select('nft_id, nfts(token_id)')
      .eq('listing_id', Number(listingId))
      .single();

    // Mark listing as inactive
    await supabase
      .from('listings')
      .update({
        is_active: false,
        cancelled_at: new Date().toISOString(),
      })
      .eq('listing_id', Number(listingId));

    // Update NFT price to null
    if (listing?.nft_id) {
      await supabase
        .from('nfts')
        .update({ price: null })
        .eq('id', listing.nft_id);
    }

    console.log(`Listing ${listingId} cancelled`);
  } catch (error) {
    console.error('Error handling listing cancelled event:', error);
  }
}

async function handleListingUpdated(
  listingId: bigint,
  newPrice: bigint,
  event: any
) {
  console.log(`Listing Updated: #${listingId} - New price: ${ethers.formatUnits(newPrice, USDC_DECIMALS)} USDC`);

  try {
    const priceInUSDC = ethers.formatUnits(newPrice, USDC_DECIMALS);

    // Get listing to find NFT
    const { data: listing } = await supabase
      .from('listings')
      .select('nft_id')
      .eq('listing_id', Number(listingId))
      .single();

    // Update listing price
    await supabase
      .from('listings')
      .update({ price: priceInUSDC })
      .eq('listing_id', Number(listingId));

    // Update NFT price
    if (listing?.nft_id) {
      await supabase
        .from('nfts')
        .update({ price: priceInUSDC })
        .eq('id', listing.nft_id);
    }

    console.log(`Listing ${listingId} updated`);
  } catch (error) {
    console.error('Error handling listing updated event:', error);
  }
}

// Main indexer function
async function startIndexer() {
  console.log('🚀 Starting Arc NFT Indexer...');
  console.log(`NFT Contract: ${NFT_CONTRACT_ADDRESS}`);
  console.log(`Marketplace Contract: ${MARKETPLACE_CONTRACT_ADDRESS}`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  try {
    // Listen to NFT events
    nftContract.on('NFTMinted', handleNFTMinted);
    nftContract.on('Transfer', handleNFTTransfer);

    // Listen to Marketplace events
    marketplaceContract.on('ListingCreated', handleListingCreated);
    marketplaceContract.on('ListingUpdated', handleListingUpdated);
    marketplaceContract.on('NFTSold', handleNFTSold);
    marketplaceContract.on('ListingCancelled', handleListingCancelled);

    console.log('✅ Indexer started successfully!');
    console.log('📡 Listening for blockchain events...\n');
    
    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Error starting indexer:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down indexer...');
  nftContract.removeAllListeners();
  marketplaceContract.removeAllListeners();
  process.exit(0);
});

// Start the indexer
startIndexer();
