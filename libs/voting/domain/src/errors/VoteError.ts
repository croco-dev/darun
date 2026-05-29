import { createDomainError } from '@darun/utils-error';

export enum VoteError {
  RateLimitExceeded = 'voting/rate-limit-exceeded',
  DuplicateVote = 'voting/duplicate-vote',
  VoteInsertFailed = 'voting/vote-insert-failed',
  VoteUpdateFailed = 'voting/vote-update-failed',
  VoteRecordInsertFailed = 'voting/vote-record-insert-failed',
}

export const votingRateLimitExceeded = () => createDomainError(VoteError.RateLimitExceeded);
export const votingDuplicateVote = () => createDomainError(VoteError.DuplicateVote);
export const votingVoteInsertFailed = () => createDomainError(VoteError.VoteInsertFailed);
export const votingVoteUpdateFailed = () => createDomainError(VoteError.VoteUpdateFailed);
export const votingVoteRecordInsertFailed = () => createDomainError(VoteError.VoteRecordInsertFailed);
