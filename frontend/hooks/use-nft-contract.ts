'use client'

import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient, useReadContract } from 'wagmi'
import { parseUnits } from 'viem'
import { ARC_CHAIN_ID, CONTRACTS } from '@/lib/contracts'
import ArcNFTAbi from '@/lib/abis/ArcNFT.json'
import ArcMarketplaceAbi from '@/lib/abis/ArcMarketplace.json'

// Hook to read listing data from blockchain
export function useMarketplaceListing_Read(tokenId: bigint | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    chainId: ARC_CHAIN_ID,
    address: CONTRACTS.MARKETPLACE as `0x${string}`,
    abi: ArcMarketplaceAbi,
    functionName: 'getListing',
    args: tokenId !== undefined ? [CONTRACTS.NFT, tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  })

  // getListing returns a Listing struct: { seller: address, price: uint256, active: bool }
  const listing = data as { seller: string; price: bigint; active: boolean } | undefined

  console.log('🔍 useMarketplaceListing_Read:', {
    tokenId,
    data,
    listing,
    seller: listing?.seller,
    price: listing?.price,
    isActive: listing?.active,
  })

  return {
    price: listing?.price,
    seller: listing?.seller,
    isActive: listing?.active,
    isLoading,
    refetch,
  }
}

export function useNFTMint() {
  const { data: hash, writeContract, writeContractAsync, isPending, error } = useWriteContract()
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID })

  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    chainId: ARC_CHAIN_ID,
    hash,
  })

  const mint = async (tokenURI: string) => {
    try {
      console.log('🎨 useNFTMint: Preparing mint call for tokenURI:', tokenURI)

      // Read freeMintCount and mintPrice to know if payment is required
      let valueToSend = 0n
      try {
        if (publicClient && address) {
          const freeCount = await publicClient.readContract({
            address: CONTRACTS.NFT as `0x${string}`,
            abi: ArcNFTAbi,
            functionName: 'freeMintCount',
            args: [address as `0x${string}`],
          }) as bigint | number

          const mintPrice = await publicClient.readContract({
            address: CONTRACTS.NFT as `0x${string}`,
            abi: ArcNFTAbi,
            functionName: 'mintPrice',
          }) as bigint | number

          const freeCountBn = BigInt(freeCount ?? 0)
          const mintPriceBn = BigInt(mintPrice ?? 0)

          // If user already used free mints (>= 5), require payment
          if (freeCountBn >= 5n) {
            valueToSend = mintPriceBn
          }
        }
      } catch (readErr) {
        console.warn('Could not read freeMintCount/mintPrice, defaulting to 0 value:', readErr)
      }

      console.log('🎨 useNFTMint: Calling writeContractAsync with tokenURI and value:', tokenURI, valueToSend)
      const txHash = await writeContractAsync({
        chainId: ARC_CHAIN_ID,
        address: CONTRACTS.NFT as `0x${string}`,
        abi: ArcNFTAbi,
        functionName: 'mint',
        args: [tokenURI],
        // Add manual gas limit to prevent estimation failures
        gas: 500000n,
        value: valueToSend,
      })
      console.log('✅ useNFTMint: Transaction hash received:', txHash)
      return txHash
    } catch (err) {
      console.error('❌ useNFTMint: Mint error:', err)
      throw err
    }
  }

  return {
    mint,
    hash,
    receipt,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

export function useNFTApprove() {
  const { data: hash, writeContract, writeContractAsync, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    chainId: ARC_CHAIN_ID,
    hash,
    timeout: 60_000, // 60 seconds timeout
    query: {
      retry: 3,
      retryDelay: 2000,
    },
  })

  const approve = async (tokenId: bigint) => {
    try {
      console.log('📝 useNFTApprove: Approving marketplace for tokenId:', tokenId)
      const txHash = await writeContractAsync({
        chainId: ARC_CHAIN_ID,
        address: CONTRACTS.NFT as `0x${string}`,
        abi: ArcNFTAbi,
        functionName: 'approve',
        args: [CONTRACTS.MARKETPLACE, tokenId],
        gas: 100000n,
      })
      console.log('✅ useNFTApprove: Approve transaction hash:', txHash)
      return txHash
    } catch (err) {
      console.error('❌ useNFTApprove: Approve error:', err)
      throw err
    }
  }

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError: error || isReceiptError,
    error,
  }
}

export function useMarketplaceListing() {
  const { data: hash, writeContract, writeContractAsync, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    chainId: ARC_CHAIN_ID,
    hash,
  })

  const listItem = async (tokenId: bigint, priceInUSDC: string) => {
    try {
      // Convert price to Wei (18 decimals for Arc USDC)
      const priceWei = parseUnits(priceInUSDC, 18)

      console.log('🏷️ useMarketplaceListing: Creating listing', { tokenId, priceInUSDC, priceWei })
      const txHash = await writeContractAsync({
        chainId: ARC_CHAIN_ID,
        address: CONTRACTS.MARKETPLACE as `0x${string}`,
        abi: ArcMarketplaceAbi,
        functionName: 'listItem',
        args: [CONTRACTS.NFT, tokenId, priceWei],
        gas: 300000n,
      })
      console.log('✅ useMarketplaceListing: Listing transaction hash:', txHash)
      return txHash
    } catch (err) {
      console.error('❌ useMarketplaceListing: Create listing error:', err)
      throw err
    }
  }

  return {
    listItem,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

export function useMarketplaceBuy() {
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    chainId: ARC_CHAIN_ID,
    hash,
  })

  const buyItem = async (tokenId: bigint, priceInUSDC: string) => {
    try {
      const priceWei = parseUnits(priceInUSDC, 18)

      const txHash = await writeContractAsync({
        chainId: ARC_CHAIN_ID,
        address: CONTRACTS.MARKETPLACE as `0x${string}`,
        abi: ArcMarketplaceAbi,
        functionName: 'buyItem',
        args: [CONTRACTS.NFT, tokenId],
        value: priceWei,
        gas: 300000n,
      })
      console.log('🛒 useMarketplaceBuy: Buy transaction hash:', txHash)
      return txHash
    } catch (err) {
      console.error('Buy NFT error:', err)
      throw err
    }
  }

  return {
    buyItem,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

export function useMarketplaceCancelListing() {
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    chainId: ARC_CHAIN_ID,
    hash,
  })

  const cancelListing = async (tokenId: bigint) => {
    try {
      console.log('❌ useMarketplaceCancelListing: Canceling listing for tokenId:', tokenId)
      const txHash = await writeContractAsync({
        chainId: ARC_CHAIN_ID,
        address: CONTRACTS.MARKETPLACE as `0x${string}`,
        abi: ArcMarketplaceAbi,
        functionName: 'cancelListing',
        args: [CONTRACTS.NFT, tokenId],
        gas: 200000n,
      })
      console.log('✅ useMarketplaceCancelListing: Cancel transaction hash:', txHash)
      return txHash
    } catch (err) {
      console.error('❌ useMarketplaceCancelListing: Cancel listing error:', err)
      throw err
    }
  }

  return {
    cancelListing,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

export function useMarketplaceUpdateListing() {
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    chainId: ARC_CHAIN_ID,
    hash,
  })

  const updateListing = async (tokenId: bigint, newPriceInUSDC: string) => {
    const priceInWei = parseUnits(newPriceInUSDC, 18)

    return writeContractAsync({
      chainId: ARC_CHAIN_ID,
      address: CONTRACTS.MARKETPLACE as `0x${string}`,
      abi: ArcMarketplaceAbi,
      functionName: 'updateListing',
      args: [CONTRACTS.NFT, tokenId, priceInWei],
    })
  }

  return {
    updateListing,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}
