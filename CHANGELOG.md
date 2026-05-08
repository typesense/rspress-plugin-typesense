# rspress-plugin-typesense

## 0.0.2

### Patch Changes

- Fixed return type of `getDefaultCollectionFields` and custom collection `fields`
- Renamed `typesenseOptions` to `serverConfig` in PluginOptions and add doc comments.
- Added VN locale.
- Added `indexCodeBlocks` plugin config option to control whether code blocks should be indexed or not. Defaults to `false` to avoid indexing large code blocks which may not be relevant for search results and can bloat the index.
- Automatically inject collection name into Search component via virtual module
- Added `versionedSearch` plugin option
- Added `transformRecord` hook for mutating data
- Added `failOnIndexError` plugin option
- Fix: remove non-doc element before indexing

## 0.0.1

### Patch Changes

- First release 🔥
