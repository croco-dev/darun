import { Inject, Service } from 'typedi';
import type { ProfileRepository } from '../repositories/ProfileRepository';
import { ProfileRepositoryToken } from '../repositories/ProfileRepository';

@Service()
export class GetProfile {
  constructor(
    @Inject(ProfileRepositoryToken)
    private readonly profileRepository: ProfileRepository
  ) {}

  executeMany(userIds: readonly string[]) {
    return this.profileRepository.findManyByUserIds(userIds);
  }

  async execute({ userId }: { userId: string }) {
    return this.profileRepository.findByUserId(userId);
  }
}
