import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Wallet, Twitter, MessageCircle, Github } from 'lucide-react'

export function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="border-t border-white/10 bg-slate-900 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content - Simplified to 3 columns */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
          {/* Brand Column */}
          <div>
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Arc<span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">NFT</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              {t('tagline')}
            </p>
            
            {/* Social Icons - Simpler style */}
            <div className="mt-6 flex gap-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-violet-400"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-violet-400"
                aria-label="Discord"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-violet-400"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Platform Column - Simplified */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              {t('marketplace.title')}
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/explore" className="text-sm text-slate-400 transition hover:text-white">
                  {t('marketplace.explore')}
                </Link>
              </li>
              <li>
                <Link href="/explore?sort=trending" className="text-sm text-slate-400 transition hover:text-white">
                  {t('marketplace.ranking')}
                </Link>
              </li>
              <li>
                <a href="/docs" className="text-sm text-slate-400 transition hover:text-white">
                  {t('resources.docs')}
                </a>
              </li>
            </ul>
          </div>

          {/* Support & Info Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              {t('resources.title')}
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="/help" className="text-sm text-slate-400 transition hover:text-white">
                  {t('resources.help')}
                </a>
              </li>
              <li>
                <a href="/blog" className="text-sm text-slate-400 transition hover:text-white">
                  {t('resources.blog')}
                </a>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-slate-400 transition hover:text-white">
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-slate-400 transition hover:text-white">
                  {t('privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar - Simplified */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-center text-sm text-slate-500">
            © 2025 ArcNFT. {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}
