'use client'

import { useAccount, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { TOKENS } from '@/lib/tokens'
import { Wallet, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

export function WalletBalance() {
  const t = useTranslations('wallet')
  const { address, isConnected } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  // Get native USDC balance
  const { data: usdcBalance, isLoading: usdcLoading } = useBalance({
    address: address,
  })

  // Get EURC balance
  const { data: eurcBalance, isLoading: eurcLoading } = useBalance({
    address: address,
    token: TOKENS.EURC as `0x${string}`,
  })

  if (!isConnected || !address) {
    return null
  }

  // Format balance - Arc uses 18 decimals internally despite being USDC
  const formatBalance = (value: bigint | undefined) => {
    if (!value) return '0.00'
    
    try {
      // Use 18 decimals (the actual format from Arc)
      const formatted = formatUnits(value, 18)
      const number = parseFloat(formatted)
      
      // Format with commas and 2 decimals
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(number)
    } catch (error) {
      console.error('Error formatting balance:', error)
      return '0.00'
    }
  }

  const usdcFormatted = formatBalance(usdcBalance?.value)
  const eurcFormatted = formatBalance(eurcBalance?.value)

  // Don't show if still loading
  if (usdcLoading && eurcLoading) {
    return null
  }

  // Calculate total value in USD (assuming EURC ≈ USDC for display purposes)
  const totalValue = parseFloat(usdcFormatted) + parseFloat(eurcFormatted)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Compact wallet button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-card flex h-10 items-center gap-2 rounded-xl px-3 py-2 transition-all hover:bg-white/10"
      >
        <Wallet className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold text-white">
          ${totalValue.toFixed(2)}
        </span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown with detailed balances */}
      {isOpen && (
          <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-violet-500/30 bg-slate-900/95 backdrop-blur-xl p-3 shadow-xl shadow-black/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
                <Wallet className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-medium text-slate-400">{t('balance')}</span>
              </div>
              
              {/* USDC Balance */}
              {!usdcLoading && usdcBalance && (
                <div className="flex items-center justify-between rounded-lg bg-white/5 p-2.5 transition-colors hover:bg-white/10">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="text-xs font-medium text-slate-400">USDC</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {usdcFormatted}
                  </span>
                </div>
              )}

              {/* EURC Balance */}
              {!eurcLoading && eurcBalance && eurcBalance.value > 0n && (
                <div className="flex items-center justify-between rounded-lg bg-white/5 p-2.5 transition-colors hover:bg-white/10">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-400" />
                    <span className="text-xs font-medium text-slate-400">EURC</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {eurcFormatted}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-xs font-medium text-slate-500">{t('total_value')}</span>
                <span className="text-sm font-bold text-white">
                  ${totalValue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
      )}
    </div>
  )
}
