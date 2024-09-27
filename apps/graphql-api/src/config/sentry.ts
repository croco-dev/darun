import * as Sentry from '@sentry/aws-serverless';
import { RUNNING_ENV } from './environment';

Sentry.init({
  dsn: 'https://0bca7005e13145b49c2b68c18022b5f8@o1088571.ingest.us.sentry.io/4508023165419520',
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
  environment: RUNNING_ENV,
});
