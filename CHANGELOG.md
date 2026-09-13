# rspress-plugin-typesense

### Minor Changes

- **Upgrade to DocSearch v5**:
  - Upgraded underlying search modal from DocSearch v3 to v5 (`typesense-docsearch-react`).
  - Added support for new DocSearch v5 capabilities, including conversational / Ask AI search results (`resultsScreen`).

- **New Strict Type Exports (`StrictLocales`)**:
  - Exported `StrictLocales`, `StrictLocaleConfig`, and `RequiredTranslations` to enforce complete, 100% translation coverage at compile-time via recursive `DeepRequired`.

- **Updated Locale Presets**:
  - Added complete DocSearch v5 translations (`facets`, `resultsScreen`, and expanded `searchBox`/`footer` fields) for Simplified Chinese (`ZH_LOCALES`), Russian (`RU_LOCALES`), and Vietnamese (`VI_LOCALES`).
  - Renamed `VN_LOCALES` to `VI_LOCALES` (and changed the locale key from `vn` to `vi`) to adhere to ISO 639-1 language code standards.

### ⚠️ Breaking Changes

- **Translation Schema Updated**: The `translations` object has been restructured to match DocSearch v5. Custom translation configs may need to be updated to include or accommodate the new `facets` and `resultsScreen` properties.
- **Vietnamese Preset Rename**: If you imported `VN_LOCALES`, update your import to `VI_LOCALES` and your locale key from `vn` to `vi`.

## 0.0.3

### Patch Changes

- explicit typesense dependency version

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
