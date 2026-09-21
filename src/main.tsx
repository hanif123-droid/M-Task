import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const originalError = console.error;
console.error = function(...args) {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('two children with the same key')) {
    if (args[1] === '') {
      return; // Suppress empty string false positive duplicate key warning
    }
    originalError.apply(console, args);
    originalError('DUPLICATE KEY FOUND! Key is:', JSON.stringify(args[1]));
    originalError('COMPONENT STACK:', args[2] || args[3] || 'No stack provided in args');
  } else {
    originalError.apply(console, args);
  }
};

window.addEventListener('error', e => {
  if (e.message === 'ResizeObserver loop limit exceeded' || e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    const resizeObserverErrDiv = document.getElementById(
      'webpack-dev-server-client-overlay-div'
    );
    const resizeObserverErr = document.getElementById(
      'webpack-dev-server-client-overlay'
    );
    if (resizeObserverErr) {
      resizeObserverErr.setAttribute('style', 'display: none');
    }
    if (resizeObserverErrDiv) {
      resizeObserverErrDiv.setAttribute('style', 'display: none');
    }
    // Just stop propagation
    e.stopImmediatePropagation();
  }
});

// Unregister PWA Service Worker in preview environment to prevent stale cached white screens
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch((err) => {
    console.warn('Failed to unregister service worker:', err);
  });
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
