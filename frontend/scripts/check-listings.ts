import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from frontend/.env.local
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkListings() {
  console.log('\n🔍 Checking listings table...\n');
  
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (listingsError) {
    console.error('❌ Error fetching listings:', listingsError);
  } else {
    console.log(`📊 Total listings found: ${listings?.length || 0}\n`);
    listings?.forEach((listing: any, index: number) => {
      console.log(`${index + 1}. Listing ID: ${listing.listing_id}`);
      console.log(`   Token ID: ${listing.token_id}`);
      console.log(`   Price: ${listing.price}`);
      console.log(`   Is Active: ${listing.is_active ? '✅' : '❌'}`);
      console.log(`   Seller: ${listing.seller}`);
      console.log(`   Created: ${listing.created_at}\n`);
    });
  }

  console.log('\n🔍 Checking NFTs with listings join...\n');
  
  const { data: nfts, error: nftsError } = await supabase
    .from('nfts')
    .select(`
      id,
      name,
      token_id,
      owner_address,
      listings!left(
        listing_id,
        price,
        is_active
      )
    `)
    .limit(10);

  if (nftsError) {
    console.error('❌ Error fetching NFTs:', nftsError);
  } else {
    console.log(`📊 Total NFTs found: ${nfts?.length || 0}\n`);
    nfts?.forEach((nft: any, index: number) => {
      const activeListings = nft.listings?.filter((l: any) => l.is_active) || [];
      const activeListing = activeListings[0];
      
      console.log(`${index + 1}. ${nft.name} (Token #${nft.token_id})`);
      console.log(`   ID: ${nft.id}`);
      console.log(`   Owner: ${nft.owner_address}`);
      console.log(`   Listings: ${nft.listings?.length || 0} total, ${activeListings.length} active`);
      if (activeListing) {
        console.log(`   💰 Active Price: ${activeListing.price} USDC`);
      } else {
        console.log(`   ⚪ Not listed`);
      }
      console.log('');
    });
  }
}

checkListings().catch(console.error);
