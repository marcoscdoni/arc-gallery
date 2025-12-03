# NFT.Storage Setup Guide

## Overview
This project uses [NFT.Storage](https://nft.storage) for permanent, decentralized storage of NFT images and metadata on IPFS. NFT.Storage is 100% free and provides guaranteed long-term storage backed by Filecoin.

## Setup Instructions

### 1. Create NFT.Storage Account
1. Visit [nft.storage](https://nft.storage)
2. Sign up with your email or GitHub account
3. Verify your email address

### 2. Generate API Token
1. Go to [API Keys](https://nft.storage/manage/)
2. Click "New Key"
3. Give it a name (e.g., "ArcNFT Development")
4. Copy the generated token (it will only be shown once!)

### 3. Configure Environment Variables
1. Copy the example environment file:
   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your NFT.Storage token:
   ```bash
   NEXT_PUBLIC_NFT_STORAGE_TOKEN=your_actual_token_here
   ```

### 4. Test the Integration
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/create` page
3. Upload an image and fill in the NFT details
4. Click "Create NFT" - the image and metadata will be uploaded to IPFS via NFT.Storage

## Features

### Automatic Upload Flow
When creating an NFT, the system automatically:
1. **Uploads image** to IPFS → Returns `ipfs://...` URL
2. **Creates metadata** JSON with image URL and attributes
3. **Uploads metadata** to IPFS → Returns metadata URI for minting
4. **Mints NFT** on Arc L1 blockchain with the metadata URI

### Progress Tracking
The UI shows real-time progress for:
- Image upload (with percentage)
- Metadata upload (with percentage)
- Combined progress bar during upload phase

### Error Handling
- Validates NFT.Storage token is configured
- Shows clear error messages if upload fails
- Gracefully handles network issues

## API Usage

### Upload Image
```typescript
import { uploadImage } from '@/lib/nft-storage'

const imageUrl = await uploadImage(file, (progress) => {
  console.log(`Upload progress: ${progress.percentage}%`)
})
// Returns: https://nftstorage.link/ipfs/bafybeig...
```

### Upload Metadata
```typescript
import { uploadMetadata } from '@/lib/nft-storage'

const metadataUrl = await uploadMetadata({
  name: "My NFT",
  description: "Amazing artwork",
  image: "ipfs://bafybeig...",
  attributes: [{ trait_type: "Color", value: "Blue" }]
})
// Returns: https://nftstorage.link/ipfs/bafybeig...
```

### Complete Upload Flow
```typescript
import { uploadNFT } from '@/lib/nft-storage'

const { imageUrl, metadataUrl } = await uploadNFT(
  imageFile,
  {
    name: "My NFT",
    description: "Amazing artwork",
    attributes: [{ trait_type: "Color", value: "Blue" }]
  },
  (progress) => console.log(`Image: ${progress.percentage}%`),
  (progress) => console.log(`Metadata: ${progress.percentage}%`)
)
```

## Benefits of NFT.Storage

✅ **100% Free** - No storage limits, no bandwidth limits  
✅ **Permanent** - Data stored on Filecoin network forever  
✅ **Decentralized** - True IPFS/Filecoin storage, not centralized  
✅ **Fast** - Global CDN for quick retrieval  
✅ **Trustworthy** - Backed by Protocol Labs (creators of IPFS)  

## Gateway URLs

NFT.Storage provides multiple gateway options:
- `https://nftstorage.link/ipfs/{cid}` (default, fastest)
- `https://ipfs.io/ipfs/{cid}` (public IPFS gateway)
- `ipfs://{cid}` (protocol URL for IPFS-compatible browsers)

The library uses `nftstorage.link` by default for best performance.

## Troubleshooting

### "NFT.Storage token not configured"
- Make sure `.env.local` exists in the `frontend/` folder
- Verify `NEXT_PUBLIC_NFT_STORAGE_TOKEN` is set correctly
- Restart the dev server after changing environment variables

### Upload fails with 401 error
- Your API token may be invalid or expired
- Generate a new token from [nft.storage/manage](https://nft.storage/manage/)
- Update `.env.local` with the new token

### Slow upload speeds
- NFT.Storage uploads go directly to IPFS nodes
- Large images may take longer (optimize images before upload)
- Network connectivity can affect upload speed

## Best Practices

1. **Image Optimization**: Resize/compress images before upload
   - Recommended: < 5MB per image
   - Use WebP or optimized JPEG/PNG

2. **Metadata Standards**: Follow ERC-721 metadata standard
   - Required: `name`, `description`, `image`
   - Optional: `attributes`, `external_url`, `animation_url`

3. **Error Handling**: Always wrap uploads in try/catch
   - Show user-friendly error messages
   - Allow retry on failure

4. **Progress Feedback**: Show upload progress to users
   - Better UX for large files
   - Prevents confusion during upload

## Cost Analysis

| Usage Level | NFT.Storage Cost | Notes |
|------------|------------------|-------|
| 0-1000 NFTs | $0/month | Free forever |
| 1000-10000 NFTs | $0/month | Free forever |
| 10000+ NFTs | $0/month | Free forever |

NFT.Storage is **completely free** with no storage limits. It's funded by Protocol Labs and Filecoin to support the NFT ecosystem.

## Resources

- [NFT.Storage Documentation](https://nft.storage/docs/)
- [API Reference](https://nft.storage/api-docs/)
- [IPFS Best Practices](https://docs.ipfs.tech/concepts/best-practices/)
- [ERC-721 Metadata Standard](https://eips.ethereum.org/EIPS/eip-721)
