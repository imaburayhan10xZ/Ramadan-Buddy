import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Property 'cwd' does not exist on type 'Process'. Cast process to any.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // User provided API Key fallback
  const HARDCODED_KEY = "AIzaSyAcIN-_ngGo5D1Y9kQu-Lk-4WZjJ4W-t7s";

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY works in the browser code
      // We prioritize ENV variables, but fall back to the provided key if missing
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || HARDCODED_KEY)
    }
  };
});