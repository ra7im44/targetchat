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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="workflow-selector">
            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-3">
                Select AI Model
            </label>
            <div className="grid grid-cols-2 gap-3">
                {workflows.map(w => (
                    <button
                        key={w.id}
                        type="button"
                        onClick={() => onSelect(w.id)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${selected === w.id
                                ? 'border-accent bg-accent/10 dark:bg-accent/20 shadow-md'
                                : 'border-gray-200 dark:border-border hover:border-accent dark:hover:border-accent bg-white dark:bg-surface'
                            }`}
                    >
                        <div className="text-3xl mb-2">{w.icon}</div>
                        <div className="font-semibold text-gray-900 dark:text-foreground">{w.name}</div>
                        <div className="text-xs text-gray-500 dark:text-muted mt-1">{w.description}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
