// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'graphql-api',
      home: 'aws',
      providers: {
        aws: {
          region: 'ap-northeast-2',
        },
      },
      removal: input?.stage === 'prod' ? 'retain' : 'remove',
      protect: input?.stage === 'prod',
    };
  },
  async run() {
    const environment = {
      INFRA_ENV: process.env.INFRA_ENV!,
      RUNNING_ENV: process.env.RUNNING_ENV!,
      DATABASE_URL: process.env.DATABASE_URL!,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID!,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY!,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL!,
      MONGODB_URI: process.env.MONGODB_URI!,
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
      OPEN_ROUTER_API_KEY: process.env.OPEN_ROUTER_API_KEY!,
      BRAVE_API_KEY: process.env.BRAVE_API_KEY ?? '',
      CURSOR_SIGNATURE_SECRET: process.env.CURSOR_SIGNATURE_SECRET!,
      VOTE_IP_SALT: process.env.VOTE_IP_SALT!,
    };

    const translationQueue = new sst.aws.Queue('TranslationQueue', {
      visibilityTimeout: '6 minutes',
    });

    const translationWorker = new sst.aws.Function('TranslationWorker', {
      handler: 'translation-worker.handler',
      bundle: '.build/lambda',
      runtime: 'nodejs22.x',
      architecture: 'arm64',
      timeout: '5 minutes',
      logging: { retention: '1 week' },
      permissions: [
        {
          actions: [
            'sqs:ChangeMessageVisibility',
            'sqs:DeleteMessage',
            'sqs:GetQueueAttributes',
            'sqs:GetQueueUrl',
            'sqs:ReceiveMessage',
          ],
          resources: [translationQueue.arn],
        },
      ],
      environment,
    });

    translationQueue.subscribe(translationWorker.arn);

    const productDescriptionQueue = new sst.aws.Queue('ProductDescriptionQueue', {
      visibilityTimeout: '6 minutes',
    });

    const productDescriptionWorker = new sst.aws.Function('ProductDescriptionWorker', {
      handler: 'product-description-worker.handler',
      bundle: '.build/lambda',
      runtime: 'nodejs22.x',
      architecture: 'arm64',
      timeout: '5 minutes',
      logging: { retention: '1 week' },
      permissions: [
        {
          actions: [
            'sqs:ChangeMessageVisibility',
            'sqs:DeleteMessage',
            'sqs:GetQueueAttributes',
            'sqs:GetQueueUrl',
            'sqs:ReceiveMessage',
          ],
          resources: [productDescriptionQueue.arn],
        },
      ],
      environment,
    });

    productDescriptionQueue.subscribe(productDescriptionWorker.arn);

    const router = new sst.aws.Router('GraphqlRouter', {
      domain: {
        name: 'api.darun.io',
        dns: false,
        cert: 'arn:aws:acm:us-east-1:533267434214:certificate/5c2bbe3c-862b-417d-8ca4-1f372b4bbb5a',
      },
    });

    const fn = new sst.aws.Function('GraphqlHandler', {
      handler: 'graphql.handler',
      bundle: '.build/lambda',
      runtime: 'nodejs22.x',
      architecture: 'arm64',
      timeout: '30 seconds',
      logging: { retention: '1 week' },
      permissions: [
        {
          actions: ['sqs:SendMessage'],
          resources: [translationQueue.arn, productDescriptionQueue.arn],
        },
      ],
      environment: {
        ...environment,
        TRANSLATION_QUEUE_URL: translationQueue.url,
        PRODUCT_DESCRIPTION_QUEUE_URL: productDescriptionQueue.url,
      },
      url: {
        cors: {
          allowOrigins: [
            'https://www.darun.io',
            'https://admin.darun.io',
            'https://visual.darun.io',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003',
          ],
          allowMethods: ['GET', 'POST'],
          allowHeaders: [
            'authorization',
            'content-type',
            'sentry-trace',
            'baggage',
            'x-darun-sibling-md',
            'x-apollo-operation-name',
            'apollo-require-preflight',
          ],
          allowCredentials: true,
        },
        router: {
          instance: router,
        },
      },
    });

    return { api: router.url };
  },
});
