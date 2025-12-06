import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import ArcMarketplaceABI from '../frontend/lib/abis/ArcMarketplace.json';

// Load environment variables from frontend/.env.local
config({ path: resolve(__dirname, '../frontend/.env.local') });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Arc Layer 1 configuration - Try different RPC endpoints
const RPC_URLS = [
  'https://rpc.testnet.arc.network',
  'https://rpc-testnet.arcscan.net',
];

const NFT_CONTRACT_ADDRESS = (process.env.NFT_CONTRACT_ADDRESS?.replace(/['"]/g, '') || '0x88FEB9dcDbAbE6f3e2fEdCC643B183Ea061f6402').toLowerCase();
const MARKETPLACE_CONTRACT_ADDRESS = '0xb79A0cd345EDbaF64e2a0a41c0b6BFA32388253b';
const USDC_DECIMALS = 18;

// Try to connect to an RPC
async function getProvider() {
  // Define Arc testnet network
  const arcNetwork = {
    name: 'arc-testnet',
    chainId: 5042002, // Correct Arc testnet chain ID
  };

  for (const rpcUrl of RPC_URLS) {
    try {
      console.log(`Trying RPC: ${rpcUrl}...`);
      const provider = new ethers.JsonRpcProvider(rpcUrl, arcNetwork);
      
      // Test the connection
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Connected to ${rpcUrl} (block: ${blockNumber})\n`);
      return provider;
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  throw new Error('Could not connect to any RPC endpoint');
}

async function syncHistoricalListings() {
  console.log('🔄 Starting historical listings sync...\n');

  try {
    // Get provider
    const provider = await getProvider();
    const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, ArcMarketplaceABI, provider);

    // Get all NFTs from database
    const { data: nfts, error } = await supabase
      .from('nfts')
      .select('id, token_id, name, price')
      .eq('contract_address', NFT_CONTRACT_ADDRESS);

    if (error) {
      console.error('Error fetching NFTs:', error);
      return;
    }

    console.log(`Found ${nfts.length} NFTs in database\n`);

    let syncedCount = 0;
    let updatedCount = 0;

    for (const nft of nfts) {
      try {
        console.log(`Checking token ${nft.token_id} (${nft.name})...`);

        // Read listing from blockchain
        const listing = await marketplaceContract.getListing(NFT_CONTRACT_ADDRESS, nft.token_id);
        
        const priceInUSDC = listing.active ? ethers.formatUnits(listing.price, USDC_DECIMALS) : null;
        const currentPrice = nft.price;

        console.log(`  Blockchain: ${listing.active ? priceInUSDC + ' USDC' : 'Not listed'}`);
        console.log(`  Database:   ${currentPrice || 'Not listed'}`);

        // Update if different
        if ((listing.active && currentPrice !== priceInUSDC) || (!listing.active && currentPrice !== null)) {
          await supabase
            .from('nfts')
            .update({ price: priceInUSDC })
            .eq('id', nft.id);

          console.log(`  ✅ Updated to ${priceInUSDC || 'null'}`);
          updatedCount++;
        } else {
          console.log(`  ✓ Already in sync`);
        }

        syncedCount++;
        console.log('');

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        console.error(`  ❌ Error syncing token ${nft.token_id}:`, error.message);
        console.log('');
      }
    }

    console.log('\n✅ Historical sync completed!');
    console.log(`   Checked: ${syncedCount}/${nfts.length} NFTs`);
    console.log(`   Updated: ${updatedCount} NFTs`);
  } catch (error) {
    console.error('❌ Error during historical sync:', error);
    process.exit(1);
  }
}

// Run the sync
syncHistoricalListings().then(() => {
  console.log('\n🏁 Sync finished');
  process.exit(0);
});
