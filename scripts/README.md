# Useful Scripts for Daily Activities

This directory contains scripts to facilitate your daily interactions on Arc Testnet.

## Available Scripts

### 1. deploy.ts
Complete deployment of NFT and Marketplace contracts.

### 2. interact.ts
Basic interaction script (mint + list).

### 3. batch-mint.ts
Mint multiple NFTs at once.

### 4. create-auction.ts
Create auctions automatically.

### 5. stats.ts
View marketplace statistics.

### 6. indexer.ts
**Real-time blockchain event indexer** - Syncs NFT and Marketplace events to Supabase database.

### 7. sync-historical.ts
**One-time sync script** - Updates all NFT listing prices from blockchain to database.

## How to Use

```bash
# Deploy
npm run deploy:testnet

# Basic interaction
npx hardhat run scripts/interact.ts --network arcTestnet

# Batch mint
npx hardhat run scripts/batch-mint.ts --network arcTestnet

# Create auction
npx hardhat run scripts/create-auction.ts --network arcTestnet

# View stats
npx hardhat run scripts/stats.ts --network arcTestnet

# Run indexer (real-time sync)
npm run indexer

# Sync historical data (one-time)
npm run sync-historical
```

## Indexer Setup

The indexer requires environment variables:

```bash
# .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ARC_RPC_URL=https://rpc-sepolia.arcscan.net
NFT_CONTRACT_ADDRESS=0x88FEB9dcDbAbE6f3e2fEdCC643B183Ea061f6402
MARKETPLACE_CONTRACT_ADDRESS=0xb79A0cd345EDbaF64e2a0a41c0b6BFA32388253b
```

### Events Monitored

**NFT Contract:**
- `NFTMinted` - New NFT created
- `Transfer` - NFT ownership changed

**Marketplace Contract:**
- `ListingCreated` - NFT listed for sale
- `ListingUpdated` - Listing price changed
- `ListingCancelled` - Listing removed
- `NFTSold` - NFT purchased

### Running the Indexer

```bash
# Install dependencies
npm install

# Run indexer (keeps running)
npm run indexer

# Or with ts-node directly
npx ts-node scripts/indexer.ts
```

The indexer will:
1. Connect to Arc Layer 1 blockchain
2. Listen for smart contract events in real-time
3. Update Supabase database automatically
4. Keep NFT prices synced with blockchain state

### Syncing Historical Data

If you already have NFTs minted before starting the indexer:

```bash
npm run sync-historical
```

This will:
1. Read all NFTs from Supabase
2. Check current listing status on blockchain
3. Update database with correct prices
4. Show detailed progress and results

