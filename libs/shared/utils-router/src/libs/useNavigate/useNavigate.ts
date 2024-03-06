import { useRouter } from 'next/navigation';

interface NavigateOptions {
  replace?: boolean;
  preventScrollReset?: boolean;
}

export function useNavigate() {
  const { push, replace } = useRouter();

  return (to: string, options?: NavigateOptions) => {
    if (options?.replace) {
      replace(to, { scroll: !options.preventScrollReset });
    } else {
      push(to, { scroll: !options?.preventScrollReset });
    }
  };
}
