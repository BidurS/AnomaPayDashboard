
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_url } from "../../lib/api";

export function AdminLogin() {
    const [key, setKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_url}/api/admin/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Key": key,
                },
            });

            if (res.ok) {
                sessionStorage.setItem("adminKey", key);
                navigate("/admin/dashboard");
            } else {
                setError("Invalid Admin Key");
            }
        } catch (err) {
            setError("Connection failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">Admin Access</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cloudflare Secret (Admin Key)
                        </label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="Enter admin key..."
                            required
                        />
                    </div>
                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50"
                    >
                        {loading ? "Verifying..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}
