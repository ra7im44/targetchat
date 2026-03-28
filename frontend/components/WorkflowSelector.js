import { useState, useEffect } from 'react';

export default function WorkflowSelector({ selected, onSelect }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkflows();
    }, []);

    async function fetchWorkflows() {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch('http://localhost:3001/api/workflows', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setWorkflows(data);
            }
        } catch (err) {
            console.error('Error fetching workflows:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="workflow-selector">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select AI Model
            </label>
            <div className="grid grid-cols-2 gap-3">
                {workflows.map(w => (
                    <button
                        key={w.id}
                        type="button"
                        onClick={() => onSelect(w.id)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${selected === w.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                            }`}
                    >
                        <div className="text-3xl mb-2">{w.icon}</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{w.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{w.description}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
