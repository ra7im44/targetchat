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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="workflow-selector">
            <label className="block text-sm font-medium text-secondary mb-3">
                Select AI Model
            </label>
            <div className="grid grid-cols-2 gap-3">
                {workflows.map(w => (
                    <button
                        key={w.id}
                        type="button"
                        onClick={() => onSelect(w.id)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${selected === w.id
                                ? 'border-primary bg-primary-soft shadow-xs'
                                : 'border-border hover:border-primary/50 bg-surface'
                            }`}
                    >
                        <div className="text-3xl mb-2">{w.icon}</div>
                        <div className="font-semibold text-foreground">{w.name}</div>
                        <div className="text-xs text-muted mt-1">{w.description}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
