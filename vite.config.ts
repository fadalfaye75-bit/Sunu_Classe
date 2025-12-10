
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Injection sécurisée de la clé API pour l'IA
    // La valeur par défaut assure le fonctionnement même si .env est manquant sur le serveur de build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "AIzaSyA5cX0Kp2QP4nZQ_FJOb5qgxo0aP1q5E3Y")
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  }
});
