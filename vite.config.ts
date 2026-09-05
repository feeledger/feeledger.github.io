import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/receiptPDF*.js', '**/html2canvas*.js', '**/purify*.js'],

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/api\//, /\/accounts\.google\.com\//],
        skipWaiting: true,
        clientsClaim: true,
      },

      manifest: {
        name: 'FeeLedger',
        short_name: 'FeeLedger',
        description: 'Fee management for tutors and coaching centres. Your data, in your Google Drive.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#F3F0EE',
        theme_color: '#141413',
        categories: ['education', 'finance', 'productivity'],
        icons: [
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Receive Payment',
            short_name: 'Payment',
            description: 'Record a new fee payment',
            url: '/app/payments',
            icons: [{ src: '/logo-192.png', sizes: '192x192' }],
          },
          {
            name: 'Members',
            short_name: 'Members',
            description: 'View your member list',
            url: '/app/students',
            icons: [{ src: '/logo-192.png', sizes: '192x192' }],
          },
        ],
      },

      devOptions: { enabled: false },
    }),
  ],

  base: '/',

  build: {
    chunkSizeWarningLimit: 600,
  },
})
