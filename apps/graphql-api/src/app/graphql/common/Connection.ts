import { ConnectionArgs } from './ConnectionArgs';
import { Cursor } from './Cursor';

export class Connection {
  public static verifyArgs({ first, after, before, last }: ConnectionArgs) {
    if (first !== undefined) {
      return {
        cursor: after,
        limit: Number(first),
        type: 'after',
      };
    }

    if (last !== undefined) {
      return {
        cursor: before,
        limit: Number(last),
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
