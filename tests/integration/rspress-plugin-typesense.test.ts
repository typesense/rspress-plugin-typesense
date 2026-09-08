import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, test } from '@rstest/core';
import { Client } from 'typesense';
import { pluginTypesense } from '../../src';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const docsRoot = path.join(repositoryRoot, 'docs');
const typesenseUrl = process.env.TYPESENSE_URL ?? 'http://localhost:8108';
const typesenseApiKey = process.env.TYPESENSE_API_KEY ?? 'xyz';
const typesenseClient = new Client({
  nodes: [{ url: typesenseUrl }],
  apiKey: typesenseApiKey,
});

async function run(command: string, args: string[], cwd: string) {
  try {
    return await execFileAsync(command, args, {
      cwd,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    const commandError = error as { stderr?: string; stdout?: string };
    throw new Error(
      [
        `Command failed: ${command} ${args.join(' ')}`,
        commandError.stdout,
        commandError.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
      { cause: error },
    );
  }
}

async function buildDocsWithCurrentPackage() {
  await run('bun', ['run', 'build'], repositoryRoot);

  const packageDir = await mkdtemp(
    path.join(tmpdir(), 'rspress-plugin-typesense-package-'),
  );
  const docsWorkspaceParent = await mkdtemp(
    path.join(tmpdir(), 'rspress-plugin-typesense-docs-'),
  );
  const docsWorkspace = path.join(docsWorkspaceParent, 'docs');

  try {
    await cp(docsRoot, docsWorkspace, {
      recursive: true,
      filter: (source) => {
        const relativePath = path.relative(docsRoot, source);
        const excludedDirectories = new Set(['doc_build', 'node_modules']);

        return !relativePath
          .split(path.sep)
          .some((segment) => excludedDirectories.has(segment));
      },
    });

    const { stdout } = await run(
      'npm',
      [
        'pack',
        '--cache',
        path.join(packageDir, 'npm-cache'),
        '--pack-destination',
        packageDir,
        '--silent',
      ],
      repositoryRoot,
    );
    const packageName = stdout.trim().split(/\r?\n/).at(-1);

    if (!packageName) {
      throw new Error('npm pack did not return an archive name');
    }

    const packageArchive = path.join(packageDir, packageName);

    await run('bun', ['install', '--frozen-lockfile'], docsWorkspace);
    await run('bun', ['add', '--no-save', packageArchive], docsWorkspace);
    await run('bun', ['run', 'build'], docsWorkspace);
  } finally {
    await Promise.all([
      rm(packageDir, { recursive: true, force: true }),
      rm(docsWorkspaceParent, { recursive: true, force: true }),
    ]);
  }
}

async function deleteCollectionsWithPrefix(prefix: string) {
  const collections = await typesenseClient.collections().retrieve();

  await Promise.all(
    collections
      .filter((collection) => collection.name.startsWith(prefix))
      .map((collection) =>
        typesenseClient
          .collections(collection.name)
          .delete()
          .catch(() => {}),
      ),
  );
}

describe('Rspress plugin Typesense integration', () => {
  beforeAll(async () => {
    await buildDocsWithCurrentPackage();
  });

  test('indexes a non-empty collection for each configured locale', async () => {
    for (const alias of ['rspress_docs_en', 'rspress_docs_vn']) {
      const aliasRecord = await typesenseClient.aliases(alias).retrieve();
      expect(aliasRecord.collection_name).toBeTruthy();

      const collection = await typesenseClient
        .collections(aliasRecord.collection_name)
        .retrieve();
      expect(collection.num_documents).toBeGreaterThan(0);
    }
  });

  test('returns results for every configured documentation version', async () => {
    for (const alias of ['rspress_docs_en', 'rspress_docs_vn']) {
      const { collection_name: collectionName } = await typesenseClient
        .aliases(alias)
        .retrieve();

      for (const version of ['v1', 'v2']) {
        const search = await typesenseClient
          .collections(collectionName)
          .documents()
          .search({
            q: 'getting',
            query_by: 'content,hierarchy.lvl1,hierarchy.lvl2',
            filter_by: `version:=${version}`,
            per_page: 1,
          });

        expect(search.found).toBeGreaterThan(0);
      }
    }
  });
});

describe('Typesense collection commit safety', () => {
  test('keeps the old collection when indexing fails before commit', async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const collectionName = `rspress_index_safety_${suffix}`;
    const aliasName = `${collectionName}_en`;
    const oldCollectionName = `${aliasName}_old`;
    const outputParent = await mkdtemp(
      path.join(tmpdir(), 'rspress-plugin-typesense-build-'),
    );
    const outputDir = path.join(outputParent, 'doc_build');

    try {
      await typesenseClient.collections().create({
        name: oldCollectionName,
        fields: [{ name: 'title', type: 'string' }],
      });
      await typesenseClient.aliases().upsert(aliasName, {
        collection_name: oldCollectionName,
      });
      await mkdir(outputDir, { recursive: true });
      await writeFile(
        path.join(outputDir, 'guide.html'),
        '<main class="rspress-doc"><h1>Guide</h1><p>Content</p></main>',
      );

      const plugin = pluginTypesense({
        serverConfig: {
          nodes: [{ url: typesenseUrl }],
          apiKey: typesenseApiKey,
        },
        collectionName,
        transformRecord() {
          throw new Error('forced integration indexing failure');
        },
      });

      await plugin.routeGenerated?.(
        [
          {
            pageName: 'guide',
            routePath: '/guide',
            lang: 'en',
            version: 'v1',
          } as any,
        ],
        true,
      );

      let buildError: unknown;
      try {
        await plugin.afterBuild?.(
          {
            outDir: outputDir,
            lang: 'en',
            multiVersion: { default: 'v1' },
          } as any,
          true,
        );
      } catch (error) {
        buildError = error;
      }

      expect(buildError).toBeTruthy();

      const oldCollection = await typesenseClient
        .collections(oldCollectionName)
        .retrieve();
      expect(oldCollection.name).toBe(oldCollectionName);

      const alias = await typesenseClient.aliases(aliasName).retrieve();
      expect(alias.collection_name).toBe(oldCollectionName);

      const temporaryCollections = (
        await typesenseClient.collections().retrieve()
      ).filter(
        (collection) =>
          collection.name.startsWith(`${aliasName}_`) &&
          collection.name !== oldCollectionName,
      );
      expect(temporaryCollections).toHaveLength(0);
    } finally {
      await typesenseClient
        .aliases(aliasName)
        .delete()
        .catch(() => {});
      await deleteCollectionsWithPrefix(collectionName).catch(() => {});
      await rm(outputParent, { recursive: true, force: true });
    }
  });
});
