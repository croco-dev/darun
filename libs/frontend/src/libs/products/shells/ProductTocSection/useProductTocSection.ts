import { useEffect, useState } from 'react';

export function useProductTocSection() {
  const [isFixed, setIsFixed] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsFixed(window.scrollY > 240);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { isFixed };
}
