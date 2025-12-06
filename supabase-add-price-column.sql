-- Add price column to nfts table for caching listing prices
-- This improves query performance by avoiding multiple blockchain reads

ALTER TABLE nfts 
ADD COLUMN IF NOT EXISTS price TEXT DEFAULT NULL;

COMMENT ON COLUMN nfts.price IS 'Current listing price in USDC (cached from blockchain). NULL if not listed.';

-- Add index for faster queries on listed NFTs
CREATE INDEX IF NOT EXISTS idx_nfts_price ON nfts(price) WHERE price IS NOT NULL;

-- Add listing_id column to link with listings table
ALTER TABLE nfts
ADD COLUMN IF NOT EXISTS listing_id BIGINT DEFAULT NULL;

COMMENT ON COLUMN nfts.listing_id IS 'Current active listing ID from blockchain. NULL if not listed.';
