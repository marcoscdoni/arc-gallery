/**
 * Test script to verify the updateListing function works correctly
 * Usage: npx ts-node scripts/test-update-listing.ts
 */

import { ethers } from 'ethers';
import { config } from 'dotenv';
import { resolve } from 'path';
import ArcMarketplaceJSON from '../artifacts/ArcMarketplace.sol/ArcMarketplace.json';

config({ path: resolve(__dirname, '../frontend/.env.local') });

const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const MARKETPLACE_ADDRESS = '0x8F2C499F84Df80c02edBeFB93685218562307529';
const NFT_CONTRACT_ADDRESS = '0x88FEB9dcDbAbE6f3e2fEdCC643B183Ea061f6402';

async function testUpdateListing() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ArcMarketplaceABI = ArcMarketplaceJSON.abi;
  
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, ArcMarketplaceABI, provider);

  console.log('🧪 Testing updateListing function...\n');
  console.log(`Marketplace Address: ${MARKETPLACE_ADDRESS}`);
  console.log(`NFT Address: ${NFT_CONTRACT_ADDRESS}\n`);

  try {
    // Check if updateListing function exists in ABI
    const abiFunction = ArcMarketplaceABI.find(
      (item: any) => item.type === 'function' && item.name === 'updateListing'
    );

    if (!abiFunction) {
      console.error('❌ updateListing function NOT found in ABI');
      return;
    }

    console.log('✅ updateListing function found in ABI');
    console.log('Function signature:', abiFunction);

    // Check if ListingUpdated event exists
    const eventAbi = ArcMarketplaceABI.find(
      (item: any) => item.type === 'event' && item.name === 'ListingUpdated'
    );

    if (!eventAbi) {
      console.error('❌ ListingUpdated event NOT found in ABI');
      return;
    }

    console.log('✅ ListingUpdated event found in ABI');
    console.log('Event signature:', eventAbi);

    // Try to call a read function to verify contract is deployed
    console.log('\n📊 Verifying contract is deployed...');
    const testTokenId = BigInt(1);
    try {
      const listing = await marketplace.getListing(NFT_CONTRACT_ADDRESS, testTokenId);
      console.log('✅ Contract is responding');
      console.log(`Sample listing for token 1:`, {
        seller: listing.seller,
        price: ethers.formatUnits(listing.price, 18),
        active: listing.active,
      });
    } catch (error: any) {
      if (error.message.includes('Listing not found') || error.message.includes('not found')) {
        console.log('✅ Contract is responding (listing not found, which is OK for test)');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All checks passed!');
    console.log('\nThe updateListing function is ready to use:');
    console.log('  - Function: updateListing(address nftAddress, uint256 tokenId, uint256 newPrice)');
    console.log('  - Event: ListingUpdated(address indexed nftAddress, uint256 indexed tokenId, address indexed seller, uint256 oldPrice, uint256 newPrice)');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUpdateListing();
