/**
 * Helper: Simple JSON-RPC Request
 */
export async function rpcRequest(url: string, method: string, params: any[]) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    });
    const j: any = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
}
