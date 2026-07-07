import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { SettingsService } from '@/services/SettingsService';

import { DEFAULT_SETTINGS, type AppSettings, type MapSettings, type NotificationSettings } from './types';

interface SettingsContextValue {
  settings: AppSettings;
  setNotification: (key: keyof NotificationSettings, value: boolean) => void;
  setMapSetting: <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Fournisseur des réglages applicatifs (notifications, carte). Hydrate depuis le stockage puis
 * persiste chaque changement. La LOGIQUE vit ici ; l'UI (écran Paramètres) ne fait que lire/écrire
 * via `useSettings()`. Ajouter un réglage = étendre `types.ts` + poser une ligne dans l'écran.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  // Évite de ré-écrire le stockage lors de l'hydratation initiale.
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    void SettingsService.load().then((loaded) => {
      if (!active) return;
      hydrated.current = true;
      setSettings(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated.current) void SettingsService.save(settings);
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setNotification: (key, val) =>
        setSettings((s) => ({ ...s, notifications: { ...s.notifications, [key]: val } })),
      setMapSetting: (key, val) => setSettings((s) => ({ ...s, map: { ...s.map, [key]: val } })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings doit être utilisé dans <SettingsProvider>.');
  return ctx;
}
