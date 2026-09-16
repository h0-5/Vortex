import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, TooltipProvider } from '@vortex/ui';

import { App } from './app.js';
import { BrandingProvider } from './components/branding-provider.js';
import { SelectedGuildProvider } from './state/selected-guild-context.js';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SelectedGuildProvider>
        <BrandingProvider>
          <TooltipProvider>
            <App />
            <Toaster />
          </TooltipProvider>
        </BrandingProvider>
      </SelectedGuildProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
