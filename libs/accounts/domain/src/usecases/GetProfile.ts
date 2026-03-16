import { Inject, Service } from 'typedi';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { ProfileRepositoryToken } from '../repositories/ProfileRepository';

@Service()
export class GetProfile {
  constructor(
    @Inject(ProfileRepositoryToken)
    private readonly profileRepository: ProfileRepository
  ) {}

  async execute({ userId }: { userId: string }) {
    return this.profileRepository.findByUserId(userId);
  }
}
