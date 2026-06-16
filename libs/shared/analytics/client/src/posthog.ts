import posthog from 'posthog-js';

let initialized = false;
let ready = false;

declare const process: {
  env: {
    NEXT_PUBLIC_POSTHOG_HOST?: string;
    NEXT_PUBLIC_POSTHOG_KEY?: string;
  };
};

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  initialized = true;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;
  posthog.init(key, {
    api_host: host,
    loaded: () => {
      ready = true;
    },
  });
}

export function isPostHogReady() {
  return ready;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!ready) return;
  posthog.capture(event, properties);
}
