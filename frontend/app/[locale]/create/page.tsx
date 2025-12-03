'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { Upload, Image as ImageIcon, Sparkles, CheckCircle, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAccount } from 'wagmi'
import { useNFTMint, useNFTApprove, useMarketplaceListing } from '@/hooks/use-nft-contract'
import { uploadNFT, type UploadProgress } from '@/lib/nft-storage'
import { useRouter } from '@/i18n/routing'

export default function CreatePage() {
  const t = useTranslations('create')
  const router = useRouter()
  const { address, isConnected } = useAccount()
  
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
  const [uploadProgress, setUploadProgress] = useState<{ image: number; metadata: number }>({ image: 0, metadata: 0 })
  
  const { mint, isPending: isMinting, isConfirming: isMintConfirming, isSuccess: isMintSuccess, hash: mintHash } = useNFTMint()
  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: isApproveSuccess } = useNFTApprove()
  const { createListing, isPending: isListing, isConfirming: isListingConfirming, isSuccess: isListingSuccess } = useMarketplaceListing()

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

    try {
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

      // Step 2: Mint NFT with metadata URI
      setCurrentStep('minting')
      await mint(metadataUrl)

      // TODO: Get token ID from event logs
      // For now, we'll need to wait for the transaction and parse logs
      
      // If price is set, we need to approve and list
      if (formData.price && parseFloat(formData.price) > 0) {
        setCurrentStep('approving')
        // Wait for mint to complete, then approve and list
        // This will be handled by useEffect watching for mint success
      } else {
        setCurrentStep('success')
      }
    } catch (error: any) {
      console.error('Minting error:', error)
      setErrorMessage(error?.message || 'Failed to mint NFT')
      setCurrentStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Create NFT</h1>
          <p className="mt-2 text-gray-400">
            Mint your digital artwork on Arc Layer 1
          </p>
        </div>

        {/* Progress Steps */}
        {currentStep !== 'form' && currentStep !== 'error' && (
          <div className="mb-8 rounded-lg border border-gray-800 bg-gray-900 p-6">
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
                    status={currentStep === 'listing' ? 'active' : currentStep === 'success' ? 'complete' : 'pending'} 
                  />
                </>
              )}
            </div>
            {mintHash && (
              <div className="mt-4 rounded bg-gray-800 p-3">
                <p className="text-xs text-gray-400">Transaction Hash:</p>
                <p className="mt-1 break-all text-sm font-mono text-violet-400">{mintHash}</p>
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {currentStep === 'success' && (
          <div className="mb-8 rounded-lg border border-green-500/20 bg-green-500/10 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <h3 className="font-semibold text-white">NFT Minted Successfully!</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {formData.price && parseFloat(formData.price) > 0 
                    ? 'Your NFT has been minted and listed on the marketplace'
                    : 'Your NFT has been minted to your wallet'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => router.push('/profile')}
                className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                View in Profile
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-gray-700 bg-gray-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Create Another
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {currentStep === 'error' && (
          <div className="mb-8 rounded-lg border border-red-500/20 bg-red-500/10 p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-400" />
              <div>
                <h3 className="font-semibold text-white">Error</h3>
                <p className="mt-1 text-sm text-gray-400">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setCurrentStep('form')}
              className="mt-4 rounded-lg border border-gray-700 bg-gray-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Try Again
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">{/* Rest of form */}
          {/* Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Upload File *
            </label>
            <div className="relative">
              {imagePreview ? (
                <div className="group relative overflow-hidden rounded-lg border-2 border-gray-700">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-96 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <label className="cursor-pointer rounded-lg bg-violet-600 px-6 py-3 text-white transition hover:bg-violet-500">
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex h-96 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-900 transition hover:border-violet-500 hover:bg-gray-800">
                  <Upload className="mb-4 h-12 w-12 text-gray-400" />
                  <p className="mb-2 text-sm font-medium text-white">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">
                    PNG, JPG, GIF up to 10MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    required
                  />
                </label>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. 'Abstract Dreams #1'"
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Price */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Price (USDC)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
              <p className="mt-1 text-xs text-gray-400">
                Leave empty to mint without listing
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell us about your NFT..."
              rows={4}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {/* Royalty */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Royalty (%)
            </label>
            <input
              type="number"
              value={formData.royalty}
              onChange={(e) => setFormData({ ...formData, royalty: e.target.value })}
              step="0.1"
              min="0"
              max="10"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <p className="mt-1 text-xs text-gray-400">
              Earn this percentage on every secondary sale (max 10%)
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-4">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 flex-shrink-0 text-violet-400" />
              <div>
                <h3 className="font-medium text-white">Free Minting Available!</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Your first 5 NFTs are completely free to mint. After that, a small fee applies.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isMinting || isMintConfirming || isApproving || isApproveConfirming || isListing || isListingConfirming || currentStep === 'uploading'}
              className="flex-1 rounded-lg bg-violet-600 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/50 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMinting || isMintConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isMintConfirming ? 'Confirming...' : 'Minting...'}
                </span>
              ) : isApproving || isApproveConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Approving...
                </span>
              ) : isListing || isListingConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Listing...
                </span>
              ) : currentStep === 'uploading' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Create NFT
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Step indicator component
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
        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
          status === 'complete' ? 'bg-green-500' : status === 'active' ? 'bg-violet-500' : 'bg-gray-700'
        }`}>
          {status === 'complete' ? (
            <CheckCircle className="h-4 w-4 text-white" />
          ) : status === 'active' ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-gray-500" />
          )}
        </div>
        <span className={`text-sm ${status === 'pending' ? 'text-gray-500' : 'text-white'}`}>
          {label}
        </span>
        {status === 'active' && progress !== undefined && (
          <span className="ml-auto text-xs text-violet-400">{progress}%</span>
        )}
      </div>
      {status === 'active' && progress !== undefined && (
        <div className="ml-9 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

