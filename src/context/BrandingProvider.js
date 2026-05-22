import React, { createContext, useContext } from 'react';

const BRANDS = {
  myhostkit: {
    slug: 'myhostkit',
    name: 'MyHostKit',
    colors: {
      primary: '#C8965A',
      dark: '#141414',
      bg: '#FAFAF8',
      text: '#141414',
      sub: '#6B6B6B',
      muted: '#9B9B9B',
    },
  },
  keyla: {
    slug: 'keyla',
    name: 'Keyla',
    colors: {
      primary: '#B89B7A',
      dark: '#1C1B1A',
      bg: '#F4F1EC',
      text: '#1C1B1A',
      sub: '#5E5A55',
      muted: '#9E9890',
    },
  },
};

const BrandingContext = createContext(BRANDS.myhostkit);

export function BrandingProvider({ children, brandSlug = 'myhostkit' }) {
  const branding = BRANDS[brandSlug] || BRANDS.myhostkit;
  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

export { BRANDS };
