import type { RouteMeta, RspressPlugin } from '@rspress/core';
import path from 'path';
import fs from 'fs';
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration';
import type {
  CustomCollectionSettings,
  CustomCollectionSettingsConfig,
  DocSearchRecord,
} from './types';
import { TypesenseHelper, getDefaultCollectionFields } from './typesenseHelper';
import { IndexFromHtml } from './indexFromHtml';
import { ImportError } from 'typesense/lib/Typesense/Errors';

export type {
  CustomCollectionSettings,
  CustomCollectionSettingsConfig,
  DocSearchRecord,
} from './types';

export { getDefaultCollectionFields };

/**
 * Options for the Typesense plugin.
 *
 * The server configuration requires an API key with **write permissions**,
 * as the plugin creates and manages collections during indexing.
 */
export interface TypesensePluginOptions {
  /** Typesense server connection options (host, port, protocol, API key, etc.). The API key must have write permissions. */
  serverConfig: ConfigurationOptions;
  /** The name of the Typesense collection to index documents into. */
  collectionName: string;
  /** Optional per-locale or global overrides for the collection schema. */
  customCollectionSettings?: CustomCollectionSettingsConfig;
  /** Whether to index code blocks into Typesense. Defaults to false to avoid search noise. */
  indexCodeBlocks?: boolean;
  /** If set to true, the search UI will query the collection corresponding to the currently selected docs version, to query across all versions, set to false. Default: true */
  versionedSearch?: boolean;
  /**
   * Hook to mutate or enrich the record before it gets indexed.
   * Useful for attaching custom fields or tags.
   */
  transformRecord?: (
    record: DocSearchRecord,
    route: RouteMeta,
  ) => DocSearchRecord;
}

export function pluginTypesense(
  options: TypesensePluginOptions,
): RspressPlugin {
  let generatedRoutes: RouteMeta[] = [];

  return {
    name: 'rspress-plugin-typesense',

    config(config) {
      return config;
    },

    async routeGenerated(routes) {
      generatedRoutes = routes;
    },

    // Inject the configuration into the frontend via a virtual module
    async addRuntimeModules() {
      // DO NOT include sensitive information in this payload, as it will be exposed to the client-side.
      const configPayload = {
        collectionName: options.collectionName,
        versionedSearch: options.versionedSearch ?? true,
      };
      return {
        'virtual-typesense-config': `export default ${JSON.stringify(configPayload)};`,
      };
    },

    async afterBuild(config, isProd) {
      if (!isProd) return;

      const outDir = config.outDir || 'doc_build';
      const defaultLang = config.lang || 'en';

      // @ts-ignore
      const isVersioned = options.versionedSearch ?? true;
      const defaultVersion = config.multiVersion?.default || '';

      if (generatedRoutes.length === 0) {
        console.warn(
          `\n\x1b[33m⚠ [TypesensePlugin] No routes generated.\x1b[0m \x1b[90mSkipping indexing.\x1b[0m\n`,
        );
        return;
      }

      // Group routes by locale
      const routeGroups: Record<
        string,
        { locale: string; routes: RouteMeta[] }
      > = {};

      for (const route of generatedRoutes) {
        // Automatically detect landing pages based on possible pageName permutations
        // This handles cases where Rspress omits default version or default lang prefixes.
        const possibleHomePages = [
          'index', // Root fallback (e.g. single lang, default version)
          route.lang ? `${route.lang}_index` : '', // Lang explicitly in path
          route.version ? `${route.version}_index` : '', // Version explicitly in path
          route.version && route.lang
            ? `${route.version}_${route.lang}_index`
            : '', // Both explicit
        ];

        if (possibleHomePages.includes(route.pageName)) {
          // Skipping indexing for the landing page
          continue;
        }

        const locale = route.lang || defaultLang;

        const groupKey = locale;

        if (!routeGroups[groupKey]) {
          routeGroups[groupKey] = { locale, routes: [] };
        }
        routeGroups[groupKey].routes.push(route);
      }

      if (Object.keys(routeGroups).length === 0) {
        console.warn(
          `\n\x1b[33m⚠ [TypesensePlugin] No routes found for indexing.\x1b[0m \x1b[90mSkipping indexing process.\x1b[0m\n`,
        );
        return;
      }

      const extractor = new IndexFromHtml({
        indexCodeBlocks: options.indexCodeBlocks ?? false,
      });
      // Process each locale group into its own Typesense collection
      for (const groupKey in routeGroups) {
        const { locale, routes } = routeGroups[groupKey]!;

        // Construct collection alias e.g. `collection_en`
        const aliasName = `${options.collectionName}_${locale}`;
        const collectionNameTmp = `${aliasName}_${Date.now()}`;

        // Calculate column padding for pretty console output
        const maxRouteLength = routes.reduce(
          (max, r) => Math.max(max, r.routePath.length),
          0,
        );
        const padLength = Math.max(maxRouteLength + 4, 30); // Add at least 4 dots of spacing

        // Prettified Group Header
        console.log(
          `\n\x1b[1m\x1b[36m[TypesensePlugin]\x1b[0m \x1b[1mProcessing group:\x1b[0m \x1b[35m${aliasName}\x1b[0m \x1b[90m(${routes.length} routes)\x1b[0m`,
        );

        const localizedCustomSettings = resolveCustomSettings(
          options.customCollectionSettings,
          locale,
        );

        const helper = new TypesenseHelper({
          config: options.serverConfig,
          aliasName,
          collectionNameTmp,
          customSettings: localizedCustomSettings,
          locale,
          isVersioned,
        });

        await helper.init();
        await helper.createTmpCollection();

        let totalRecords = 0;
        // Process each route's HTML File
        for (const route of routes) {
          const version = route.version || defaultVersion;

          // Clean the route path of leading slashes
          let normalizedRoute = route.routePath.replace(/^\//, '');

          // If this route is the default version, Rspress omits the version folder
          if (
            defaultVersion &&
            normalizedRoute.startsWith(`${defaultVersion}/`)
          ) {
            normalizedRoute = normalizedRoute.substring(
              defaultVersion.length + 1,
            );
          }
          // If this route is the default lang, Rspress omits the lang folder
          if (defaultLang && normalizedRoute.startsWith(`${defaultLang}/`)) {
            normalizedRoute = normalizedRoute.substring(defaultLang.length + 1);
          }

          let htmlPath = path.join(outDir, normalizedRoute);

          // Resolve the physical HTML file output
          let fileFound = false;
          if (fs.existsSync(htmlPath + '.html')) {
            htmlPath += '.html';
            fileFound = true;
          } else if (fs.existsSync(path.join(htmlPath, 'index.html'))) {
            htmlPath = path.join(htmlPath, 'index.html');
            fileFound = true;
          }

          if (!fileFound) {
            const fillerLength = Math.max(
              2,
              padLength - route.routePath.length,
            );
            const filler = '\x1b[90m' + '.'.repeat(fillerLength) + '\x1b[0m';
            console.warn(
              `  \x1b[33m⚠\x1b[0m \x1b[37m${route.routePath}\x1b[0m ${filler} \x1b[33mskipped\x1b[0m \x1b[90m(HTML not found)\x1b[0m`,
            );
            continue;
          }

          try {
            const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

            let records = extractor.getRecords(
              htmlContent,
              route.routePath,
              locale,
            );

            if (isVersioned && version) {
              records.forEach((r) => ((r as any).version = version));
            }

            // Allow users to inject custom data or mutate the record
            if (options.transformRecord) {
              records = records.map((record) =>
                options.transformRecord!(record, route),
              );
            }

            if (records.length > 0) {
              totalRecords += await helper.addRecords(
                records,
                route.routePath,
                false,
                padLength,
              );
            }
          } catch (error) {
            const fillerLength = Math.max(
              2,
              padLength - route.routePath.length,
            );
            const filler = '\x1b[90m' + '.'.repeat(fillerLength) + '\x1b[0m';
            console.error(
              `  \x1b[31m✖\x1b[0m \x1b[37m${route.routePath}\x1b[0m ${filler} \x1b[31m failed\x1b[0m \x1b[90m(Processing error)\x1b[0m`,
            );
            if (error instanceof ImportError) {
              console.error(`    \x1b[31m↳ Import error\x1b[0m`);
              console.error(error.importResults);
            } else
              console.error(
                `    \x1b[31m↳ ${error instanceof Error ? error.message : error}\x1b[0m`,
              );
          }
        }

        // Commit Collection to Typesense
        try {
          await helper.commitTmpCollection();
          console.log(
            `\x1b[32m✔ Indexing complete for\x1b[0m \x1b[35m${aliasName}\x1b[0m \x1b[90m—\x1b[0m \x1b[33m${totalRecords}\x1b[0m \x1b[90mtotal records!\x1b[0m`,
          );
        } catch (error) {
          console.error(
            `[TypesensePlugin] Failed to commit collection ${aliasName}:`,
            error,
          );
          throw error;
        }
      }
    },
  };
}

// Helper to determine if the user provided global settings or per-lang settings
function resolveCustomSettings(
  settings: CustomCollectionSettingsConfig | undefined,
  locale: string,
): CustomCollectionSettings | null {
  if (!settings) return null;

  // Detect if it's a global config by looking for known root keys
  const isGlobalConfig =
    ('token_separators' satisfies keyof CustomCollectionSettings) in settings ||
    ('symbols_to_index' satisfies keyof CustomCollectionSettings) in settings ||
    ('fields' satisfies keyof CustomCollectionSettings) in settings ||
    ('enable_nested_fields' satisfies keyof CustomCollectionSettings) in
      settings;

  if (isGlobalConfig) {
    return settings as CustomCollectionSettings;
  }

  // Otherwise, treat it as a per-language map
  const perLangSettings = settings as Record<string, CustomCollectionSettings>;
  return perLangSettings[locale] || null;
}
