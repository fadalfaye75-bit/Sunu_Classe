import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid TS error about missing cwd() property on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Permet de garder la compatibilité avec votre code existant (process.env.API_KEY)
      // Utilise la clé fournie si aucune variable d'environnement n'est définie
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "AIzaSyA5cX0Kp2QP4nZQ_FJOb5qgxo0aP1q5E3Y")
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // Désactivé pour la prod (plus léger)
      minify: 'esbuild', // Compilation rapide et optimisée
    }
  };
});