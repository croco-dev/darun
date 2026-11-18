const locks = new WeakMap<HTMLElement, { count: number; overflow: string }>();

export function lockBodyScroll(body: HTMLElement) {
  const lock = locks.get(body) ?? { count: 0, overflow: body.style.overflow };
  if (lock.count === 0) {
    body.style.overflow = 'hidden';
    locks.set(body, lock);
  }
  lock.count += 1;

  return () => {
    lock.count -= 1;
    if (lock.count === 0) {
      body.style.overflow = lock.overflow;
      locks.delete(body);
    }
  };
}
