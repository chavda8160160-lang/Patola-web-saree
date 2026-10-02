/* ====================================================================================================
 * File Name: vite.config.js
 * Folder: frontend/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Vite build tool configuration.
 * Configures reverse proxy for '/api' calls towards the .NET Core backend (http://localhost:5285).
 * Allows seamless API communication from React Dev Server (http://localhost:5173) without CORS issues.
 * ==================================================================================================== */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5285',
        changeOrigin: true,
        secure: false
      },
      '/assets/images/custom-bookings': {
        target: 'http://localhost:5285',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:5285',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5285',
        changeOrigin: true,
        secure: false
      },
      '/assets/images/custom-bookings': {
        target: 'http://localhost:5285',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:5285',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    sourcemap: false, // Prevents original JSX and source code from being visible in DevTools Sources
    minify: 'esbuild', // Minifies and obfuscates JavaScript into unreadable single-line code
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
