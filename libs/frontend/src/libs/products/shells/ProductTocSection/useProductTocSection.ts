import { useEffect, useState } from 'react';

export function useProductTocSection() {
  const [isFixed, setIsFixed] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const nextIsFixed = window.scrollY > 240;

      setIsFixed(prevIsFixed => (prevIsFixed === nextIsFixed ? prevIsFixed : nextIsFixed));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { isFixed };
}
