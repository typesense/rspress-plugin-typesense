import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import { pluginTypesense } from '../src/index';

export default defineConfig({
  lang: 'en',
  locales: [
    {
      lang: 'en',
      // The label in nav bar to switch language
      label: 'English',
      title: 'Rspress',
      description: 'Static Site Generator',
    },
    {
      lang: 'vn',
      label: 'Tiếng Việt',
      title: 'Rspress',
      description: 'Static Site Generator',
    },
  ],
  plugins: [
    pluginTypesense({
      collectionName: 'rspress_docs',
      typesenseOptions: {
        nodes: [
          {
            host: 'localhost',
            port: 8108,
            protocol: 'http',
          },
        ],
        apiKey: 'xyz',
      },
    }),
  ],
  root: path.join(__dirname, 'docs'),
  title: 'My Site',
  icon: '/rspress-icon.png',
  logo: {
    light: '/rspress-light-logo.png',
    dark: '/rspress-dark-logo.png',
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/web-infra-dev/rspress',
      },
    ],
  },
  multiVersion: {
    default: 'v1',
    versions: ['v1', 'v2'],
  },
});
