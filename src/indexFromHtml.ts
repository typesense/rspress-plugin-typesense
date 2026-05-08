import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { DocSearchRecord, Hierarchy, RecordWeight } from './types';

// Adapted from typesense docsearch scraper with a few tweaks

export class IndexFromHtml {
  private levels = ['lvl0', 'lvl1', 'lvl2', 'lvl3', 'lvl4', 'lvl5', 'lvl6'];

  private selectors: Record<string, { selector: string; global: boolean }>;

  constructor(options?: { indexCodeBlocks?: boolean }) {
    // Support both modern Rspress and legacy Modern.js classes
    const docClass = '.rspress-doc';

    let contentSelector = `${docClass} p, ${docClass} li, ${docClass} td, ${docClass} th`;
    // Dynamically append the code block selector if configured
    if (options?.indexCodeBlocks) {
      contentSelector += `, ${docClass} pre > code`;
    }

    this.selectors = {
      lvl0: {
        selector: '.rp-nav-menu__item--active',
        global: true,
      },

      lvl1: { selector: `${docClass} h1`, global: false },
      lvl2: { selector: `${docClass} h2`, global: false },
      lvl3: { selector: `${docClass} h3`, global: false },
      lvl4: { selector: `${docClass} h4`, global: false },
      lvl5: { selector: `${docClass} h5`, global: false },
      lvl6: { selector: `${docClass} h6`, global: false },
      content: {
        selector: contentSelector,
        global: false,
      },
    };
  }

  public getRecords(
    html: string,
    url: string,
    lang?: string,
  ): DocSearchRecord[] {
    const $ = cheerio.load(html);
    // Remove badge elements to prevent their text from being indexed
    $('.rp-badge').remove();
    // Remove non-doc elements (e.g. version switcher) to keep title text clean
    $('.rp-not-doc').remove();

    const records: DocSearchRecord[] = [];

    // Helper to safely extract text from global selectors
    const getGlobalText = (selector: string): string | null => {
      const el = $(selector).first();
      return el.length ? this.cleanText(el) : null;
    };

    const globalHierarchy: Partial<Hierarchy> = {
      lvl0:
        getGlobalText(this.selectors.lvl0.selector) ||
        getGlobalText(this.selectors.lvl1.selector) ||
        getGlobalText('.rp-sidebar-item--active .rp-sidebar-item__left') ||
        $('title').text().trim() ||
        'Documentation',
    };

    // We construct a query that selects all headers and paragraphs inside .rspress-doc
    // in the order they appear in the DOM.
    const selectorString = Object.values(this.selectors)
      .filter((s) => !s.global)
      .map((s) => s.selector)
      .join(', ');

    const nodes = $(selectorString);

    let previousHierarchy = this.generateEmptyHierarchy();
    previousHierarchy.lvl0 = globalHierarchy.lvl0 || null;

    const anchors = this.generateEmptyHierarchy();

    nodes.each((index, element) => {
      const el = $(element);

      // Prevent duplicate indexing of nested elements
      // If this <p> or <li> is inside a table, a callout, or another <li> that we are already selecting,
      // skip it to prevent duplicate text.
      const isNestedMatch = el.parents(selectorString).length > 0;
      if (isNestedMatch) return;

      // @ts-ignore need to install domhandler to import type Element
      const tagName = element.tagName.toLowerCase();
      const currentLevel = this.getLevelFromTag(tagName);

      const hierarchy = { ...previousHierarchy };

      const currentLevelInt = this.levels.indexOf(currentLevel);

      if (currentLevel !== 'content') {
        const text = this.cleanText(el);

        hierarchy[currentLevel] = text;

        anchors[currentLevel] = this.getAnchor(el);

        // Reset deeper levels
        for (let i = currentLevelInt + 1; i < 7; i++) {
          const lvlKey = `lvl${i}`;
          hierarchy[lvlKey] = null;
          anchors[lvlKey] = null;
        }
        previousHierarchy = { ...hierarchy };
      }

      let content: string | null = null;
      if (currentLevel === 'content') {
        content = this.cleanText(el);
        if (!content) return;
      }

      if (currentLevel.startsWith('lvl') && !hierarchy[currentLevel]) return;

      const resolvedAnchor = this.getClosestAnchor(anchors);

      // Distinguish between normal paragraph text and code blocks
      let levelWeight: number;

      if (currentLevel !== 'content') {
        // Headers get priorities from 40 to 100
        levelWeight = 100 - currentLevelInt * 10;
      } else {
        const isCodeBlock = tagName === 'code' || el.parents('pre').length > 0;
        // Regular text gets 10, Code blocks get 0 (lowest priority)
        levelWeight = isCodeBlock ? 0 : 10;
      }

      const weight: RecordWeight = {
        page_rank: 0,
        level: levelWeight,
        position: index,
        position_descending: nodes.length - index,
      };

      const record: DocSearchRecord = {
        objectID: '',
        url_without_anchor: url,
        url: resolvedAnchor ? `${url}#${resolvedAnchor}` : url,
        anchor: resolvedAnchor,
        content: content,
        hierarchy: hierarchy as Hierarchy,
        hierarchy_radio: this.getHierarchyRadio(
          hierarchy as Hierarchy,
          currentLevel,
        ),
        type: currentLevel,
        weight: weight,
        language: lang,
      };

      record.objectID = this.getObjectID(record);
      records.push(record);
    });

    return records;
  }

  // Helpers

  private getLevelFromTag(tagName: string): string {
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      return `lvl${tagName.replace('h', '')}`;
    }
    return 'content';
  }

  private generateEmptyHierarchy(): Hierarchy {
    return {
      lvl0: null,
      lvl1: null,
      lvl2: null,
      lvl3: null,
      lvl4: null,
      lvl5: null,
      lvl6: null,
    };
  }

  // Returns hierarchy where only the deepest active level is filled.
  private getHierarchyRadio(
    hierarchy: Hierarchy,
    currentLevel: string,
  ): Hierarchy {
    const radio = this.generateEmptyHierarchy();
    let isFound = false;

    for (let i = 6; i >= 0; i--) {
      const level = `lvl${i}`;
      const value = hierarchy[level];

      if (!isFound && value !== null) {
        if (currentLevel === 'content' || level === currentLevel) {
          radio[level] = value;
          isFound = true;
          continue;
        }
      }
      radio[level] = null;
    }
    return radio;
  }

  private getAnchor(el: cheerio.Cheerio<any>): string | null {
    const id = el.attr('id');
    return id || null;
  }

  private getClosestAnchor(anchors: Hierarchy): string | null {
    for (let i = 6; i >= 0; i--) {
      const val = anchors[`lvl${i}`];
      if (val) return val;
    }
    return null;
  }

  private getObjectID(record: DocSearchRecord): string {
    const hierarchyToHash: Record<string, string> = {};
    Object.keys(record.hierarchy).forEach((k) => {
      const val = record.hierarchy[k];
      if (val) hierarchyToHash[k] = val;
    });

    const payload = {
      hierarchy: hierarchyToHash,
      url: record.url_without_anchor,
      position: record.weight.position,
    };

    const jsonStr = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha1').update(jsonStr).digest('hex');
  }

  /**
   * Removes anchor links and invisible characters
   */
  private cleanText(el: cheerio.Cheerio<any>): string {
    // Clone the element so we don't destroy the original DOM for other operations
    const clone = el.clone();

    // Remove the header anchor link (<a class="rp-header-anchor">​​</a>)
    clone.find('.rp-header-anchor').remove();

    clone.find('br').replaceWith(' ');
    clone.find('li, p, div, tr').append(' ');

    // Get text
    let text = clone.text();

    // Regex cleaning:
    // \u00A0 : Non-breaking space
    // \u200B : Zero-width space
    // \s+    : Collapse multiple whitespaces into one
    text = text
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 10000) {
      text = text.slice(0, 10000) + '...';
    }
    return text;
  }
}
