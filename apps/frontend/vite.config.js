import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // The Nginx location block for this deployment does
  //   alias /mnt/insighted-dpa/dist/;  (serving this build's output)
  //   try_files $uri $uri/ /insighted-dpa/index.html;
  // under the /insighted-dpa/ path, so the built index.html's asset URLs must
  // be prefixed with /insighted-dpa/ or the browser requests them from the
  // domain root instead (where they don't exist). Read from VITE_BASE_PATH
  // (injected by the deploy script's subprocess environment, not hardcoded
  // here) so this config stays reusable if the subpath ever changes, and only
  // applied for `vite build` — local `vite dev` still serves from root.
  base: command === 'build' ? (process.env.VITE_BASE_PATH || '/insighted-dpa/') : '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
}));
