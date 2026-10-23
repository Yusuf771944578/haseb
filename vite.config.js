import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages يخدم المشروع على المسار /haseb/
// نطبّق base في بناء الإنتاج فقط، ليبقى الخادم المحلي على الجذر
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/haseb/' : '/',
  server: {
    port: 5173,
    open: true,
  },
}))
