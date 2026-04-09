import type { ConnectionArgs } from './ConnectionArgs';
import { Cursor } from './Cursor';

export class Connection {
  public static verifyArgs({ first, after, before, last }: ConnectionArgs) {
    if (first !== undefined && last !== undefined) {
      throw new Error('pagination/invalid-connection-args');
    }

    if (first !== undefined) {
      if (!Number.isInteger(first) || first <= 0 || before !== undefined) {
        throw new Error('pagination/invalid-connection-args');
      }

      return {
        cursor: after,
        limit: first,
        type: 'after',
      };
    }

    if (last !== undefined) {
      if (!Number.isInteger(last) || last <= 0 || after !== undefined) {
        throw new Error('pagination/invalid-connection-args');
      }

      return {
        cursor: before,
        limit: last,
        type: 'before',
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
    };
    totalCount: number;
  }) {
    const { nodes, cursorKeys, previous, totalCount } = args;

    const edges = nodes.map(node => ({
      node,
      cursor: Cursor.encode(node, cursorKeys),
    }));

    return {
      totalCount,
      edges,
      pageInfo: {
        hasNextPage: nodes.length === previous.limit,
        hasPreviousPage: typeof previous.cursor !== 'undefined',
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }
}
