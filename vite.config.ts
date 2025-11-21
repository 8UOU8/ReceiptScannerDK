import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Replace 'ReceiptScannerDK' with your actual GitHub Repository name if it's different.
  // For example, if your repo is 'my-scanner', change this to '/my-scanner/'
  // base: '/ReceiptScannerDK/', 
  // When using a Custom Domain (e.g. receipt-scanner.com), the base must be '/'
  base: '/', 
  build: {
    outDir: 'dist',
  }
})