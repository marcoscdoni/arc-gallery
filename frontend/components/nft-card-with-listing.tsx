'use client'

import { NFTCard } from './nft-card'
import { useMarketplaceListing_Read } from '@/hooks/use-nft-contract'

interface NFTCardWithListingProps {
  id: string
  tokenId: string
  name: string
  image: string
  owner?: string
}

export function NFTCardWithListing({ id, tokenId, name, image, owner }: NFTCardWithListingProps) {
  // Fetch real listing status from blockchain
  const { price: blockchainPrice, isActive } = useMarketplaceListing_Read(
    tokenId ? BigInt(tokenId) : undefined
  )

  // Use blockchain data as source of truth
  const actualPrice = isActive && blockchainPrice ? blockchainPrice : 0n
  const isListed = isActive === true

  return (
    <NFTCard
      id={id}
      name={name}
      image={image}
      price={actualPrice}
      isListed={isListed}
      owner={owner}
    />
  )
}
