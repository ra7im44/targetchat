import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';
import React, { useState, createContext } from 'react';
import { GlobalConfigProvider } from '../context/GlobalConfig';
import en from '../public/locales/en.json';
import ar from '../public/locales/ar.json';

export const LocaleContext = createContext({ t: en, locale: 'en', setLocale: () => { } });

function MyApp({ Component, pageProps }) {
  const [locale, setLocale] = useState('en');
  const t = locale === 'ar' ? ar : en;
  return (
    <GlobalConfigProvider>
      <LocaleContext.Provider value={{ t, locale, setLocale }}>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <Component {...pageProps} />
      </LocaleContext.Provider>
    </GlobalConfigProvider>
  );
}

export default MyApp;
