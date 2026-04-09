import crypto from 'node:crypto';

const VOTE_IP_SALT = process.env.VOTE_IP_SALT ?? 'darun-vote-salt-2024';

export function hashVoterIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(VOTE_IP_SALT + ip)
    .digest('hex');
}
