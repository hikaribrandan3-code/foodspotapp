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
          // Keep html5-qrcode separate (large, only needed on inventory pages)
          'vendor-qrcode': ['html5-qrcode'],
          // Force React into its own chunk so it never gets trapped inside
          // a cross-entry shared chunk like InventoryEntry.
          'vendor-react': ['react', 'react-dom'],
          // Same for framer-motion — prevents TDZ crashes when chunks
          // loaded by multiple entry points initialize out of order.
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // Use esbuild minify instead of terser to avoid TDZ/circular-init
    // crashes like "Cannot access 'X' before initialization" when chunks
    // are split across multiple entry points (staff-ops + main app).
    minify: 'esbuild',
  },
})
