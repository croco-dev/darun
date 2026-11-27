import type { Mock } from 'vitest';

// Function members become property-typed mocks, so expect() and vi.mocked() can take them without unbinding a method.
export type MockedMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : T[K];
};

// Types an object whose methods are vi.fn() or vi.spyOn() mocks. It returns the same object.
export function mockedMethods<T extends object>(value: T): MockedMethods<T> {
  return value as MockedMethods<T>;
}
