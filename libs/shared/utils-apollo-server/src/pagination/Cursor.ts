import { createHmac, timingSafeEqual } from 'node:crypto';

const CURSOR_DELIMITER = '__CURSOR_DELIMITER__';
const KEY_DELIMITER = '__KEY_DELIMITER__';
const SIGNATURE_DELIMITER = '__SIGNATURE_DELIMITER__';

const getSecret = (): string => {
  const secret = process.env.CURSOR_SIGNATURE_SECRET;
  if (!secret) {
    throw new Error('CURSOR_SIGNATURE_SECRET environment variable is not set');
  }
  return secret;
};

const sign = (cursor: string): string => createHmac('sha256', getSecret()).update(cursor).digest('hex');

const verifySignature = (cursor: string, signature: string): void => {
  const expectedSignature = Buffer.from(sign(cursor));
  const actualSignature = Buffer.from(signature);

  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
    throw new Error('pagination/invalid-cursor');
  }
};

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

    return Buffer.from(`${cursor}${SIGNATURE_DELIMITER}${sign(cursor)}`).toString('base64');
  }

  static decode<Keys extends readonly string[]>(cursor: string, keys: Keys): { [K in Keys[number]]: string } {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const delimiterIndex = decoded.lastIndexOf(SIGNATURE_DELIMITER);

    let payload: string;

    if (delimiterIndex === -1) {
      // Legacy cursor without signature — skip verification
      payload = decoded;
    } else {
      payload = decoded.slice(0, delimiterIndex);
      const signature = decoded.slice(delimiterIndex + SIGNATURE_DELIMITER.length);
      verifySignature(payload, signature);
    }

    const parsedCursor = payload.split(CURSOR_DELIMITER).reduce((acc, key) => {
      const [cursorKey, value] = key.split(KEY_DELIMITER);
      return { ...acc, [cursorKey]: value };
    }, {});

    return keys.reduce(
      (acc, key) => ({
        ...acc,
        [key]: parsedCursor[key as keyof typeof parsedCursor],
      }),
      {}
    ) as {
      [K in Keys[number]]: string;
    };
  }
}
