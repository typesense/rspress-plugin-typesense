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

export interface CustomSettings {
  token_separators?: string[];
  symbols_to_index?: string[];
  field_definitions?: any[];
  enable_nested_fields?: boolean;
}
