import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // Pour simuler le DOM si nécessaire
    globals: true, // Pour utiliser describe, it, expect sans import
  },
});