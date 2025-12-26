import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173,
    // 允许 Cloudflare Tunnel 域名访问
    allowedHosts: [
      '.trycloudflare.com', // 允许所有 trycloudflare.com 子域名
      'localhost',
      '127.0.0.1'
    ],
    // 配置 HMR (Hot Module Replacement) WebSocket 连接
    // 通过 Cloudflare Tunnel 访问时，HMR 需要连接到 Cloudflare 的域名
    hmr: process.env.VITE_HMR_HOST ? {
      // 如果设置了环境变量 VITE_HMR_HOST，使用它
      host: process.env.VITE_HMR_HOST,
      protocol: 'wss',
      clientPort: 443,
    } : {
      // 否则使用默认配置（本地开发）
      protocol: 'ws',
    },
  },
})
