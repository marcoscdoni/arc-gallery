import { createPublicClient, http, formatEther } from 'viem';
import { defineChain } from 'viem';

const arcLayer1 = defineChain({
  id: 62298,
  name: 'Arc Layer 1',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer-layer1.arcadiachain.io' },
  },
});

const marketplaceAddress = '0xb79A0cd345EDbaF64e2a0a41c0b6BFA32388253b';

const marketplaceABI = [
  {
    inputs: [],
    name: 'listingIdCounter',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'listings',
    outputs: [
      { internalType: 'address', name: 'seller', type: 'address' },
      { internalType: 'address', name: 'nftContract', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function checkBlockchainListings() {
  console.log('\n🔗 Checking blockchain listings...\n');

  const client = createPublicClient({
    chain: arcLayer1,
    transport: http(),
  });

  try {
    // Get total number of listings
    const listingCounter = await client.readContract({
      address: marketplaceAddress,
      abi: marketplaceABI,
      functionName: 'listingIdCounter',
    });

    console.log(`📊 Total listings created on-chain: ${listingCounter}\n`);

    if (listingCounter > 0n) {
      // Check first 20 listings
      const maxToCheck = listingCounter > 20n ? 20n : listingCounter;
      
      for (let i = 0n; i < maxToCheck; i++) {
        try {
          const listing = await client.readContract({
            address: marketplaceAddress,
            abi: marketplaceABI,
            functionName: 'listings',
            args: [i],
          });

          const [seller, nftContract, tokenId, price, isActive] = listing;

          console.log(`Listing #${i}:`);
          console.log(`  Seller: ${seller}`);
          console.log(`  NFT Contract: ${nftContract}`);
          console.log(`  Token ID: ${tokenId}`);
          console.log(`  Price: ${formatEther(price)} USDC`);
          console.log(`  Is Active: ${isActive ? '✅' : '❌'}`);
          console.log('');
        } catch (error) {
          console.log(`Listing #${i}: Error reading - ${error}`);
        }
      }
    } else {
      console.log('⚠️  No listings found on the blockchain');
    }
  } catch (error) {
    console.error('❌ Error connecting to blockchain:', error);
  }
}

checkBlockchainListings().catch(console.error);
