import { describe, it, expect, vi } from 'vitest';
import { Vote } from '../entities/Vote';
import { votingRateLimitExceeded, votingDuplicateVote } from '../errors/VoteError';
import { VoteRecordRepository } from '../repositories/VoteRecordRepository';
import { UpvoteProduct } from '../usecases/UpvoteProduct';

describe('hashVoterIp', () => {
  it('can be imported without VOTE_IP_SALT env var', async () => {
    const prev = process.env.VOTE_IP_SALT;
    delete process.env.VOTE_IP_SALT;
    vi.resetModules();
    try {
      const { hashVoterIp } = await import('../utils/hashVoterIp');
      expect(hashVoterIp).toBeDefined();
    } finally {
      if (prev === undefined) {
        delete process.env.VOTE_IP_SALT;
      } else {
        process.env.VOTE_IP_SALT = prev;
      }
    }
  });

  it('throws when called without VOTE_IP_SALT', async () => {
    const prev = process.env.VOTE_IP_SALT;
    delete process.env.VOTE_IP_SALT;
    vi.resetModules();
    try {
      const { hashVoterIp } = await import('../utils/hashVoterIp');
      expect(() => hashVoterIp('1.2.3.4')).toThrow(/VOTE_IP_SALT/);
    } finally {
      if (prev === undefined) {
        delete process.env.VOTE_IP_SALT;
      } else {
        process.env.VOTE_IP_SALT = prev;
      }
    }
  });

  it('should return 64 character hex string', async () => {
    const { hashVoterIp } = await import('../utils/hashVoterIp');
    const result = hashVoterIp('192.168.1.1');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be deterministic', async () => {
    const { hashVoterIp } = await import('../utils/hashVoterIp');
    const result1 = hashVoterIp('192.168.1.1');
    const result2 = hashVoterIp('192.168.1.1');
    expect(result1).toBe(result2);
  });

  it('should produce different hashes for different IPs', async () => {
    const { hashVoterIp } = await import('../utils/hashVoterIp');
    const result1 = hashVoterIp('192.168.1.1');
    const result2 = hashVoterIp('192.168.1.2');
    expect(result1).not.toBe(result2);
  });
});

describe('UpvoteProduct', () => {
  it('returns the atomic repository result and never stores a raw IP', async () => {
    const vote = new Vote({ targetId: 'product-1', count: 1 });
    const repository: VoteRecordRepository = { incrementVote: vi.fn().mockResolvedValue(vote) };
    const useCase = new UpvoteProduct(repository);
    await expect(useCase.execute({ productId: 'product-1', voterIp: '192.168.1.1' })).resolves.toBe(vote);
    expect(repository.incrementVote).toHaveBeenCalledWith('product-1', expect.stringMatching(/^[a-f0-9]{64}$/));
  });

  it.each([votingDuplicateVote(), votingRateLimitExceeded()])('preserves atomic write errors', async error => {
    const repository: VoteRecordRepository = { incrementVote: vi.fn().mockRejectedValue(error) };
    await expect(
      new UpvoteProduct(repository).execute({ productId: 'product-1', voterIp: '192.168.1.1' })
    ).rejects.toBe(error);
  });
});
