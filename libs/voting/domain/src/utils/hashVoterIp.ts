import crypto from 'node:crypto';

export function hashVoterIp(ip: string): string {
  const VOTE_IP_SALT = process.env.VOTE_IP_SALT;

  if (!VOTE_IP_SALT) {
    throw new Error('Missing required env: VOTE_IP_SALT');
  }

  return crypto
    .createHash('sha256')
    .update(VOTE_IP_SALT + ip)
    .digest('hex');
}
