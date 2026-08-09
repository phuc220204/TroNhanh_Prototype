import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


// figmaAssetResolver đã bị xóa: nó map 'figma:asset/*' → 'src/assets/*',
// nhưng src/assets/ không tồn tại và không file nào import 'figma:asset/'.

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    watch: {
      // Bỏ qua các thư mục tạm của trình duyệt (CDP) nằm trong project,
      // tránh Vite watcher crash với EBUSY trên file bị khóa (vd Cookies).
      ignored: ['**/.edge-cdp-tmp/**', '**/.chrome-cdp-tmp/**'],
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
