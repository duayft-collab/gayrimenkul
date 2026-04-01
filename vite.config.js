import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Gayrimenkul/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_VERSION__: JSON.stringify('v' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '.' + new Date().toISOString().slice(11,16).replace(':','')),
  }
})
