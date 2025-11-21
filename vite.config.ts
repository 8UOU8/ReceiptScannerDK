import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/dk-receipt-scanner/', // REPLACE THIS with your GitHub repo name, e.g. '/receipt-scanner/'
})