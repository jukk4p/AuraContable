
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { locales, defaultLocale, type Locale } from './locales';
import { setCookie, getCookie } from 'cookies-next';
import { useSession } from "next-auth/react";
import { getCompanyProfile } from '@/actions/company';
import type { CompanyProfile } from '../types';

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

function getNestedValue(obj: any, key: string): string {
  return key.split('.').reduce((acc, part) => acc && acc[part], obj) || key;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  // Solo el id: `session.user` es un objeto nuevo en cada render, así que usarlo
  // como dependencia reejecutaba el efecto sin parar.
  const userId = session?.user?.id;
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Estable entre renders: si se recreara, `value` cambiaría de identidad en
  // cada render y arrastraría a todos los consumidores del contexto.
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setCookie('locale', newLocale, { maxAge: 60 * 60 * 24 * 365 });
    document.documentElement.lang = newLocale;
  }, []);

  /**
   * Este proveedor envuelve toda la aplicación, así que un efecto que se
   * reejecute aquí golpea al servidor en bucle. La cadena era:
   * pedir perfil → setCompanyProfile (objeto nuevo) → render → `user` cambia de
   * identidad → el efecto vuelve a dispararse → sin fin.
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchProfileAndSetLocale() {
        if (userId) {
            try {
                const profile = await getCompanyProfile();
                if (cancelled) return;
                setCompanyProfile(profile);
                if (profile?.language && profile.language in locales) {
                    setLocale(profile.language as Locale);
                    return;
                }
            } catch (error) {
                if (cancelled) return;
                console.error("Error cargando el idioma del perfil:", error);
            }
        }

        if (cancelled) return;

        const cookieLocale = getCookie('locale');
        if (cookieLocale && locales[cookieLocale as Locale]) {
            setLocale(cookieLocale as Locale);
            return;
        }

        const browserLang = navigator.language.split('-')[0] as Locale;
        if (locales[browserLang]) {
          setLocale(browserLang);
        }
    }

    fetchProfileAndSetLocale();
    return () => { cancelled = true; };
  }, [userId, setLocale]);

  const t = useCallback((key: string): string => {
    const translations = locales[locale] || locales[defaultLocale];
    return getNestedValue(translations, key);
  }, [locale]);
  
  const formatCurrency = useMemo(() => {
    const currency = companyProfile?.currency || 'EUR';
    const numberFormat = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    });
    return (amount: number) => numberFormat.format(amount);
  }, [locale, companyProfile]);


  const value = useMemo(() => ({ locale, setLocale, t, formatCurrency }), [locale, setLocale, t, formatCurrency]);

  useEffect(() => {
    if (locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);


  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
