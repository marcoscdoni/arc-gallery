import { Link } from '@/i18n/routing'
import { Sparkles, ShoppingBag, TrendingUp, Shield, Zap, DollarSign } from 'lucide-react'
import {useTranslations} from 'next-intl';

export default function HomePage() {
  const t = useTranslations('home');
  
  return (
    <div className="min-h-screen animated-gradient">
      {/* Hero Section - modernized with visual appeal */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />
        
        {/* Floating gradient orbs for depth */}
        <div className="absolute top-0 -left-4 h-72 w-72 rounded-full bg-violet-600 opacity-20 blur-3xl" />
        <div className="absolute bottom-0 -right-4 h-72 w-72 rounded-full bg-blue-600 opacity-20 blur-3xl" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            {/* Left: Text content */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
                {t('hero.title')}
                <span className="block mt-2 bg-gradient-to-r from-violet-400 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                  {t('hero.subtitle')}
                </span>
              </h1>
              
              <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto lg:mx-0">
                {t('hero.description')}
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/explore"
                  className="group relative rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/50 transition-all hover:shadow-violet-500/70 hover:scale-105"
                >
                  <span className="relative z-10">{t('hero.explore')}</span>
                </Link>
                <Link
                  href="/create"
                  className="glass-card glass-card-hover rounded-xl px-8 py-3.5 text-sm font-semibold text-white"
                >
                  {t('hero.create')}
                </Link>
              </div>

              {/* Stats - compacted for better visual balance */}
              <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div className="rounded-xl p-4 text-center bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">10K+</div>
                  <div className="mt-1 text-xs text-slate-400">{t('stats.nfts')}</div>
                </div>
                <div className="rounded-xl p-4 text-center bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">5K+</div>
                  <div className="mt-1 text-xs text-slate-400">{t('stats.sales')}</div>
                </div>
                <div className="rounded-xl p-4 text-center bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">2K+</div>
                  <div className="mt-1 text-xs text-slate-400">{t('stats.artists')}</div>
                </div>
                <div className="rounded-xl p-4 text-center bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">$1M+</div>
                  <div className="mt-1 text-xs text-slate-400">{t('stats.volume')}</div>
                </div>
              </div>
            </div>

            {/* Right: Featured NFT showcase - "Show, don't tell" */}
            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                {/* Featured NFT cards with clean borders - all aligned */}
                <div className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition-all hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/20 hover:-translate-y-1">
                  <div className="aspect-square bg-gradient-to-br from-violet-500 to-purple-600 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-16 w-16 text-white opacity-50" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white">Featured Art #1</p>
                    <p className="text-xs text-slate-400 mt-1">0.5 ETH</p>
                  </div>
                </div>
                
                <div className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition-all hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1">
                  <div className="aspect-square bg-gradient-to-br from-blue-500 to-cyan-600 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TrendingUp className="h-16 w-16 text-white opacity-50" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white">Featured Art #2</p>
                    <p className="text-xs text-slate-400 mt-1">1.2 ETH</p>
                  </div>
                </div>

                <div className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition-all hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1">
                  <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-600 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shield className="h-16 w-16 text-white opacity-50" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white">Featured Art #3</p>
                    <p className="text-xs text-slate-400 mt-1">0.8 ETH</p>
                  </div>
                </div>

                <div className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition-all hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1">
                  <div className="aspect-square bg-gradient-to-br from-cyan-500 to-blue-600 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShoppingBag className="h-16 w-16 text-white opacity-50" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white">Featured Art #4</p>
                    <p className="text-xs text-slate-400 mt-1">2.0 ETH</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced with better visual hierarchy */}
      <section className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {t('features.title')}
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Built on Arc Layer 1 for the best NFT experience
            </p>
          </div>

          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:max-w-none lg:grid-cols-4">
            {/* Low Fees - Highlighted with USDC stability */}
            <div className="group rounded-2xl p-8 bg-white/5 border border-white/10 transition-all hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/30">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('features.low_fees.title')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {t('features.low_fees.description')}
              </p>
              <p className="mt-2 text-xs text-violet-400 font-medium">
                Powered by USDC stablecoin
              </p>
            </div>

            {/* Fast Transactions */}
            <div className="group rounded-2xl p-8 bg-white/5 border border-white/10 transition-all hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/30">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('features.fast.title')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {t('features.fast.description')}
              </p>
            </div>

            {/* Secure */}
            <div className="group rounded-2xl p-8 bg-white/5 border border-white/10 transition-all hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/30">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('features.secure.title')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {t('features.secure.description')}
              </p>
            </div>

            {/* Royalties */}
            <div className="group rounded-2xl p-8 bg-white/5 border border-white/10 transition-all hover:-translate-y-1 hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-500/10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 shadow-lg shadow-pink-500/30">
                <ShoppingBag className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('features.royalties.title')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {t('features.royalties.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Clean with gradient border */}
      <section className="relative isolate overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-3xl p-12 text-center bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 shadow-2xl shadow-violet-500/20">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
              {t('cta.description')}
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/create"
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/50 transition-all hover:shadow-violet-500/70 hover:scale-105"
              >
                {t('cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
