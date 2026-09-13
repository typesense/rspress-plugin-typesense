import './index.css';

import {
  Search as PluginTypesenseSearch,
  VI_LOCALES,
} from 'rspress-plugin-typesense/runtime';

const Search = () => {
  return (
    <PluginTypesenseSearch
      locales={{ ...VI_LOCALES }}
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
