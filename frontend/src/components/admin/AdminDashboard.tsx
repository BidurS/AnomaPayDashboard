
import { useEffect, useState } from "react";
import { API_BASE_url } from "../../lib/api";
import { Plus, Trash2, Edit2, X } from "lucide-react";

interface AdminChain {
    id: number;
    name: string;
    rpc_url: string;
    contract_address: string;
    start_block: number;
    explorer_url: string;
    icon: string;
    is_enabled: number;
}

export function AdminDashboard() {
    const [chains, setChains] = useState<AdminChain[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChain, setEditingChain] = useState<AdminChain | null>(null);
    const [formData, setFormData] = useState<Partial<AdminChain>>({});

    useEffect(() => {
        fetchChains();
    }, []);

    const fetchChains = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_url}/api/admin/chains`, {
                headers: { "X-Admin-Key": sessionStorage.getItem("adminKey") || "" },
            });
            if (res.ok) setChains(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const headers = {
            "Content-Type": "application/json",
            "X-Admin-Key": sessionStorage.getItem("adminKey") || "",
        };

        try {
            if (editingChain) {
                await fetch(`${API_BASE_url}/api/admin/chains/${editingChain.id}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(formData),
                });
            } else {
                await fetch(`${API_BASE_url}/api/admin/chains`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(formData),
                });
            }
            setIsModalOpen(false);
            setEditingChain(null);
            setFormData({});
            fetchChains();
        } catch (e) {
            alert("Operation failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? This will delete the chain configuration.")) return;
        try {
            await fetch(`${API_BASE_url}/api/admin/chains/${id}`, {
                method: "DELETE",
                headers: { "X-Admin-Key": sessionStorage.getItem("adminKey") || "" },
            });
            fetchChains();
        } catch (e) {
            alert("Delete failed");
        }
    };

    const openEdit = (chain: AdminChain) => {
        setEditingChain(chain);
        setFormData(chain);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingChain(null);
        setFormData({
            name: "",
            rpc_url: "",
            contract_address: "",
            start_block: 0,
            explorer_url: "",
            icon: "",
            is_enabled: 1
        });
        setIsModalOpen(true);
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">Chain Management</h2>
                <button
                    onClick={openAdd}
                    className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800"
                >
                    <Plus size={18} /> Add Chain
                </button>
            </div>

            {loading ? (
                <div>Loading chains...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RPC URL</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {chains.map((chain) => (
                                <tr key={chain.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{chain.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img src={chain.icon} alt="" className="h-6 w-6 rounded-full mr-2" />
                                            <span className="text-sm font-medium text-gray-900">{chain.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate" title={chain.rpc_url}>
                                        {chain.rpc_url}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {chain.contract_address.substring(0, 10)}...
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${chain.is_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {chain.is_enabled ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openEdit(chain)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(chain.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingChain ? 'Edit Chain' : 'Add New Chain'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contract Address</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.contract_address || ''}
                                        onChange={(e) => setFormData({ ...formData, contract_address: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm border p-2"
                                        placeholder="0x..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">RPC URL</label>
                                <input
                                    type="url"
                                    required
                                    value={formData.rpc_url || ''}
                                    onChange={(e) => setFormData({ ...formData, rpc_url: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm border p-2"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Block</label>
                                    <input
                                        type="number"
                                        value={formData.start_block || 0}
                                        onChange={(e) => setFormData({ ...formData, start_block: parseInt(e.target.value) })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        value={formData.is_enabled}
                                        onChange={(e) => setFormData({ ...formData, is_enabled: parseInt(e.target.value) })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm border p-2"
                                    >
                                        <option value={1}>Active</option>
                                        <option value={0}>Disabled</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Explorer URL</label>
                                <input
                                    type="url"
                                    value={formData.explorer_url || ''}
                                    onChange={(e) => setFormData({ ...formData, explorer_url: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm border p-2"
                                    placeholder="https://basescan.org"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Icon URL</label>
                                <input
                                    type="url"
                                    value={formData.icon || ''}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm border p-2"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-black py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                                >
                                    {editingChain ? 'Save Changes' : 'Add Chain'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
