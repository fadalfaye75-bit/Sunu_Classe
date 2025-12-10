
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid TS error about missing cwd() property on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Utilise la variable d'environnement SI elle existe, SINON utilise la clé fournie en dur.
  // Cela garantit que l'IA fonctionne après déploiement même sans config serveur.
  const apiKey = env.API_KEY || "AIzaSyA5cX0Kp2QP4nZQ_FJOb5qgxo0aP1q5E3Y";

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
    }
  };
});
