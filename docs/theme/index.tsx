import './index.css';

import {
  Search as PluginTypesenseSearch,
  VN_LOCALES,
} from 'rspress-plugin-typesense/runtime';

const Search = () => {
  return (
    <PluginTypesenseSearch
      locales={{ ...VN_LOCALES }}
      docSearchProps={{
        typesenseServerConfig: {
          nodes: [{ url: 'http://localhost:8108' }],
          apiKey: 'xyz',
        },
      }}
    />
  );
};

export { Search };
export * from '@rspress/core/theme-original';
