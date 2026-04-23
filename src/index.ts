import type { RouteMeta, RspressPlugin } from '@rspress/core';
import path from 'path';
import fs from 'fs';
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration';
import type { CustomSettings, CustomSettingsConfig } from './types';
import { TypesenseHelper } from './typesenseHelper';
import { IndexFromHtml } from './indexFromHtml';

export interface TypesensePluginOptions {
  typesenseOptions: ConfigurationOptions;
  collectionName: string;
  customSettings?: CustomSettingsConfig;
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

    async afterBuild(config, isProd) {
      if (!isProd) return;

      const outDir = config.outDir || 'doc_build';
      const defaultLang = config.lang || 'en';

      // @ts-ignore
      const isVersioned = config.search?.versioned ?? true;
      const defaultVersion = config.multiVersion?.default || '';

      if (generatedRoutes.length === 0) {
        console.warn(
          '[TypesensePlugin] No routes generated. Skipping indexing.',
        );
        return;
      }

      // Group routes by locale
      const routeGroups: Record<
        string,
        { locale: string; routes: RouteMeta[] }
      > = {};

      for (const route of generatedRoutes) {
        const locale = route.lang || defaultLang;

        const groupKey = locale;

        if (!routeGroups[groupKey]) {
          routeGroups[groupKey] = { locale, routes: [] };
        }
        routeGroups[groupKey].routes.push(route);
      }

      const extractor = new IndexFromHtml();

      // Process each locale group into its own Typesense collection
      for (const groupKey in routeGroups) {
        const { locale, routes } = routeGroups[groupKey]!;

        // Construct collection alias e.g. `collection_en`
        const aliasName = `${options.collectionName}_${locale}`;
        const collectionNameTmp = `${aliasName}_${Date.now()}`;

        console.log(
          `\n[TypesensePlugin] Processing group: ${aliasName} (${routes.length} routes)`,
        );

        const localizedCustomSettings = resolveCustomSettings(
          options.customSettings,
          locale,
        );

        const helper = new TypesenseHelper({
          config: options.typesenseOptions,
          aliasName,
          collectionNameTmp,
          customSettings: localizedCustomSettings,
          locale,
          isVersioned,
        });

        await helper.init();
        await helper.createTmpCollection();

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
            console.warn(
              `[TypesensePlugin] HTML file not found: ${htmlPath}. Skipping route: ${route.routePath}`,
            );
            continue;
          }

          try {
            const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

            const records = extractor.getRecords(
              htmlContent,
              route.routePath,
              locale,
            );

            if (isVersioned && version) {
              records.forEach((r) => ((r as any).version = version));
            }

            if (records.length > 0) {
              await helper.addRecords(records, route.routePath, false);
            }
          } catch (error) {
            console.error(
              `[TypesensePlugin] Error processing ${route.routePath}:`,
              error,
            );
          }
        }

        // Commit Collection to Typesense
        try {
          await helper.commitTmpCollection();
          console.log(`[TypesensePlugin] Indexing complete for ${aliasName}!`);
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
  settings: CustomSettingsConfig | undefined,
  locale: string,
): CustomSettings | null {
  if (!settings) return null;

  // Detect if it's a global config by looking for known root keys
  const isGlobalConfig =
    'token_separators' in settings ||
    'symbols_to_index' in settings ||
    'field_definitions' in settings ||
    'enable_nested_fields' in settings;

  if (isGlobalConfig) {
    return settings as CustomSettings;
  }

  // Otherwise, treat it as a per-language map
  const perLangSettings = settings as Record<string, CustomSettings>;
  return perLangSettings[locale] || null;
}
