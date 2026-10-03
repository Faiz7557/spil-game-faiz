import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/__tests__/**/*.test.js', 'shared/__tests__/**/*.test.js'],
    alias: {
      '../../shared/': new URL('./shared/', import.meta.url).pathname
    }
  }
});
