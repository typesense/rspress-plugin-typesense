import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import {
  getDefaultCollectionFields,
  pluginTypesense,
} from 'rspress-plugin-typesense';

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
      serverConfig: {
        nodes: [
          {
            url: 'http://localhost:8108',
          },
        ],
        apiKey: 'xyz',
      },
      customCollectionSettings: {
        fields: (params) => {
          return getDefaultCollectionFields(params);
        },
      },
      indexCodeBlocks: true,
      transformRecord(record, route) {
        record['my_custom_field'] = 'hello';
        return record;
      },
      failOnIndexError: true,
      versionedSearch: true,
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
