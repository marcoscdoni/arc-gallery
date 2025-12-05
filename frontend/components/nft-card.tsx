'use client'

import { Link } from '@/i18n/routing'
import { formatUnits } from 'viem'

interface NFTCardProps {
  id: string
  name: string
  image: string
  price: bigint
  isListed?: boolean
  owner?: string
}

export function NFTCard({ id, name, image, price, isListed, owner }: NFTCardProps) {
  const formattedPrice = formatUnits(price, 18)
  const hasPrice = price > 0n

  // Normalize image URLs and avoid passing empty string to <img src="">
  function normalizeImageUrl(img: string | undefined | null) {
    if (!img) return null
    const s = img.trim()
    if (s === '') return null

    // R2/Cloudflare URLs (direct HTTP/HTTPS)
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return s
    }

    // ipfs:// protocol (legacy support)
    if (s.startsWith('ipfs://')) {
      let cid = s.replace('ipfs://', '')
      if (cid.startsWith('ipfs/')) cid = cid.replace('ipfs/', '')
      return `https://ipfs.io/ipfs/${cid}`
    }

    // Extract CID from any IPFS gateway (legacy support)
    if (s.includes('/ipfs/')) {
      const cid = s.split('/ipfs/')[1].split('?')[0]
      return `https://ipfs.io/ipfs/${cid}`
    }

    // bare CID like Qm... or baf... (legacy support)
    if (/^(Qm|baf)/i.test(s)) {
      return `https://ipfs.io/ipfs/${s}`
    }

    // Other paths starting with /
    if (s.startsWith('/')) {
      if (typeof window !== 'undefined' && window.location) {
        return `${window.location.origin}${s}`
      }
      return null
    }

    return s
  }

  const normalizedImage = normalizeImageUrl(image)

  return (
    <Link
      href={`/nft/${id}`}
      className="glass-card glass-card-hover group overflow-hidden rounded-2xl border border-white/10"
    >
      <div className="aspect-square overflow-hidden">
        {normalizedImage ? (
          <img
            src={normalizedImage}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-slate-800 flex items-center justify-center text-slate-500">
            <span className="text-sm">No Image</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-white truncate">{name}</h3>
        
        <div className="mt-3 space-y-2">
          {hasPrice ? (
            <>
              <div className="flex items-center justify-between rounded-lg bg-violet-500/10 px-3 py-2">
                <span className="text-xs font-medium text-violet-400">Price</span>
                <span className="font-semibold text-white">{formattedPrice} <span className="text-sm text-violet-400">USDC</span></span>
              </div>
              <div className="flex items-center gap-1.5 px-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">Listed for sale</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-1">
              <div className="h-2 w-2 rounded-full bg-slate-500"></div>
              <span className="text-xs text-slate-400 font-medium">Not listed</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
