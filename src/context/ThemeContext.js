import React, { createContext, useContext } from 'react';
import { useBranding } from './BrandingProvider';

const ThemeContext = createContext({});

export function ThemeProvider({ children }) {
  const branding = useBranding();
  
  const theme = {
    primary: branding.colors.primary,
    dark: branding.colors.dark,
    bg: branding.colors.bg,
    text: branding.colors.text,
    sub: branding.colors.sub,
    muted: branding.colors.muted,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
