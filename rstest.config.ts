import { defineConfig } from '@rstest/core';

export default defineConfig({
  testEnvironment: 'node',
  testTimeout: 180_000,
  hookTimeout: 180_000,
  include: ['tests/**/*.test.ts'],
});
