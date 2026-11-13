import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductTableOfContent } from '../components/ProductTableOfContent';

function renderToc() {
  render(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ ProductDetail: { tocAriaLabel: 'Sections' } }}>
      <ProductTableOfContent />
    </NextIntlClientProvider>
  );
  vi.spyOn(screen.getByRole('navigation'), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 69, 500, 52));
  act(() => vi.advanceTimersToNextFrame());
}

function setSectionTop(id: string, top: number) {
  const section = document.getElementById(id)!;
  vi.spyOn(section, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 500, 1000));
}

function scroll() {
  act(() => {
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersToNextFrame();
  });
}

describe('ProductTableOfContent', () => {
  let detail: HTMLElement;
  let header: HTMLElement;
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.href;
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    header = document.createElement('header');
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 69));
    document.body.appendChild(header);
    detail = document.createElement('div');
    detail.id = 'detail-content';
    detail.innerHTML = `
      <section id="description" tabindex="-1"><h2>Overview</h2></section>
      <section id="screenshot" tabindex="-1"><h2>Gallery</h2></section>
      <section id="features" tabindex="-1"><h2>Features</h2></section>
    `;
    document.body.appendChild(detail);
    setSectionTop('description', 40);
    setSectionTop('screenshot', 540);
    setSectionTop('features', 1600);
  });

  afterEach(() => {
    cleanup();
    detail.remove();
    header.remove();
    window.history.replaceState(null, '', originalUrl);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('moves focus from the focused link while the current section stays put', () => {
    renderToc();
    const navigation = screen.getByRole('navigation', { name: 'Sections' });
    const [overview, gallery, features] = screen.getAllByRole('link');
    expect(navigation.contains(overview)).toBe(true);
    expect(features.getAttribute('href')).toBe('#features');
    overview.focus();

    fireEvent.keyDown(overview, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(gallery);
    fireEvent.keyDown(gallery, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(features);
    fireEvent.keyDown(features, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(overview);
    fireEvent.keyDown(overview, { key: 'End' });
    expect(document.activeElement).toBe(features);
    fireEvent.keyDown(features, { key: 'Home' });
    expect(document.activeElement).toBe(overview);
    expect(screen.getByRole('link', { current: 'location' })).toBe(overview);
    expect(window.location.href).toBe(originalUrl);
  });

  it('marks the visible section as its top crosses the header in either direction', () => {
    setSectionTop('screenshot', 150);
    renderToc();
    expect(screen.getByRole('link', { current: 'location' }).textContent).toBe('Overview');

    setSectionTop('screenshot', 110);
    scroll();
    expect(screen.getByRole('link', { current: 'location' }).textContent).toBe('Gallery');

    setSectionTop('screenshot', 150);
    scroll();
    expect(screen.getByRole('link', { current: 'location' }).textContent).toBe('Overview');
  });

  it('marks a short final section that cannot reach the header at the bottom', () => {
    setSectionTop('screenshot', 20);
    setSectionTop('features', 360);
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);
    vi.stubGlobal('scrollY', 1190);
    renderToc();
    expect(screen.getByRole('link', { current: 'location' }).textContent).toBe('Gallery');

    vi.stubGlobal('scrollY', 1200);
    scroll();
    expect(screen.getByRole('link', { current: 'location' }).textContent).toBe('Features');
  });

  it('focuses the fragment target and skips smooth scrolling when reduced motion is requested', () => {
    const features = document.getElementById('features')!;
    const scrollIntoView = vi.fn();
    Object.defineProperty(features, 'scrollIntoView', {
      value: scrollIntoView,
    });
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    renderToc();

    fireEvent.click(screen.getByRole('link', { name: 'Features' }));
    expect(window.location.hash).toBe('#features');
    expect(document.activeElement).toBe(features);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant' });
  });

  it('refreshes the link labels when detail content changes', async () => {
    renderToc();
    expect(screen.getByRole('link', { name: 'Gallery' })).toBeDefined();

    await act(async () => {
      detail.querySelector('#screenshot h2')!.textContent = 'Screenshots';
    });
    expect(screen.queryByRole('link', { name: 'Gallery' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Screenshots' }).getAttribute('href')).toBe('#screenshot');
  });
});
