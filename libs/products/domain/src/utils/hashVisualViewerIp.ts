import crypto from 'node:crypto';

/**
 * M2 조회 기록용 viewer 해시. IP 원문 저장 금지.
 * sha256(salt + ip) 해시만 저장한다.
 */
export function hashVisualViewerIp(ip: string): string {
  const salt = process.env.VISUAL_VIEW_IP_SALT ?? process.env.VOTE_IP_SALT;

  if (!salt) {
    throw new Error('Missing required env: VISUAL_VIEW_IP_SALT (or VOTE_IP_SALT fallback)');
  }

  return crypto
    .createHash('sha256')
    .update(salt + ip)
    .digest('hex');
}
