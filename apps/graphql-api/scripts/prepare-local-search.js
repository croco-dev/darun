// Run with mongosh inside the local Search container.
const name = 'searchable_products_index';
const collection = db.getSiblingDB('darun').getCollection('searchableProducts');

try {
  collection.getDB().createCollection(collection.getName());
} catch (error) {
  if (error.codeName !== 'NamespaceExists') throw error;
}

if (!collection.getSearchIndexes(name).length) {
  collection.createSearchIndex(name, {
    mappings: {
      dynamic: false,
      fields: {
        name: { type: 'string' },
        description: { type: 'string' },
        summary: { type: 'string' },
        tags: { type: 'string' },
        category: { type: 'string' },
        categoryText: { type: 'string' },
      },
    },
  });
}

const deadline = Date.now() + 120_000;
let status;
while (Date.now() < deadline) {
  const [index] = collection.getSearchIndexes(name);
  status = index?.status;
  if (status === 'FAILED') throw new Error(`${name} 빌드에 실패했습니다.`);
  if (status === 'READY' && index.queryable) {
    collection
      .aggregate([{ $search: { index: name, text: { query: 'darun', path: 'name' } } }, { $limit: 1 }])
      .toArray();
    print(`${name} 인덱스를 검색할 수 있습니다.`);
    quit(0);
  }
  sleep(1000);
}
throw new Error(`${name} 인덱스가 120초 안에 준비되지 않았습니다. 상태: ${status ?? '없음'}`);
