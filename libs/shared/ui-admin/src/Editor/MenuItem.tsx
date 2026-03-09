'use client';

import './MenuItem.scss';

type MenuItemProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
};

export function MenuItem({ label, active = false, onClick }: MenuItemProps) {
  return (
    <button type="button" className={`menu-item ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}
