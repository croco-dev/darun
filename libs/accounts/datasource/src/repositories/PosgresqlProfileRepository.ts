import { ProfileRepository } from '@darun/accounts-domain';
import { Profile, ProfileRepositoryToken } from '@darun/accounts-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import { and, eq } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { profiles } from '../entities/ProfileSchema';

@Service(ProfileRepositoryToken)
export class PosgresqlProfileRepository implements ProfileRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async findByUserId(userId: string): Promise<Profile | null> {
    return this.db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId)))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  private mapper<ProfileType extends typeof profiles.$inferSelect | typeof profiles.$inferInsert>(
    schema: ProfileType
  ): Profile {
    return new Profile({
      ...schema,
    });
  }
}
