export function startViewTransition(callback: () => void): boolean {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    (document as Document & { startViewTransition: (cb: () => void) => unknown }).startViewTransition(
      callback,
    );
    return true;
  }
  return false;
}
