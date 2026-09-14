// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleButton } from '../GoogleButton';

afterEach(() => {
  cleanup();
});

describe('GoogleButton', () => {
  it('renders GoogleButton with GoogleIcon and text by default', () => {
    const { container } = render(<GoogleButton>Google로 계속하기</GoogleButton>);

    const button = screen.getByRole('button', { name: 'Google로 계속하기' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).not.toHaveClass('cursor-wait');

    // GoogleIcon is rendered (it has viewBox="0 0 256 262")
    const svgIcon = container.querySelector('svg[viewBox="0 0 256 262"]');
    expect(svgIcon).toBeInTheDocument();

    // Loader2 spinner is NOT rendered
    expect(container.querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });

  it('hides GoogleIcon and renders Loader2 spinner when loading is true', () => {
    const { container } = render(<GoogleButton loading>Google로 계속하기</GoogleButton>);

    const button = screen.getByRole('button', { name: 'Google로 계속하기' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveClass('cursor-wait');

    // GoogleIcon is hidden to avoid duplicate icons
    const googleIcon = container.querySelector('svg[viewBox="0 0 256 262"]');
    expect(googleIcon).not.toBeInTheDocument();

    // Loader2 spinner is rendered
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('prevents click events when loading is true', () => {
    const handleClick = vi.fn();
    render(
      <GoogleButton loading onClick={handleClick}>
        Google로 계속하기
      </GoogleButton>
    );

    const button = screen.getByRole('button', { name: 'Google로 계속하기' });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies fullWidth class when fullWidth is true', () => {
    render(<GoogleButton fullWidth>전체 너비</GoogleButton>);

    const button = screen.getByRole('button', { name: '전체 너비' });
    expect(button).toHaveClass('w-full');
  });

  it('handles transition between loading states cleanly', () => {
    const { container, rerender } = render(<GoogleButton loading={false}>Google로 계속하기</GoogleButton>);

    const button = screen.getByRole('button', { name: 'Google로 계속하기' });
    expect(button).not.toBeDisabled();
    expect(container.querySelector('svg[viewBox="0 0 256 262"]')).toBeInTheDocument();
    expect(container.querySelector('svg.animate-spin')).not.toBeInTheDocument();

    // Transition to loading: true
    rerender(<GoogleButton loading={true}>Google로 계속하기</GoogleButton>);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('svg[viewBox="0 0 256 262"]')).not.toBeInTheDocument();
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();

    // Transition back to loading: false
    rerender(<GoogleButton loading={false}>Google로 계속하기</GoogleButton>);
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(container.querySelector('svg[viewBox="0 0 256 262"]')).toBeInTheDocument();
    expect(container.querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });
});
