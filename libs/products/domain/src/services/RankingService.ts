import { Service } from 'typedi';

const RANKING_GRAVITY = 0.6;
const NEW_PRODUCT_BOOST_HOURS = 24;
const NEW_PRODUCT_BOOST_MULTIPLIER = 1.5;
const RANKING_AGE_OFFSET_HOURS = 2;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

const calculateVoteSignal = (votes: number): number => Math.log1p(votes);

@Service()
export class RankingService {
  constructor(private readonly getNow: () => Date = () => new Date()) {}

  calculateScore(votes: number, ageHours: number, createdAt: Date): number {
    return (calculateVoteSignal(votes) / Math.pow(ageHours + RANKING_AGE_OFFSET_HOURS, RANKING_GRAVITY)) * this.boostMultiplier(createdAt);
  }

  private boostMultiplier(createdAt: Date): number {
    const ageHours = Math.max(0, this.getNow().getTime() - createdAt.getTime()) / MILLISECONDS_PER_HOUR;

    return ageHours <= NEW_PRODUCT_BOOST_HOURS ? NEW_PRODUCT_BOOST_MULTIPLIER : 1;
  }
}
