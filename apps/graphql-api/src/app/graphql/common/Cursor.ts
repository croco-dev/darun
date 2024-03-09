const CURSOR_DELIMITER = '__CURSOR_DELIMITER__';
const KEY_DELIMITER = '__KEY_DELIMITER__';

export class Cursor {
  static encode<Node>(item: Node, cursorKeys: (keyof Node)[]): string {
    const cursor = cursorKeys
      .map(cursorKey => {
        if (item[cursorKey] instanceof Date) {
          const isoString = (item[cursorKey] as Date).toISOString();
          return `${cursorKey.toString()}${KEY_DELIMITER}${isoString}`;
        }

        return `${cursorKey.toString()}${KEY_DELIMITER}${item[cursorKey]}`;
      })
      .join(CURSOR_DELIMITER);

    return Buffer.from(cursor).toString('base64');
  }

  static decode<Keys extends readonly string[]>(cursor: string, keys: Keys): { [K in Keys[number]]: string } {
    const parsedCursor = Buffer.from(cursor, 'base64')
      .toString('utf8')
      .split(CURSOR_DELIMITER)
      .reduce((acc, key) => {
        const [cursorKey, value] = key.split(KEY_DELIMITER);
        return { ...acc, [cursorKey]: value };
      }, {});

    return keys.reduce((acc, key) => ({ ...acc, [key]: parsedCursor[key as keyof typeof parsedCursor] }), {}) as {
      [K in Keys[number]]: string;
    };
  }
}
