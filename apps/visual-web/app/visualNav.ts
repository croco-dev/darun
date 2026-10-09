export const VISUAL_NAV_TABS = [
  { href: '/', label: '화면' },
  { href: '/flows', label: '플로우' },
] as const;

export function isTabActive(pathname: string | null, href: string) {
  if (pathname === null) {
    return false;
  }
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
