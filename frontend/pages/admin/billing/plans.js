import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminPlansPage() {
    const router = useRouter();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            const res = await fetch(`${API}/api/admin/billing/plans`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPlans(data.plans || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function togglePlanStatus(planId, currentStatus) {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/billing/plans/${planId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !currentStatus })
            });

            if (res.ok) {
                fetchPlans(); // Refresh list
            }
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage active plans and pricing visibility</p>
                    </div>
                    <Link
                        href="/admin/billing"
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:opacity-80 transition-colors text-black dark:text-white"
                    >
                        ← Back to Billing
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="glass-panel p-6 rounded-2xl h-64 animate-pulse bg-gray-100 dark:bg-gray-800"></div>
                        ))
                    ) : (
                        plans.map(plan => (
                            <div key={plan.id} className={`glass-panel p-6 rounded-2xl border-2 transition-all ${plan.isActive ? 'border-transparent' : 'border-gray-200 dark:border-gray-700 opacity-75'
                                }`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${plan.isActive
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                        ${plan.priceMonthly}</span
                                    ><span className="text-gray-500">/mo</span>
                                </div>

                                <div className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-300">
                                    <p>Trial: {plan.trialDays} days</p>
                                    <p>Chats: {plan.maxChats === -1 ? 'Unlimited' : plan.maxChats}</p>
                                    <p>Messages: {plan.maxMessagesPerMonth === -1 ? 'Unlimited' : plan.maxMessagesPerMonth}/mo</p>
                                </div>

                                <div className="pt-4 border-t border-gray-200/20">
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={plan.isActive}
                                                onChange={() => togglePlanStatus(plan.id, plan.isActive)}
                                            />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${plan.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                                }`}></div>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${plan.isActive ? 'translate-x-4' : ''
                                                }`}></div>
                                        </div>
                                        <div className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {plan.isActive ? 'Visible to Users' : 'Hidden'}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
