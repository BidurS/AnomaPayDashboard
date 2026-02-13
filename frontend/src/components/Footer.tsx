import { Github, Twitter, ExternalLink } from 'lucide-react'

export function Footer() {
    return (
        <footer className="border-t-4 border-black dark:border-white bg-white dark:bg-black py-12 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-[#FF0000]" />
                        <div>
                            <p className="font-bold uppercase tracking-wider text-sm text-black dark:text-white">Gnoma Explorer</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Powered by Anoma Protocol Adapter
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/anoma"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                        >
                            <Github className="w-5 h-5" />
                        </a>
                        <a
                            href="https://x.com/anoma"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                        >
                            <Twitter className="w-5 h-5" />
                        </a>
                        <a
                            href="https://anoma.net"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                <div className="swiss-divider dark:bg-white" />

                <div className="text-center flex flex-col gap-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">
                        Build with love — 2026
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.1em]">
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
