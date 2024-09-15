import './MenuItem.scss';
import { useCallback, MouseEvent } from 'react';

type MenuItemProps = {
  icon?: string;
  title?: string;
  action?: () => void;
  isActive?: (() => boolean) | null;
};

export const MenuItem = ({ icon, title, action, isActive = null }: MenuItemProps) => {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      action && action();
    },
    [action]
  );

  return (
    <button
      className={`menu-item${isActive && isActive() ? ' is-active' : ''}`}
      onClick={handleClick}
      title={title}
      type="button"
    >
      <i className={`ri-${icon}`}></i>
    </button>
  );
};
