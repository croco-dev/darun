import { useEffect, useState } from 'react';

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

    if (!nextHeading) {
      return false;
    }

    return heading.id === nextHeading.id && heading.text === nextHeading.text;
  });
}

function resolveActiveHeadingId(headings: HTMLElement[]) {
  if (headings.length === 0) {
    return null;
  }

  let currentHeadingId: string | null = null;

  for (const heading of headings) {
    const { top } = heading.getBoundingClientRect();

    if (top <= ACTIVE_HEADING_OFFSET) {
      currentHeadingId = heading.id;
      continue;
    }

    return currentHeadingId ?? heading.id;
  }

  return currentHeadingId ?? headings[0]?.id ?? null;
}

export function useProductTableOfContent() {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<HeadingData[]>([]);

  useEffect(() => {
    let headingElements = getHeadingElements();
    let rafId: number | null = null;

    const syncHeadings = () => {
      headingElements = getHeadingElements();

      setHeadings(prevHeadings => {
        const nextHeadings = toHeadingData(headingElements);

        return areHeadingsEqual(prevHeadings, nextHeadings) ? prevHeadings : nextHeadings;
      });
    };

    const updateActiveHeading = () => {
      setActiveHeadingId(prevActiveHeadingId => {
        const nextActiveHeadingId = resolveActiveHeadingId(headingElements);

        return prevActiveHeadingId === nextActiveHeadingId ? prevActiveHeadingId : nextActiveHeadingId;
      });
    };

    const handleScroll = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateActiveHeading();
      });
    };

    const handleResize = () => {
      syncHeadings();
      updateActiveHeading();
    };

    syncHeadings();
    updateActiveHeading();

    const detailContent = document.getElementById('detail-content');
    const observer =
      detailContent === null
        ? null
        : new MutationObserver(() => {
            syncHeadings();
            updateActiveHeading();
          });

    if (detailContent && observer) {
      observer.observe(detailContent, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { activeHeadingId, headings };
}
