import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();
/* Only two themes are implemented and reachable. A third `professional` entry
   previously existed here but had no CSS rules in styles/globals.css and no
   UI entry point (the "Professional" option on /chat is an AI persona, not a
   theme), so it silently resolved to Dark. Kept out until it is really built. */
const THEMES = ['light', 'dark'];

function readSavedTheme() {
    try {
        const savedTheme = localStorage.getItem('tc_theme') || localStorage.getItem('theme');
        return THEMES.includes(savedTheme) ? savedTheme : 'light';
    } catch (e) {
        return 'light';
    }
}

function applyTheme(nextTheme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const isDark = nextTheme !== 'light';
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';

    try {
        localStorage.setItem('tc_theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
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
