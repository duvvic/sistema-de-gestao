import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // O plugin do Cloudflare só é carregado localmente (modo preview/wrangler).
  // No build do Cloudflare Pages (CI) ele não está disponível, então ignoramos.
  const extraPlugins: any[] = [];
  if (mode === 'preview' || mode === 'worker') {
    try {
      const { cloudflare } = await import('@cloudflare/vite-plugin');
      extraPlugins.push(cloudflare());
    } catch {
      // pacote não disponível no ambiente de CI — ignorar
    }
  }

  return {
    server: {
      host: '0.0.0.0',
      port: 5173,
      historyApiFallback: true,
      hmr: { overlay: true },
      watch: { usePolling: true },
    },
    plugins: [react(), tailwindcss(), ...extraPlugins],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    }
  };
});