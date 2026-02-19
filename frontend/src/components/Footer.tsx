import { Github, Twitter, ExternalLink, Activity, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSystemStatus } from '../lib/api'
import { useChainContext } from '../context/ChainContext'

export function Footer() {
    const { activeChain } = useChainContext()
    const { status, loading } = useSystemStatus(activeChain?.id || 8453)

    return (
        <footer className="border-t-4 border-black dark:border-white/10 bg-white dark:bg-black py-12 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-[#FF0000]" />
                        <div>
                            <p className="font-bold uppercase tracking-wider text-sm text-black dark:text-zinc-100">Gnoma Explorer</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                                Powered by Anoma Protocol Adapter
                            </p>
                        </div>
                    </div>

                    {/* System Status Indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-full bg-gray-50 dark:bg-zinc-900">
                        {loading ? (
                            <Activity className="w-3 h-3 text-gray-400 animate-pulse" />
                        ) : status?.status === 'synced' ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                            <AlertCircle className="w-3 h-3 text-orange-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-zinc-400">
                            {loading ? 'Checking Sync...' : status?.status === 'synced' ? 'System Operational' : `Syncing (${status?.diff || 0} blocks behind)`}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/anoma"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 border-2 border-black dark:border-white/10 text-black dark:text-zinc-300 hover:bg-black hover:text-white dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        >
                            <Github className="w-5 h-5" />
                        </a>
                        <a
                            href="https://x.com/anoma"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 border-2 border-black dark:border-white/10 text-black dark:text-zinc-300 hover:bg-black hover:text-white dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        >
                            <Twitter className="w-5 h-5" />
                        </a>
                        <a
                            href="https://anoma.net"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 border-2 border-black dark:border-white/10 text-black dark:text-zinc-300 hover:bg-black hover:text-white dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                <div className="swiss-divider dark:bg-white/10" />

                <div className="text-center flex flex-col gap-3 pb-8 md:pb-0">
                    <p className="text-xs text-gray-500 dark:text-zinc-600 uppercase tracking-[0.2em] font-medium">
                        Build with love — 2026
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-600 uppercase tracking-[0.1em]">
                        Contributed by{' '}
                        <a
                            href="https://x.com/justcryptodefi"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold hover:text-[#FF0000] transition-colors"
                        >
                            @justcryptodefi
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    )
}
