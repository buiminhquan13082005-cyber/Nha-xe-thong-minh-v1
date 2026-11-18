import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Khi chạy dev (npm run dev), /api được chuyển tới API ở cổng 5080.
// Khi chạy bằng Docker, NGINX làm việc này (Buổi 8).
export default defineConfig({
  plugins: [react()],
  // '@/...' = thư mục src: import sang module khác / shared / app viết đường dẫn tuyệt đối cho dễ đọc
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/api': 'http://localhost:5080', '/hub': { target: 'http://localhost:5080', ws: true } } },
});
