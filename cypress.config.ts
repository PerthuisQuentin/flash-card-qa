import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // Vite dev server (`npm run dev`), started separately before running Cypress.
    baseUrl: 'http://localhost:5173',
    video: false,
  },
})
