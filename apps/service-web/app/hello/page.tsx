import { authChecker } from '@darun/provider-auth/server';
import { use } from 'react';

export default function Hello() {
  const isLoggedIn = use(authChecker.getIsLoggedIn());
  return <div>{JSON.stringify({ isLoggedIn })}</div>;
}
