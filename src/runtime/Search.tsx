import type { DocSearchProps } from 'typesense-docsearch-react';
import { DocSearch } from 'typesense-docsearch-react';
import {
  removeBase,
  useLang,
  useNavigate,
  useVersion,
} from '@rspress/core/runtime';
// @ts-expect-error @theme is not typed
import { Link } from '@theme';
import 'typesense-docsearch-css';
import './Search.css';
import type { Locales } from './locales';

const Hit: DocSearchProps['hitComponent'] = ({ hit, children }) => {
  return <Link href={hit.url}>{children}</Link>;
};

type SearchProps = {
  docSearchProps: Omit<DocSearchProps, 'translations'>;
  locales?: Locales;
  versionedSearch?: boolean;
};

function Search({
  locales = {},
  versionedSearch = true,
  docSearchProps: { typesenseCollectionName, ...docSearchProps },
}: SearchProps) {
  const navigate = useNavigate();

  const version = useVersion();
  const lang = useLang() || 'en';

  const { translations, placeholder } = locales?.[lang] ?? {};

  // Construct collection name matching the server-side generation
  let resolvedCollectionName = typesenseCollectionName;
  if (versionedSearch && version) {
    resolvedCollectionName += `_${version}`;
  }
  resolvedCollectionName += `_${lang}`;

  return (
    <>
      <DocSearch
        typesenseCollectionName={resolvedCollectionName}
        placeholder={placeholder}
        translations={translations}
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
export { Search };
