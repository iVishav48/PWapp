/* eslint-disable no-undef */
// This service worker uses Workbox with injectManifest.
// The precache manifest will be injected at build time.

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, setDefaultHandler, setCatchHandler, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

self.skipWaiting();
clientsClaim();

// Precache app shell and static assets
// self.__WB_MANIFEST is replaced by Workbox at build time
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Offline fallback for navigation requests
const offlineFallbackUrl = '/offline.html';
const navigationHandler = new NetworkFirst({
  cacheName: 'html-pages',
  networkTimeoutSeconds: 5,
});
registerRoute(new NavigationRoute(async (params) => {
  try {
    return await navigationHandler.handle(params);
  } catch (_) {
    return await caches.match(offlineFallbackUrl, { ignoreSearch: true });
  }
}));

// Runtime caching strategies

// 1) Product list: stale-while-revalidate (simulate with the home and list routes)
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/home'),
  new StaleWhileRevalidate({ cacheName: 'route-product-list' })
);

// 2) Product images: cache-first with expiration
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-products',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }) // 30 days
    ]
  })
);

// 3) Product details: network-first with fallback to cache
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && url.pathname.startsWith('/product/'),
  new NetworkFirst({ cacheName: 'route-product-details', networkTimeoutSeconds: 5 })
);

// API examples (if you later add APIs):
// Product list JSON: stale-while-revalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/products'),
  new StaleWhileRevalidate({ cacheName: 'api-products' })
);

// Product details JSON: network-first
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/product/'),
  new NetworkFirst({ cacheName: 'api-product-details', networkTimeoutSeconds: 5 })
);

// Background sync for queued actions (e.g., checkout POSTs)
const checkoutQueue = new BackgroundSyncPlugin('checkout-queue', {
  maxRetentionTime: 24 * 60, // retry for up to 24 hours
});
registerRoute(
  ({ url, request }) => request.method === 'POST' && url.pathname.startsWith('/api/checkout'),
  new NetworkFirst({
    cacheName: 'api-checkout',
    plugins: [checkoutQueue],
  }),
  'POST'
);

// Default handler for other GET requests: stale-while-revalidate
setDefaultHandler(new StaleWhileRevalidate({ cacheName: 'misc' }));

// Catch handler for failures: serve offline page for navigations
setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    return caches.match(offlineFallbackUrl, { ignoreSearch: true });
  }
  return Response.error();
});


