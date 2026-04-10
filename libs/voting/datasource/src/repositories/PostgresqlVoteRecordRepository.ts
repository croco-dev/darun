import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import { VoteRecordRepository } from '@darun/voting-domain';
import { Vote, VoteRecord, VoteRecordRepositoryToken } from '@darun/voting-domain';
import { and, eq, gte } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { voteRecords } from '../entities/VoteRecordSchema';
import { votes } from '../entities/VoteSchema';

@Service(VoteRecordRepositoryToken)
export class PostgresqlVoteRecordRepository implements VoteRecordRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async existsByTargetIdAndVoterIpHash(targetId: string, voterIpHash: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(voteRecords)
      .where(and(eq(voteRecords.targetId, targetId), eq(voteRecords.voterIpHash, voterIpHash)))
      .limit(1);

    return rows.length > 0;
  }

  async countByVoterIpHashSince(voterIpHash: string, since: Date): Promise<number> {
    const rows = await this.db
      .select()
      .from(voteRecords)
      .where(and(eq(voteRecords.voterIpHash, voterIpHash), gte(voteRecords.createdAt, since)));

    return rows.length;
  }

  async insert(record: VoteRecord): Promise<VoteRecord> {
    const inserted = await this.db.insert(voteRecords).values(record).returning();

    if (!inserted[0]) {
      throw new Error('VoteRecord insert failed');
    }

    return new VoteRecord(inserted[0].id, inserted[0].targetId, inserted[0].voterIpHash, inserted[0].createdAt);
  }

  async upsertVoteWithRecord(targetId: string, voterIpHash: string, modifier: (vote: Vote) => Vote): Promise<Vote> {
    return this.db.transaction(async tx => {
      const prevVote = await tx
        .select()
        .from(votes)
        .where(eq(votes.targetId, targetId))
        .limit(1)
        .then(rows => (rows[0] ? new Vote(rows[0]) : undefined));

      const updatedVote = modifier(prevVote ?? new Vote({ targetId }));

      if (!prevVote) {
        const inserted = await tx
          .insert(votes)
          .values(updatedVote)
          .returning()
          .then(rows => (rows[0] ? new Vote(rows[0]) : undefined));

        if (!inserted) {
          throw new Error('Vote insert failed');
        }
      } else {
        const updated = await tx
          .update(votes)
          .set({ count: updatedVote.count })
          .where(eq(votes.id, prevVote.id))
          .returning();

        if (!updated[0]) {
          throw new Error('Vote update failed');
        }
      }

      await tx.insert(voteRecords).values({
        id: undefined as unknown as string,
        targetId,
        voterIpHash,
        createdAt: undefined as unknown as Date,
      });

      return updatedVote;
    });
  }
}
