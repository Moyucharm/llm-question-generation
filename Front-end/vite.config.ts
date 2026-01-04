import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    // 开发环境代理配置：将/api请求转发到后端
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // 可选：重写路径（如果后端API已经包含/api前缀则不需要）
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
