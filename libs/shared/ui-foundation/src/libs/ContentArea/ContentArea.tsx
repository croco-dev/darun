import { styled } from '@kuma-ui/core';
import { ReactNode } from 'react';

export function ContentArea({ children }: { children: ReactNode }) {
  return <Component>{children}</Component>;
}

const Component = styled.div`
  width: 100%;
  margin-right: auto;
  margin-left: auto;
  max-width: 1120px;
  padding-right: 1rem;
  padding-left: 1rem;

  @media (min-width: t('breakpoints.md')) {
    padding-right: 2rem;
    padding-left: 2rem;
  }
`;
