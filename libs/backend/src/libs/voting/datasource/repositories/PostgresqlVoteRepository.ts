import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { eq } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { Vote, VoteRepository, VoteRepositoryToken } from '../../domain';
import { votes } from '../entities/VoteSchema';

@Service(VoteRepositoryToken)
export class PostgresqlVoteRepository implements VoteRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  findByTargetId(productId: string): Promise<Vote | null> {
    return this.db.transaction(async tx =>
      tx
        .select()
        .from(votes)
        .where(eq(votes.targetId, productId))
        .limit(1)
        .then(rows => (rows[0] ? new Vote(rows[0]) : null))
    );
  }

  upsertByTargetId(id: string, modifier: (vote: Vote) => Vote): Promise<Vote> {
    return this.db.transaction(async tx => {
      const prevVote =
        (await tx
          .select()
          .from(votes)
          .where(eq(votes.targetId, id))
          .limit(1)
          .then(rows => (rows[0] ? new Vote(rows[0]) : undefined))) ??
        (await tx
          .insert(votes)
          .values({ targetId: id, count: 0 })
          .returning()
          .then(rows => (rows[0] ? new Vote(rows[0]) : undefined)));

      if (!prevVote) {
        throw new Error('Vote not found');
      }

      const updated = await tx.update(votes).set(modifier(prevVote)).where(eq(votes.id, id)).returning();
      if (!updated[0]) {
        throw new Error('Vote update failed');
      }

      return new Vote(updated[0]);
    });
  }
}
