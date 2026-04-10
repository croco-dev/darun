export const votingRateLimitExceeded = () => {
  const e = new Error('voting/rate-limit-exceeded');
  (e as unknown as { code: string }).code = 'voting/rate-limit-exceeded';
  return e;
};

export const votingDuplicateVote = () => {
  const e = new Error('voting/duplicate-vote');
  (e as unknown as { code: string }).code = 'voting/duplicate-vote';
  return e;
};
