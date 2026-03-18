import React from 'react';

export function bind(useHook, View, options) {
  const ViewComponent = React.memo(View);
  const Bound = React.memo(props => React.createElement(ViewComponent, useHook(props)));

  if (options?.displayName) {
    Bound.displayName = options.displayName;
    ViewComponent.displayName = `${options.displayName}View`;
  }

  return Object.assign(Bound, {
    ViewComponent,
  });
}
