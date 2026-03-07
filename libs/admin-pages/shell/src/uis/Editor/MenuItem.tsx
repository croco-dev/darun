import './MenuItem.scss';
import { useCallback, MouseEvent } from 'react';

type MenuItemProps = {
  icon?: string;
  title?: string;
  action?: () => void;
  isActive?: (() => boolean) | null;
};

export const MenuItem = ({ icon, title, action, isActive = null }: MenuItemProps) => {
  const active = isActive?.() ?? false;

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      action?.();
    },
    [action]
  );

  return (
    <button
      className={`menu-item${active ? ' is-active' : ''}`}
      onClick={handleClick}
      title={title}
      type="button"
      aria-label={title ?? icon}
      aria-pressed={isActive ? active : undefined}
      disabled={!action}
    >
      <i className={`ri-${icon}`} aria-hidden="true"></i>
    </button>
  );
};
