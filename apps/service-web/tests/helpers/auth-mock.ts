import type { Page, BrowserContext } from '@playwright/test';

/**
 * E2E 테스트용 인증 Mock 헬퍼
 * Firebase Auth Emulator와 연동하여 테스트 계정으로 로그인
 */

const TEST_USER = {
  email: 'test@darun.io',
  uid: 'e2e-test-uid',
  displayName: 'E2E Test User',
};

const FIREBASE_AUTH_EMULATOR_URL = 'http://localhost:9099';

/**
 * Firebase Auth Emulator에서 커스텀 토큰을 발급받아 쿠키로 설정
 */
export async function loginAs(page: Page, email: string = TEST_USER.email): Promise<void> {
  const context = page.context();

  // Firebase Auth Emulator에 커스텀 토큰 생성 요청
  const customToken = await createCustomToken(TEST_USER.uid);

  // 토큰을 쿠키로 설정
  await context.addCookies([
    {
      name: '__darun_session',
      value: JSON.stringify({
        uid: TEST_USER.uid,
        email: TEST_USER.email,
        token: customToken,
      }),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // 페이지에서 인증 상태 설정
  await page.evaluate(user => {
    // @ts-expect-error - E2E 테스트용 전역 속성
    window.__E2E_AUTH_USER__ = user;
  }, TEST_USER);
}

/**
 * Firebase Auth Emulator에서 커스텀 토큰 생성
 */
async function createCustomToken(uid: string): Promise<string> {
  try {
    const response = await fetch(
      `${FIREBASE_AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localId: uid,
          email: 'test@darun.io',
          returnSecureToken: true,
        }),
      }
    );

    if (!response.ok) {
      // 이미 존재하는 계정이면 로그인 시도
      const signInResponse = await fetch(
        `${FIREBASE_AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@darun.io',
            password: 'testpassword',
            returnSecureToken: true,
          }),
        }
      );

      if (signInResponse.ok) {
        const data = (await signInResponse.json()) as { idToken: string };
        return data.idToken;
      }

      throw new Error('Failed to create or sign in test user');
    }

    const data = (await response.json()) as { idToken: string };
    return data.idToken;
  } catch (error) {
    console.warn('Firebase Auth Emulator not available, using mock token:', error);
    // Emulator가 없을 경우 mock 토큰 반환
    return 'mock-e2e-token';
  }
}

/**
 * 로그아웃 - 쿠키 삭제
 */
export async function logout(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

/**
 * 현재 로그인 상태 확인
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some(cookie => cookie.name === '__darun_session');
}
