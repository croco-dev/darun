import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID, IS_LOCAL } from './environment';

// Lambda 컨테이너 재사용 시 중복 초기화 방지
if (getApps().length === 0) {
  try {
    if (IS_LOCAL) {
      initializeApp({ projectId: FIREBASE_PROJECT_ID });
    } else {
      initializeApp({
        credential: cert({
          projectId: FIREBASE_PROJECT_ID,
          privateKey: FIREBASE_PRIVATE_KEY,
          clientEmail: FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error);
    throw error;
  }
}
