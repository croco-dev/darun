import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import { VoteRepository } from '@darun/voting-domain';
import { Vote, VoteRepositoryToken, votingVoteInsertFailed, votingVoteUpdateFailed } from '@darun/voting-domain';
import DataLoader from 'dataloader';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { votes } from '../entities/VoteSchema';

@Service(VoteRepositoryToken)
export class PostgresqlVoteRepository implements VoteRepository {
  private readonly countLoader = new DataLoader<string, Vote | null>(
    async ids => {
      const rows = await this.db
        .select()
        .from(votes)
        .where(inArray(votes.targetId, [...ids]));
      const byId = new Map(rows.map(row => [row.targetId, new Vote(row)]));
      return ids.map(id => byId.get(id) ?? null);
    },
    { cache: false }
  );
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  findByTargetId(productId: string): Promise<Vote | null> {
    return this.countLoader.load(productId);
  }

  upsertByTargetId(id: string, modifier: (vote: Vote) => Vote): Promise<Vote> {
    return this.db.transaction(async tx => {
      const prevVote = await tx
        .select()
        .from(votes)
        .where(eq(votes.targetId, id))
        .limit(1)
        .then(rows => (rows[0] ? new Vote(rows[0]) : undefined));

      const updatedVote = modifier(prevVote ?? new Vote({ targetId: id }));

      if (!prevVote) {
        const inserted = await tx
          .insert(votes)
          .values(updatedVote)
          .returning()
          .then(rows => (rows[0] ? new Vote(rows[0]) : undefined));

        if (!inserted) {
          throw votingVoteInsertFailed();
        }
        return inserted;
      }

      const updated = await tx
        .update(votes)
        .set({
          count: updatedVote.count,
        })
        .where(eq(votes.id, prevVote.id))
        .returning();

      if (!updated[0]) {
        throw votingVoteUpdateFailed();
      }

      return new Vote(updated[0]);
    });
  }

  async findTopNByVoteCount(n: number): Promise<Vote[]> {
    const rows = await this.db
      .select()
      .from(votes)
      .orderBy(desc(votes.count), asc(votes.createdAt), asc(votes.id))
      .limit(n);

    return rows.map(row => new Vote(row));
  }
}
