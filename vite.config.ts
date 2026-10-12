import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // Railway builds with NODE_ENV=production, which would load React's production build
    // (no `act`) and break component tests.
    env: { NODE_ENV: 'test' },
  },
})
