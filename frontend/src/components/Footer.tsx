import { Github, Twitter, ExternalLink, Activity, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSystemStatus } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { Link } from 'react-router-dom'
import { SkylineSVG } from './effects/SkylineSVG'

export function Footer() {
    const { activeChain } = useChainContext()
    const { status, loading } = useSystemStatus(activeChain?.id || 8453)

    return (
        <footer className="border-t-4 border-black dark:border-white/10 bg-white dark:bg-black py-16 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                
                {/* Main Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 relative z-10">
                    
                    {/* Brand Section */}
                    <div className="md:col-span-4 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#FF0000]" />
                            <div>
                                <p className="font-black uppercase tracking-tighter text-xl text-black dark:text-zinc-100">Gnoma Explorer</p>
                                <p className="text-[10px] text-gray-500 dark:text-zinc-500 uppercase font-bold tracking-widest mt-1">
                                    Real-time Intent OS Analytics
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                            The industry-standard analytics platform for the Anoma Protocol. Visualizing the lifecycle of intents from gossip to ZK-settlement.
                        </p>
                        
                        {/* Socials */}
                        <div className="flex items-center gap-3 pt-4">
                            <a href="https://github.com/anoma" target="_blank" rel="noopener noreferrer" className="p-2 border border-black/10 dark:border-white/10 hover:bg-black hover:text-white transition-colors">
                                <Github className="w-4 h-4" />
                            </a>
                            <a href="https://x.com/anoma" target="_blank" rel="noopener noreferrer" className="p-2 border border-black/10 dark:border-white/10 hover:bg-black hover:text-white transition-colors">
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a href="https://anoma.net" target="_blank" rel="noopener noreferrer" className="p-2 border border-black/10 dark:border-white/10 hover:bg-black hover:text-white transition-colors">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Network</h4>
                            <div className="flex flex-col gap-2">
                                <Link to="/" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors">Dashboard</Link>
                                <Link to="/live" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors flex items-center gap-2">Live Data <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /></Link>
                                <Link to="/mempool" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors">Mempool</Link>
                                <Link to="/domains" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors">Topology</Link>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Technical</h4>
                            <div className="flex flex-col gap-2">
                                <Link to="/debug" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors">Intent Debugger</Link>
                                <Link to="/circuits" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors">ZK Registry</Link>
                                <Link to="/transactions" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors">Explorer</Link>
                                <Link to="/solvers" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors">Solvers</Link>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Resources</h4>
                            <div className="flex flex-col gap-2">
                                <Link to="/faq" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors">Documentation</Link>
                                <a href="https://specs.anoma.net" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors flex items-center gap-1.5">Protocol Specs <ExternalLink className="w-3 h-3" /></a>
                                <a href="https://github.com/anoma/whitepaper" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase hover:text-[#FF0000] transition-colors flex items-center gap-1.5">Whitepaper <ExternalLink className="w-3 h-3" /></a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-32 pb-12 border-t border-black/5 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative min-h-[320px]">
                    
                    {/* Skyline Background Effect */}
                    <SkylineSVG />

                    {/* System Status */}
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm relative z-10">
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

                    <div className="text-center md:text-right relative z-10">
                        <p className="text-[10px] text-gray-500 dark:text-zinc-600 uppercase tracking-[0.1em] bg-white/50 dark:bg-black/50 px-2 py-1 backdrop-blur-sm rounded">
                            Contributed by{' '}
                            <a href="https://x.com/justcryptodefi" target="_blank" rel="noopener noreferrer" className="font-bold text-black dark:text-white hover:text-[#FF0000] transition-colors">
                                @justcryptodefi
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}
