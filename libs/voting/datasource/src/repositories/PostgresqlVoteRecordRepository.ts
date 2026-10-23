import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import { VoteRecordRepository } from '@darun/voting-domain';
import {
  Vote,
  VoteRecordRepositoryToken,
  votingVoteInsertFailed,
  votingDuplicateVote,
  votingRateLimitExceeded,
} from '@darun/voting-domain';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { voteRecords } from '../entities/VoteRecordSchema';
import { votes } from '../entities/VoteSchema';

@Service(VoteRecordRepositoryToken)
export class PostgresqlVoteRecordRepository implements VoteRecordRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async incrementVote(targetId: string, voterIpHash: string): Promise<Vote> {
    return this.db.transaction(
      async tx => {
        // Serialize across Lambda instances, not just within one process. The lock
        // and both checks must use this transaction's connection.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${voterIpHash}, 0))`);
        const duplicate = await tx
          .select({ id: voteRecords.id })
          .from(voteRecords)
          .where(and(eq(voteRecords.targetId, targetId), eq(voteRecords.voterIpHash, voterIpHash)))
          .limit(1);
        if (duplicate.length > 0) {
          throw votingDuplicateVote();
        }
        const recent = await tx
          .select({ value: count() })
          .from(voteRecords)
          .where(
            and(
              eq(voteRecords.voterIpHash, voterIpHash),
              gte(voteRecords.createdAt, sql`clock_timestamp() - interval '1 minute'`)
            )
          );
        if (Number(recent[0]?.value ?? 0) >= 10) {
          throw votingRateLimitExceeded('1분 내 최대 10회까지 투표할 수 있습니다.');
        }
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

        await tx.insert(voteRecords).values({ targetId, voterIpHash, createdAt: sql`clock_timestamp()` });

        return new Vote(vote);
      },
      { isolationLevel: 'read committed' }
    );
  }
}
