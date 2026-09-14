import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 관리자 API는 세션 쿠키 때문에 같은 출처로 호출한다 (운영은 nginx.conf.template 이 같은 역할)
    proxy: {
      '/api/admin': 'http://localhost:8080',
    },
  },
});
