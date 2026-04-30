import { CollectionFieldSchema } from 'typesense/lib/Typesense/Collection';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
export interface Hierarchy {
  [key: string]: string | null | undefined;
  lvl0: string | null;
  lvl1: string | null;
  lvl2: string | null;
  lvl3: string | null;
  lvl4: string | null;
  lvl5: string | null;
  lvl6: string | null;
}

export interface RecordWeight {
  page_rank: number;
  level: number;
  position: number;
  position_descending: number;
}

export interface DocSearchRecord {
  objectID: string;
  url: string; // deep link e.g., /foo#bar
  url_without_anchor: string; // page link e.g., /foo
  anchor: string | null;
  content: string | null;
  hierarchy: Hierarchy;
  hierarchy_radio: Hierarchy;
  type: string;
  weight: RecordWeight;
  version?: string;
  language?: string;
  [key: string]: any;
}
export interface FieldsParams {
  locale: string;
  isVersioned: boolean;
}

export interface CustomCollectionSettings {
  token_separators?: CollectionCreateSchema['token_separators'];
  symbols_to_index?: CollectionCreateSchema['symbols_to_index'];
  fields?: (params: FieldsParams) => CollectionFieldSchema[];
  enable_nested_fields?: CollectionCreateSchema['enable_nested_fields'];
}

/**  Allows a single global config OR a map of configs keyed by language (e.g. `{ en: {...}, zh: {...} }`) */
export type CustomCollectionSettingsConfig =
  | CustomCollectionSettings
  | Record<string, CustomCollectionSettings>;
