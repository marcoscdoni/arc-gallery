import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying UPDATED ArcMarketplace to Arc Testnet...\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy ArcMarketplace with updateListing function
  console.log("📦 Deploying ArcMarketplace (with updateListing)...");
  const ArcMarketplace = await ethers.getContractFactory("ArcMarketplace");
  const marketplace = await ArcMarketplace.deploy();
  
  console.log("⏳ Waiting for deployment transaction...");
  await marketplace.waitForDeployment();
  
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ ArcMarketplace deployed to:", marketplaceAddress);

  // Get existing NFT address
  const deploymentsPath = path.join(__dirname, "../deployments/arc-testnet.json");
  let existingNFT = "0x88FEB9dcDbAbE6f3e2fEdCC643B183Ea061f6402"; // Default
  
  if (fs.existsSync(deploymentsPath)) {
    const existing = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    existingNFT = existing.contracts.ArcNFT;
  }

  // Save deployment info
  const deploymentInfo = {
    network: "Arc Testnet",
    chainId: 5042002,
    timestamp: new Date().toISOString(),
    contracts: {
      ArcNFT: existingNFT,
      ArcMarketplace: marketplaceAddress,
      ArcMarketplace_OLD: "0xb79A0cd345EDbaF64e2a0a41c0b6BFA32388253b"
    },
    deployer: deployer.address,
    notes: "Updated marketplace with updateListing function"
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "arc-testnet.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📝 Deployment info saved to deployments/arc-testnet.json");
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Next steps:");
  console.log("1. Update frontend/lib/contracts.ts with new marketplace address");
  console.log("2. Copy updated ABI to frontend/lib/abis/ArcMarketplace.json");
  console.log("3. Approve NFT contract for new marketplace");
  console.log("\n📍 Addresses:");
  console.log("   NFT:         ", existingNFT);
  console.log("   Marketplace: ", marketplaceAddress);
  console.log("   Old Marketplace: 0xb79A0cd345EDbaF64e2a0a41c0b6BFA32388253b");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
