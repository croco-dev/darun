import { useEffect, useRef, useState } from 'react';

type HeadingData = {
  id: string;
  text: string;
};

const HEADING_SELECTOR = '#detail-content .darun-heading';
const ACTIVE_HEADING_OFFSET = 56;

function getHeadingElements() {
  return Array.from(document.querySelectorAll<HTMLElement>(HEADING_SELECTOR)).filter(heading => heading.id);
}

function toHeadingData(headings: HTMLElement[]): HeadingData[] {
  return headings.map(heading => ({
    id: heading.id,
    text: heading.textContent || '',
  }));
}

function areHeadingsEqual(prev: HeadingData[], next: HeadingData[]) {
  if (prev.length !== next.length) {
    return false;
  }
  return prev.every((heading, index) => {
    const nextHeading = next[index];
    return nextHeading && heading.id === nextHeading.id && heading.text === nextHeading.text;
  });
}

export function useProductTableOfContent() {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const headingPositionsRef = useRef<Record<string, 'above' | 'below'>>({});
  const headingsRef = useRef<HeadingData[]>([]);

  const updateActiveHeading = (currentHeadings: HeadingData[]) => {
    let lastAboveHeadingId: string | null = null;
    for (const heading of currentHeadings) {
      if (headingPositionsRef.current[heading.id] === 'above') {
        lastAboveHeadingId = heading.id;
      }
    }
    const nextActive = lastAboveHeadingId ?? currentHeadings[0]?.id ?? null;
    setActiveHeadingId(nextActive);
  };

  useEffect(() => {
    let io: IntersectionObserver | null = null;

    const syncHeadings = () => {
      const headingElements = getHeadingElements();
      const nextHeadings = toHeadingData(headingElements);

      setHeadings(prev => {
        if (areHeadingsEqual(prev, nextHeadings)) {
          return prev;
        }
        headingsRef.current = nextHeadings;
        return nextHeadings;
      });

      if (io) {
        io.disconnect();
      }

      io = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            const id = entry.target.id;
            if (!id) return;
            const isAbove = entry.boundingClientRect.top <= ACTIVE_HEADING_OFFSET;
            headingPositionsRef.current[id] = isAbove ? 'above' : 'below';
          });

          updateActiveHeading(headingsRef.current);
        },
        {
          rootMargin: `-${ACTIVE_HEADING_OFFSET}px 0px 0px 0px`,
          threshold: 0,
        }
      );

      headingElements.forEach(el => io?.observe(el));

      updateActiveHeading(nextHeadings);
    };

    syncHeadings();

    const detailContent = document.getElementById('detail-content');
    const observer = detailContent
      ? new MutationObserver(() => {
          syncHeadings();
        })
      : null;

    if (detailContent && observer) {
      observer.observe(detailContent, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      if (io) {
        io.disconnect();
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return { activeHeadingId, headings };
}
