import type { ButtonProps } from '@darun/ui';
import { Button } from '@darun/ui';

type GoogleButtonProps = ButtonProps & {
  fullWidth?: boolean;
  loading?: boolean;
};

function GoogleIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 256 262"
      style={{ width: '0.9rem', height: '0.9rem' }}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M255.878 133.451c0-10.525-.87-21.1-2.746-31.451H130.55v59.436h70.18c-2.91 19.151-14.127 36.094-30.54 46.858v38.564h49.708c29.186-26.863 45.98-66.532 45.98-113.407"
        fill="#4285F4"
      />
      <path
        d="M130.55 261c35.043 0 64.554-11.507 86.018-31.642l-49.708-38.564c-13.83 9.403-31.434 14.723-52.31 14.723-33.42 0-61.734-22.563-71.895-52.876H-8.861v39.773C13.13 235.287 68.798 261 130.55 261"
        fill="#34A853"
      />
      <path
        d="M58.655 152.641c-4.723-14.076-4.723-29.23 0-43.306V69.562H8.861a130.023 130.023 0 0 0 0 122.852l49.794-39.773"
        fill="#FBBC05"
      />
      <path
        d="M130.55 55.479c22.024-.338 43.308 7.96 59.514 23.18l44.341-44.341C193.967-3.62 161.771-21.59 130.55-21.29 68.798-21.29 13.13 4.423-8.861 69.562l49.794 39.773c10.16-30.313 38.474-52.876 71.895-52.876"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleButton({ children, className, disabled, fullWidth, loading, ...props }: GoogleButtonProps) {
  const mergedClassName = [fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ');

  return (
    <Button
      variant="base"
      className={mergedClassName || undefined}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        <GoogleIcon />
        {children}
      </span>
    </Button>
  );
}
