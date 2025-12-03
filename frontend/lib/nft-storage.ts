import { NFTStorage, File } from 'nft.storage';

// Initialize NFT.Storage client with API token from environment
const getClient = () => {
  const token = process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN;
  if (!token) {
    throw new Error('NFT.Storage token not configured. Set NEXT_PUBLIC_NFT_STORAGE_TOKEN in .env.local');
  }
  return new NFTStorage({ token });
};

export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // IPFS URL after image upload
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  animation_url?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload image file to IPFS via NFT.Storage
 * Returns the IPFS gateway URL for the uploaded image
 */
export async function uploadImage(
  file: File | Blob,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    const client = getClient();
    
    // Convert Blob to File if needed
    const imageFile = file instanceof File 
      ? file 
      : new File([file], 'image.png', { type: file.type });

    // Store the image
    const cid = await client.storeBlob(imageFile);
    
    // Simulate progress for better UX (NFT.Storage doesn't provide native progress)
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    // Return IPFS gateway URL
    return `https://nftstorage.link/ipfs/${cid}`;
  } catch (error) {
    console.error('Error uploading image to IPFS:', error);
    throw new Error('Failed to upload image to IPFS');
  }
}

/**
 * Upload complete NFT metadata to IPFS via NFT.Storage
 * This includes the image URL and all other metadata
 */
export async function uploadMetadata(
  metadata: NFTMetadata,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    const client = getClient();
    
    // Convert metadata to JSON blob
    const metadataJson = JSON.stringify(metadata, null, 2);
    const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
    
    // Store the metadata
    const cid = await client.storeBlob(metadataBlob);
    
    // Simulate progress
    if (onProgress) {
      onProgress({ loaded: metadataBlob.size, total: metadataBlob.size, percentage: 100 });
    }

    // Return IPFS gateway URL
    return `https://nftstorage.link/ipfs/${cid}`;
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}

/**
 * Complete flow: upload image first, then upload metadata with image URL
 * Returns the metadata URI to be used in the NFT contract
 */
export async function uploadNFT(
  imageFile: File | Blob,
  metadata: Omit<NFTMetadata, 'image'>,
  onImageProgress?: (progress: UploadProgress) => void,
  onMetadataProgress?: (progress: UploadProgress) => void
): Promise<{ imageUrl: string; metadataUrl: string }> {
  try {
    // Step 1: Upload image
    const imageUrl = await uploadImage(imageFile, onImageProgress);
    
    // Step 2: Upload metadata with image URL
    const completeMetadata: NFTMetadata = {
      ...metadata,
      image: imageUrl,
    };
    
    const metadataUrl = await uploadMetadata(completeMetadata, onMetadataProgress);
    
    return { imageUrl, metadataUrl };
  } catch (error) {
    console.error('Error in complete NFT upload flow:', error);
    throw error;
  }
}

/**
 * Fetch metadata from IPFS URL
 * Useful for displaying NFT details
 */
export async function fetchMetadata(ipfsUrl: string): Promise<NFTMetadata> {
  try {
    // Convert ipfs:// to https gateway if needed
    const gatewayUrl = ipfsUrl.replace('ipfs://', 'https://nftstorage.link/ipfs/');
    
    const response = await fetch(gatewayUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching metadata from IPFS:', error);
    throw new Error('Failed to fetch NFT metadata');
  }
}

/**
 * Check if NFT.Storage is properly configured
 */
export function isConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN;
}
