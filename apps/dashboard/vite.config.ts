import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type ViteDevServer } from 'vite';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

export default defineConfig(() => {
  const apiInternalPort = Number(process.env.API_INTERNAL_PORT || process.env.API_PORT || 4000);
  const vitePort = Number(process.env.PORT) || getDashboardPort(process.env.DASHBOARD_URL);
  const allowedHosts = getAllowedHosts(process.env.DASHBOARD_URL);

  const isLocalDev = !allowedHosts || allowedHosts === true;
  const plugins = [tailwindcss()];
  if (isLocalDev) {
    plugins.unshift(react());
  }

  const root = process.cwd();
  const indexPath = join(root, 'index.html');
  const indexHtml = readFileSync(indexPath, 'utf-8');

  return {
    plugins,
    server: {
      port: vitePort,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiInternalPort}`,
          changeOrigin: true,
        },
      },
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url) return next();
        if (req.url.startsWith('/api')) return next();
        const ext = extname(req.url);
        if (ext && ext !== '.html') return next();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(indexHtml);
      });
    },
    build: {
      target: 'es2022',
      sourcemap: true,
    },
  };
});

function getAllowedHosts(dashboardUrl: string | undefined): string[] | true {
  if (!dashboardUrl) {
    return true;
  }

  try {
    const url = new URL(dashboardUrl);
    const host = url.hostname;

    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }

    return [host, `.${host}`];
  } catch {
    return true;
  }
}

function getDashboardPort(dashboardUrl: string | undefined): number {
  if (!dashboardUrl) {
    return 5173;
  }

  try {
    const url = new URL(dashboardUrl);
    if (url.port) {
      return Number(url.port);
    }
    return url.protocol === 'https:' ? 443 : 80;
  } catch {
    return 5173;
  }
}
