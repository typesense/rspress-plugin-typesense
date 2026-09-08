# Rspress Plugin Typesense 🦀🔎⚡️

A plugin that brings lightning-fast, typo-tolerant search powered by Typesense to your Rspress site.

## About Typesense & Rspress

[**Typesense**](https://typesense.org/) is an open-source, lightning-fast search engine that delivers instant, typo-tolerant results with minimal setup. It's an open source alternative to Algolia and an easier-to-use alternative to ElasticSearch.

[**Rspress**](https://rspress.rs/) is a high-performance static site generator for documentation websites. Built with Rust, it offers a modern development experience and produces blazing-fast static sites.

Together, **Typesense** and **Rspress** provide a seamless way to add powerful, blazingly-fast search to modern documentation websites.

## Installation

```bash
npm install rspress-plugin-typesense
```

## Usage

### 1. Start typesense server

You can either self-host the Typesense server or use [Typesense Cloud service](https://cloud.typesense.org/). Follow this [getting started guide](https://typesense.org/docs/guide/install-typesense.html) to set up your server and obtain the API key and server URL.

### 2. Configure the plugin

First, add the plugin to your `rspress.config.ts`. You must provide your Typesense server details and an API key with **write permissions** so the plugin can create collections and index your documents during the build.

```ts
// rspress.config.ts
import { defineConfig } from '@rspress/core';
import { pluginTypesense } from 'rspress-plugin-typesense';

export default defineConfig({
  plugins: [
    pluginTypesense({
      collectionName: 'my_docs',
      serverConfig: {
        nodes: [{ url: 'YOUR_TYPESENSE_SERVER_URL' }],
        apiKey: 'YOUR_TYPESENSE_ADMIN_API_KEY', // Requires Write permissions
      },
    }),
  ],
});
```

### 3. Override the search component

Next, override Rspress's default `Search` component via a [Custom Theme](https://rspress.rs/guide/basic/custom-theme).

Provide a **Search-Only API Key** here. For security reasons, **never expose your Admin API Key in the frontend**.

```tsx
// theme/index.tsx
import { Search as PluginTypesenseSearch } from 'rspress-plugin-typesense/runtime';

const Search = () => {
  return (
    <PluginTypesenseSearch
      docSearchProps={{
        typesenseServerConfig: {
          nodes: [{ url: 'YOUR_TYPESENSE_SERVER_URL' }],
          apiKey: 'YOUR_TYPESENSE_SEARCH_ONLY_API_KEY', // Safe for browsers
        },
      }}
    />
  );
};

export { Search };
export * from '@rspress/core/theme-original';
```

### 4. Build and index

Run the build command to generate your site and index your content into Typesense.

<PackageManagerTabs command="run build" />

All set! You've successfully integrated typo-tolerant search into your documentation. The plugin automatically handles filtering based on the user's current language and version.

## Plugin configuration (Backend)

The `pluginTypesense` function accepts an options object with the following properties:

```ts
export interface TypesensePluginOptions {
  /**
   * Typesense server connection options.
   * The API key must have write permissions to create and index collections.
   */
  serverConfig: ConfigurationOptions;

  /**
   * The base name of the Typesense collection.
   * Note: The plugin creates dedicated localized collections (e.g., `my_docs_en`).
   */
  collectionName: string;

  /**
   * Optional schema overrides. Can be a global settings object or a map keyed by language.
   */
  customCollectionSettings?: CustomCollectionSettingsConfig;

  /**
   * Whether to index code blocks into Typesense.
   * Defaults to `false` to avoid search noise and bloated index sizes.
   */
  indexCodeBlocks?: boolean;

  /**
   * Whether to automatically filter search results by the active documentation version.
   * Defaults to `true`.
   */
  versionedSearch?: boolean;
}
```

### customCollectionSettings

- **Type**:

```ts
type CustomCollectionSettingsConfig =
  | CustomCollectionSettings
  | Record<string, CustomCollectionSettings>;
```

- **Default**: `undefined`

Allows you to override the Typesense schema configuration. You can pass a single global configuration, or a map of configurations keyed by language (useful if you need specific token separators for languages like Chinese or Japanese).

#### Customizing schema and injecting custom data

For advanced use cases like adding custom tags for faceted search or boosting the search ranking of specific pages, you can extend the default schema and mutate records before they are indexed.

To do this:

1. Use the `getDefaultCollectionFields` helper in `customCollectionSettings` to safely append new fields to the collection schema.
2. Use the `transformRecord` hook to populate those fields or modify existing weights based on the `route`.

Here is an example showing how to add a custom `category` field for filtering, and how to boost the `page_rank` of "Getting Started" guides:

```ts
import {
  pluginTypesense,
  getDefaultCollectionFields,
} from 'rspress-plugin-typesense';

pluginTypesense({
  collectionName: 'my_docs',
  serverConfig: {
    /* ... */
  },

  // 1. Extend the schema to add a custom 'category' field
  customCollectionSettings: {
    en: {
      fields: (params) => [
        ...getDefaultCollectionFields(params),
        { name: 'category', type: 'string', facet: true, optional: true },
      ],
    },
  },

  // 2. Mutate the record before it gets indexed
  transformRecord(record, route) {
    // Example: Inject a custom tag for faceted search
    if (route.routePath.startsWith('/api/')) {
      record.category = 'API Reference';
    }

    // Example: Boost the search priority of important pages
    if (route.routePath.includes('getting-started')) {
      record.weight.page_rank = 100; // Default is 0
    }

    return record;
  },
});
```

In the frontend, you could now pass `typesenseSearchParams: { filter_by: 'category:=API Reference' }` to your `<Search />` component to restrict results.

### indexCodeBlocks

- **Type**: `boolean`
- **Default**: `false`

By default, the plugin only indexes headers (`h1-h6`), paragraphs, lists and tables. Enabling this will also extract text from inside code blocks.

### versionedSearch

- **Type**: `boolean`
- **Default**: `true`

If your Rspress site utilizes multiple versions, the plugin tags every indexed document with its respective version and exposes this setting to the frontend via a virtual module. This ensures users only see search results relevant to the documentation version they are currently viewing. Set this to `false` if you want to search across all versions.

## Search component props (Frontend)

The `<PluginTypesenseSearch />` component accepts the following properties:

```ts
type SearchProps = {
  docSearchProps: TypesenseDocSearchProps;
  locales?: Locales;
};
```

### `docSearchProps`

- **Type**: `TypesenseDocSearchProps`
- **Required**: Yes (`typesenseServerConfig` must be provided)

Parameters passed directly to the underlying `typesense-docsearch-react` modal.

_You do not need to provide `typesenseCollectionName`. The plugin automatically injects the collection name via a virtual module._

### `locales`

- **Type**:

```ts
type Locales = Record<
  string,
  { translations: DocSearchProps['translations']; placeholder: string }
>;
```

- **Default**: `{}`

Allows you to customize the placeholder and modal translations based on the active language. You can see the list of translations provided by the plugin [here](/src/runtime/locales.ts).

**Example:**

```tsx
import { Search as PluginTypesenseSearch } from 'rspress-plugin-typesense/runtime';

<PluginTypesenseSearch
  locales={{
    en: {
      placeholder: 'Search documentation',
      translations: {
        button: {
          buttonText: 'Search',
          buttonAriaLabel: 'Search',
        },
      },
    },
    ...ZH_LOCALES,
  }}
/>;
```

## Integration tests

Integration tests use Rstest and require a running Typesense instance. Start Typesense and run the suite:

```bash
docker compose up -d
bun run test:integration
```

The suite builds the package, installs the generated npm tarball into a temporary copy of `docs`, builds the Rspress site, and verifies the indexed locale collections and version-filtered search results.

## License

Licensed under the Apache 2.0 License, Copyright © Typesense.

See [LICENSE](../../LICENSE) for more information.
