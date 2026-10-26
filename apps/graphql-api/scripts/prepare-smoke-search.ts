import { mongo } from 'mongoose';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

async function main() {
  // This script may only create an index in the disposable smoke deployment.
  const uri = 'mongodb://127.0.0.1:27038/darun?directConnection=true';
  assert.equal(process.env.MONGODB_URI, uri, 'Use the disposable smoke MongoDB URL');
  const client = new mongo.MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const collection = client.db('darun').collection('searchableProducts');
    const name = 'searchable_products_index';
    const indexes = await collection.listSearchIndexes(name).toArray();
    if (!indexes.length) {
      await collection.createSearchIndex({
        name,
        definition: { mappings: { dynamic: true } },
      });
    }
    const deadline = Date.now() + 120_000;
    while (true) {
      // The bundled driver's declaration exposes only `name`, while the command
      // also returns the documented search-index readiness fields.
      const [index] = (await collection.listSearchIndexes(name).toArray()) as Array<{
        name: string;
        status?: string;
        queryable?: boolean;
      }>;
      assert.notEqual(index?.status, 'FAILED', 'Smoke search index failed');
      if (index?.queryable) {
        // Queryable alone can precede ingestion. Prove both fixtures are searchable.
        const results = await Promise.all(
          ['figma', 'sketch'].map(query =>
            collection.aggregate([{ $search: { index: name, text: { query, path: 'name' } } }]).toArray()
          )
        );
        if (results.every((rows, i) => rows.some(row => row.slug === ['figma-e2e', 'sketch-e2e'][i]))) break;
      }
      assert.ok(Date.now() < deadline, 'Smoke search fixtures were not indexed within 120 seconds');
      await delay(1000);
    }
    console.log('Smoke search index is queryable and both search fixtures are visible');
  } finally {
    await client.close();
  }
}

void main().catch((error: unknown) => {
  console.error('Smoke search preparation failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
