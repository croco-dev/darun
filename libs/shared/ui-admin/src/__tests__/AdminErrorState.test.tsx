import { ServerError } from '@apollo/client/errors';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminErrorState } from '../AdminState';

describe('AdminErrorState', () => {
  afterEach(cleanup);

  it('shows the HTTP failure and escaped diagnostics while keeping the retry action usable', () => {
    const retry = vi.fn();
    const bodyText = '<img src="invalid" onerror="alert(1)">Gateway timeout';
    const error = new ServerError('Response not successful', {
      response: new Response(bodyText, { status: 502 }),
      bodyText,
    });
    const { container } = render(<AdminErrorState error={error} action={<button onClick={retry}>다시 시도</button>} />);
    expect(screen.getByText('서버 응답 오류 (HTTP 502)')).toBeDefined();
    fireEvent.click(screen.getByText('자세한 오류 정보 확인'));
    expect(container.querySelector('pre')?.textContent).toContain('Gateway timeout');
    expect(container.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
