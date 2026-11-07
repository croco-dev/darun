import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LogoImage } from './LogoImage';

afterEach(cleanup);

const fallbackSrc = '/images/default-product-icon.svg';

describe('LogoImage', () => {
  it.each([
    'https://linear.app/logo.png',
    'http://res.cloudinary.com/demo/logo.png',
    'https://res.cloudinary.com:8443/demo/logo.png',
    'https://res.cloudinary.com.example.org/logo.png',
    'blob:http://localhost/selected-logo',
  ])('허용 자산이 아닌 %s는 원본 URL을 표시한다', src => {
    render(<LogoImage src={src} fallbackSrc={fallbackSrc} alt="서비스 로고" width={48} height={48} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', src);
    expect(screen.getByRole('img')).not.toHaveAttribute('srcset');
  });

  it.each(['https://res.cloudinary.com/demo/logo.png', 'https://via.placeholder.com/48.png', '/local.png'])(
    '기존 허용 자산 %s는 최적화를 유지한다',
    src => {
      render(<LogoImage src={src} fallbackSrc={fallbackSrc} alt="서비스 로고" width={48} height={48} />);
      const image = screen.getByRole('img');
      const optimized = new URL(image.getAttribute('src')!, 'http://localhost');
      expect(optimized.pathname).toBe('/_next/image');
      expect(optimized.searchParams.get('url')).toBe(src);
      expect(image).toHaveAttribute('srcset');
    }
  );

  it.each([null, undefined, ''])('빈 로고 %s는 기본 아이콘을 표시한다', src => {
    render(<LogoImage src={src} fallbackSrc={fallbackSrc} alt="서비스 로고" width={48} height={48} />);
    expect(new URL(screen.getByRole('img').getAttribute('src')!, 'http://localhost').pathname).toBe(fallbackSrc);
  });

  it('깨진 로고는 기본 아이콘을 표시하고 새 URL에서는 다시 시도한다', () => {
    const { rerender } = render(
      <LogoImage
        src="https://example.org/broken.png"
        fallbackSrc={fallbackSrc}
        alt="서비스 로고"
        width={48}
        height={48}
      />
    );
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img')).toHaveAttribute('src', fallbackSrc);
    rerender(
      <LogoImage
        src="https://example.org/working.png"
        fallbackSrc={fallbackSrc}
        alt="서비스 로고"
        width={48}
        height={48}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.org/working.png');
  });
});
