import type { ComponentType } from 'react';
import { createElement, memo } from 'react';

type BindOptions = {
  displayName?: string;
};

type NamedComponent<TProps> = ComponentType<TProps> & {
  displayName?: string;
};

export function bind<TProps extends object, THookResult extends object>(
  useHook: (props: TProps) => THookResult,
  View: ComponentType<THookResult>,
  options?: BindOptions
) {
  const ViewComponent = memo(View) as NamedComponent<THookResult>;
  const Bound = memo((props: TProps) => createElement(ViewComponent, useHook(props)));

  if (options?.displayName) {
    Bound.displayName = options.displayName;
    ViewComponent.displayName = `${options.displayName}View`;
  }

  return Object.assign(Bound, {
    ViewComponent,
  });
}
