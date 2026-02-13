
import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const key = sessionStorage.getItem("adminKey");
        if (!key) {
            if (location.pathname !== "/admin/login") {
                navigate("/admin/login");
            }
        } else {
            setAuthorized(true);
            if (location.pathname === "/admin/login" || location.pathname === "/admin") {
                navigate("/admin/dashboard");
            }
        }
    }, [navigate, location]);

    if (!authorized && location.pathname !== "/admin/login") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {authorized && (
                <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900">Gnoma Admin</h1>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem("adminKey");
                            navigate("/admin/login");
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                    >
                        Logout
                    </button>
                </header>
            )}
            <main className="flex-1 p-6">
                <Outlet />
            </main>
        </div>
    );
}
