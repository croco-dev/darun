import { type RankedProductVoteRepository, RankedProductVoteRepositoryToken } from '@darun/products-domain';
import { type SearchProductVoteRepository, SearchProductVoteRepositoryToken } from '@darun/search-domain';
import { VoteRepositoryToken } from '@darun/voting-domain';
import { Container, ContainerInstance } from 'typedi';

export function registerRepositoryAliases(): void {
  Container.set({
    id: RankedProductVoteRepositoryToken,
    factory: (container: ContainerInstance): RankedProductVoteRepository => container.get(VoteRepositoryToken),
  });
  Container.set({
    id: SearchProductVoteRepositoryToken,
    factory: (container: ContainerInstance): SearchProductVoteRepository => container.get(VoteRepositoryToken),
  });
}
