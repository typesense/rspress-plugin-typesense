import { Client } from 'typesense';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration';
import type { ImportResponse } from 'typesense/lib/Typesense/Documents';
import type { DocSearchRecord, CustomSettings } from './types';

export interface TypesenseHelperOptions {
  config: ConfigurationOptions;
  aliasName: string;
  collectionNameTmp: string;
  customSettings: CustomSettings | null;
  locale: string;
  isVersioned: boolean;
}

export class TypesenseHelper {
  private typesenseClient: Client;
  private aliasName: string;
  private collectionNameTmp: string;
  private collectionLocale: string;
  private customSettings: CustomSettings | null;
  private isVersioned: boolean;
  private typesenseVersion: number = 0;

  constructor(options: TypesenseHelperOptions) {
    const clientConfig = { ...options.config };
    clientConfig.connectionTimeoutSeconds =
      clientConfig.connectionTimeoutSeconds || 1800;
    clientConfig.retryIntervalSeconds = clientConfig.retryIntervalSeconds || 1;
    clientConfig.numRetries = clientConfig.numRetries || 3;
    clientConfig.healthcheckIntervalSeconds =
      clientConfig.healthcheckIntervalSeconds || 60;
    clientConfig.logLevel = clientConfig.logLevel || 'error';

    this.typesenseClient = new Client(clientConfig);
    this.aliasName = options.aliasName;
    this.collectionNameTmp = options.collectionNameTmp;
    this.collectionLocale =
      options.locale || process.env.TYPESENSE_COLLECTION_LOCALE || 'en';
    this.customSettings = options.customSettings;
    this.isVersioned = options.isVersioned;
  }

  public async init() {
    const debugInfo = await this.typesenseClient.debug.retrieve();
    const version = debugInfo.version;

    if (version === 'nightly') {
      this.typesenseVersion = 30;
    } else {
      this.typesenseVersion = parseInt(version.split('.')[0]!, 10);
    }
  }

  public async createTmpCollection(): Promise<void> {
    if (this.typesenseVersion === 0) await this.init();

    try {
      await this.typesenseClient.collections(this.collectionNameTmp).delete();
    } catch (error: any) {
      if (error?.httpStatus !== 404) throw error;
    }

    const schema: CollectionCreateSchema = {
      name: this.collectionNameTmp,
      fields: [
        { name: 'anchor', type: 'string', optional: true },
        {
          name: 'content',
          type: 'string',
          locale: this.collectionLocale,
          optional: true,
        },
        { name: 'url', type: 'string' },
        {
          name: 'url_without_anchor',
          type: 'string',
          facet: true,
          optional: true,
        },
        ...Array.from({ length: 7 }).map((_, i) => ({
          name: `hierarchy.lvl${i}`,
          type: 'string' as const,
          facet: true,
          locale: this.collectionLocale,
          optional: true,
        })),
        {
          name: 'type',
          type: 'string',
          facet: true,
          optional: true,
        },
        { name: 'item_priority', type: 'int64' },
      ],
      default_sorting_field: 'item_priority',
      token_separators: ['_', '-'],
    };

    // Dynamically append the version field if the project is versioned
    if (this.isVersioned) {
      schema.fields!.push({
        name: 'version',
        type: 'string[]',
        facet: true,
        optional: true,
      });
    }

    // Custom overrides mapping
    if (this.customSettings) {
      if (this.customSettings.token_separators) {
        schema.token_separators = this.customSettings.token_separators;
      }
      if (this.customSettings.symbols_to_index) {
        schema.symbols_to_index = this.customSettings.symbols_to_index;
      }
      if (this.customSettings.field_definitions) {
        schema.fields = this.customSettings.field_definitions;
      }
      if (this.customSettings.enable_nested_fields !== undefined) {
        schema.enable_nested_fields = this.customSettings.enable_nested_fields;
      }
    }

    await this.typesenseClient.collections().create(schema);
  }

  public async addRecords(
    records: DocSearchRecord[],
    fileName: string,
    fromSitemap: boolean,
  ): Promise<void> {
    const transformedRecords = records.map((r) =>
      TypesenseHelper.transformRecord(r, this.isVersioned),
    );
    const recordCount = transformedRecords.length;

    const results = (await this.typesenseClient
      .collections(this.collectionNameTmp)
      .documents()
      .import(transformedRecords, { action: 'create' })) as ImportResponse[];

    const failedItems = results.filter((r) => r.success === false);

    if (failedItems.length > 0) {
      console.error(
        'Typesense Import Failed:',
        JSON.stringify(failedItems, null, 2),
      );
      throw new Error('Failed to import some records');
    }

    const color = fromSitemap ? '96' : '94';
    console.log(
      `\x1b[${color}m> Typesense DocSearch Chunk: \x1b[0m${fileName}\x1b[93m ${recordCount} records\x1b[0m`,
    );
  }

  public async commitTmpCollection(): Promise<void> {
    const oldCollectionName = await this.getOldCollectionName();

    if (oldCollectionName) {
      await this.transferSynonyms(oldCollectionName);
      await this.transferOverrides(oldCollectionName);
    }

    await this.typesenseClient.aliases().upsert(this.aliasName, {
      collection_name: this.collectionNameTmp,
    });

    if (oldCollectionName) {
      await this.typesenseClient.collections(oldCollectionName).delete();
    }
  }

  public static transformRecord(
    record: DocSearchRecord,
    isVersioned: boolean,
  ): any {
    const transformedRecord: any = {};

    // Explicitly exclude properties that are no longer in our collection schema
    const excludeKeys = ['weight', 'language', 'tags', '.*_tag'];

    for (const key in record) {
      if (
        record[key] !== null &&
        record[key] !== undefined &&
        !excludeKeys.includes(key)
      ) {
        transformedRecord[key] = record[key];
      }
    }

    if (record.weight) {
      transformedRecord['item_priority'] =
        record.weight.page_rank * 1000000000 +
        record.weight.level * 1000 +
        record.weight.position_descending;
    } else {
      transformedRecord['item_priority'] = 0;
    }

    // Flatten Hierarchy for Typesense schema
    for (let x = 0; x < 7; x++) {
      const lvlKey = `lvl${x}`;

      if (record.hierarchy && record.hierarchy[lvlKey] != null) {
        transformedRecord[`hierarchy.lvl${x}`] = record.hierarchy[lvlKey];
      }

      if (record.hierarchy_radio && record.hierarchy_radio[lvlKey] != null) {
        transformedRecord[`hierarchy_radio.lvl${x}`] =
          record.hierarchy_radio[lvlKey];
      }
    }

    // Handle Versions dynamically
    if (isVersioned && record.version && typeof record.version === 'string') {
      transformedRecord['version'] = record.version.split(',');
    } else if (!isVersioned) {
      // Ensure we don't accidentally push version into the DB if not in schema
      delete transformedRecord['version'];
    }

    return transformedRecord;
  }

  private async getOldCollectionName(): Promise<string | null> {
    try {
      const alias = await this.typesenseClient
        .aliases(this.aliasName)
        .retrieve();
      return alias.collection_name;
    } catch (error: any) {
      if (error?.httpStatus === 404) return null;
      throw error;
    }
  }

  private async transferSynonyms(oldCollectionName: string): Promise<void> {
    if (this.typesenseVersion >= 30) {
      const oldCollection = await this.typesenseClient
        .collections(oldCollectionName)
        .retrieve();
      const synonyms = (oldCollection as any).synonym_sets || [];

      for (const syn of synonyms) {
        await this.typesenseClient
          .collections(this.collectionNameTmp)
          .synonyms()
          .upsert(syn.id, syn);
      }
      return;
    }

    const result = await this.typesenseClient
      .collections(oldCollectionName)
      .synonyms()
      .retrieve();
    const synonyms = result.synonyms || [];

    for (const synonym of synonyms) {
      const { id, ...synonymKeys } = synonym;
      await this.typesenseClient
        .collections(this.collectionNameTmp)
        .synonyms()
        .upsert(synonym.id, synonymKeys as any);
    }
  }

  private async transferOverrides(oldCollectionName: string): Promise<void> {
    if (this.typesenseVersion >= 30) {
      const oldCollection = await this.typesenseClient
        .collections(oldCollectionName)
        .retrieve();
      const curations = (oldCollection as any).curation_sets || [];

      for (const cur of curations) {
        await this.typesenseClient
          .collections(this.collectionNameTmp)
          .overrides()
          .upsert(cur.id, cur);
      }
      return;
    }

    const result = await this.typesenseClient
      .collections(oldCollectionName)
      .overrides()
      .retrieve();
    const overrides = result.overrides || [];

    for (const override of overrides) {
      const { id, ...overrideKeys } = override;
      await this.typesenseClient
        .collections(this.collectionNameTmp)
        .overrides()
        .upsert(override.id, overrideKeys as any);
    }
  }
}
