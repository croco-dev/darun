import { Container, Context, LOGGER_TOKEN, ShutdownManager } from '@darun/utils-croco-adapter/framework-context';
import { Problem, ProblemCategory, ProblemFactory } from '@darun/utils-croco-adapter/problems-core';

class HarnessValidationProblem extends Problem {
  readonly code = 'compatibility-harness/validation-error';
  readonly category = ProblemCategory.ValidationError;
}

function harnessFactoryError(detail: string): Problem {
  return ProblemFactory.validationError('compatibility-harness/factory', detail);
}

const HARNESS_TOKEN = 'compatibility-harness/token';

Container.set(HARNESS_TOKEN, { ready: true });

function getHarnessToken(): { ready: boolean } | undefined {
  try {
    return Container.get<{ ready: boolean }>(HARNESS_TOKEN);
  } catch {
    return undefined;
  }
}

function runWithRequestContext<T>(requestId: string, fn: () => T): T {
  return Context.run({ requestId }, fn) as T;
}

function getLoggerToken() {
  return LOGGER_TOKEN;
}

function getShutdownManager(): ShutdownManager {
  return ShutdownManager.getInstance();
}

export {
  Container,
  Context,
  HarnessValidationProblem,
  harnessFactoryError,
  getHarnessToken,
  HARNESS_TOKEN,
  runWithRequestContext,
  getLoggerToken,
  getShutdownManager,
};
