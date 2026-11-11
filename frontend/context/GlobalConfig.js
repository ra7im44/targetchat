import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../utils/apiConfig';

const GlobalConfigContext = createContext();

export const useGlobalConfig = () => useContext(GlobalConfigContext);

function hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
    if (!match) return null;
    return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function shift(rgb, amount) {
    return rgb.map((channel) => Math.max(0, Math.min(255, Math.round(channel + amount))));
}

/**
 * Apply the admin-configured brand colour to the CSS variables the whole
 * interface already uses. Without this the "Theme Primary Colour" setting
 * would persist but change nothing.
 */
function applyBrandColor(hex) {
    if (typeof document === 'undefined') return;
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const root = document.documentElement.style;
    root.setProperty('--primary', `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`);
    root.setProperty('--primary-hover', `#${shift(rgb, -12).map(c => c.toString(16).padStart(2, '0')).join('')}`);
    root.setProperty('--primary-active', `#${shift(rgb, -24).map(c => c.toString(16).padStart(2, '0')).join('')}`);
    root.setProperty('--primary-rgb', rgb.join(' '));
    root.setProperty('--primary-hover-rgb', shift(rgb, -12).join(' '));
    root.setProperty('--primary-active-rgb', shift(rgb, -24).join(' '));
}

export const GlobalConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({
        appName: 'TargetChat',
        logoUrl: '/logo.svg', // Default
        brandColor: '#5B5BD6',
        supportEmail: 'support@targetchat.com',
        appUrl: '',
        allowRegistration: true,
        paymentsEnabled: true,
        maintenanceMode: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            // Public, allowlisted endpoint: never contains secrets.
            const res = await fetch(`${API_URL}/api/settings/public`);
            if (res.ok) {
                const data = await res.json();
                const brandColor = data.theme_primary_color || '#5B5BD6';
                applyBrandColor(brandColor);
                setConfig(prev => ({
                    ...prev,
                    appName: data.app_name || prev.appName,
                    logoUrl: data.logo_url || prev.logoUrl,
                    brandColor,
                    supportEmail: data.support_email || prev.supportEmail,
                    appUrl: data.app_url || prev.appUrl,
                    allowRegistration: data.allow_registration !== 'false',
                    paymentsEnabled: data.payments_enabled !== 'false',
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
