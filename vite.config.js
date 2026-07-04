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
        'siteengine-preview': path.resolve(__dirname, 'siteengine-preview.html'),
      },
      output: {
        manualChunks: {
          // Force React into its own chunk so it never gets trapped inside
          // a cross-entry shared chunk like InventoryEntry.
          'vendor-react': ['react', 'react-dom'],
          // Same for framer-motion — prevents TDZ crashes when chunks
          // loaded by multiple entry points initialize out of order.
          'vendor-motion': ['framer-motion'],
          // Keep html5-qrcode separate (large, only needed on inventory pages)
          'vendor-qrcode': ['html5-qrcode'],
          // canvas-confetti is only loaded when a customer reaches the event ticket screen
          'vendor-confetti': ['canvas-confetti'],
          // qrcode.react is only needed on the /session route
          'vendor-qrcode-react': ['qrcode.react'],
          // html2canvas + jsPDF only needed for event ticket PDF export
          'vendor-pdf': ['html2canvas', 'jspdf'],
        },
      },
    },
    // Use esbuild minify instead of terser to avoid TDZ/circular-init
    // crashes like "Cannot access 'X' before initialization" when chunks
    // are split across multiple entry points (staff-ops + main app).
    minify: 'esbuild',
  },
})
