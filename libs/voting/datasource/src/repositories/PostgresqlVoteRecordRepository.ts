import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import { VoteRecordRepository } from '@darun/voting-domain';
import {
  Vote,
  VoteRecord,
  VoteRecordRepositoryToken,
  votingVoteInsertFailed,
  votingVoteRecordInsertFailed,
} from '@darun/voting-domain';
import { and, count, eq, gte, sql } from 'drizzle-orm';
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
    return this.db
      .select({ value: count() })
      .from(voteRecords)
      .where(and(eq(voteRecords.voterIpHash, voterIpHash), gte(voteRecords.createdAt, since)))
      .then(rows => Number(rows[0]?.value ?? 0));
  }

  async insert(record: VoteRecord): Promise<VoteRecord> {
    const inserted = await this.db.insert(voteRecords).values(record).returning();

    if (!inserted[0]) {
      throw votingVoteRecordInsertFailed();
    }

    return new VoteRecord(inserted[0].id, inserted[0].targetId, inserted[0].voterIpHash, inserted[0].createdAt);
  }

  async incrementVote(targetId: string, voterIpHash: string): Promise<Vote> {
    return this.db.transaction(async tx => {
      const rows = await tx
        .insert(votes)
        .values({ targetId, count: 1 })
        .onConflictDoUpdate({
          target: votes.targetId,
          set: { count: sql`${votes.count} + 1` },
        })
        .returning();

      const vote = rows[0];
      if (!vote) {
        throw votingVoteInsertFailed();
      }

      await tx.insert(voteRecords).values({ targetId, voterIpHash });

      return new Vote(vote);
    });
  }
}
