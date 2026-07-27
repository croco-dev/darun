import { RankedProductVoteRepositoryToken } from '@darun/products-domain';
import { VoteRepositoryToken } from '@darun/voting-domain';
import { Container, ContainerInstance } from 'typedi';

export function registerRepositoryAliases(): void {
  Container.set({
    id: RankedProductVoteRepositoryToken,
    factory: (container: ContainerInstance) => container.get(VoteRepositoryToken),
  });
}
