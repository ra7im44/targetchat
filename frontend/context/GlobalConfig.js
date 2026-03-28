import React, { createContext, useContext, useState, useEffect } from 'react';

const GlobalConfigContext = createContext();

export const useGlobalConfig = () => useContext(GlobalConfigContext);

export const GlobalConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({
        appName: 'TargetChat',
        logoUrl: '/logo.svg', // Default
        brandColor: '#4f46e5', // Default Indigo
        paymentsEnabled: true,
        maintenanceMode: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            // Note: This endpoint must be PUBLIC or handle unauthenticated requests safely
            // Use /api/settings/public if available, or just fetch known safe keys
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/settings/public`);
            if (res.ok) {
                const data = await res.json();
                setConfig(prev => ({
                    ...prev,
                    appName: data.app_name || prev.appName,
                    logoUrl: data.logo_url || prev.logoUrl,
                    brandColor: data.brand_color || prev.brandColor,
                    paymentsEnabled: data.payments_enabled !== 'false', // Default true
                    maintenanceMode: data.maintenance_mode === 'true'
                }));
            }
        } catch (error) {
            console.error('Failed to load global config:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlobalConfigContext.Provider value={{ ...config, loading, refreshConfig: fetchSettings }}>
            {children}
        </GlobalConfigContext.Provider>
    );
};
