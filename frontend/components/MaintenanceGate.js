import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AlertTriangle } from 'lucide-react';
import { useGlobalConfig } from '../context/GlobalConfig';
import { API_URL } from '../utils/apiConfig';

/**
 * Renders a real maintenance screen when the admin enables maintenance mode.
 * The backend already returns 503 for non-admin API traffic; without this the
 * public UI would still paint normally and the setting would look inert.
 *
 * Admin routes and the login page stay reachable so an administrator can turn
 * maintenance mode back off.
 */
export default function MaintenanceGate({ children }) {
    const { maintenanceMode, loading, supportEmail, appName } = useGlobalConfig();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkedAdmin, setCheckedAdmin] = useState(false);

    const path = router.pathname || '';
    const alwaysAllowed = path.startsWith('/admin') || path === '/login';

    useEffect(() => {
        let cancelled = false;
        if (!maintenanceMode || alwaysAllowed) {
            setCheckedAdmin(true);
            return () => { cancelled = true; };
        }
        const token = typeof window !== 'undefined' ? localStorage.getItem('tc_token') : null;
        if (!token) {
            setCheckedAdmin(true);
            return () => { cancelled = true; };
        }
        fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled) return;
                const role = data && data.user && data.user.role;
                setIsAdmin(role === 'admin' || role === 'superadmin');
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setCheckedAdmin(true); });
        return () => { cancelled = true; };
    }, [maintenanceMode, alwaysAllowed]);

    if (loading) return children;
    if (!maintenanceMode || alwaysAllowed || isAdmin) return children;
    if (!checkedAdmin) return null;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center bg-surface border border-border rounded-card p-10 shadow-sm">
                <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-warning-soft text-warning-ink flex items-center justify-center">
                    <AlertTriangle size={26} />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">Scheduled maintenance</h1>
                <p className="text-sm text-muted leading-relaxed">
                    {appName} is temporarily unavailable while we perform maintenance.
                    Please try again shortly.
                </p>
                {supportEmail && (
                    <p className="text-xs text-muted mt-3">
                        Need help? Contact <a className="text-primary-active hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
                    </p>
                )}
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-6 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg"
                >
                    Retry
                </button>
            </div>
        </div>
    );
}
