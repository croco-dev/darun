import { useEffect, useState } from 'react';

type HeadingData = {
  id: string;
  text: string;
};

export function useProductTableOfContent() {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<HeadingData[]>([]);

  useEffect(() => {
    const headingsFromHTML = Array.from(document.querySelectorAll('#detail-content .darun-heading')).map(heading => ({
      id: heading.id,
      text: heading.textContent || '',
    }));
    setHeadings(headingsFromHTML);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const headingsElements = Array.from(document.querySelectorAll('#detail-content .darun-heading'));
      const activeHeading = headingsElements.find(element => {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });

      if (activeHeading) {
        setActiveHeadingId(activeHeading.id);
      } else {
        setActiveHeadingId(null);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { activeHeadingId, headings };
}
