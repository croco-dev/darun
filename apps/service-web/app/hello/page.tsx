import { authChecker } from '@darun/provider-auth/server';
import { getCookies } from 'next-client-cookies/server';
import { use } from 'react';

export default function Hello() {
  const isLoggedIn = use(authChecker.getIsLoggedIn(getCookies()));
  return <div>{JSON.stringify({ isLoggedIn })}</div>;
}
