
import { useEffect, useState, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle";

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
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
            {authorized && (
                <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 px-6 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Gnoma Admin</h1>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={() => {
                                sessionStorage.removeItem("adminKey");
                                navigate("/admin/login");
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                        >
                            Logout
                        </button>
                    </div>
                </header>
            )}
            <main className="flex-1 p-6">
                <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[40vh]">
                        <div className="w-6 h-6 border-4 border-gray-200 dark:border-zinc-700 border-t-black dark:border-t-white rounded-full animate-spin" />
                    </div>
                }>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
}
