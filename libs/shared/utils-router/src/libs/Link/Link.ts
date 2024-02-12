import { createElement } from 'react';
import { RouterContextValue } from '../RouterContext';
import { useRouterContext } from '../RouterContext';

export const Link: RouterContextValue['LinkComponent'] = props => {
  const { LinkComponent } = useRouterContext();

  return createElement(LinkComponent, props);
};
