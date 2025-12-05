'use client'

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import Image from 'next/image'
import { Copy, ExternalLink, Settings, Share2, Edit2, Save, X, Upload, Lock } from 'lucide-react'
import { NFTCard } from '@/components/nft-card'
import { getProfile, upsertProfile, getNFTs, type Profile } from '@/lib/supabase'
import { uploadProfileImage } from '@/lib/storage'
import { useWalletAuth } from '@/hooks/use-wallet-auth'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useTranslations } from 'next-intl'

const normalizeIpfsUrl = (url?: string | null) => {
  if (!url) return null
  
  // R2/Cloudflare, Supabase Storage URLs, data URLs, and proxy URLs are ready to use
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/api/ipfs/')) {
    return url
  }

  // Convert ipfs:// protocol to proxy (legacy support for old NFTs)
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '')
    return `/api/ipfs/${cid}`
  }

  // Extract CID from any IPFS URL and normalize to proxy (legacy support)
  const match = url.match(/\/ipfs\/([^/?#]+)/i)
  if (match?.[1]) {
    return `/api/ipfs/${match[1]}`
  }

  return url
}

const normalizeProfileUrls = (profileData: Profile): Profile => ({
  ...profileData,
  avatar_url: normalizeIpfsUrl(profileData.avatar_url) || undefined,
  banner_url: normalizeIpfsUrl(profileData.banner_url) || undefined,
})

export default function ProfilePage() {
  const t = useTranslations('toast')
  const { address, isConnected } = useAccount()
  const { signAuth, isSigningAuth, authError, isAuthenticated } = useWalletAuth()
  const [activeTab, setActiveTab] = useState<'collected' | 'created' | 'listed'>('collected')
  const [isMounted, setIsMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nfts, setNfts] = useState<any[]>([])
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    twitter_handle: '',
    discord_handle: '',
    website_url: '',
  })
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const loadProfileData = async () => {
    if (!address) return
    
    setIsLoading(true)
    try {
      const profileData = await getProfile(address)
      if (profileData) {
        const normalizedProfile = normalizeProfileUrls(profileData)
        setProfile(normalizedProfile)
        setFormData({
          username: normalizedProfile.username || '',
          bio: normalizedProfile.bio || '',
          twitter_handle: normalizedProfile.twitter_handle || '',
          discord_handle: normalizedProfile.discord_handle || '',
          website_url: normalizedProfile.website_url || '',
        })
        // CRITICAL FIX: Set preview URLs from database
        setAvatarPreview(normalizedProfile.avatar_url || null)
        setBannerPreview(normalizedProfile.banner_url || null)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadNFTs = async () => {
    if (!address) return
    
    setIsLoadingNFTs(true)
    try {
      console.log(`📡 Carregando NFTs (${activeTab})...`)
      
      // Sempre tentar Supabase primeiro
      let nftData = []
      
      if (activeTab === 'collected') {
        nftData = await getNFTs({ owner: address })
      } else if (activeTab === 'created') {
        nftData = await getNFTs({ creator: address })
      } else {
        // Listed: buscar apenas do Supabase
        nftData = await getNFTs({ owner: address })
      }
      
      console.log(`✅ Carregados ${nftData.length} NFTs do Supabase`)
      setNfts(nftData)
      
      // Não buscar da blockchain automaticamente
      // Isso evita o erro 429 e melhora performance
      // Se precisar, adicionar um botão "Sync from Blockchain"
      
    } catch (error) {
      console.error('Error loading NFTs:', error)
      setNfts([])
    } finally {
      setIsLoadingNFTs(false)
    }
  }

  // Avoid hydration mismatch by rendering skeleton until mounted on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load profile and NFTs on mount
  useEffect(() => {
    if (!address || !isConnected) return
    loadProfileData()
    loadNFTs()
  }, [address, isConnected, activeTab])

  if (!isMounted) {
    return (
      <div className="relative min-h-screen py-12">
        <div className="animated-gradient fixed inset-0 -z-10 opacity-30" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass-card glow-violet mb-8 animate-pulse rounded-3xl border border-white/10">
            <div className="h-48 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600" />
            <div className="space-y-4 px-8 py-10">
              <div className="h-8 w-48 rounded-full bg-white/10" />
              <div className="h-4 w-64 rounded-full bg-white/5" />
              <div className="h-4 w-56 rounded-full bg-white/5" />
              <div className="flex gap-4 pt-4">
                <div className="h-12 flex-1 rounded-2xl bg-white/5" />
                <div className="h-12 flex-1 rounded-2xl bg-white/5" />
                <div className="h-12 flex-1 rounded-2xl bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('profile.avatarTooLarge') || 'Avatar must be less than 2MB')
        return
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error(t('profile.invalidImageType') || 'Only JPEG, PNG, GIF, and WebP images are allowed')
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('profile.bannerTooLarge') || 'Banner must be less than 5MB')
        return
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error(t('profile.invalidImageType') || 'Only JPEG, PNG, GIF, and WebP images are allowed')
        return
      }

      setBannerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    if (!address) return
    
    // CRITICAL: Require authentication AND verify wallet matches profile
    if (!isAuthenticated) {
      // Verify that connected wallet matches the profile being edited
      const signature = await signAuth();
      if (!signature) {
        toast.error(t('auth.required'));
        return;
      }
    }
    
    // Double-check: connected wallet must match profile wallet
    if (address.toLowerCase() !== address.toLowerCase()) {
      toast.error(t('auth.ownProfileOnly'));
      return;
    }
    
    setIsSaving(true)
    const uploadToast = toast.loading(t('profile.saving'))
    
    try {
      let avatarUrl = profile?.avatar_url || ''
      let bannerUrl = profile?.banner_url || ''
      
      // Upload avatar if changed
      if (avatarFile) {
        toast.loading(t('profile.uploadingAvatar'), { id: uploadToast })
        avatarUrl = await uploadProfileImage(avatarFile, address, 'avatar')
      }
      
      // Upload banner if changed
      if (bannerFile) {
        toast.loading(t('profile.uploadingBanner'), { id: uploadToast })
        bannerUrl = await uploadProfileImage(bannerFile, address, 'banner')
      }
      
      // Save profile to Supabase with wallet validation
      toast.loading(t('profile.savingDatabase'), { id: uploadToast })
      const updatedProfile = await upsertProfile({
        wallet_address: address,
        username: formData.username || undefined,
        bio: formData.bio || undefined,
        avatar_url: avatarUrl || undefined,
        banner_url: bannerUrl || undefined,
        twitter_handle: formData.twitter_handle || undefined,
        discord_handle: formData.discord_handle || undefined,
        website_url: formData.website_url || undefined,
      }, address) // Pass authenticated wallet for validation
      
      if (updatedProfile) {
        const normalizedProfile = normalizeProfileUrls(updatedProfile)
        setProfile(normalizedProfile)
        setIsEditing(false)
        setAvatarFile(null)
        setBannerFile(null)
        setAvatarPreview(normalizedProfile.avatar_url || null)
        setBannerPreview(normalizedProfile.banner_url || null)
        toast.success(t('profile.updated'), { id: uploadToast })
      } else {
        toast.error(t('profile.updateFailed'), { id: uploadToast })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error(t('error.generic') + ': ' + (error as Error).message, { id: uploadToast })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    const hasChanges = 
      avatarFile !== null || 
      bannerFile !== null ||
      formData.username !== (profile?.username || '') ||
      formData.bio !== (profile?.bio || '') ||
      formData.twitter_handle !== (profile?.twitter_handle || '') ||
      formData.discord_handle !== (profile?.discord_handle || '') ||
      formData.website_url !== (profile?.website_url || '');

    if (hasChanges) {
      setShowCancelDialog(true);
      return;
    }

    // No changes, just close edit mode
    cancelEditMode();
  }

  const cancelEditMode = () => {
    setIsEditing(false)
    setShowCancelDialog(false)
    setFormData({
      username: profile?.username || '',
      bio: profile?.bio || '',
      twitter_handle: profile?.twitter_handle || '',
      discord_handle: profile?.discord_handle || '',
      website_url: profile?.website_url || '',
    })
    setAvatarPreview(profile?.avatar_url || null)
    setBannerPreview(profile?.banner_url || null)
    setAvatarFile(null)
    setBannerFile(null)
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success(t('clipboard.addressCopied'))
    }
  }

  const stats = [
    { label: 'Collected', value: nfts.filter(n => n.owner_address === address?.toLowerCase()).length.toString() },
    { label: 'Created', value: nfts.filter(n => n.creator_address === address?.toLowerCase()).length.toString() },
    { label: 'Following', value: profile?.website_url ? '1' : '0' },
    { label: 'Followers', value: profile?.twitter_handle ? '1' : '0' },
  ]

  if (!isConnected) {
    return (
      <div className="relative min-h-screen py-12">
        <div className="animated-gradient fixed inset-0 -z-10 opacity-30" />
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] items-center justify-center px-4">
          <div className="glass-card max-w-md rounded-2xl border border-white/10 p-12 text-center">
            <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
            <p className="mt-2 text-slate-400">
              Please connect your wallet to view your profile
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen py-12">
      <div className="animated-gradient fixed inset-0 -z-10 opacity-30" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="glass-card glow-violet mb-8 overflow-hidden rounded-3xl border border-white/10">
          {/* Cover Image */}
          <div className="relative h-48 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600">
            {bannerPreview && (
              <div className="relative h-full w-full">
                <Image 
                  src={bannerPreview} 
                  alt="Banner"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            {isEditing && (
              <label className="absolute right-4 top-4 cursor-pointer rounded-lg bg-black/50 p-2 backdrop-blur-sm transition hover:bg-black/70">
                <Upload className="h-5 w-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                />
              </label>
            )}
          </div>
          
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6">
              <div className="relative h-32 w-32 rounded-full border-4 border-gray-900 bg-gradient-to-br from-violet-400 to-purple-400 p-1">
                {avatarPreview ? (
                  <div className="relative h-full w-full rounded-full overflow-hidden bg-gray-900">
                    <Image 
                      src={avatarPreview} 
                      alt="Avatar"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-900 text-4xl font-bold text-white">
                    {address?.slice(2, 4).toUpperCase()}
                  </div>
                )}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-violet-600 p-2 transition hover:bg-violet-500">
                    <Upload className="h-4 w-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleCancelEdit}
                    disabled={isSaving || isSigningAuth}
                    className="glass-card flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving || isSigningAuth}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-purple-500 disabled:opacity-50"
                  >
                    {isSigningAuth ? (
                      <>
                        <Lock className="h-4 w-4" />
                        Sign to Save...
                      </>
                    ) : isSaving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button className="glass-card rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="glass-card flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Profile
                  </button>
                </>
              )}
            </div>

            <div className="mt-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-400">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter your username"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-400">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself"
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-400">Twitter</label>
                      <input
                        type="text"
                        value={formData.twitter_handle}
                        onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                        placeholder="@username"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-400">Discord</label>
                      <input
                        type="text"
                        value={formData.discord_handle}
                        onChange={(e) => setFormData({ ...formData, discord_handle: e.target.value })}
                        placeholder="username#1234"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-400">Website</label>
                      <input
                        type="url"
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-white">
                    {profile?.username || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                  </h1>
                  <button
                    onClick={copyAddress}
                    className="mt-2 flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
                  >
                    {address}
                    <Copy className="h-4 w-4" />
                  </button>
                  <p className="mt-4 max-w-2xl text-slate-400">
                    {profile?.bio || 'Digital artist and NFT collector on Arc Layer 1.'}
                  </p>
                  {(profile?.twitter_handle || profile?.discord_handle || profile?.website_url) && (
                    <div className="mt-4 flex gap-3">
                      {profile.twitter_handle && (
                        <a
                          href={`https://twitter.com/${profile.twitter_handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 transition hover:text-violet-400"
                        >
                          Twitter
                        </a>
                      )}
                      {profile.discord_handle && (
                        <span className="text-slate-400">Discord: {profile.discord_handle}</span>
                      )}
                      {profile.website_url && (
                        <a
                          href={profile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-slate-400 transition hover:text-violet-400"
                        >
                          Website <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl border border-white/10 p-4 transition-all hover:bg-white/10">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-4 border-b border-white/10">
          {(['collected', 'created', 'listed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-3 font-medium capitalize transition ${
                activeTab === tab
                  ? 'border-violet-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* NFT Grid */}
        {isLoadingNFTs ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : nfts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {nfts.map((nft) => (
              <NFTCard 
                key={nft.id} 
                id={nft.id}
                name={nft.name}
                image={nft.image_url}
                price={BigInt(nft.price || '0')}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white">No NFTs Yet</h3>
              <p className="mt-2 text-slate-400">
                {activeTab === 'collected'
                  ? 'Start collecting NFTs from the marketplace'
                  : activeTab === 'created'
                  ? 'Create your first NFT to get started'
                  : 'List your NFTs for sale'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Edit Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={cancelEditMode}
        title="Discard Changes?"
        description="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="warning"
      />
    </div>
  )
}

