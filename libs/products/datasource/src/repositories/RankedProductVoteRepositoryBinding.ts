import { RankedProductVoteRepositoryToken } from '@darun/products-domain';
import { PostgresqlVoteRepository } from '@darun/voting-datasource';
import { Container } from 'typedi';

Container.set({
  id: RankedProductVoteRepositoryToken,
  factory: () => Container.get(PostgresqlVoteRepository),
});
