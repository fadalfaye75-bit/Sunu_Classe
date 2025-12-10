
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid TS error about missing cwd() property on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Configuration sécurisée : On lit la variable d'environnement injectée par Vercel ou le fichier .env
      // Si aucune clé n'est trouvée, l'IA ne fonctionnera pas (ce qui est mieux que d'exposer la clé publiquement)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "")
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // Désactivé pour la prod (plus léger)
      minify: 'esbuild', // Compilation rapide et optimisée
    }
  };
});
