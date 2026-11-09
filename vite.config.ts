import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Exercise the production browser policy in local previews and E2E tests.
  preview: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon*.png', 'icons/*.png'],
      manifest: {
        id: '/',
        name: 'Манчкин — Счётчик героя',
        short_name: 'Счётчик героя',
        description: 'Персональный офлайн-счётчик для настольной игры Манчкин',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#f2e4c5',
        background_color: '#f2e4c5',
        icons: [
          { src: '/icons/hero-v2-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/hero-v2-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/hero-v2-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,svg,woff2,webmanifest,txt}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
