#!/bin/bash

# Deploy ArcMarketplace with Ledger using Foundry
# Usage: ./deploy-with-ledger.sh [account-number]
# Example: ./deploy-with-ledger.sh 1  (for Ledger Live Account 1)

set -e

ACCOUNT_INDEX=${1:-1}
RPC_URL="https://rpc.testnet.arc.network"
CHAIN_ID=5042002

# Ledger Live uses path: m/44'/60'/ACCOUNT'/0/0
LEDGER_PATH="m/44'/60'/$ACCOUNT_INDEX'/0/0"

echo "🚀 Deploying ArcMarketplace to Arc Testnet"
echo "📍 Using Ledger Live Account: $ACCOUNT_INDEX"
echo "🔑 Derivation path: $LEDGER_PATH"
echo "🌐 RPC: $RPC_URL"
echo ""

# Compile contract first
echo "📦 Compiling contract..."
forge build contracts/ArcMarketplace.sol

echo ""
echo "🔐 Please confirm on your Ledger device..."
echo "   Make sure 'Blind signing' is enabled in Ethereum app settings"
echo ""

# Deploy using Ledger
forge create contracts/ArcMarketplace.sol:ArcMarketplace \
  --rpc-url $RPC_URL \
  --ledger \
  --mnemonic-derivation-path "$LEDGER_PATH" \
  --legacy \
  --broadcast

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the deployed address above"
echo "2. Update frontend/lib/contracts.ts MARKETPLACE address"
echo "3. Run: npm run copy-abis (to update ABI)"
echo "4. Approve NFT for new marketplace if needed"
