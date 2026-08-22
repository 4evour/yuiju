"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

const SHOW_MESSAGE_TIME_KEY = "yuiju:show-message-time";
const REDUCE_MOTION_KEY = "yuiju:reduce-motion";

interface InterfacePreferences {
  showMessageTime: boolean;
  reduceMotion: boolean;
}

interface InterfacePreferencesContextValue extends InterfacePreferences {
  setShowMessageTime: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
}

const InterfacePreferencesContext = createContext<InterfacePreferencesContextValue | null>(null);

function applyPreferences(preferences: InterfacePreferences): void {
  document.documentElement.dataset.showMessageTime = String(preferences.showMessageTime);
  document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion);
}

export function InterfacePreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<InterfacePreferences>({
    showMessageTime: true,
    reduceMotion: false,
  });

  useEffect(() => {
    const storedPreferences = {
      showMessageTime: localStorage.getItem(SHOW_MESSAGE_TIME_KEY) !== "false",
      reduceMotion: localStorage.getItem(REDUCE_MOTION_KEY) === "true",
    };
    setPreferences(storedPreferences);
    applyPreferences(storedPreferences);
  }, []);

  const value = useMemo<InterfacePreferencesContextValue>(
    () => ({
      ...preferences,
      setShowMessageTime: (showMessageTime) => {
        const nextPreferences = { ...preferences, showMessageTime };
        localStorage.setItem(SHOW_MESSAGE_TIME_KEY, String(showMessageTime));
        setPreferences(nextPreferences);
        applyPreferences(nextPreferences);
      },
      setReduceMotion: (reduceMotion) => {
        const nextPreferences = { ...preferences, reduceMotion };
        localStorage.setItem(REDUCE_MOTION_KEY, String(reduceMotion));
        setPreferences(nextPreferences);
        applyPreferences(nextPreferences);
      },
    }),
    [preferences],
  );

  return (
    <InterfacePreferencesContext.Provider value={value}>
      {children}
    </InterfacePreferencesContext.Provider>
  );
}

export function useInterfacePreferences(): InterfacePreferencesContextValue {
  const preferences = useContext(InterfacePreferencesContext);
  if (!preferences) {
    throw new Error("useInterfacePreferences must be used inside InterfacePreferencesProvider");
  }
  return preferences;
}
