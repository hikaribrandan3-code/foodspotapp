import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Used by staff-ops TypeScript files (@/components, @/hooks, etc.)
      '@': path.resolve(__dirname, './src/staff-ops'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'staff-ops': path.resolve(__dirname, 'staff-ops.html'),
      },
      output: {
        manualChunks: {
          'html5-qrcode': ['html5-qrcode'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
