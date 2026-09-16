import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { appSettingsQuery } from '../hooks/app-settings.js';

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const settings = useQuery(appSettingsQuery);

  useEffect(() => {
    const general = settings.data?.general;
    const branding = settings.data?.branding;
    const pwa = settings.data?.pwa;
    if (!branding || !general) return;

    const root = document.documentElement;
    root.style.setProperty('--primary', hexToHsl(branding.primaryColor));

    document.title = document.title.replace(/^[^|]+\|?\s*/, `${general.appName} `).trim();

    const favicon = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (branding.faviconUrl) {
      if (favicon) favicon.href = branding.faviconUrl;
      else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = branding.faviconUrl;
        document.head.appendChild(link);
      }
    }

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = pwa?.themeColor ?? branding.primaryColor;

    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (pwa?.enabled) {
      if (manifest) manifest.href = '/api/v1/settings/manifest.json';
      else {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/api/v1/settings/manifest.json';
        document.head.appendChild(link);
      }
    } else if (manifest) {
      manifest.remove();
    }
  }, [settings.data?.branding, settings.data?.general, settings.data?.pwa]);

  return <>{children}</>;
}

function hexToHsl(hex: string): string {
  const sanitized = hex.replace('#', '');
  const r = Number.parseInt(sanitized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(sanitized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(sanitized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
