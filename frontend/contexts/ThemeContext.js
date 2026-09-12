import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();
const THEMES = ['light', 'dark', 'professional'];

function readSavedTheme() {
    try {
        const savedTheme = localStorage.getItem('tc_theme');
        return THEMES.includes(savedTheme) ? savedTheme : 'light';
    } catch (e) {
        return 'light';
    }
}

function applyTheme(nextTheme) {
    const root = document.documentElement;
    root.classList.toggle('dark', nextTheme !== 'light');
    root.classList.toggle('professional', nextTheme === 'professional');
    root.style.colorScheme = nextTheme === 'light' ? 'light' : 'dark';

    try {
        localStorage.setItem('tc_theme', nextTheme);
    } catch (e) {
        // Storage may be unavailable; theme still applies for this session.
    }
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState('light');

    // Load the persisted theme after mount, then keep <html> in sync.
    useEffect(() => {
        const savedTheme = readSavedTheme();
        setThemeState(savedTheme);
        applyTheme(savedTheme);
    }, []);

    const setTheme = (nextTheme) => {
        if (!THEMES.includes(nextTheme)) return;
        setThemeState(nextTheme);
        applyTheme(nextTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, isDark: theme !== 'light', setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
