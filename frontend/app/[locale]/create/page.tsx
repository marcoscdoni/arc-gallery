'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useRef } from 'react'
import { Upload, Image as ImageIcon, Sparkles, CheckCircle, XCircle, ArrowRight, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAccount, useReadContract } from 'wagmi'
import { useNFTMint, useNFTApprove, useMarketplaceListing } from '@/hooks/use-nft-contract'
import { uploadNFT, type UploadProgress } from '@/lib/nft-storage'
import { useRouter } from '@/i18n/routing'
import { useWalletAuth } from '@/hooks/use-wallet-auth'
import { decodeEventLog } from 'viem'
import ArcNFTAbi from '@/lib/abis/ArcNFT.json'
import { ARC_CHAIN_ID } from '@/lib/contracts'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/contracts'
import { indexNFT, indexListing } from '@/lib/supabase'

export default function CreatePage() {
  const t = useTranslations('create')
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { signAuth, isSigningAuth, authError, isAuthenticated } = useWalletAuth()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    royalty: '2.5',
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [currentStep, setCurrentStep] = useState<'form' | 'uploading' | 'minting' | 'approving' | 'listing' | 'success' | 'error'>('form')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null)
  const [listingPrice, setListingPrice] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<{ image: number; metadata: number }>({ image: 0, metadata: 0 })
  const [freeMintCount, setFreeMintCount] = useState<number | null>(null)
  const [mintPriceHuman, setMintPriceHuman] = useState<string | null>(null)
  const [mintInfoLoading, setMintInfoLoading] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [uploadedMetadataUrl, setUploadedMetadataUrl] = useState<string | null>(null)

  // Guard to ensure we only attempt approval once per mint flow
  const approvalStartedRef = useRef(false)
  const listingStartedRef = useRef(false)
  
  const { mint, isPending: isMinting, isConfirming: isMintConfirming, isSuccess: isMintSuccess, hash: mintHash, receipt: mintReceipt } = useNFTMint()
  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: isApproveSuccess, hash: approveHash, isError: isApproveError, error: approveError } = useNFTApprove()
  const { listItem, isPending: isListing, isConfirming: isListingConfirming, isSuccess: isListingSuccess, hash: listingHash } = useMarketplaceListing()

  // Handle approve timeout/error (move to effect to avoid setting state during render)
  useEffect(() => {
    if (isApproveError && currentStep === 'approving') {
      console.error('❌ Approve failed:', approveError)
      console.error('Approve hash:', approveHash)
      setErrorMessage(`Approve failed: ${approveError?.message || 'Transaction timeout or rejected'}. Check console for details.`)
      setCurrentStep('error')
    }
  }, [isApproveError, currentStep, approveError, approveHash])

  // Read free mint count and mint price using wagmi hooks
  const { data: freeCountData, isFetching: isFreeCountFetching } = useReadContract({
    address: CONTRACTS.NFT as `0x${string}`,
    abi: ArcNFTAbi,
    functionName: 'freeMintCount',
    args: address ? [address as `0x${string}`] : undefined,
    chainId: ARC_CHAIN_ID,
    query: {
      enabled: Boolean(isConnected && address),
    },
  })

  const { data: mintPriceData, isFetching: isMintPriceFetching } = useReadContract({
    address: CONTRACTS.NFT as `0x${string}`,
    abi: ArcNFTAbi,
    functionName: 'mintPrice',
    chainId: ARC_CHAIN_ID,
    query: {
      enabled: Boolean(isConnected && address),
    },
  })

  useEffect(() => {
    setMintInfoLoading(Boolean(isFreeCountFetching || isMintPriceFetching))

    if (freeCountData !== undefined && freeCountData !== null) {
      try {
        setFreeMintCount(Number(freeCountData as bigint))
      } catch {
        setFreeMintCount(Number(freeCountData as number))
      }
    } else {
      setFreeMintCount(null)
    }

    if (mintPriceData !== undefined && mintPriceData !== null) {
      try {
        const human = formatUnits(BigInt(mintPriceData as bigint), 18)
        setMintPriceHuman(human)
      } catch (e) {
        setMintPriceHuman(null)
      }
    } else {
      setMintPriceHuman(null)
    }
  }, [freeCountData, mintPriceData, isFreeCountFetching, isMintPriceFetching])

  // Debug logging for transaction hashes
  if (mintHash) {
    console.log('🔗 Mint hash:', mintHash)
  }
  if (approveHash) {
    console.log('🔗 Approve hash:', approveHash)
  }
  if (listingHash) {
    console.log('🔗 Listing hash:', listingHash)
  }

  // Automatically mark success when mint finishes and no listing is requested
  useEffect(() => {
    if (!isMintSuccess || Boolean(listingPrice)) {
      return
    }
    setCurrentStep('success')
  }, [isMintSuccess, listingPrice])

  // Index NFT in Supabase after successful mint
  useEffect(() => {
    if (!isMintSuccess || !mintReceipt || !address || !uploadedImageUrl || !uploadedMetadataUrl) {
      return
    }

    const indexMintedNFT = async () => {
      try {
        const nftAddress = CONTRACTS.NFT.toLowerCase()
        const logs = mintReceipt.logs || []

        for (const log of logs) {
          if ((log.address?.toLowerCase() ?? '') !== nftAddress) {
            continue
          }

          const decoded = decodeEventLog({
            abi: ArcNFTAbi,
            data: log.data,
            topics: log.topics,
          }) as { eventName: string; args?: { tokenId?: bigint } }

          if (decoded.eventName === 'Transfer') {
            const tokenId = decoded.args?.tokenId as bigint | undefined
            if (tokenId !== undefined) {
              console.log('📇 Indexing NFT:', tokenId.toString())
              console.log('Image URL:', uploadedImageUrl)
              console.log('Metadata URL:', uploadedMetadataUrl)
              
              try {
                await indexNFT({
                  tokenId: Number(tokenId),
                  contractAddress: CONTRACTS.NFT,
                  ownerAddress: address,
                  creatorAddress: address,
                  name: formData.name,
                  description: formData.description,
                  imageUrl: uploadedImageUrl || '',
                  metadataUrl: uploadedMetadataUrl || '',
                  royaltyPercentage: parseFloat(formData.royalty),
                })
                console.log('✅ NFT indexing completed')
              } catch (indexErr) {
                console.error('⚠️ Failed to index NFT (non-blocking):', indexErr)
                // Don't block the UI - indexer can retry later
              }
              
              return
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse mint receipt:', err)
      }
    }

    // Don't await - run in background
    indexMintedNFT().catch(e => console.error('Background indexing error:', e))
  }, [isMintSuccess, mintReceipt, address, uploadedImageUrl, uploadedMetadataUrl, formData])

  // Parse mint receipt to extract the token ID when we plan to list
  useEffect(() => {
    if (!listingPrice || mintedTokenId || !isMintSuccess || !mintReceipt) {
      return
    }

    try {
      const nftAddress = CONTRACTS.NFT.toLowerCase()
      const logs = mintReceipt.logs || []

      for (const log of logs) {
        if ((log.address?.toLowerCase() ?? '') !== nftAddress) {
          continue
        }

        const decoded = decodeEventLog({
          abi: ArcNFTAbi,
          data: log.data,
          topics: log.topics,
        }) as { eventName: string; args?: { tokenId?: bigint } }

        if (decoded.eventName === 'Transfer') {
          const tokenId = decoded.args?.tokenId as bigint | undefined
          if (tokenId !== undefined) {
            setMintedTokenId(tokenId)
            console.log('🆔 Minted token ID detected:', tokenId.toString())
            return
          }
        }
      }

      throw new Error('Token ID not found in mint receipt logs')
    } catch (err) {
      console.error('Failed to decode mint receipt:', err)
      setErrorMessage('Could not determine minted token ID. Please check the explorer and try again.')
      setCurrentStep('error')
    }
  }, [listingPrice, mintedTokenId, isMintSuccess, mintReceipt])

  // Detect reverted mint transactions and show error to the user
  useEffect(() => {
    if (!mintReceipt) return

    // Some providers return numeric status (0 = failed), others may use strings
    const status: any = (mintReceipt as any).status
    if (status === 0 || status === '0' || status === 'reverted') {
      // Try to pick up a more descriptive reason if available
      const reason = (mintReceipt as any).revertReason || 'Transaction reverted on-chain. Check the explorer for details.'
      console.error('Mint transaction reverted:', mintReceipt)
      setErrorMessage(typeof reason === 'string' ? reason : 'Transaction reverted on-chain. Check the explorer for details.')
      setCurrentStep('error')
    }
  }, [mintReceipt])

  // Start approval once we know which token to list
  useEffect(() => {
    if (!listingPrice || !mintedTokenId || !isMintSuccess || approvalStartedRef.current) {
      return
    }

    // Prevent starting if already pending or confirming
    if (isApproving || isApproveConfirming) {
      return
    }

    let cancelled = false

    const runApproval = async () => {
      try {
        setCurrentStep('approving')
        approvalStartedRef.current = true
        await approve(mintedTokenId)
      } catch (err: any) {
        if (!cancelled) {
          console.error('Approve transaction failed:', err)
          setErrorMessage(err?.message || 'Approve transaction failed. Please retry.')
          setCurrentStep('error')
        }
      }
    }

    runApproval()

    return () => {
      cancelled = true
    }
  }, [listingPrice, mintedTokenId, isMintSuccess])

  // Kick off listing after approval succeeds
  useEffect(() => {
    if (!listingPrice || !mintedTokenId || !isApproveSuccess || listingStartedRef.current) {
      return
    }

    // Prevent starting if already pending or confirming
    if (isListing || isListingConfirming) {
      console.log('⏸️ Listing already in progress, skipping...')
      return
    }

    let cancelled = false

    const runListing = async () => {
      try {
        console.log('🏷️ Starting listing process for token:', mintedTokenId.toString())
        setCurrentStep('listing')
        listingStartedRef.current = true
        await listItem(mintedTokenId, listingPrice)
      } catch (err: any) {
        if (!cancelled) {
          console.error('Create listing failed:', err)
          setErrorMessage(err?.message || 'Listing transaction failed. Please retry.')
          setCurrentStep('error')
        }
      }
    }

    runListing()

    return () => {
      cancelled = true
    }
  }, [listingPrice, mintedTokenId, isApproveSuccess])

  useEffect(() => {
    if (!listingPrice || !mintedTokenId || !address) {
      return
    }
    if (isListingSuccess && listingHash) {
      // Index listing in Supabase
      const saveListing = async () => {
        try {
          // First, get the NFT ID from Supabase
          const response = await fetch('/api/nfts/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenId: mintedTokenId.toString(),
              contractAddress: CONTRACTS.NFT,
              ownerAddress: address,
              creatorAddress: address,
              name: formData.name,
              description: formData.description,
              imageUrl: uploadedImageUrl,
              metadataUrl: uploadedMetadataUrl,
              royaltyPercentage: parseFloat(formData.royalty),
            }),
          })

          const nftData = await response.json()
          
          if (nftData && nftData.id) {
            // Now save the listing
            await fetch('/api/listings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nft_id: nftData.id,
                token_id: mintedTokenId.toString(),
                nft_contract: CONTRACTS.NFT,
                seller: address,
                price: listingPrice,
                tx_hash: listingHash,
              }),
            })
            
            console.log('✅ NFT and listing indexed successfully')
          }
        } catch (error) {
          console.error('❌ Failed to index NFT/listing:', error)
        }
      }

      saveListing()
      setCurrentStep('success')
    }
  }, [listingPrice, isListingSuccess, listingHash, mintedTokenId, address, formData, uploadedImageUrl, uploadedMetadataUrl])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first')
      setCurrentStep('error')
      return
    }

    if (!imageFile) {
      setErrorMessage('Please select an image')
      setCurrentStep('error')
      return
    }

    // Require authentication before creating NFT
    if (!isAuthenticated) {
      const signature = await signAuth();
      if (!signature) {
        setErrorMessage('Authentication required. Please sign the message to verify your wallet.');
        setCurrentStep('error');
        return;
      }
    }

    try {
      const normalizedPrice = formData.price && parseFloat(formData.price) > 0 ? formData.price : ''
      setListingPrice(normalizedPrice)
      setMintedTokenId(null)
      setErrorMessage('')
      // Step 1: Upload image and metadata to IPFS via NFT.Storage
      setCurrentStep('uploading')
      setUploadProgress({ image: 0, metadata: 0 })
      
      const { imageUrl, metadataUrl } = await uploadNFT(
        imageFile,
        {
          name: formData.name,
          description: formData.description,
          attributes: [
            {
              trait_type: 'Royalty',
              value: parseFloat(formData.royalty),
            },
          ],
        },
        (progress: UploadProgress) => {
          setUploadProgress(prev => ({ ...prev, image: progress.percentage }))
        },
        (progress: UploadProgress) => {
          setUploadProgress(prev => ({ ...prev, metadata: progress.percentage }))
        }
      )

      console.log('Uploaded to IPFS:', { imageUrl, metadataUrl })
      
      // Store URLs for indexing later
      setUploadedImageUrl(imageUrl)
      setUploadedMetadataUrl(metadataUrl)

      // Step 2: Mint NFT with metadata URI
      setCurrentStep('minting')
      console.log('🎨 Minting NFT with metadata:', metadataUrl)
      await mint(metadataUrl)
      
      console.log('✅ Mint transaction submitted, waiting for confirmation...')

      // TODO: Get token ID from event logs
      // For now, we'll need to wait for the transaction and parse logs
      
      // Next steps handled by effects once mint confirmation arrives
    } catch (error: any) {
      console.error('Minting error:', error)
      setErrorMessage(error?.message || 'Failed to mint NFT')
      setCurrentStep('error')
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      
      {/* Background Gradient Effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12">
          <h1 className="bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-5xl font-bold tracking-tight text-transparent lg:text-6xl">
            Create NFT
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-gray-400">
            Mint your digital artwork on <span className="font-medium text-violet-400">Arc Layer 1</span>
          </p>
        </div>

        {/* Error Banner */}
        {currentStep === 'error' && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-2 rounded-xl border border-red-500/30 bg-red-500/10 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-red-500/20 p-2">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-200">Transaction Failed</h3>
                <p className="mt-1 text-sm leading-relaxed text-red-300/90">{errorMessage}</p>
              </div>
              <button
                onClick={() => {
                  approvalStartedRef.current = false
                  listingStartedRef.current = false
                  setErrorMessage('')
                  setCurrentStep('form')
                }}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {currentStep === 'success' && (
          <div className="mb-8 animate-in fade-in zoom-in-95 rounded-xl border border-green-500/30 bg-green-500/10 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/20 p-3">
                <CheckCircle className="h-7 w-7 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-100">NFT Minted Successfully!</h3>
                <p className="mt-1 text-sm text-green-200/80">
                  {formData.price && parseFloat(formData.price) > 0 
                    ? 'Your NFT has been minted and listed on the marketplace'
                    : 'Your NFT has been minted to your wallet'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/profile')}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                View in Profile
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-gray-700 bg-gray-900/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Create Another
              </button>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        {currentStep !== 'form' && currentStep !== 'error' && currentStep !== 'success' && (
          <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Transaction Progress</h3>
            <div className="space-y-3">
              <StepIndicator 
                label="Uploading to IPFS" 
                status={currentStep === 'uploading' ? 'active' : 'complete'}
                progress={currentStep === 'uploading' ? Math.round((uploadProgress.image + uploadProgress.metadata) / 2) : undefined}
              />
              <StepIndicator 
                label="Minting NFT" 
                status={currentStep === 'minting' || currentStep === 'approving' || currentStep === 'listing' ? (currentStep === 'minting' ? 'active' : 'complete') : 'pending'} 
              />
              {formData.price && parseFloat(formData.price) > 0 && (
                <>
                  <StepIndicator 
                    label="Approving Marketplace" 
                    status={currentStep === 'approving' || currentStep === 'listing' ? (currentStep === 'approving' ? 'active' : 'complete') : 'pending'} 
                  />
                  <StepIndicator 
                    label="Creating Listing" 
                    status={currentStep === 'listing' ? 'active' : 'pending'} 
                  />
                </>
              )}
            </div>
            {(mintHash || approveHash || listingHash) && (
              <div className="mt-5 rounded-lg bg-gray-800/50 p-4">
                <p className="text-xs font-medium text-gray-400">Transaction Hash</p>
                <a 
                  href={`https://testnet.arcscan.app/tx/${mintHash || approveHash || listingHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block break-all font-mono text-sm text-violet-400 transition hover:text-violet-300 hover:underline"
                >
                  {mintHash || approveHash || listingHash}
                </a>
                <p className="mt-3 flex items-center gap-2 text-xs text-yellow-400">
                  <Info className="h-3.5 w-3.5" />
                  Waiting for blockchain confirmation...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main Form Layout - 2 Columns */}
        <div className="grid gap-10 lg:grid-cols-[420px_1fr] lg:gap-16">
          
          {/* LEFT: Image Preview */}
          <div className="lg:sticky lg:top-8 self-start space-y-6">
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-300">
                Media File <span className="text-red-400">*</span>
              </label>
              
              <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900/50 transition-all hover:border-violet-500 hover:bg-gray-900">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="NFT Preview"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="text-sm font-medium text-white">Click to change image</p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <div className="mb-5 rounded-full bg-gray-800/80 p-5 ring-1 ring-white/5 transition-all group-hover:bg-violet-500/20 group-hover:ring-violet-500/30">
                      <Upload className="h-10 w-10 text-gray-400 transition group-hover:text-violet-400" />
                    </div>
                    <p className="text-lg font-semibold text-white">Upload Artwork</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Drag & drop or click to browse
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      PNG, JPG, GIF • Max 10MB
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  required
                />
              </div>
            </div>

            {/* Free Minting Info */}
            <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent p-5">
              <div className="flex gap-4">
                <div className="shrink-0 rounded-lg bg-violet-500/20 p-2.5">
                  <Sparkles className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-violet-200">Free Minting Available</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-violet-300/80">
                    Your first 5 NFTs are completely free. No gas fees, no hidden costs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-7">
            
            {/* Name & Price Row */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 'Abstract Dreams #1'"
                  required
                  className="h-12 w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 text-white placeholder-gray-500 backdrop-blur-sm transition focus:border-violet-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">
                  Price (USDC)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="h-12 w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 text-white placeholder-gray-500 backdrop-blur-sm transition focus:border-violet-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <div className="flex h-12 items-center rounded-lg border border-gray-700 bg-gray-900/50 px-4 text-sm font-medium text-gray-400">
                    USDC
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Leave empty to mint without listing</p>
                {/* Dynamic mint cost info */}
                {mintInfoLoading ? (
                  <p className="mt-2 text-sm text-yellow-300">Checking mint cost...</p>
                ) : freeMintCount !== null ? (
                  freeMintCount >= 5 ? (
                    <p className="mt-2 text-sm text-yellow-300">This mint costs {mintPriceHuman ?? '—'} USDC (you've used {freeMintCount}/5 free mints)</p>
                  ) : (
                    <p className="mt-2 text-sm text-green-300">This mint is free (you've used {freeMintCount}/5 free mints)</p>
                  )
                ) : null}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell collectors about your artwork..."
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition focus:border-violet-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Royalty Slider */}
            <div>
              <label className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-300">
                <span>Royalty Percentage</span>
                <span className="rounded-lg bg-violet-500/20 px-3 py-1 font-mono text-violet-300">
                  {formData.royalty}%
                </span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={parseFloat(formData.royalty)}
                  onChange={(e) => setFormData({ ...formData, royalty: String(parseFloat(e.target.value).toFixed(1)) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-800 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:transition [&::-webkit-slider-thumb]:hover:bg-violet-400"
                />
                <input
                  type="number"
                  value={formData.royalty}
                  onChange={(e) => {
                    let v = parseFloat(e.target.value)
                    if (isNaN(v)) v = 0
                    if (v < 0) v = 0
                    if (v > 10) v = 10
                    setFormData({ ...formData, royalty: String(v) })
                  }}
                  step="0.1"
                  min="0"
                  max="10"
                  className="h-12 w-24 rounded-lg border border-gray-700 bg-gray-900/50 px-3 text-center font-mono text-white backdrop-blur-sm transition focus:border-violet-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Earn this percentage on every secondary sale (max 10%)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isMinting || isMintConfirming || isApproving || isApproveConfirming || isListing || isListingConfirming || currentStep === 'uploading'}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-violet-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-violet-400 opacity-0 transition group-hover:opacity-100 group-disabled:opacity-0" />
              <span className="relative flex items-center justify-center gap-2.5">
                {isMinting || isMintConfirming ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {isMintConfirming ? 'Confirming Transaction...' : 'Minting NFT...'}
                  </>
                ) : isApproving || isApproveConfirming ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Approving Marketplace...
                  </>
                ) : isListing || isListingConfirming ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating Listing...
                  </>
                ) : currentStep === 'uploading' ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Uploading to IPFS...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5" />
                    Create NFT
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// Step Indicator Component (Improved)
function StepIndicator({ 
  label, 
  status, 
  progress 
}: { 
  label: string; 
  status: 'pending' | 'active' | 'complete';
  progress?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
          status === 'complete' 
            ? 'bg-green-500 ring-2 ring-green-500/30' 
            : status === 'active' 
            ? 'bg-violet-500 ring-2 ring-violet-500/30 animate-pulse' 
            : 'bg-gray-700 ring-2 ring-gray-700/20'
        }`}>
          {status === 'complete' ? (
            <CheckCircle className="h-4 w-4 text-white" />
          ) : status === 'active' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
          )}
        </div>
        <span className={`flex-1 text-sm font-medium ${status === 'pending' ? 'text-gray-500' : 'text-white'}`}>
          {label}
        </span>
        {status === 'active' && progress !== undefined && (
          <span className="font-mono text-xs font-semibold text-violet-400">{progress}%</span>
        )}
      </div>
      {status === 'active' && progress !== undefined && (
        <div className="ml-11 h-2 overflow-hidden rounded-full bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 via-violet-400 to-cyan-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
