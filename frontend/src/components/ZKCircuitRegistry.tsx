import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Code, ArrowLeft, Search, Filter } from 'lucide-react'
import { SEO } from './SEO'
import { ZK_PROGRAM_MAPPING } from '../lib/zkMapping'
import { useLocation, useNavigate } from 'react-router-dom'

export function ZKCircuitRegistry() {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null)

    // Check query params for a specific circuit to highlight
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search)
        const id = searchParams.get('id')
        if (id && ZK_PROGRAM_MAPPING[id]) {
            setSelectedCircuit(id)
            // Optional: scroll to it
            setTimeout(() => {
                const el = document.getElementById(id)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 100)
        }
    }, [location.search])

    const ObjectEntries = Object.entries as <T>(o: T) => [Extract<keyof T, string>, T[keyof T]][]
    const circuits = ObjectEntries(ZK_PROGRAM_MAPPING).filter(([id]) => id !== 'default')

    const filteredCircuits = circuits.filter(([id, program]) => {
        const term = searchTerm.toLowerCase()
        return id.toLowerCase().includes(term) ||
            program.name.toLowerCase().includes(term) ||
            program.tags.some(t => t.toLowerCase().includes(term))
    })

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-20 pt-8 px-6 lg:px-12 max-w-7xl mx-auto">
            <SEO
                title="ZK Circuit Registry"
                description="Explore the public registry of Zero-Knowledge circuits and RISC Zero Image IDs used on the Anoma network."
            />

            <div className="mb-12">
                <button onClick={() => navigate(-1)} className="group flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-[0.15em] hover:text-[#FF0000] transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> Back
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-8 h-8 text-[#FF0000]" />
                    <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight leading-[0.9]">
                        ZK Circuit<br />Registry
                    </h1>
                </div>
                <p className="text-gray-500 uppercase tracking-widest text-sm max-w-2xl leading-relaxed">
                    Anoma ensures function privacy by hiding execution logic behind Zero-Knowledge proofs. This registry maps public RISC Zero and Taiga circuit hashes back to their verifiable source code.
                </p>
            </div>

            {/* Search / Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="SEARCH BY HASH, NAME, OR TAG..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-black dark:border-white p-4 pl-12 font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-[#FF0000] dark:focus:border-[#FF0000] transition-colors"
                    />
                </div>
                <button className="swiss-border px-6 py-4 flex items-center gap-2 uppercase font-bold text-xs tracking-widest hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-none">
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </div>

            {/* Registry List */}
            <div className="space-y-6">
                {filteredCircuits.map(([id, program], index) => {
                    const isSelected = selectedCircuit === id
                    return (
                        <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`swiss-border p-6 md:p-8 transition-all duration-500 ${isSelected ? 'border-4 border-[#FF0000] bg-red-50/20 dark:bg-[#FF0000]/5 scale-[1.01] shadow-[8px_8px_0px_0px_rgba(255,0,0,1)]' : 'bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[-2px]'}`}
                            id={id}
                        >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold uppercase tracking-tight">{program.name}</h2>
                                        {isSelected && <span className="px-2 py-1 bg-[#FF0000] text-white text-[9px] font-bold uppercase tracking-widest animate-pulse">Selected Circuit</span>}
                                    </div>
                                    <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed max-w-3xl mb-4">
                                        {program.description}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {program.tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 p-4">
                                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Circuit Hash (Image ID)</div>
                                        <div className="font-mono text-sm md:text-base break-all text-black dark:text-white">
                                            {id}
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 flex flex-col gap-3">
                                    <a
                                        href={program.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-swiss-primary py-3 px-6 flex items-center justify-center gap-2 text-xs"
                                    >
                                        <Code className="w-4 h-4" /> Verify Source
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}

                {filteredCircuits.length === 0 && (
                    <div className="swiss-border p-12 text-center bg-gray-50 dark:bg-zinc-900">
                        <Shield className="w-8 h-8 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-xl font-bold uppercase mb-2">No Circuits Found</h3>
                        <p className="text-gray-500 uppercase tracking-widest text-sm">
                            Try adjusting your search criteria.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
