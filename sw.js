// sw.js - Simple Offline Cache
const CACHE_NAME = 'asset-manager-v1';
const ASSETS = [
  './',
  './index.html',
  './App.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
