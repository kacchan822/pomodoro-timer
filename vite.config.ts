import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,   // コンテナ外（ホスト Windows）からのアクセスを許可
    port: 5173,
  },
  test: {
    environment: 'jsdom',
  },
})
