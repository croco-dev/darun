import { ConnectionArgs } from './ConnectionArgs';
import { Cursor } from './Cursor';

export const MAX_PAGE_SIZE = 100;

export class Connection {
  public static verifyArgs({ first, after, before, last }: ConnectionArgs) {
    if (first !== undefined && last !== undefined) {
      throw new Error('pagination/invalid-connection-args');
    }

    if (first !== undefined) {
      if (!Number.isInteger(first) || first <= 0 || first > MAX_PAGE_SIZE || before !== undefined) {
        throw new Error('pagination/invalid-connection-args');
      }

      return {
        cursor: after,
        limit: first,
        type: 'after' as const,
      };
    }

    if (last !== undefined) {
      if (!Number.isInteger(last) || last <= 0 || last > MAX_PAGE_SIZE || after !== undefined) {
        throw new Error('pagination/invalid-connection-args');
      }

      return {
        cursor: before,
        limit: last,
        type: 'before' as const,
      };
    }

    throw new Error('pagination/invalid-connection-args');
  }

  public static create<Node>(args: {
    nodes: Node[];
    cursorKeys: (keyof Node)[];
    previous: {
      cursor?: string;
      limit: number;
      type: 'after' | 'before';
    };
    totalCount: number;
  }) {
    const { nodes, cursorKeys, previous, totalCount } = args;

    // Callers fetch limit + 1 in the requested direction, retaining display order.
    const hasMore = nodes.length > previous.limit;
    const pageNodes = previous.type === 'after' ? nodes.slice(0, previous.limit) : nodes.slice(-previous.limit);

    const edges = pageNodes.map(node => ({
      node,
      cursor: Cursor.encode(node, cursorKeys),
    }));

    return {
      totalCount,
      edges,
      pageInfo: {
        hasNextPage: previous.type === 'after' ? hasMore : typeof previous.cursor !== 'undefined',
        hasPreviousPage: previous.type === 'before' ? hasMore : typeof previous.cursor !== 'undefined',
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }
}
