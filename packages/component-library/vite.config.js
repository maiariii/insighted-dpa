import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.js',
      name: 'InsightedUI',
      fileName: (format) => `insighted-ui.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // Exclude all peer deps from the bundle
      external: ['react', 'react-dom', 'chart.js', 'react-chartjs-2', 'lucide-react'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
