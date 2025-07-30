import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the AJAX frontend.  The root is set to the
// `frontend` directory so that index.html and module resolution work
// correctly when running `vite` from the project root.
export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the Flask backend running on port 8000
      '/mode': 'http://localhost:8000',
      '/loganin': 'http://localhost:8000',
      '/loganout': 'http://localhost:8000',
      '/agents': 'http://localhost:8000',
      '/projects': 'http://localhost:8000',
      '/tasks': 'http://localhost:8000',
      '/connect_platform': 'http://localhost:8000'
    }
  },
});