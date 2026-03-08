import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, BookOpen, Play, Copy, Check, ChevronDown, ChevronRight, Zap, Shield, Server } from 'lucide-react';
import { SEO } from '../components/SEO';

const API_BASE = 'https://anomapay-explorer.bidurandblog.workers.dev/api/v3';

/* ──────────────────────────────────── types */
interface Param { name: string; type: string; required: boolean; description: string }
interface Endpoint { method: string; path: string; description: string; params?: Param[]; body?: string; response: string }
interface Category { name: string; description: string; endpoints: Endpoint[] }
interface Tier { name: string; rpm: number; daily: number; price: string }
interface Catalog { baseUrl: string; tiers: Tier[]; categories: Category[]; authentication: { method: string; header: string; queryParam: string; description: string } }
interface ApiKey { keyHash: string; name: string; tier: string | null; rateLimit: number | null; dailyLimit: number | null; createdAt: number; lastUsed: number | null; isActive: number | null }

/* ──────────────────────────────────── helpers */
const methodColor: Record<string, string> = {
    GET: '#4ade80', POST: '#60a5fa', PUT: '#fbbf24', DELETE: '#f87171',
};

/* ═══════════════════════════════════ MAIN */
export default function DevPortalPage() {
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [openCat, setOpenCat] = useState<string>('Intents');
    const [playResult, setPlayResult] = useState<string>('');
    const [playLoading, setPlayLoading] = useState(false);
    const [playEndpoint, setPlayEndpoint] = useState('');
    const [copied, setCopied] = useState('');

    // API Key Management
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [userId] = useState(() => 'dev_' + Math.random().toString(36).slice(2, 10));
    const [createdKey, setCreatedKey] = useState('');
    const [tab, setTab] = useState<'docs' | 'keys' | 'playground'>('docs');

    useEffect(() => {
        fetch(`${API_BASE}/developer/catalog`).then(r => r.json()).then((d: any) => setCatalog(d.data)).catch(() => { });
    }, []);

    const createKey = async () => {
        if (!newKeyName.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/developer/keys`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, name: newKeyName.trim() }),
            });
            const data = await res.json() as any;
            if (data.success) {
                setCreatedKey(data.data.key);
                setNewKeyName('');
                // Refresh keys
                fetch(`${API_BASE}/developer/keys?userId=${userId}`).then(r => r.json()).then((d: any) => setKeys(d.data || []));
            }
        } catch (_e) { /* silent */ }
    };

    const tryEndpoint = async (method: string, path: string) => {
        setPlayLoading(true);
        setPlayEndpoint(`${method} ${path}`);
        try {
            const url = `${API_BASE}${path.replace(':id', 'example').replace(':address', '0x0000')}${path.includes('?') ? '&' : '?'}chainId=8453`;
            const res = await fetch(url);
            const data = await res.json();
            setPlayResult(JSON.stringify(data, null, 2));
        } catch (e: any) {
            setPlayResult(`Error: ${e.message}`);
        }
        setPlayLoading(false);
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <>
            <SEO title="Developer Portal" description="AnomaScan API documentation, key management, and interactive playground" />
            <div style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>
                {/* ─── Hero Header ─── */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                        <Server size={28} style={{ color: '#e11d48' }} />
                        <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>DEVELOPER PORTAL</h1>
                    </div>
                    <p style={{ color: '#888', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>REST API • TypeScript SDK • API Key Management</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                        <code style={{ background: '#111', padding: '6px 14px', borderRadius: 6, fontSize: '0.8rem', color: '#4ade80', border: '1px solid #222' }}>
                            BASE: {catalog?.baseUrl || API_BASE}
                        </code>
                    </div>
                </motion.div>

                {/* ─── Tab Bar ─── */}
                <div style={{ display: 'flex', gap: 0, marginBottom: '2rem', borderBottom: '1px solid #222', overflowX: 'auto' }}>
                    {[
                        { id: 'docs' as const, label: 'API Reference', icon: BookOpen },
                        { id: 'keys' as const, label: 'API Keys', icon: Key },
                        { id: 'playground' as const, label: 'Playground', icon: Play },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            background: 'transparent', border: 'none', padding: '12px 16px', cursor: 'pointer',
                            color: tab === t.id ? '#e11d48' : '#666', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem',
                            fontWeight: tab === t.id ? 700 : 400, borderBottom: tab === t.id ? '2px solid #e11d48' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                            <t.icon size={16} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* ════════ API REFERENCE TAB ════════ */}
                {tab === 'docs' && catalog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Tier Pricing */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: '2rem' }}>
                            {catalog.tiers.map(tier => (
                                <div key={tier.name} style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{tier.name}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: tier.name === 'Pro' ? '#e11d48' : '#fff' }}>{tier.price}</div>
                                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#666' }}>
                                        <div>{tier.rpm.toLocaleString()} req/min</div>
                                        <div>{tier.daily.toLocaleString()} req/day</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Authentication */}
                        <div style={{ background: '#0a0a0a', border: '1px solid #1a3a20', borderRadius: 10, padding: 20, marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <Shield size={16} style={{ color: '#4ade80' }} />
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: 700, color: '#4ade80' }}>Authentication</span>
                            </div>
                            <p style={{ color: '#999', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{catalog.authentication.description}</p>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <code style={{ background: '#111', padding: '4px 10px', borderRadius: 4, fontSize: '0.75rem', color: '#60a5fa' }}>Header: {catalog.authentication.header}: ask_xxxxx</code>
                                <code style={{ background: '#111', padding: '4px 10px', borderRadius: 4, fontSize: '0.75rem', color: '#60a5fa' }}>Query: ?api_key=ask_xxxxx</code>
                            </div>
                        </div>

                        {/* Endpoint Categories */}
                        {catalog.categories.map(cat => (
                            <div key={cat.name} style={{ marginBottom: 16 }}>
                                <button onClick={() => setOpenCat(openCat === cat.name ? '' : cat.name)} style={{
                                    width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: '16px 20px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Zap size={18} style={{ color: '#e11d48' }} />
                                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.9rem' }}>{cat.name}</span>
                                        <span style={{ color: '#666', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>— {cat.description}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ background: '#1a1a1a', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', color: '#888' }}>{cat.endpoints.length}</span>
                                        {openCat === cat.name ? <ChevronDown size={16} color="#666" /> : <ChevronRight size={16} color="#666" />}
                                    </div>
                                </button>

                                {openCat === cat.name && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                                        {cat.endpoints.map((ep, idx) => (
                                            <div key={idx} style={{ background: '#0d0d0d', borderLeft: `3px solid ${methodColor[ep.method] || '#888'}`, borderRight: '1px solid #222', borderBottom: '1px solid #222', padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                                    <span style={{ background: methodColor[ep.method] + '22', color: methodColor[ep.method], padding: '2px 10px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{ep.method}</span>
                                                    <code style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>/v3{ep.path}</code>
                                                    <button onClick={() => tryEndpoint(ep.method, ep.path)} style={{ marginLeft: 'auto', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#888', fontSize: '0.7rem' }}>
                                                        <Play size={12} /> Try
                                                    </button>
                                                </div>
                                                <p style={{ color: '#999', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{ep.description}</p>

                                                {ep.params && ep.params.length > 0 && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Parameters</div>
                                                        <div style={{ display: 'grid', gap: 4 }}>
                                                            {ep.params.map(p => (
                                                                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                                                    <code style={{ color: '#60a5fa' }}>{p.name}</code>
                                                                    <span style={{ color: '#444' }}>:</span>
                                                                    <span style={{ color: '#fbbf24', fontSize: '0.7rem' }}>{p.type}</span>
                                                                    {p.required && <span style={{ color: '#e11d48', fontSize: '0.6rem', fontWeight: 700 }}>required</span>}
                                                                    <span style={{ color: '#666' }}>— {p.description}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {ep.body && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Body</div>
                                                        <code style={{ fontSize: '0.75rem', color: '#a78bfa', display: 'block', background: '#111', padding: '6px 10px', borderRadius: 4 }}>{ep.body}</code>
                                                    </div>
                                                )}

                                                <div style={{ marginTop: 8 }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Response</div>
                                                    <code style={{ fontSize: '0.7rem', color: '#4ade80', display: 'block', background: '#0a1a0d', padding: '6px 10px', borderRadius: 4 }}>{ep.response}</code>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        ))}

                        {/* cURL example */}
                        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: 20, marginTop: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: 700, color: '#888' }}>Quick Start</span>
                                <button onClick={() => copyToClipboard(`curl -H "X-API-Key: YOUR_KEY" "${API_BASE}/intents?chainId=8453&limit=10"`, 'curl')} style={{ background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: '0.7rem' }}>
                                    {copied === 'curl' ? <Check size={12} color="#4ade80" /> : <Copy size={12} />} Copy
                                </button>
                            </div>
                            <pre style={{ background: '#111', padding: 16, borderRadius: 6, overflow: 'auto', fontSize: '0.75rem', color: '#4ade80', fontFamily: 'JetBrains Mono, monospace' }}>
                                {`curl -H "X-API-Key: YOUR_KEY" \\
  "${API_BASE}/intents?chainId=8453&limit=10"`}
                            </pre>
                        </div>
                    </motion.div>
                )}

                {/* ════════ API KEYS TAB ════════ */}
                {tab === 'keys' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: 24, marginBottom: '2rem' }}>
                            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.95rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Key size={18} style={{ color: '#e11d48' }} /> Create API Key
                            </h3>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="My App" style={{
                                    flex: 1, background: '#111', border: '1px solid #333', borderRadius: 8, padding: '10px 16px',
                                    color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', outline: 'none',
                                }} />
                                <button onClick={createKey} style={{
                                    background: '#e11d48', border: 'none', borderRadius: 8, padding: '10px 24px',
                                    color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: 700,
                                    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>Generate</button>
                            </div>

                            {createdKey && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, background: '#0a1a0d', border: '1px solid #1a3a20', borderRadius: 8, padding: 16 }}>
                                    <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>⚠ Save this key — it won't be shown again</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <code style={{ flex: 1, background: '#111', padding: '8px 12px', borderRadius: 4, fontSize: '0.8rem', color: '#4ade80', wordBreak: 'break-all' }}>{createdKey}</code>
                                        <button onClick={() => copyToClipboard(createdKey, 'newkey')} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', color: '#888' }}>
                                            {copied === 'newkey' ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#666', marginBottom: 8 }}>Your Keys ({keys.length})</div>
                        {keys.length === 0 ? (
                            <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: 40, textAlign: 'center', color: '#444', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                                No API keys yet. Create one above to get started.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 8 }}>
                                {keys.map(k => (
                                    <div key={k.keyHash} style={{
                                        background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: '14px 20px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        opacity: k.isActive ? 1 : 0.4,
                                    }}>
                                        <div>
                                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: 600 }}>{k.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {k.keyHash.slice(0, 12)}… • {k.tier || 'free'} • {k.rateLimit} rpm
                                            </div>
                                        </div>
                                        <span style={{ color: k.isActive ? '#4ade80' : '#e11d48', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                                            {k.isActive ? 'ACTIVE' : 'REVOKED'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Usage info */}
                        <div style={{ marginTop: '2rem', background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: 20 }}>
                            <div style={{ fontSize: '0.8rem', color: '#888', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>Your User ID (for key management)</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <code style={{ flex: 1, background: '#111', padding: '8px 12px', borderRadius: 4, fontSize: '0.8rem', color: '#60a5fa' }}>{userId}</code>
                                <button onClick={() => copyToClipboard(userId, 'uid')} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px', cursor: 'pointer', color: '#888' }}>
                                    {copied === 'uid' ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ════════ PLAYGROUND TAB ════════ */}
                {tab === 'playground' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: 24 }}>
                            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.95rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Play size={18} style={{ color: '#e11d48' }} /> API Playground
                            </h3>
                            <p style={{ color: '#888', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', marginBottom: 20 }}>
                                Click "Try" on any endpoint in the API Reference tab, or test common queries below.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                                {[
                                    { label: 'List Intents', method: 'GET', path: '/intents' },
                                    { label: 'Solver Leaderboard', method: 'GET', path: '/solvers' },
                                    { label: 'Cross-Chain Flows', method: 'GET', path: '/analytics/cross-chain-flows' },
                                    { label: 'AI Insights', method: 'GET', path: '/analytics/ai-insights' },
                                    { label: 'API Catalog', method: 'GET', path: '/developer/catalog' },
                                ].map(q => (
                                    <button key={q.path} onClick={() => tryEndpoint(q.method, q.path)} style={{
                                        background: '#111', border: '1px solid #222', borderRadius: 8, padding: '14px 18px',
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ background: methodColor[q.method] + '22', color: methodColor[q.method], padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{q.method}</span>
                                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{q.label}</span>
                                        </div>
                                        <code style={{ fontSize: '0.7rem', color: '#666' }}>/v3{q.path}</code>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Response Panel */}
                        {(playResult || playLoading) && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #222' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: playLoading ? '#fbbf24' : '#4ade80' }} />
                                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#888' }}>{playEndpoint}</span>
                                    </div>
                                    {playResult && (
                                        <button onClick={() => copyToClipboard(playResult, 'resp')} style={{ background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: '0.7rem' }}>
                                            {copied === 'resp' ? <Check size={12} color="#4ade80" /> : <Copy size={12} />} Copy
                                        </button>
                                    )}
                                </div>
                                <pre style={{ padding: 20, overflow: 'auto', maxHeight: 400, fontSize: '0.75rem', color: '#4ade80', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                                    {playLoading ? 'Loading...' : playResult}
                                </pre>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </div>
        </>
    );
}
