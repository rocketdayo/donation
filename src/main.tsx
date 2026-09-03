import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Render React root immediately to ensure preview displays reliably
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Background PWA service worker registration (guarded for preview iframes)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Only attempt service worker registration in top-level standalone window
  const isIframe = window.self !== window.top;
  if (!isIframe) {
    try {
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          try {
            registerSW({
              immediate: false,
              onNeedRefresh() {
                console.info('PWA update available');
              },
              onOfflineReady() {
                console.info('PWA ready offline');
              },
            });
          } catch (e) {
            console.info('Service worker registration ignored:', e);
          }
        })
        .catch(() => {
          // Dev virtual module not active, safe to ignore
        });
    } catch {
      // Ignore preview container restriction
    }
  }
}


