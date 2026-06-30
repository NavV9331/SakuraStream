import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'add-download-header',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.endsWith('.exe')) {
            const filename = req.url.split('/').pop();
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          }
          next();
        });
      }
    }
  ],
  
  // Use relative paths so the build works in Electron (file://) and Capacitor
  base: './',
  
  server: {
    open: true,
    // Allow access from Capacitor live reload on same network
    host: true,
  },
  
  build: {
    // Ensure output works in Electron's file:// protocol
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('hls.js') || id.includes('plyr')) {
              return 'player-vendor';
            }
            if (id.includes('react')) {
              return 'react-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
