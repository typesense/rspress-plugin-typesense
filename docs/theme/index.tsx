import './index.css';

import { Search as PluginTypesenseSearch } from '../../src/runtime/Search';

const Search = () => {
  return (
    <PluginTypesenseSearch
      docSearchProps={{
        typesenseCollectionName: 'rspress_docs',
        typesenseServerConfig: {
          nodes: [
            {
              host: 'localhost',
              port: 8108,
              protocol: 'http',
            },
          ],
          apiKey: 'xyz',
        },
        typesenseSearchParameters: {},
      }}
    />
  );
};
export { Search };
export * from '@rspress/core/theme-original';
