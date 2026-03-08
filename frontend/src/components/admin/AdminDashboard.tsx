import { useEffect, useState, useMemo, useCallback } from "react";
import { API_BASE_url } from "../../lib/api";
import { Search, Tag, Activity, Database, Download, RefreshCw, Plus, Trash2, Edit2, X, ToggleLeft, ToggleRight, Copy, Eye, Layers } from "lucide-react";

// ═══════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════

interface AdminChain {
    id: number; name: string;
    rpc_url?: string; rpcUrl?: string;
    contract_address?: string; contractAddress?: string;
    start_block?: number; startBlock?: number;
    explorer_url?: string; explorerUrl?: string;
    icon: string;
    is_enabled?: number; isEnabled?: number;
}

interface SolverInfo {
    address: string; txCount: number; totalGasSpent: string;
    totalValueProcessed: string; chainCount: number;
    firstSeen: number | null; lastSeen: number | null;
    label: string | null; category: string | null;
    logoUrl: string | null; website: string | null; notes: string | null;
}

interface SearchResult {
    type: 'transaction' | 'solver' | 'chain' | 'intent' | 'token_transfer' | 'label';
    id: string; title: string; subtitle: string;
    chainId?: number; metadata?: any;
}

interface HealthData {
    database: { tables: { table: string; count: number }[]; totalRows: number };
    chains: { chainId: number; chainName: string; chainIcon: string; lastBlock: number; lastSyncAgeHuman: string; status: string }[];
    api: { last24h: { totalRequests: number; avgResponseTimeMs: number; uniqueApiKeys: number } };
    recentEvents: { txHash: string; chainId: number; eventType: string; timestamp: number }[];
}

interface TxDetail {
    event: any; payloads: any[]; tokenTransfers: any[];
    forwarderCalls: any[]; intentLifecycle: any; solverLabel: any; chain: any;
}

// ═══════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════

const chainField = (c: AdminChain, snake: string, camel: string): any =>
    (c as any)[camel] ?? (c as any)[snake];

const shortAddr = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '—';
const copyText = (t: string) => navigator.clipboard.writeText(t);
const formatDate = (ts: number | null) => ts ? new Date(ts * 1000).toLocaleDateString() : '—';

type Tab = 'chains' | 'solvers' | 'search' | 'health' | 'export' | 'project';

// ═══════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('chains');
    const adminKey = sessionStorage.getItem("adminKey") || "";
    const adminHeaders = () => ({ "Content-Type": "application/json", "X-Admin-Key": adminKey });

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'chains', label: 'Chains', icon: Activity },
        { id: 'solvers', label: 'Solvers', icon: Tag },
        { id: 'search', label: 'Search', icon: Search },
        { id: 'health', label: 'Health', icon: Database },
        { id: 'export', label: 'Export', icon: Download },
        { id: 'project', label: 'Project', icon: Layers },
    ];

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        padding: '0.75rem 1.25rem', border: 'none', background: activeTab === t.id ? 'var(--accent)' : 'transparent',
                        color: activeTab === t.id ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                        borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        borderRadius: '0.5rem 0.5rem 0 0', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'chains' && <ChainsTab adminHeaders={adminHeaders} />}
            {activeTab === 'solvers' && <SolversTab adminHeaders={adminHeaders} />}
            {activeTab === 'search' && <SearchTab adminHeaders={adminHeaders} />}
            {activeTab === 'health' && <HealthTab adminHeaders={adminHeaders} />}
            {activeTab === 'export' && <ExportTab adminHeaders={adminHeaders} />}
            {activeTab === 'project' && <ProjectTab adminHeaders={adminHeaders} />}
        </div>
    );
}

// ═══════════════════════════════════════════
//  CHAINS TAB (existing chain management)
// ═══════════════════════════════════════════

function ChainsTab({ adminHeaders }: { adminHeaders: () => any }) {
    const [chains, setChains] = useState<AdminChain[]>([]);
    const [search, setSearch] = useState('');
    const [editingChain, setEditingChain] = useState<AdminChain | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ id: 0, name: '', rpcUrl: '', contractAddress: '', startBlock: 0, explorerUrl: '', icon: '🔗', isEnabled: 1 });
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const fetchChains = useCallback(async () => {
        try {
            const r = await fetch(`${API_BASE_url}/api/admin/chains`, { headers: adminHeaders() });
            if (r.ok) setChains(await r.json());
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { fetchChains(); }, []);

    const filtered = useMemo(() => chains.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        chainField(c, 'contract_address', 'contractAddress')?.toLowerCase().includes(search.toLowerCase())
    ), [chains, search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingChain ? 'PUT' : 'POST';
        const url = editingChain ? `${API_BASE_url}/api/admin/chains/${editingChain.id}` : `${API_BASE_url}/api/admin/chains`;
        await fetch(url, { method, headers: adminHeaders(), body: JSON.stringify(form) });
        setShowForm(false); setEditingChain(null); fetchChains();
    };

    const handleDelete = async (id: number) => {
        const chain = chains.find(c => c.id === id);
        const name = chain?.name || '';
        const typed = prompt(`⚠️ DANGER: This will permanently delete "${name}" (ID: ${id}).\n\nType the chain name "${name}" to confirm:`);
        if (!typed || typed.trim() !== name) {
            if (typed !== null) alert('Chain name did not match. Delete cancelled.');
            return;
        }
        await fetch(`${API_BASE_url}/api/admin/chains/${id}`, { method: 'DELETE', headers: adminHeaders() });
        fetchChains();
    };

    const bulkSetEnabled = async (enabled: number) => {
        await Promise.all(Array.from(selected).map(id =>
            fetch(`${API_BASE_url}/api/admin/chains/${id}`, { method: 'PUT', headers: adminHeaders(), body: JSON.stringify({ isEnabled: enabled }) })
        ));
        setSelected(new Set()); fetchChains();
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chains..."
                        style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                </div>
                {selected.size > 0 && (
                    <>
                        <button onClick={() => bulkSetEnabled(1)} style={{ padding: '0.5rem 1rem', background: '#22c55e', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>
                            <ToggleRight size={14} /> Enable ({selected.size})
                        </button>
                        <button onClick={() => bulkSetEnabled(0)} style={{ padding: '0.5rem 1rem', background: '#f59e0b', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>
                            <ToggleLeft size={14} /> Disable ({selected.size})
                        </button>
                    </>
                )}
                <button onClick={() => { setEditingChain(null); setForm({ id: 0, name: '', rpcUrl: '', contractAddress: '', startBlock: 0, explorerUrl: '', icon: '🔗', isEnabled: 1 }); setShowForm(true); }}
                    style={{ padding: '0.6rem 1.25rem', background: 'var(--accent)', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={16} /> Add Chain
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                        {[
                            { label: 'Chain ID', key: 'id', type: 'number' }, { label: 'Name', key: 'name' },
                            { label: 'RPC URL', key: 'rpcUrl' }, { label: 'Contract Address', key: 'contractAddress' },
                            { label: 'Start Block', key: 'startBlock', type: 'number' }, { label: 'Explorer URL', key: 'explorerUrl' },
                            { label: 'Icon', key: 'icon' },
                        ].map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>{f.label}</label>
                                <input type={f.type || 'text'} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.4rem', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--accent)', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer' }}>{editingChain ? 'Update' : 'Add'}</button>
                        <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
                    </div>
                </form>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>
                                <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())} />
                            </th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Chain</th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Contract</th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Status</th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '0.6rem 0.5rem' }}>
                                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => setSelected(prev => { const s = new Set(prev); s.has(c.id) ? s.delete(c.id) : s.add(c.id); return s; })} />
                                </td>
                                <td style={{ padding: '0.6rem 0.5rem' }}><span style={{ fontSize: '1.1rem' }}>{c.icon}</span> <strong>{c.name}</strong> <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>#{c.id}</span></td>
                                <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{shortAddr(chainField(c, 'contract_address', 'contractAddress') || '')}</td>
                                <td style={{ padding: '0.6rem 0.5rem' }}>
                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 600, background: chainField(c, 'is_enabled', 'isEnabled') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: chainField(c, 'is_enabled', 'isEnabled') ? '#22c55e' : '#ef4444' }}>
                                        {chainField(c, 'is_enabled', 'isEnabled') ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                                    <button onClick={() => { setEditingChain(c); setForm({ id: c.id, name: c.name, rpcUrl: chainField(c, 'rpc_url', 'rpcUrl') || '', contractAddress: chainField(c, 'contract_address', 'contractAddress') || '', startBlock: chainField(c, 'start_block', 'startBlock') || 0, explorerUrl: chainField(c, 'explorer_url', 'explorerUrl') || '', icon: c.icon, isEnabled: chainField(c, 'is_enabled', 'isEnabled') }); setShowForm(true); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '0.25rem' }}><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
//  SOLVERS TAB
// ═══════════════════════════════════════════

function SolversTab({ adminHeaders }: { adminHeaders: () => any }) {
    const [solvers, setSolvers] = useState<SolverInfo[]>([]);
    const [search, setSearch] = useState('');
    const [editingAddr, setEditingAddr] = useState<string | null>(null);
    const [labelForm, setLabelForm] = useState({ label: '', category: 'solver', website: '', notes: '' });
    const [loading, setLoading] = useState(false);

    const fetchSolvers = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE_url}/api/admin/solvers`, { headers: adminHeaders() });
            if (r.ok) setSolvers(await r.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchSolvers(); }, []);

    const filtered = useMemo(() => solvers.filter(s =>
        s.address.toLowerCase().includes(search.toLowerCase()) ||
        (s.label && s.label.toLowerCase().includes(search.toLowerCase()))
    ), [solvers, search]);

    const saveLabel = async (address: string) => {
        await fetch(`${API_BASE_url}/api/admin/solvers/label`, {
            method: 'POST', headers: adminHeaders(),
            body: JSON.stringify({ address, ...labelForm }),
        });
        setEditingAddr(null); fetchSolvers();
    };

    const deleteLabel = async (address: string) => {
        await fetch(`${API_BASE_url}/api/admin/solvers/label/${address}`, { method: 'DELETE', headers: adminHeaders() });
        fetchSolvers();
    };

    const categories = ['solver', 'relayer', 'protocol', 'user', 'deployer'];

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by address or label..."
                        style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                </div>
                <button onClick={fetchSolvers} style={{ padding: '0.6rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                    { label: 'Total Solvers', value: solvers.length, color: '#6366f1' },
                    { label: 'Labeled', value: solvers.filter(s => s.label).length, color: '#22c55e' },
                    { label: 'Unlabeled', value: solvers.filter(s => !s.label).length, color: '#f59e0b' },
                    { label: 'Multi-chain', value: solvers.filter(s => s.chainCount > 1).length, color: '#3b82f6' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Solver List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filtered.map(s => (
                    <div key={s.address} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    {s.label ? (
                                        <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(99,102,241,0.15)', color: '#6366f1', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>{s.label}</span>
                                    ) : (
                                        <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: '1rem', fontSize: '0.7rem' }}>unlabeled</span>
                                    )}
                                    {s.category && s.category !== 'solver' && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.category}</span>
                                    )}
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    {s.address}
                                    <button onClick={() => copyText(s.address)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0' }}><Copy size={12} /></button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <span>{s.txCount} txs</span>
                                <span>•</span>
                                <span>{s.chainCount} chain{s.chainCount !== 1 ? 's' : ''}</span>
                                <span>•</span>
                                <span>Last: {formatDate(s.lastSeen)}</span>
                            </div>
                        </div>

                        {editingAddr === s.address ? (
                            <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                                <input placeholder="Label (e.g. BarterSwap)" value={labelForm.label} onChange={e => setLabelForm({ ...labelForm, label: e.target.value })}
                                    style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '0.4rem', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                                <select value={labelForm.category} onChange={e => setLabelForm({ ...labelForm, category: e.target.value })}
                                    style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '0.4rem', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input placeholder="Website URL" value={labelForm.website} onChange={e => setLabelForm({ ...labelForm, website: e.target.value })}
                                    style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '0.4rem', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                                <input placeholder="Notes" value={labelForm.notes} onChange={e => setLabelForm({ ...labelForm, notes: e.target.value })}
                                    style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '0.4rem', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button onClick={() => saveLabel(s.address)} style={{ padding: '0.4rem 0.8rem', background: 'var(--accent)', border: 'none', borderRadius: '0.4rem', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>Save</button>
                                    <button onClick={() => setEditingAddr(null)} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.4rem', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                                <button onClick={() => { setEditingAddr(s.address); setLabelForm({ label: s.label || '', category: s.category || 'solver', website: s.website || '', notes: s.notes || '' }); }}
                                    style={{ padding: '0.3rem 0.7rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.4rem', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Tag size={12} /> {s.label ? 'Edit Label' : 'Add Label'}
                                </button>
                                {s.label && (
                                    <button onClick={() => deleteLabel(s.address)} style={{ padding: '0.3rem 0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.4rem', cursor: 'pointer', color: '#ef4444', fontSize: '0.75rem' }}>
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        {loading ? 'Loading solvers...' : 'No solvers found. Solvers will appear once the indexer discovers on-chain activity.'}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
//  SEARCH TAB
// ═══════════════════════════════════════════

function SearchTab({ adminHeaders }: { adminHeaders: () => any }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [txDetail, setTxDetail] = useState<TxDetail | null>(null);

    const doSearch = async () => {
        if (query.length < 2) return;
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE_url}/api/admin/search?q=${encodeURIComponent(query)}`, { headers: adminHeaders() });
            if (r.ok) { const d = await r.json(); setResults(d.results || []); }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const inspectTx = async (chainId: number | undefined, txHash: string) => {
        if (!chainId) return;
        try {
            const r = await fetch(`${API_BASE_url}/api/admin/tx/${chainId}/${txHash}`, { headers: adminHeaders() });
            if (r.ok) setTxDetail(await r.json());
        } catch (e) { console.error(e); }
    };

    const typeColors: Record<string, string> = {
        transaction: '#3b82f6', solver: '#6366f1', chain: '#22c55e',
        intent: '#f59e0b', token_transfer: '#ec4899', label: '#8b5cf6',
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
                        placeholder="Search tx hash, address, block number, intent ID, or label name..."
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
                </div>
                <button onClick={doSearch} disabled={loading} style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', opacity: loading ? 0.6 : 1 }}>
                    {loading ? '...' : 'Search'}
                </button>
            </div>

            {/* Quick examples */}
            {results.length === 0 && !loading && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>🔍 Search Guide</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div><strong>Tx hash:</strong> 0xe081...acf2cd</div>
                        <div><strong>Address:</strong> 0x094F...dd84F8</div>
                        <div><strong>Block:</strong> 43100000</div>
                        <div><strong>Label:</strong> BarterSwap</div>
                        <div><strong>Intent:</strong> 8453:0xe08...</div>
                    </div>
                </div>
            )}

            {/* Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {results.map((r, i) => (
                    <div key={`${r.type}-${r.id}-${i}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: r.type === 'transaction' ? 'pointer' : undefined }}
                        onClick={() => r.type === 'transaction' && r.chainId && inspectTx(r.chainId, r.metadata?.txHash || r.title)}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <span style={{ padding: '0.15rem 0.5rem', background: `${typeColors[r.type]}22`, color: typeColors[r.type], borderRadius: '1rem', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase' }}>{r.type}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.title.length > 50 ? shortAddr(r.title) : r.title}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.subtitle}</div>
                        </div>
                        {r.type === 'transaction' && <Eye size={14} style={{ color: 'var(--text-secondary)' }} />}
                    </div>
                ))}
            </div>

            {/* TX Detail Modal */}
            {txDetail && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }} onClick={() => setTxDetail(null)}>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '800px', width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem' }}>🔬 Transaction Inspector</h3>
                            <button onClick={() => setTxDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                        </div>

                        {txDetail.event && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>📋 Event</h4>
                                <div style={{ fontSize: '0.8rem', background: 'var(--bg-card)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                                    <div><strong>Hash:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{txDetail.event.txHash}</span></div>
                                    <div><strong>Block:</strong> {txDetail.event.blockNumber} • <strong>Type:</strong> {txDetail.event.eventType}</div>
                                    <div><strong>Solver:</strong> {txDetail.event.solverAddress ? shortAddr(txDetail.event.solverAddress) : '—'} {txDetail.solverLabel && <span style={{ color: '#6366f1' }}>({txDetail.solverLabel.label})</span>}</div>
                                </div>
                            </div>
                        )}

                        {txDetail.payloads.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: '#f59e0b', marginBottom: '0.5rem' }}>📦 Payloads ({txDetail.payloads.length})</h4>
                                {txDetail.payloads.map((p: any, i: number) => (
                                    <div key={i} style={{ fontSize: '0.75rem', background: 'var(--bg-card)', borderRadius: '0.4rem', padding: '0.5rem', marginBottom: '0.25rem' }}>
                                        <strong>{p.payloadType}</strong> #{p.payloadIndex} {p.tag && <span style={{ color: 'var(--text-secondary)' }}>tag: {p.tag}</span>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {txDetail.tokenTransfers.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: '#ec4899', marginBottom: '0.5rem' }}>💰 Token Transfers ({txDetail.tokenTransfers.length})</h4>
                                {txDetail.tokenTransfers.map((t: any, i: number) => (
                                    <div key={i} style={{ fontSize: '0.75rem', background: 'var(--bg-card)', borderRadius: '0.4rem', padding: '0.5rem', marginBottom: '0.25rem' }}>
                                        {t.amountDisplay} {t.tokenSymbol} • {shortAddr(t.fromAddress)} → {shortAddr(t.toAddress)} {t.amountUsd > 0 && <span style={{ color: '#22c55e' }}>(${t.amountUsd.toFixed(2)})</span>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {txDetail.intentLifecycle && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.85rem', color: '#3b82f6', marginBottom: '0.5rem' }}>🎯 Intent Lifecycle</h4>
                                <div style={{ fontSize: '0.8rem', background: 'var(--bg-card)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                                    <div><strong>Type:</strong> {txDetail.intentLifecycle.intentType} • <strong>Status:</strong> {txDetail.intentLifecycle.status}</div>
                                    <div><strong>Value:</strong> ${txDetail.intentLifecycle.inputValueUsd?.toFixed(2)} → ${txDetail.intentLifecycle.outputValueUsd?.toFixed(2)}</div>
                                    {txDetail.intentLifecycle.settlementTimeMs && <div><strong>Settlement:</strong> {txDetail.intentLifecycle.settlementTimeMs}ms</div>}
                                </div>
                            </div>
                        )}

                        {txDetail.chain && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                {txDetail.chain.icon} {txDetail.chain.name} {txDetail.chain.explorerUrl && <a href={`${txDetail.chain.explorerUrl}/tx/${txDetail.event?.txHash}`} target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>View on Explorer ↗</a>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
//  HEALTH TAB
// ═══════════════════════════════════════════

function HealthTab({ adminHeaders }: { adminHeaders: () => any }) {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE_url}/api/admin/health`, { headers: adminHeaders() });
            if (r.ok) setHealth(await r.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchHealth(); }, []);

    if (!health) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading health data...</div>;

    const statusColors: Record<string, string> = { healthy: '#22c55e', stale: '#f59e0b', critical: '#ef4444' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>System Health</h3>
                <button onClick={fetchHealth} style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                </button>
            </div>

            {/* Chain Health */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {health.chains.map(c => (
                    <div key={c.chainId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span><span style={{ fontSize: '1.1rem' }}>{c.chainIcon}</span> <strong>{c.chainName}</strong></span>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[c.status] || '#999', display: 'inline-block' }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <div>Block: <strong>{c.lastBlock?.toLocaleString()}</strong></div>
                            <div>Last sync: <strong style={{ color: statusColors[c.status] }}>{c.lastSyncAgeHuman}</strong></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Database Stats */}
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>📊 Database — {health.database.totalRows.toLocaleString()} total rows</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {health.database.tables.sort((a, b) => b.count - a.count).map(t => (
                    <div key={t.table} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{t.table}</span>
                        <strong>{t.count.toLocaleString()}</strong>
                    </div>
                ))}
            </div>

            {/* API Usage */}
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>🔌 API Usage (24h)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Requests', value: health.api.last24h.totalRequests },
                    { label: 'Avg Response', value: `${health.api.last24h.avgResponseTimeMs}ms` },
                    { label: 'API Keys', value: health.api.last24h.uniqueApiKeys },
                ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Recent Events */}
            {health.recentEvents.length > 0 && (
                <>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>🕐 Recent Events</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {health.recentEvents.map((e, i) => (
                            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span><span style={{ fontFamily: 'monospace' }}>{shortAddr(e.txHash)}</span> <span style={{ color: 'var(--text-secondary)' }}>• {e.eventType}</span></span>
                                <span style={{ color: 'var(--text-secondary)' }}>Chain {e.chainId} • {formatDate(e.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
//  EXPORT TAB
// ═══════════════════════════════════════════

function ExportTab({ adminHeaders }: { adminHeaders: () => any }) {
    const [exportType, setExportType] = useState('events');
    const [chainId, setChainId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ count: number; data: any[] } | null>(null);

    const types = ['events', 'solvers', 'transfers', 'intents', 'economics', 'daily_stats'];

    const doExport = async () => {
        setLoading(true);
        try {
            const params = chainId ? `?chainId=${chainId}` : '';
            const r = await fetch(`${API_BASE_url}/api/admin/export/${exportType}${params}`, { headers: adminHeaders() });
            if (r.ok) setResult(await r.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const downloadJSON = () => {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${exportType}_export.json`; a.click();
        URL.revokeObjectURL(url);
    };

    const downloadCSV = () => {
        if (!result || result.data.length === 0) return;
        const headers = Object.keys(result.data[0]);
        const rows = result.data.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${exportType}_export.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📤 Data Export</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Data Type</label>
                        <select value={exportType} onChange={e => setExportType(e.target.value)}
                            style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.85rem', minWidth: '150px' }}>
                            {types.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Chain ID (optional)</label>
                        <input value={chainId} onChange={e => setChainId(e.target.value)} placeholder="e.g. 8453"
                            style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '120px' }} />
                    </div>
                    <button onClick={doExport} disabled={loading}
                        style={{ padding: '0.6rem 1.25rem', background: 'var(--accent)', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                        {loading ? 'Loading...' : 'Fetch Data'}
                    </button>
                </div>
            </div>

            {result && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.9rem' }}><strong>{result.count}</strong> records fetched</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={downloadJSON} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.4rem', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem' }}>💾 JSON</button>
                            <button onClick={downloadCSV} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.4rem', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem' }}>📊 CSV</button>
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', maxHeight: '400px', overflow: 'auto' }}>
                        <pre style={{ fontSize: '0.7rem', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(result.data.slice(0, 5), null, 2)}
                            {result.data.length > 5 && `\n\n... and ${result.data.length - 5} more records`}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
//  PROJECT INTELLIGENCE TAB
// ═══════════════════════════════════════════

interface ProjectAgent {
    id: string; name: string; strategy: string; walletAddress: string;
    status: string; executions: number; successRate: string;
    lastActive: number; createdAt: number;
}

interface ProjectData {
    agents: {
        total: number; active: number; paused: number; disabled: number;
        totalExecutions: number; successRate: string; totalGasSpent: number;
        strategies: Record<string, number>; chainsCovered: number[];
        fleet: ProjectAgent[];
    };
    recentExecutions: { id: string; agentId: string; chainId: number; intentType: string; status: string; txHash: string; gasUsed: number; createdAt: number }[];
}

function ProjectTab({ adminHeaders }: { adminHeaders: () => any }) {
    const [data, setData] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(false);
    const [section, setSection] = useState<'overview' | 'stack' | 'roadmap' | 'agents' | 'sdk' | 'api'>('overview');

    const fetchProject = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE_url}/api/admin/project`, { headers: adminHeaders() });
            if (r.ok) { const d = await r.json(); setData(d.data); }
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchProject(); }, []);

    const sectionStyle = (s: string) => ({
        padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
        background: section === s ? 'var(--accent)' : 'var(--bg-card)',
        color: section === s ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s',
    });

    const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem' };
    const headingStyle = { fontSize: '0.9rem', fontWeight: 700 as const, marginBottom: '0.75rem', color: 'var(--text-primary)' };
    const labelStyle = { fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
    const valueStyle = { fontSize: '1.5rem', fontWeight: 700 as const };

    const strategyColors: Record<string, string> = {
        arbitrage: '#6366f1', market_maker: '#22c55e', liquidator: '#f59e0b',
        mev: '#ef4444', custom: '#8b5cf6',
    };

    const statusColors: Record<string, string> = { active: '#22c55e', paused: '#f59e0b', disabled: '#ef4444' };

    return (
        <div>
            {/* Section Nav */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', overflowX: 'auto', flexWrap: 'wrap' }}>
                {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'stack', label: '🏗️ Tech Stack' },
                    { id: 'roadmap', label: '🗺️ Roadmap' },
                    { id: 'agents', label: '🤖 Agent Fleet' },
                    { id: 'sdk', label: '📦 SDK v1.0' },
                    { id: 'api', label: '🔌 API Catalog' },
                ].map(s => (
                    <button key={s.id} onClick={() => setSection(s.id as any)} style={sectionStyle(s.id)}>{s.label}</button>
                ))}
            </div>

            {/* OVERVIEW */}
            {section === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Hero Stats */}
                    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99,102,241,0.08) 100%)', padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>AnomaScan Explorer</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, marginBottom: '1rem' }}>Multichain intent observability & AI reasoning platform for the Anoma Distributed Operating System</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                            {[
                                { label: 'Platform', value: 'v3.0', color: '#6366f1' },
                                { label: 'SDK', value: 'v1.0.0', color: '#22c55e' },
                                { label: 'Agent Fleet', value: data?.agents.total || 0, color: '#3b82f6' },
                                { label: 'Executions', value: data?.agents.totalExecutions || 0, color: '#f59e0b' },
                                { label: 'Success Rate', value: `${data?.agents.successRate || 0}%`, color: '#22c55e' },
                                { label: 'Chains', value: data?.agents.chainsCovered?.length || 0, color: '#ec4899' },
                            ].map(s => (
                                <div key={s.label} style={{ textAlign: 'center' }}>
                                    <div style={{ ...valueStyle, color: s.color }}>{s.value}</div>
                                    <div style={labelStyle}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Status Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        <div style={cardStyle}>
                            <h3 style={headingStyle}>🏗️ Infrastructure Status</h3>
                            {[
                                { name: 'Cloudflare Workers', status: '🟢 Live', detail: 'anomapay-explorer.bidurandblog.workers.dev' },
                                { name: 'D1 Database', status: '🟢 Live', detail: '10.43 MB, ~60K rows' },
                                { name: 'Privy Wallets', status: '🟢 Active', detail: 'Server-side EOA provisioning' },
                                { name: 'AI Simulation', status: '🟢 Gemini', detail: 'Intent prediction engine' },
                            ].map(s => (
                                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                    <div><strong>{s.name}</strong><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.detail}</div></div>
                                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{s.status}</span>
                                </div>
                            ))}
                        </div>
                        <div style={cardStyle}>
                            <h3 style={headingStyle}>🤖 Agent Fleet</h3>
                            {data ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{data.agents.active}</div><div style={labelStyle}>Active</div></div>
                                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{data.agents.paused}</div><div style={labelStyle}>Paused</div></div>
                                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{data.agents.totalExecutions}</div><div style={labelStyle}>Execs</div></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {Object.entries(data.agents.strategies).map(([s, c]) => (
                                            <span key={s} style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 600, background: `${strategyColors[s] || '#666'}22`, color: strategyColors[s] || '#666' }}>
                                                {s}: {c}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            ) : <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>Loading...</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* TECH STACK */}
            {section === 'stack' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h3 style={{ ...headingStyle, fontSize: '1.1rem' }}>🏗️ Technology Stack</h3>
                    {[
                        {
                            category: 'Frontend', items: [
                                { name: 'React 18', detail: 'UI framework with Suspense + lazy loading', badge: 'Core' },
                                { name: 'TypeScript', detail: 'Strict mode, full type safety', badge: 'Language' },
                                { name: 'Vite 5', detail: 'Build tool, HMR development', badge: 'Build' },
                                { name: 'React Router 6', detail: 'Client-side routing, admin subroutes', badge: 'Navigation' },
                                { name: 'Recharts', detail: 'Analytics charts & data visualization', badge: 'Charts' },
                                { name: 'Lucide React', detail: 'Icon library', badge: 'UI' },
                            ]
                        },
                        {
                            category: 'Backend', items: [
                                { name: 'Cloudflare Workers', detail: 'Edge compute, V8 Isolates, global deployment', badge: 'Runtime' },
                                { name: 'Hono.js', detail: 'Ultra-fast web framework (12KB)', badge: 'Framework' },
                                { name: 'Drizzle ORM', detail: 'Type-safe SQL queries, D1 integration', badge: 'ORM' },
                                { name: 'D1 Database', detail: 'SQLite at the edge (anomapay-db)', badge: 'Database' },
                            ]
                        },
                        {
                            category: 'AI & Intelligence', items: [
                                { name: 'Gemini 2.0 Flash', detail: 'Intent simulation engine, risk scoring', badge: 'AI' },
                                { name: 'Cross-chain Correlator', detail: 'Multi-chain intent pattern matching', badge: 'Engine' },
                                { name: 'Lifecycle Engine', detail: 'Intent status tracking (created→settled)', badge: 'Engine' },
                            ]
                        },
                        {
                            category: 'Infrastructure', items: [
                                { name: 'Privy', detail: 'Server-side EOA wallet provisioning for agents', badge: 'Wallets' },
                                { name: 'Cloudflare Pages', detail: 'Frontend hosting, CDN delivery', badge: 'CDN' },
                                { name: 'Discord Webhooks', detail: 'Alerting for sync errors and crashes', badge: 'Alerts' },
                                { name: 'SSE Streaming', detail: 'Real-time event push (Server-Sent Events)', badge: 'Real-time' },
                            ]
                        },
                        {
                            category: 'External APIs', items: [
                                { name: 'Blockscout REST', detail: 'Primary block explorer data source', badge: 'Indexer' },
                                { name: 'Alchemy RPC', detail: 'Fallback for getLogs when Blockscout rate-limited', badge: 'RPC' },
                                { name: 'CoinGecko', detail: 'Token price data for USD valuations', badge: 'Prices' },
                            ]
                        },
                        {
                            category: 'SDK', items: [
                                { name: '@anomascan/sdk v1.0', detail: 'Zero-dependency, 10 KB gzipped', badge: 'Package' },
                                { name: 'tsup', detail: 'SDK build tool — CJS + ESM + DTS', badge: 'Build' },
                            ]
                        },
                    ].map(cat => (
                        <div key={cat.category} style={cardStyle}>
                            <h4 style={{ ...headingStyle, color: 'var(--accent)' }}>{cat.category}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                                {cat.items.map(item => (
                                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                        <div>
                                            <strong style={{ fontSize: '0.85rem' }}>{item.name}</strong>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.detail}</div>
                                        </div>
                                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.6rem', fontWeight: 600, background: 'rgba(99,102,241,0.12)', color: '#6366f1', whiteSpace: 'nowrap' }}>{item.badge}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ROADMAP */}
            {section === 'roadmap' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h3 style={{ ...headingStyle, fontSize: '1.1rem' }}>🗺️ Strategic Roadmap</h3>
                    {[
                        {
                            phase: 'Phase 1 — Core Infrastructure', status: 'complete', color: '#22c55e', items: [
                                '✅ ARM Protocol Adapter indexing (Ethereum + Base)',
                                '✅ Intent lifecycle tracking (created → matched → settled)',
                                '✅ Solver leaderboard with P&L economics',
                                '✅ Admin dashboard (chains, solvers, search, health, export)',
                                '✅ Mobile-responsive design across all pages',
                            ]
                        },
                        {
                            phase: 'Phase 2 — AI Intelligence', status: 'complete', color: '#22c55e', items: [
                                '✅ Gemini 2.0 Flash simulation engine',
                                '✅ Cross-chain correlation detection',
                                '✅ AI-powered intent risk scoring',
                                '✅ Prediction accuracy tracking',
                            ]
                        },
                        {
                            phase: 'Phase 3 — Developer Platform', status: 'complete', color: '#22c55e', items: [
                                '✅ Developer Portal with API key management',
                                '✅ Tiered rate limiting (Anonymous → Enterprise)',
                                '✅ SSE real-time event streaming',
                                '✅ @anomascan/sdk v1.0 (6 modules, 28 methods)',
                                '✅ Solver marketplace frontend',
                            ]
                        },
                        {
                            phase: 'Phase 4 — Agent Autonomy', status: 'active', color: '#3b82f6', items: [
                                '✅ Agent registration with Privy wallet provisioning',
                                '✅ Autonomous intent execution pipeline',
                                '✅ Agent lifecycle management (pause/resume)',
                                '🔄 Connect to real AI simulation engine',
                                '🔄 Solver staking & slashing monitoring',
                                '⏳ Agent performance analytics dashboard',
                            ]
                        },
                        {
                            phase: 'Phase 5 — Privacy & Namada', status: 'planned', color: '#8b5cf6', items: [
                                '⏳ MASP privacy pool tracking',
                                '⏳ IBC message correlation',
                                '⏳ Shielded intent discovery (ZK)',
                                '⏳ Namada testnet integration',
                            ]
                        },
                        {
                            phase: 'Phase 6 — Multi-VM Expansion', status: 'planned', color: '#f59e0b', items: [
                                '⏳ Bitcoin & Solana ARM adapters',
                                '⏳ Chimera chain support',
                                '⏳ FHE/MPC cryptography indexing',
                                '⏳ Cross-VM intent routing',
                            ]
                        },
                    ].map(phase => (
                        <div key={phase.phase} style={{ ...cardStyle, borderLeft: `3px solid ${phase.color}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{phase.phase}</h4>
                                <span style={{ padding: '0.2rem 0.7rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 600, background: `${phase.color}22`, color: phase.color, textTransform: 'uppercase' }}>
                                    {phase.status}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {phase.items.map((item, i) => (
                                    <div key={i} style={{ fontSize: '0.8rem', color: item.startsWith('✅') ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '0.15rem 0' }}>{item}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* AGENT FLEET */}
            {section === 'agents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ ...headingStyle, fontSize: '1.1rem', margin: 0 }}>🤖 Agent Fleet</h3>
                        <button onClick={fetchProject} style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        </button>
                    </div>

                    {data ? (
                        <>
                            {/* Fleet Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                                {[
                                    { label: 'Total Agents', value: data.agents.total, color: '#6366f1' },
                                    { label: 'Active', value: data.agents.active, color: '#22c55e' },
                                    { label: 'Paused', value: data.agents.paused, color: '#f59e0b' },
                                    { label: 'Executions', value: data.agents.totalExecutions, color: '#3b82f6' },
                                    { label: 'Success Rate', value: `${data.agents.successRate}%`, color: '#22c55e' },
                                    { label: 'Gas Spent', value: data.agents.totalGasSpent.toLocaleString(), color: '#ef4444' },
                                ].map(s => (
                                    <div key={s.label} style={{ ...cardStyle, textAlign: 'center' }}>
                                        <div style={{ ...valueStyle, color: s.color }}>{s.value}</div>
                                        <div style={labelStyle}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Agent List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {data.agents.fleet.map(agent => (
                                    <div key={agent.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <strong style={{ fontSize: '0.9rem' }}>{agent.name}</strong>
                                                <span style={{ padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: 600, background: `${statusColors[agent.status] || '#666'}22`, color: statusColors[agent.status] || '#666' }}>
                                                    {agent.status}
                                                </span>
                                                <span style={{ padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: 600, background: `${strategyColors[agent.strategy] || '#666'}22`, color: strategyColors[agent.strategy] || '#666' }}>
                                                    {agent.strategy}
                                                </span>
                                            </div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {agent.walletAddress}
                                                <button onClick={() => copyText(agent.walletAddress)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0' }}><Copy size={12} /></button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            <span>{agent.executions} execs</span>
                                            <span>{agent.successRate}% success</span>
                                            <span>Last: {agent.lastActive ? new Date(agent.lastActive * 1000).toLocaleDateString() : '—'}</span>
                                        </div>
                                    </div>
                                ))}
                                {data.agents.fleet.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No agents registered yet.</div>
                                )}
                            </div>

                            {/* Recent Executions */}
                            {data.recentExecutions.length > 0 && (
                                <div style={cardStyle}>
                                    <h4 style={headingStyle}>Recent Executions</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {data.recentExecutions.map(e => (
                                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span style={{ padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 600, background: e.status === 'simulated' ? 'rgba(99,102,241,0.15)' : e.status === 'submitted' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: e.status === 'simulated' ? '#6366f1' : e.status === 'submitted' ? '#22c55e' : '#ef4444' }}>{e.status}</span>
                                                    <span>{e.intentType} on chain {e.chainId}</span>
                                                </div>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{e.txHash ? shortAddr(e.txHash) : '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>{loading ? 'Loading agent fleet...' : 'No data available.'}</div>}
                </div>
            )}

            {/* SDK */}
            {section === 'sdk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ ...cardStyle, borderLeft: '3px solid #22c55e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ ...headingStyle, margin: 0 }}>@anomascan/sdk</h3>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>v1.0.0</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                            {[
                                { label: 'CJS', value: '10.43 KB' },
                                { label: 'ESM', value: '9.42 KB' },
                                { label: 'DTS', value: '11.94 KB' },
                                { label: 'Dependencies', value: '0' },
                                { label: 'Modules', value: '6' },
                                { label: 'Methods', value: '28' },
                            ].map(s => (
                                <div key={s.label} style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{s.value}</div>
                                    <div style={labelStyle}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {[
                        { module: 'client.intents', methods: ['list(params?)', 'get(id, chainId?)', 'lifecycle(id)', 'simulation(id)', 'simulate(params)'], count: 5 },
                        { module: 'client.solvers', methods: ['list(params?)', 'get(address, chainId?)', 'economics(params?)', 'economicHistory(address, chainId?)'], count: 4 },
                        { module: 'client.analytics', methods: ['volume(params?)', 'crossChainFlows(params?)', 'aiInsights(params?)', 'intentTypes(params?)', 'demandHeatmap(params?)', 'lifecycleFunnel(params?)'], count: 6 },
                        { module: 'client.agents', methods: ['register(config)', 'execute(params)', 'status(agentId)', 'history(agentId, limit?)', 'pause(agentId)', 'resume(agentId)'], count: 6 },
                        { module: 'client.developer', methods: ['createKey(userId, name)', 'listKeys(userId)', 'revokeKey(keyHash, userId)', 'getUsage(keyHash, days?)', 'getCatalog()'], count: 5 },
                        { module: 'client.stream', methods: ['getEvents(since?, type?)', 'subscribe(callback, options?)'], count: 2 },
                    ].map(mod => (
                        <div key={mod.module} style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontFamily: 'monospace' }}>{mod.module}</h4>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{mod.count} methods</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                {mod.methods.map(m => (
                                    <span key={m} style={{ padding: '0.2rem 0.6rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.4rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>.{m}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* API CATALOG */}
            {section === 'api' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h3 style={{ ...headingStyle, fontSize: '1.1rem' }}>🔌 API Endpoint Catalog</h3>
                    {[
                        {
                            group: 'Intents', endpoints: [
                                { method: 'GET', path: '/api/v3/intents', desc: 'List intents with pagination & filters' },
                                { method: 'GET', path: '/api/v3/intents/:id', desc: 'Intent detail with lifecycle' },
                                { method: 'GET', path: '/api/v3/intents/:id/lifecycle', desc: 'Lifecycle timeline' },
                                { method: 'GET', path: '/api/v3/intents/:id/simulation', desc: 'AI simulation results' },
                                { method: 'POST', path: '/api/v3/intents/simulate', desc: 'Run hypothetical simulation' },
                            ]
                        },
                        {
                            group: 'Solvers', endpoints: [
                                { method: 'GET', path: '/api/v3/solvers', desc: 'Solver leaderboard' },
                                { method: 'GET', path: '/api/v3/solvers/:address', desc: 'Solver profile' },
                                { method: 'GET', path: '/api/v3/solvers/economics', desc: 'P&L leaderboard' },
                                { method: 'GET', path: '/api/v3/solvers/:address/economics', desc: 'Daily economic history' },
                            ]
                        },
                        {
                            group: 'Analytics', endpoints: [
                                { method: 'GET', path: '/api/v3/analytics/volume', desc: 'Volume over time' },
                                { method: 'GET', path: '/api/v3/analytics/cross-chain', desc: 'Cross-chain flow data' },
                                { method: 'GET', path: '/api/v3/analytics/ai-insights', desc: 'AI predictions' },
                                { method: 'GET', path: '/api/v3/analytics/intent-types', desc: 'Intent type distribution' },
                                { method: 'GET', path: '/api/v3/analytics/demand-heatmap', desc: 'Hot token pairs' },
                                { method: 'GET', path: '/api/v3/analytics/lifecycle-funnel', desc: 'Conversion funnel' },
                            ]
                        },
                        {
                            group: 'Agents', endpoints: [
                                { method: 'POST', path: '/api/v3/agents/register', desc: 'Register autonomous agent' },
                                { method: 'POST', path: '/api/v3/agents/execute', desc: 'Execute intent via agent' },
                                { method: 'GET', path: '/api/v3/agents/:id/status', desc: 'Agent health & stats' },
                                { method: 'GET', path: '/api/v3/agents/:id/history', desc: 'Execution log' },
                                { method: 'POST', path: '/api/v3/agents/:id/pause', desc: 'Pause agent' },
                                { method: 'POST', path: '/api/v3/agents/:id/resume', desc: 'Resume agent' },
                            ]
                        },
                        {
                            group: 'Developer', endpoints: [
                                { method: 'GET', path: '/api/v3/developer/catalog', desc: 'Full API reference' },
                                { method: 'POST', path: '/api/v3/developer/keys', desc: 'Create API key' },
                                { method: 'GET', path: '/api/v3/developer/keys', desc: 'List API keys' },
                                { method: 'POST', path: '/api/v3/developer/keys/revoke', desc: 'Revoke API key' },
                                { method: 'GET', path: '/api/v3/developer/keys/usage', desc: 'Usage analytics' },
                            ]
                        },
                        {
                            group: 'Streaming', endpoints: [
                                { method: 'GET', path: '/api/v3/stream/events', desc: 'SSE stream or JSON poll' },
                            ]
                        },
                    ].map(group => (
                        <div key={group.group} style={cardStyle}>
                            <h4 style={{ ...headingStyle, color: 'var(--accent)' }}>{group.group}</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {group.endpoints.map(ep => (
                                    <div key={ep.path} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                        <span style={{ padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 700, minWidth: '40px', textAlign: 'center', background: ep.method === 'GET' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)', color: ep.method === 'GET' ? '#22c55e' : '#3b82f6' }}>{ep.method}</span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', flex: 1 }}>{ep.path}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right' }}>{ep.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
