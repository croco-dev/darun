import { cva } from 'class-variance-authority';

type MenuItemProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
};

const menuItemVariants = cva(
  'rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40',
  {
    variants: {
      active: {
        true: 'bg-dark-900 text-white border-dark-900',
        false: 'bg-white text-dark-900 border-dark-200 hover:bg-surface-100',
      },
    },
    defaultVariants: { active: false },
  }
);

export function MenuItem({ label, active = false, onClick }: MenuItemProps) {
  return (
    <button type="button" className={menuItemVariants({ active })} onClick={onClick}>
      {label}
    </button>
  );
}
