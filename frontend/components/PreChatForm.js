import { useState } from 'react';

export default function PreChatForm({ widgetId, formFields, welcomeMessage, onSubmit }) {
    // Default fields if none provided
    const defaultFields = [
        { id: 'name', label: 'Name', type: 'text', required: true },
        { id: 'email', label: 'Email', type: 'email', required: false },
        { id: 'phone', label: 'Phone', type: 'tel', required: false },
        { id: 'company', label: 'Company', type: 'text', required: false },
        { id: 'message', label: 'How can we help?', type: 'textarea', required: false }
    ];

    const fieldsToRender = (formFields && formFields.length > 0) ? formFields : defaultFields;

    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    async function handleSubmit(e) {
        e.preventDefault();

        // Basic validation
        for (const field of fieldsToRender) {
            if (field.required && !formData[field.label]) {
                alert(`Please enter your ${field.label}`);
                return;
            }
        }

        setLoading(true);
        try {
            // Map standard fields for backend compatibility
            const standardData = {
                name: formData['Name'] || formData['name'] || 'Visitor',
                email: formData['Email'] || formData['email'],
                phone: formData['Phone'] || formData['phone'],
                company: formData['Company'] || formData['company'],
                custom_field: formData['Message'] || formData['message'] || formData['How can we help?']
            };

            const res = await fetch(`${API}/api/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    widget_id: widgetId,
                    ...standardData,
                    custom_data: formData // Save all form data as custom_data
                })
            });

            if (res.ok) {
                const lead = await res.json();
                onSubmit(lead);
            } else {
                alert('Failed to submit form');
            }
        } catch (err) {
            console.error('Error submitting form:', err);
            alert('Error submitting form');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm mx-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                👋 Welcome!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {welcomeMessage || "Please fill out this form to start chatting."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
                {fieldsToRender.map((field, index) => (
                    <div key={index}>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {field.label} {field.required && '*'}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea
                                required={field.required}
                                value={formData[field.label] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder={field.label}
                            />
                        ) : (
                            <input
                                type={field.type === 'phone' ? 'tel' : field.type}
                                required={field.required}
                                value={formData[field.label] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder={field.label}
                            />
                        )}
                    </div>
                ))}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                    {loading ? 'Starting...' : 'Start Chat'}
                </button>
            </form>
        </div>
    );
}
