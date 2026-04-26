
import type { DocSearchProps } from 'typesense-docsearch-react';
import { DocSearch } from 'typesense-docsearch-react';
import { useLang, useNavigate, useVersion } from '@rspress/core/runtime';
// @ts-expect-error @theme is not typed
import { Link } from '@theme';
import type { Locales } from './locales';

const Hit: DocSearchProps['hitComponent'] = ({ hit, children }) => {
  return <Link href={hit.url}>{children}</Link>;
};

// A regex that escapes < and > UNLESS they are part of <mark> or </mark>
const safeEscapeHighlights = (str: string) => {
  if (!str) return str;
  return str
    .replace(/<(?!mark>|\/mark>)/gi, '&lt;')
    .replace(/(?<!<mark|<\/mark)>/gi, '&gt;');
};

type SearchProps = {
  docSearchProps: Omit<DocSearchProps, 'translations'>;
  locales?: Locales;
  versionedSearch?: boolean;
};

function Search({
  locales = {},
  versionedSearch = true,
  docSearchProps: {
    typesenseCollectionName,
    transformItems,
    typesenseSearchParameters,
    ...docSearchProps
  },
}: SearchProps) {
  const navigate = useNavigate();

  const version = useVersion();
  const lang = useLang() || 'en';

  const { translations, placeholder } = locales?.[lang] ?? {};

  // Resolve collection by locale
  const resolvedCollectionName = `${typesenseCollectionName}_${lang}`;

  const searchParams = { ...(typesenseSearchParameters || {}) };
  const filters: string[] = [];

  if (searchParams.filter_by) {
    filters.push(`(${searchParams.filter_by})`);
  }

  if (versionedSearch && version) {
    filters.push(`version:=\`${version}\``);
  }

  if (filters.length > 0) {
    searchParams.filter_by = filters.join(' && ');
  }

  return (
    <>
      <DocSearch
        typesenseCollectionName={resolvedCollectionName}
        typesenseSearchParameters={searchParams}
        placeholder={placeholder}
        translations={translations}
        transformItems={(items) => {
          const transformedItems = items.map((item) => {
            const transformed = structuredClone(item);

            // Escape Snippets (Paragraphs)
            if (transformed._snippetResult?.content?.value) {
              transformed._snippetResult.content.value = safeEscapeHighlights(
                transformed._snippetResult.content.value,
              );
            }

            // Escape Highlights (Headers/Titles)
            if (transformed._highlightResult?.hierarchy) {
              Object.values(transformed._highlightResult.hierarchy).forEach(
                (level: any) => {
                  if (level?.value) {
                    level.value = safeEscapeHighlights(level.value);
                  }
                },
              );
            }

            return transformed;
          });

          if (transformItems) {
            return transformItems(transformedItems);
          }
          return transformedItems;
        }}
        navigator={{
          navigate({ itemUrl }: { itemUrl: string }) {
            navigate(itemUrl);
          },
        }}
        hitComponent={Hit}
        {...docSearchProps}
      />
    </>
  );
}

export type { SearchProps };
export default Search;
