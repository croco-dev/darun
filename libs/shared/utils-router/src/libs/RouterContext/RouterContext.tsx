import { ComponentType, ReactNode, RefAttributes } from 'react';
import { createContext, useContext } from 'react';

type LinkComponent = ComponentType<RefAttributes<HTMLAnchorElement>>;

export type RouterContextValue = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  LinkComponent: LinkComponent;
  isProvided: boolean;
};

const NotProvided = () => {
  throw new Error('RouterProvider is not set');
};

const RouterContext = createContext<RouterContextValue>({
  LinkComponent: NotProvided,
  isProvided: false,
});

type RouterProviderProps = {
  children: ReactNode;
  linkComponent: LinkComponent;
};

export const RouterProvider = ({ children, linkComponent }: RouterProviderProps) => {
  return (
    <RouterContext.Provider value={{ LinkComponent: linkComponent, isProvided: !!linkComponent }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouterContext = () => useContext(RouterContext);
