import * as Sentry from '@sentry/aws-serverless';
import { RUNNING_ENV } from './environment';

Sentry.init({
  dsn: 'https://0bca7005e13145b49c2b68c18022b5f8@o1088571.ingest.us.sentry.io/4508023165419520',
  // Tracing
  tracesSampleRate: 0.1, // 운영 비용 절감을 위해 10%로 조정

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
  environment: RUNNING_ENV,
});
