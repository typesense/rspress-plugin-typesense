import crypto from 'crypto';
import type { DocSearchRecord, Hierarchy } from './types';

// Adapted from typesense-docsearch-scraper logic.

type LvlKey = 'lvl0' | 'lvl1' | 'lvl2' | 'lvl3' | 'lvl4' | 'lvl5' | 'lvl6';
export interface RspressSearchItem {
  title: string;
  content: string;
  routePath: string;
  lang?: string;
  toc: Array<{ id: string; text: string; depth: number; charIndex: number }>;
  frontmatter?: Record<string, any>;
  version?: string;
}

export class RspressConverter {
  public static getRecords(item: RspressSearchItem): DocSearchRecord[] {
    const url = item.routePath;

    // Slice the content into logical sections based on TOC offsets
    const sections = this.buildSections(item);

    // Calculate total items so we can exactly match the `position_descending` logic
    const totalItems = sections.reduce(
      (sum, sec) => sum + (sec.header ? 1 : 0) + sec.paragraphs.length,
      0,
    );

    const records: DocSearchRecord[] = [];
    let currentIndex = 0;

    // Default top-level hierarchy
    const currentHierarchy: Hierarchy = {
      lvl0:
        item.frontmatter?.title ||
        this.getCategoryFromPath(url, item.version, item.lang) ||
        'Documentation',
      lvl1: item.title || null,
      lvl2: null,
      lvl3: null,
      lvl4: null,
      lvl5: null,
      lvl6: null,
    };

    // Generate Records
    for (const section of sections) {
      // Update hierarchy and emit Header record if this section has a TOC header
      if (section.header) {
        const lvlKey = `lvl${section.header.depth}` as LvlKey;
        currentHierarchy[lvlKey] = section.header.text;

        // Reset deeper levels
        for (let i = section.header.depth + 1; i <= 6; i++) {
          currentHierarchy[`lvl${i}` as keyof Hierarchy] = null;
        }

        records.push(
          this.createRecord({
            item,
            url,
            currentHierarchy,
            type: lvlKey,
            content: null,
            anchor: section.header.id,
            index: currentIndex++,
            totalItems,
            levelWeight: 100 - section.header.depth * 10,
          }),
        );
      }

      // Emit Content (paragraph) records for this section
      for (const paragraph of section.paragraphs) {
        records.push(
          this.createRecord({
            item,
            url,
            currentHierarchy,
            type: 'content',
            content: paragraph,
            anchor: section.header?.id || null, // Point to the section's header
            index: currentIndex++,
            totalItems,
            levelWeight: 0,
          }),
        );
      }
    }

    return records;
  }

  // Slicing Strategy

  private static buildSections(item: RspressSearchItem) {
    const sections: Array<{
      header: { text: string; id: string; depth: number } | null;
      paragraphs: string[];
    }> = [];

    // Check for "Intro" text before the first TOC header
    const firstTocIndex =
      item.toc.length > 0 ? item.toc[0].charIndex : item.content.length;
    const introText = item.content.slice(0, firstTocIndex);
    const introParagraphs = this.splitIntoParagraphs(introText);

    if (introParagraphs.length > 0) {
      sections.push({ header: null, paragraphs: introParagraphs });
    }

    // Process TOC chunks
    for (let i = 0; i < item.toc.length; i++) {
      const toc = item.toc[i];
      const nextToc = item.toc[i + 1];

      const start = toc.charIndex;
      const end = nextToc ? nextToc.charIndex : item.content.length;

      let chunkText = item.content.slice(start, end);
      // Strip the Markdown header itself (e.g., "## My Header\n") from the chunk text
      chunkText = chunkText.replace(/^#{1,6}\s+[^\n]+/, '');

      sections.push({
        header: { text: toc.text, id: toc.id, depth: toc.depth },
        paragraphs: this.splitIntoParagraphs(chunkText),
      });
    }

    return sections;
  }

  // Record Generation

  private static createRecord(params: {
    item: RspressSearchItem;
    url: string;
    currentHierarchy: Hierarchy;
    type: string;
    content: string | null;
    anchor: string | null;
    index: number;
    totalItems: number;
    levelWeight: number;
  }): DocSearchRecord {
    const {
      item,
      url,
      currentHierarchy,
      type,
      content,
      anchor,
      index,
      totalItems,
      levelWeight,
    } = params;

    const record: DocSearchRecord = {
      objectID: '',
      url_without_anchor: url,
      url: anchor ? `${url}#${anchor}` : url,
      anchor,
      content,
      hierarchy: { ...currentHierarchy },
      hierarchy_radio: this.getHierarchyRadio(currentHierarchy, type),
      type,
      language: item.lang || 'en',
      weight: {
        page_rank: item.frontmatter?.order || 0,
        level: levelWeight,
        position: index,
        position_descending: totalItems - index,
      },
    };

    if (item.version) (record as any).version = [item.version];
    record.objectID = this.getObjectID(record);

    return record;
  }

  // Helpers

  private static splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n{2,}/) // Split by double newlines (markdown paragraphs)
      .map((p) => this.cleanMarkdownText(p))
      .filter(Boolean); // Remove empty strings
  }

  private static cleanMarkdownText(text: string): string {
    return text
      .replace(/```[a-z]*\n[\s\S]*?```/g, '') // Remove code blocks entirely
      .replace(/:::[a-z-]+\n/g, '') // Remove MDX block wrappers
      .replace(/:::/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links [text](url) -> text
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static getCategoryFromPath(
    routePath: string,
    version?: string,
    lang?: string,
  ): string | null {
    const parts = routePath.split('/').filter(Boolean);
    if (parts.length === 0) return null;

    let startIndex = 0;

    // Safely skip any URL segments that perfectly match the version or language
    while (
      startIndex < parts.length &&
      ((version && parts[startIndex] === version) ||
        (lang && parts[startIndex] === lang))
    ) {
      startIndex++;
    }

    const cat = parts[startIndex];
    if (!cat) return 'Documentation';

    // Format the string: 'getting-started' -> 'Getting Started'
    return cat
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private static getHierarchyRadio(
    hierarchy: Hierarchy,
    type: string,
  ): Hierarchy {
    const radio: Hierarchy = {
      lvl0: null,
      lvl1: null,
      lvl2: null,
      lvl3: null,
      lvl4: null,
      lvl5: null,
      lvl6: null,
    };
    let found = false;

    for (let i = 6; i >= 0; i--) {
      const level = `lvl${i}` as keyof Hierarchy;
      if (!found && hierarchy[level] !== null) {
        if (type === 'content' || level === type) {
          radio[level] = hierarchy[level];
          found = true;
          continue;
        }
      }
    }
    return radio;
  }

  private static getObjectID(record: DocSearchRecord): string {
    const hierarchyToHash: Record<string, string> = {};
    Object.keys(record.hierarchy).forEach((k) => {
      const val = record.hierarchy[k as keyof Hierarchy];
      if (val) hierarchyToHash[k] = val;
    });

    const payload = {
      hierarchy: hierarchyToHash,
      url: record.url_without_anchor,
      position: record.weight.position,
    };

    return crypto
      .createHash('sha1')
      .update(JSON.stringify(payload, Object.keys(payload).sort()))
      .digest('hex');
  }
}
