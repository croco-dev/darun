import { Service } from 'typedi';

@Service()
export class SystemClock {
  now(): Date {
    return new Date();
  }

  nowMilliseconds(): number {
    return Date.now();
  }
}
