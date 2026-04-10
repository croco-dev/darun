import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Vote } from '../entities/Vote';
import { votingRateLimitExceeded, votingDuplicateVote } from '../errors/VoteError';
import { VoteRecordRepository } from '../repositories/VoteRecordRepository';
import { UpvoteProduct } from '../usecases/UpvoteProduct';

describe('hashVoterIp', () => {
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
  let repository: VoteRecordRepository;
  let useCase: UpvoteProduct;

  beforeEach(() => {
    repository = {
      existsByTargetIdAndVoterIpHash: vi.fn(),
      countByVoterIpHashSince: vi.fn(),
      insert: vi.fn(),
      upsertVoteWithRecord: vi.fn(),
    };
    useCase = new UpvoteProduct(repository);
  });

  it('should call upsertVoteWithRecord on normal vote', async () => {
    (repository.countByVoterIpHashSince as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (repository.existsByTargetIdAndVoterIpHash as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (repository.upsertVoteWithRecord as ReturnType<typeof vi.fn>).mockImplementation(
      async (targetId, _hash, modifier) => {
        return modifier(new Vote({ targetId }));
      }
    );

    await useCase.execute({ productId: 'product-1', voterIp: '192.168.1.1' });

    expect(repository.upsertVoteWithRecord).toHaveBeenCalled();
  });

  it('should block duplicate vote', async () => {
    (repository.countByVoterIpHashSince as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (repository.existsByTargetIdAndVoterIpHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(useCase.execute({ productId: 'product-1', voterIp: '192.168.1.1' })).rejects.toThrow(
      votingDuplicateVote()
    );
    expect(repository.upsertVoteWithRecord).not.toHaveBeenCalled();
  });

  it('should block rate limited vote', async () => {
    (repository.countByVoterIpHashSince as ReturnType<typeof vi.fn>).mockResolvedValue(10);
    (repository.existsByTargetIdAndVoterIpHash as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await expect(useCase.execute({ productId: 'product-1', voterIp: '192.168.1.1' })).rejects.toThrow(
      votingRateLimitExceeded()
    );
    expect(repository.existsByTargetIdAndVoterIpHash).not.toHaveBeenCalled();
    expect(repository.upsertVoteWithRecord).not.toHaveBeenCalled();
  });
});
