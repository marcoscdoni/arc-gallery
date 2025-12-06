'use client'

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Heart, Share2, Flag, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getNFTById } from '@/lib/supabase'
import type { NFT } from '@/lib/supabase'
import { useMarketplaceCancelListing, useMarketplaceUpdateListing, useMarketplaceListing, useMarketplaceListing_Read } from '@/hooks/use-nft-contract'
import { toast } from 'sonner'
import { formatUnits } from 'viem'

export default function NFTDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { address } = useAccount()
  const t = useTranslations('nft')
  const [isLiked, setIsLiked] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showListModal, setShowListModal] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [listPrice, setListPrice] = useState('')
  const [nft, setNft] = useState<NFT | null>(null)
  const [loading, setLoading] = useState(true)

  const { cancelListing, isPending: isCanceling, isSuccess: isCancelSuccess } = useMarketplaceCancelListing()
  const { listItem, isPending: isListing, isSuccess: isListSuccess } = useMarketplaceListing()
  const { updateListing, isPending: isUpdating, isSuccess: isUpdateSuccess } = useMarketplaceUpdateListing()
  
  // State for update listing process (cancel + relist)
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)
  const [pendingNewPrice, setPendingNewPrice] = useState<string | null>(null)
  
  // Read listing data from blockchain
  const { price: blockchainPrice, seller: blockchainSeller, isActive: blockchainIsActive, refetch: refetchListing } = useMarketplaceListing_Read(
    nft ? BigInt(nft.token_id) : undefined
  )

  // Debug: log blockchain data
  useEffect(() => {
    if (nft) {
      console.log('📊 NFT Detail Page - Blockchain listing data:', {
        tokenId: nft.token_id,
        blockchainPrice,
        blockchainSeller,
        blockchainIsActive,
        isListed: blockchainIsActive === true,
      })
    }
  }, [nft, blockchainPrice, blockchainSeller, blockchainIsActive])

  useEffect(() => {
    async function loadNFT() {
      if (!params.id || typeof params.id !== 'string') return
      
      setLoading(true)
      try {
        const data = await getNFTById(params.id)
        setNft(data)
        setNewPrice(data.price || '')
      } catch (error) {
        console.error('Failed to load NFT:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNFT()
  }, [params.id])

  // Reload NFT after successful cancel - isSuccess means transaction was confirmed
  useEffect(() => {
    if (isCancelSuccess) {
      toast.success('Listing canceled successfully!')
      refetchListing()
    }
  }, [isCancelSuccess, refetchListing])

  // Reload NFT after successful update - isSuccess means transaction was confirmed
  useEffect(() => {
    if (isUpdateSuccess) {
      toast.success('Listing updated successfully!')
      setShowUpdateModal(false)
      refetchListing()
    }
  }, [isUpdateSuccess, refetchListing])

  // Reload NFT after successful list - isSuccess means transaction was confirmed
  useEffect(() => {
    if (isListSuccess) {
      toast.success('NFT listed successfully!')
      setShowListModal(false)
      refetchListing()
    }
  }, [isListSuccess, refetchListing])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">{t('loading')}</div>
      </div>
    )
  }

  if (!nft) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">{t('notFound')}</div>
      </div>
    )
  }

  // Activity will come from blockchain events later
  const activity: Array<{type: string; from: string; to: string | null; price: string | null; date: string}> = []

  const isOwner = address ? address.toLowerCase() === nft.owner_address.toLowerCase() : false

  // Use blockchain data as source of truth for listing status
  const isListed = blockchainIsActive === true
  const listingPrice = blockchainPrice ? formatUnits(blockchainPrice, 18) : null

  const handleCancelListing = async () => {
    if (!nft) return
    
    try {
      await cancelListing(BigInt(nft.token_id))
    } catch (error) {
      console.error('Cancel listing error:', error)
      toast.error('Failed to cancel listing')
    }
  }

  const handleUpdateListing = async () => {
    if (!nft || !newPrice || parseFloat(newPrice) <= 0) {
      toast.error('Please enter a valid price')
      return
    }
    
    try {
      await updateListing(BigInt(nft.token_id), newPrice)
    } catch (error) {
      console.error('Update listing error:', error)
      toast.error('Failed to update listing')
    }
  }

  const handleListForSale = async () => {
    if (!nft || !listPrice || parseFloat(listPrice) <= 0) {
      toast.error('Please enter a valid price')
      return
    }
    
    try {
      await listItem(BigInt(nft.token_id), listPrice)
    } catch (error) {
      console.error('List for sale error:', error)
      toast.error('Failed to list NFT')
    }
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
              <img
                src={nft.image_url}
                alt={nft.name}
                className="aspect-square w-full object-cover"
              />
            </div>

            {/* Description */}
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <h3 className="mb-2 text-lg font-semibold text-white">{t('description')}</h3>
              <p className="text-gray-400">{nft.description || t('noDescription')}</p>
            </div>

            {/* Details */}
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">{t('details')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('contractAddress')}</span>
                  <a
                    href={`https://testnet.arcscan.app/address/${nft.contract_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-violet-400 hover:text-violet-300"
                  >
                    {nft.contract_address.slice(0, 6)}...{nft.contract_address.slice(-4)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('tokenId')}</span>
                  <span className="text-white">{nft.token_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('tokenStandard')}</span>
                  <span className="text-white">ERC-721</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('blockchain')}</span>
                  <span className="text-white">Arc Layer 1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('creatorRoyalty')}</span>
                  <span className="text-white">{nft.royalty_percentage || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-4">
            {/* Title and Actions */}
            <div>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-white">{nft.name}</h1>
                  <p className="mt-2 text-gray-400">Token #{nft.token_id}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className={`rounded-lg border p-2 transition ${
                      isLiked
                        ? 'border-red-500 bg-red-500/10 text-red-500'
                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Heart className="h-5 w-5" fill={isLiked ? 'currentColor' : 'none'} />
                  </button>
                  <button className="rounded-lg border border-gray-700 bg-gray-900 p-2 text-gray-400 transition hover:text-white">
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button className="rounded-lg border border-gray-700 bg-gray-900 p-2 text-gray-400 transition hover:text-white">
                    <Flag className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Owner */}
              <div className="mb-6 flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400">{t('ownedBy')}</p>
                  <a
                    href={`/profile/${nft.owner_address}`}
                    className="text-sm font-medium text-violet-400 hover:text-violet-300"
                  >
                    {address?.toLowerCase() === nft.owner_address.toLowerCase() ? t('you') : `${nft.owner_address.slice(0, 6)}...${nft.owner_address.slice(-4)}`}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('createdBy')}</p>
                  <a
                    href={`/profile/${nft.creator_address}`}
                    className="text-sm font-medium text-violet-400 hover:text-violet-300"
                  >
                    {nft.creator_address.slice(0, 6)}...{nft.creator_address.slice(-4)}
                  </a>
                </div>
              </div>
            </div>

            {/* Price Card */}
            {isListed && listingPrice ? (
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-400">{t('currentPrice')}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-white">{parseFloat(listingPrice).toFixed(2)}</p>
                    <p className="text-lg text-gray-400">USDC</p>
                  </div>
                </div>

                {isOwner ? (
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowUpdateModal(true)}
                      disabled={isUpdating}
                      className="w-full rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/50 transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      {isUpdating ? 'Updating...' : t('updateListing')}
                    </button>
                    <button 
                      onClick={handleCancelListing}
                      disabled={isCanceling}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                    >
                      {isCanceling ? 'Canceling...' : t('cancelListing')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBuyModal(true)}
                    className="w-full rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/50 transition hover:bg-violet-500"
                  >
                    {t('buyNow')}
                  </button>
                )}
              </div>
            ) : isOwner ? (
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="mb-4 text-sm text-gray-400">{t('status')}</p>
                <p className="mb-4 text-lg font-semibold text-white">{t('notListed')}</p>
                <button 
                  onClick={() => setShowListModal(true)}
                  disabled={isListing}
                  className="w-full rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/50 transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {isListing ? 'Listing...' : t('listForSale')}
                </button>
              </div>
            ) : null}

            {/* Update Listing Modal */}
            {showUpdateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
                  <h3 className="mb-4 text-xl font-bold text-white">{t('updateListing')}</h3>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      New Price (USDC)
                    </label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="h-12 w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 text-white placeholder-gray-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      disabled={isUpdating}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleUpdateListing}
                      disabled={isUpdating}
                      className="flex-1 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/50 transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      {isUpdating ? 'Updating...' : t('confirm')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List for Sale Modal */}
            {showListModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
                  <h3 className="mb-4 text-xl font-bold text-white">{t('listForSale')}</h3>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Price (USDC)
                    </label>
                    <input
                      type="number"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="h-12 w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 text-white placeholder-gray-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowListModal(false)}
                      disabled={isListing}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleListForSale}
                      disabled={isListing}
                      className="flex-1 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/50 transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      {isListing ? 'Listing...' : t('confirm')}
                    </button>
                  </div>
                </div>
              </div>
            )}


            {/* Activity */}
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">{t('activity')}</h3>
              <div className="space-y-3">
                {activity.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b border-gray-800 pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-800 p-2">
                        {item.type === 'Minted' ? (
                          <DollarSign className="h-4 w-4 text-green-400" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.type}</p>
                        <p className="text-xs text-gray-400">{item.date}</p>
                      </div>
                    </div>
                    {item.price && (
                      <p className="text-sm font-medium text-white">{item.price} USDC</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-2xl font-bold text-white">Complete Purchase</h2>
            <div className="mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price</span>
                <span className="font-medium text-white">{nft.price} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Creator Royalty</span>
                <span className="font-medium text-white">{nft.royalty}%</span>
              </div>
              <div className="border-t border-gray-800 pt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white">Total</span>
                  <span className="text-xl font-bold text-white">{nft.price} USDC</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
              >
                Cancel
              </button>
              <button className="flex-1 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/50 transition hover:bg-violet-500">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
