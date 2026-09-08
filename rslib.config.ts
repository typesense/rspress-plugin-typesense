import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import { pluginPublint } from 'rsbuild-plugin-publint';

export default defineConfig({
  plugins: [
    pluginPublint({
      publintOptions: {
        pack: 'npm',
      },
    }),
  ],
  lib: [
    {
      source: {
        entry: {
          index: ['./src/**/*.ts', '!./src/runtime/**'],
        },
      },
      dts: true,
      format: 'esm',

      bundle: false,

      output: {
        target: 'node',
      },

      experiments: {
        advancedEsm: true,
      },
      syntax: 'esnext',
      redirect: {
        dts: {
          extension: true,
        },
      },
    },
    {
      source: {
        entry: {
          index: './src/runtime/*',
        },
      },
      outBase: './src',
      bundle: false,
      format: 'esm',
      syntax: 'esnext',
      plugins: [pluginReact()],
      output: {
        externals: [
          '@theme',
          'react',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
        ],
        target: 'web',
      },
    },
  ],
});
