import { useEffect, useRef, useState } from 'react';

type HeadingData = {
  id: string;
  text: string;
};

export function useProductTableOfContent() {
  const navigationRef = useRef<HTMLElement>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<HeadingData[]>([]);

  useEffect(() => {
    const navigation = navigationRef.current;
    const detailContent = document.getElementById('detail-content');
    const productPage = detailContent?.parentElement;
    if (!navigation || !detailContent || !productPage) return;

    const header = document.querySelector('body header');
    let sections: HTMLElement[] = [];
    let frame: number | null = null;
    let initialFragment = window.location.hash;
    let headerHeight = -1;
    let sectionOffset = -1;

    const clearInitialFragment = () => {
      initialFragment = '';
    };

    const updateActiveHeading = () => {
      frame = null;
      const nextHeaderHeight = header?.getBoundingClientRect().height ?? 0;
      const nextSectionOffset = Math.ceil(nextHeaderHeight + navigation.getBoundingClientRect().height) + 8;
      if (headerHeight !== nextHeaderHeight) {
        headerHeight = nextHeaderHeight;
        productPage.style.setProperty('--product-header-height', `${headerHeight}px`);
      }
      if (sectionOffset !== nextSectionOffset) {
        sectionOffset = nextSectionOffset;
        productPage.style.setProperty('--product-section-offset', `${sectionOffset}px`);
      }

      // The browser can resolve the initial fragment before the sticky navigation has its full height.
      if (initialFragment && window.location.hash === initialFragment) {
        const target = sections.find(section => `#${encodeURIComponent(section.id)}` === initialFragment);
        if (target && navigation.querySelector('a')) {
          target.scrollIntoView({ behavior: 'instant' });
          initialFragment = '';
        }
      } else {
        initialFragment = '';
      }

      const { scrollHeight, clientHeight } = document.documentElement;
      const atBottom = scrollHeight > clientHeight && window.scrollY + clientHeight >= scrollHeight - 1;
      let activeSection = sections[0];

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= sectionOffset + 1) {
          activeSection = section;
        }
      }

      const lastSection = sections.at(-1);
      if (atBottom && lastSection && lastSection.getBoundingClientRect().top < clientHeight) {
        activeSection = lastSection;
      }

      setActiveHeadingId(activeSection?.id ?? null);
    };

    const scheduleUpdate = () => {
      frame ??= window.requestAnimationFrame(updateActiveHeading);
    };

    const syncHeadings = () => {
      sections = Array.from(detailContent.querySelectorAll<HTMLElement>('section[id]')).filter(section => section.id);
      const nextHeadings = sections.map(section => ({
        id: section.id,
        text: section.querySelector('h2')?.textContent || section.id,
      }));

      setHeadings(previous =>
        previous.length === nextHeadings.length &&
        previous.every(({ id, text }, index) => id === nextHeadings[index].id && text === nextHeadings[index].text)
          ? previous
          : nextHeadings
      );
      scheduleUpdate();
    };

    const mutationObserver = new MutationObserver(syncHeadings);
    mutationObserver.observe(detailContent, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    if (header) resizeObserver.observe(header);
    resizeObserver.observe(navigation);
    resizeObserver.observe(document.body);
    resizeObserver.observe(detailContent);

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('wheel', clearInitialFragment, { passive: true });
    window.addEventListener('touchstart', clearInitialFragment, { passive: true });
    window.addEventListener('keydown', clearInitialFragment);
    syncHeadings();

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('wheel', clearInitialFragment);
      window.removeEventListener('touchstart', clearInitialFragment);
      window.removeEventListener('keydown', clearInitialFragment);
      if (frame !== null) window.cancelAnimationFrame(frame);
      productPage.style.removeProperty('--product-header-height');
      productPage.style.removeProperty('--product-section-offset');
    };
  }, []);

  return { activeHeadingId, headings, navigationRef };
}
